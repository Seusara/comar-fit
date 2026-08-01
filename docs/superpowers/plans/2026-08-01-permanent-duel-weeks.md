# Permanent Duel Weeks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing permanent two-person duel into automatic Mexico City calendar weeks and add a dedicated Duelo page with completed-week history.

**Architecture:** Add a pure weekly-domain module that groups duel workouts by deterministic Monday keys and derives current/completed weekly comparisons without writing aggregates. Dashboard and the new Duelo page consume that same domain output through the existing real-time duel-workouts listener, keeping Firestore workouts authoritative.

**Tech Stack:** React 18, React Router 6, Firebase Firestore 10, Vite 5, Vitest, Testing Library.

## Global Constraints

- Exactly two participants remain attached to the existing duel.
- Week boundaries and day keys use `America/Mexico_City`.
- Weeks run Monday through Sunday and are identified by their Monday `YYYY-MM-DD` key.
- No Cloud Functions, score documents, multiple partners, rankings, invitations, opponent management, or new environment variables.
- Workouts remain the only source of truth for weekly activity and results.
- Multiple workouts by one participant on the same calendar day count as one active day.
- Existing Firestore ownership and ten-minute edit/delete rules remain unchanged.

---

## File Map

- Create `app/src/duel/weeklyHistory.js`: pure Mexico City week-key, grouping, winner, and history derivation.
- Create `app/src/duel/weeklyHistory.test.js`: domain coverage for rollover, duplicate days, invalid timestamps, winner, tie, and empty weeks.
- Modify `app/src/pages/Dashboard.jsx`: consume the derived current calendar week instead of stale creation-week boundaries.
- Modify `app/src/pages/Dashboard.test.jsx`: verify Monday rollover resets the displayed weekly progress.
- Create `app/src/pages/Duelo.jsx`: current comparison and completed-week list.
- Create `app/src/pages/Duelo.test.jsx`: rendering, names, ordering, winner/tie, loading, error, and empty history.
- Modify `app/src/App.jsx`: register protected `/duelo` route.
- Modify `app/src/App.test.jsx`: verify route access.
- Modify `app/src/components/Layout.jsx`: point the Duelo navigation item to `/duelo`.
- Modify `app/src/components/components.test.jsx`: verify the Duelo navigation destination and active state.

### Task 1: Pure Weekly Duel Domain

**Files:**
- Create: `app/src/duel/weeklyHistory.js`
- Create: `app/src/duel/weeklyHistory.test.js`

**Interfaces:**
- Consumes: workout objects shaped as `{userId, performedAt | date}` and duel objects shaped as `{userA_uid, userB_uid, createdAt?}`.
- Produces: `weekStartKey(value): string | null`.
- Produces: `deriveWeeklyDuelHistory(workouts, duel, now): {currentWeek, completedWeeks}`.
- Each week is `{weekId, startKey, endKey, participantA, participantB, result}` where each participant value is `{uid, activeDays, percentage, dayKeys}` and result is `'participantA' | 'participantB' | 'tied'`.

- [ ] **Step 1: Write failing timezone and grouping tests**

```js
import { describe, expect, it } from 'vitest';
import { deriveWeeklyDuelHistory, weekStartKey } from './weeklyHistory';

const duel = {
  userA_uid: 'aaron',
  userB_uid: 'alexandra',
  createdAt: new Date('2026-07-20T18:00:00Z'),
};

describe('weekStartKey', () => {
  it('rolls from Sunday to Monday in Mexico City', () => {
    expect(weekStartKey(new Date('2026-08-03T05:30:00Z'))).toBe('2026-07-27');
    expect(weekStartKey(new Date('2026-08-03T06:30:00Z'))).toBe('2026-08-03');
  });
});

describe('deriveWeeklyDuelHistory', () => {
  it('counts duplicate workouts on one day once and determines both winners and ties', () => {
    const workouts = [
      { userId: 'aaron', performedAt: new Date('2026-07-27T18:00:00Z') },
      { userId: 'aaron', performedAt: new Date('2026-07-27T20:00:00Z') },
      { userId: 'aaron', performedAt: new Date('2026-07-28T18:00:00Z') },
      { userId: 'alexandra', performedAt: new Date('2026-07-27T19:00:00Z') },
    ];

    const result = deriveWeeklyDuelHistory(workouts, duel, new Date('2026-08-03T18:00:00Z'));

    expect(result.currentWeek.weekId).toBe('2026-08-03');
    expect(result.currentWeek.result).toBe('tied');
    expect(result.completedWeeks[0]).toMatchObject({
      weekId: '2026-07-27',
      participantA: { activeDays: 2 },
      participantB: { activeDays: 1 },
      result: 'participantA',
    });
  });

  it('ignores invalid timestamps and includes empty completed weeks as ties', () => {
    const result = deriveWeeklyDuelHistory(
      [{ userId: 'aaron', performedAt: 'invalid' }],
      duel,
      new Date('2026-08-03T18:00:00Z'),
    );

    expect(result.completedWeeks.map((week) => week.result)).toEqual(['tied', 'tied']);
  });
});
```

- [ ] **Step 2: Run the domain test and verify RED**

Run:

```bash
npx vitest run src/duel/weeklyHistory.test.js
```

Expected: FAIL because `./weeklyHistory` does not exist.

- [ ] **Step 3: Implement the pure domain**

Implement `weeklyHistory.js` with these rules:

```js
import { formatDayKey, resolvePerformedAt, toDate } from '../utils/dates';

function shiftKey(key, days) {
  const [year, month, day] = key.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days, 12));
  return value.toISOString().slice(0, 10);
}

export function weekStartKey(value) {
  const dayKey = formatDayKey(value);
  if (!dayKey) return null;
  const noon = new Date(`${dayKey}T12:00:00.000Z`);
  const daysSinceMonday = (noon.getUTCDay() + 6) % 7;
  return shiftKey(dayKey, -daysSinceMonday);
}

function participant(uid, dayKeys) {
  const unique = [...new Set(dayKeys)].sort();
  return {
    uid,
    activeDays: unique.length,
    percentage: Math.round((unique.length / 7) * 100),
    dayKeys: unique,
  };
}

function resultFor(a, b) {
  if (a.activeDays === b.activeDays) return 'tied';
  return a.activeDays > b.activeDays ? 'participantA' : 'participantB';
}
```

Complete `deriveWeeklyDuelHistory` by:

1. deriving the current Monday key from `now`;
2. deriving the first Monday from `duel.createdAt`, the oldest valid workout, or the current key;
3. enumerating each Monday through the current key;
4. assigning valid participant workouts by `weekStartKey(resolvePerformedAt(workout))`;
5. returning the current week separately and completed weeks newest first;
6. using `shiftKey(startKey, 6)` for each `endKey`.

- [ ] **Step 4: Run the domain tests and verify GREEN**

Run:

```bash
npx vitest run src/duel/weeklyHistory.test.js
```

Expected: all weekly-domain tests PASS.

- [ ] **Step 5: Commit the domain**

```bash
git add app/src/duel/weeklyHistory.js app/src/duel/weeklyHistory.test.js
git commit -m "feat: derive permanent duel weeks"
```

### Task 2: Current Calendar Week on Dashboard

**Files:**
- Modify: `app/src/pages/Dashboard.jsx`
- Modify: `app/src/pages/Dashboard.test.jsx`

**Interfaces:**
- Consumes: `deriveWeeklyDuelHistory(workouts, duel, now)` from Task 1.
- Produces: Dashboard progress based on `history.currentWeek`, independent of the duel document's original week dates.

- [ ] **Step 1: Add a failing Monday-rollover test**

Add to `Dashboard.test.jsx`:

```jsx
it('starts a fresh zero-day week after Monday rollover', () => {
  vi.setSystemTime(new Date('2026-08-03T18:00:00Z'));
  useDuelWorkouts.mockReturnValue({
    workouts: [
      { userId: 'aaron', performedAt: new Date('2026-07-29T18:00:00Z') },
      { userId: 'alexandra', performedAt: new Date('2026-07-30T18:00:00Z') },
    ],
    loading: false,
    error: null,
  });

  renderDashboard();

  expect(screen.getByRole('heading', { name: /día 1 de 7/i })).toBeInTheDocument();
  expect(screen.getAllByRole('progressbar').map((ring) => ring.getAttribute('aria-valuenow')))
    .toEqual(['0', '0']);
});
```

- [ ] **Step 2: Run the Dashboard test and verify RED**

Run:

```bash
npx vitest run src/pages/Dashboard.test.jsx
```

Expected: FAIL because Dashboard still uses the duel's creation-week boundaries.

- [ ] **Step 3: Replace stale week calculations**

In `Dashboard.jsx`:

```jsx
const { currentWeek } = deriveWeeklyDuelHistory(workouts, duel, new Date());
const activityA = currentWeek.participantA;
const activityB = currentWeek.participantB;
```

Derive `dayNumber` from the current Mexico City day key relative to `currentWeek.startKey`. Derive the countdown target from the next Mexico City calendar-day boundary, clamped to `currentWeek.endKey`. Remove reliance on `duel.weekStartDate` and `duel.weekEndDate` for the current display while retaining the existing participant-name and loading/error behavior.

- [ ] **Step 4: Run Dashboard and domain tests**

Run:

```bash
npx vitest run src/pages/Dashboard.test.jsx src/duel/weeklyHistory.test.js
```

Expected: both files PASS.

- [ ] **Step 5: Commit Dashboard rollover**

```bash
git add app/src/pages/Dashboard.jsx app/src/pages/Dashboard.test.jsx
git commit -m "feat: roll dashboard into current duel week"
```

### Task 3: Dedicated Duelo History Page

**Files:**
- Create: `app/src/pages/Duelo.jsx`
- Create: `app/src/pages/Duelo.test.jsx`

**Interfaces:**
- Consumes: `useActiveDuel()`, `useDuelWorkouts(duelId)`, and `deriveWeeklyDuelHistory`.
- Produces: default React component `Duelo` rendered at `/duelo` by Task 4.

- [ ] **Step 1: Write failing page tests**

Create `Duelo.test.jsx` with mocked hooks and assert:

```jsx
it('renders current totals and completed weeks newest first', () => {
  renderDuelo();
  expect(screen.getByRole('heading', { name: /duelo semanal/i })).toBeInTheDocument();
  expect(screen.getByText('Aaron')).toBeInTheDocument();
  expect(screen.getByText('Alexandra')).toBeInTheDocument();
  expect(screen.getByText(/ganó Aaron/i)).toBeInTheDocument();
  expect(screen.getByText(/empate/i)).toBeInTheDocument();
  expect(screen.getAllByTestId('week-row').map((row) => row.dataset.weekId))
    .toEqual(['2026-07-27', '2026-07-20']);
});

it('renders loading, error, and no-completed-week states', () => {
  useDuelWorkouts.mockReturnValue({ workouts: [], loading: false, error: null });
  const { rerender } = renderDuelo();
  expect(screen.getByText(/aún no hay semanas finalizadas/i)).toBeInTheDocument();

  useDuelWorkouts.mockReturnValue({ workouts: [], loading: false, error: new Error('offline') });
  rerender(<MemoryRouter><Duelo /></MemoryRouter>);
  expect(screen.getByRole('alert')).toBeInTheDocument();
});
```

Use a fixed system time and workouts spanning at least three weeks so winner and tie copy are deterministic.

- [ ] **Step 2: Run the page test and verify RED**

Run:

```bash
npx vitest run src/pages/Duelo.test.jsx
```

Expected: FAIL because `Duelo.jsx` does not exist.

- [ ] **Step 3: Implement the Duelo page**

Build the page with existing `Layout`, `Card`, `VSDisplay`, and `ProgressRing` components:

```jsx
function resultLabel(week, nameA, nameB) {
  if (week.result === 'tied') return 'Empate';
  return `Ganó ${week.result === 'participantA' ? nameA : nameB}`;
}

function Duelo() {
  const { duel, loading: duelLoading, error: duelError } = useActiveDuel();
  const { workouts, loading: workoutsLoading, error: workoutsError } = useDuelWorkouts(duel?.duelId);
  if (duelLoading || workoutsLoading) return <Layout active="duelo"><p role="status">Cargando duelo...</p></Layout>;
  if (duelError || workoutsError) return <Layout active="duelo"><p role="alert">No pudimos cargar el duelo.</p></Layout>;

  const nameA = duel?.participantNames?.[duel.userA_uid] || 'Jugador 1';
  const nameB = duel?.participantNames?.[duel.userB_uid] || 'Jugador 2';
  const history = deriveWeeklyDuelHistory(workouts, duel, new Date());

  return (
    <Layout active="duelo">
      <h1>Duelo semanal</h1>
      <Card>
        <p>{nameA}: {history.currentWeek.participantA.activeDays}/7</p>
        <p>{nameB}: {history.currentWeek.participantB.activeDays}/7</p>
      </Card>
      {history.completedWeeks.length === 0 ? (
        <p>Aún no hay semanas finalizadas.</p>
      ) : history.completedWeeks.map((week) => (
        <Card key={week.weekId} data-testid="week-row" data-week-id={week.weekId}>
          <p>{week.startKey} – {week.endKey}</p>
          <p>{nameA}: {week.participantA.activeDays}/7</p>
          <p>{nameB}: {week.participantB.activeDays}/7</p>
          <p>{resultLabel(week, nameA, nameB)}</p>
        </Card>
      ))}
    </Layout>
  );
}
```

Each completed week row must have `data-testid="week-row"`, `data-week-id={week.weekId}`, an accessible date-range label, both `X/7` values, and the result label. Use `<Layout active="duelo">`.

- [ ] **Step 4: Run page and domain tests**

Run:

```bash
npx vitest run src/pages/Duelo.test.jsx src/duel/weeklyHistory.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit the page**

```bash
git add app/src/pages/Duelo.jsx app/src/pages/Duelo.test.jsx
git commit -m "feat: add permanent duel history"
```

### Task 4: Route and Navigation Integration

**Files:**
- Modify: `app/src/App.jsx`
- Modify: `app/src/App.test.jsx`
- Modify: `app/src/components/Layout.jsx`
- Modify: `app/src/components/components.test.jsx`

**Interfaces:**
- Consumes: default `Duelo` component from Task 3.
- Produces: authenticated `/duelo` route and bottom navigation link.

- [ ] **Step 1: Add failing route and navigation assertions**

Add to routing/component tests:

```jsx
it('routes the Duelo navigation item to the dedicated page', async () => {
  useAuth.mockReturnValue({ currentUser: { uid: 'aaron' }, authLoading: false });
  setRoute('/duelo');
  render(<App />);
  expect(await screen.findByRole('heading', { name: /duelo semanal/i })).toBeInTheDocument();
});

it('links Duelo to /duelo', () => {
  render(<MemoryRouter><Layout active="duelo">contenido</Layout></MemoryRouter>);
  expect(screen.getByRole('link', { name: /duelo/i })).toHaveAttribute('href', '/duelo');
});
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
npx vitest run src/App.test.jsx src/components/components.test.jsx
```

Expected: FAIL because `/duelo` is not registered and Layout points Duelo to `/dashboard`.

- [ ] **Step 3: Register route and link**

In `App.jsx`, import `Duelo` and add:

```jsx
<Route path="/duelo" element={<RequireAuth><Duelo /></RequireAuth>} />
```

In `Layout.jsx`, change only the Duelo item:

```js
{ key: 'duelo', label: 'Duelo', icon: 'swords', to: '/duelo' }
```

- [ ] **Step 4: Run integration tests and verify GREEN**

Run:

```bash
npx vitest run src/App.test.jsx src/components/components.test.jsx src/pages/Duelo.test.jsx
```

Expected: PASS.

- [ ] **Step 5: Commit route integration**

```bash
git add app/src/App.jsx app/src/App.test.jsx app/src/components/Layout.jsx app/src/components/components.test.jsx
git commit -m "feat: route permanent duel history"
```

### Task 5: Full Verification and Production Readiness

**Files:**
- Modify only files required to fix failures caused by Tasks 1-4.

**Interfaces:**
- Consumes: completed feature from Tasks 1-4.
- Produces: verified branch ready to push to `main`.

- [ ] **Step 1: Run all automated tests**

Run:

```bash
npm test
```

Expected: all test files PASS; Firestore rules tests may log expected permission-denied messages for negative cases but must report zero failures.

- [ ] **Step 2: Run the Vite production build**

Run:

```bash
npm run build
```

Expected: build succeeds and emits `dist/index.html` plus fingerprinted assets.

- [ ] **Step 3: Run a stale-week runtime scan**

Run:

```bash
rg -n "to: '/dashboard'.*Duelo|weekData|useDuelScore|Puntuación semanal|Calculando puntos" src --glob '!**/*.test.*'
```

Expected: no runtime matches.

- [ ] **Step 4: Manually verify the current and historical flows**

Verify at mobile and desktop widths:

1. Dashboard shows the current Mexico City week and current totals.
2. Duelo nav opens `/duelo` and is visibly active.
3. Completed weeks are newest first with correct participant names and winner/tie copy.
4. Refreshing `/duelo` loads successfully under Vite history fallback/Vercel.
5. A fresh Monday renders `0/7` versus `0/7` without modifying old workouts.

- [ ] **Step 5: Commit any verification-only fixes**

If Step 1-4 required changes:

```bash
git add app/src
git commit -m "fix: harden permanent duel week rollover"
```

If no changes were required, do not create an empty commit.
