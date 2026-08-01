# Dashboard Daily Mission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the authenticated Dashboard around a state-aware daily mission, with a compact duel summary, weekly momentum, and three-item activity feed.

**Architecture:** Keep Firebase access in the existing hooks and derive display state through pure functions. `Dashboard.jsx` orders the current user and partner, creates the same deterministic daily routine used by `Rutina.jsx`, and passes prepared data into two focused presentational components. No persistence or backend schema changes are introduced.

**Tech Stack:** React 18, React Router 6, Tailwind CSS, Vitest, Testing Library, existing Firebase hooks and Kinetic Glow tokens.

## Global Constraints

- Reuse existing duel, workout, profile, routine, and navigation data.
- Do not add Firestore collections, server functions, scoring, notifications, dependencies, or new persistence.
- A workout registered today takes precedence over routine completion.
- Missing or malformed routine progress falls back safely to the no-workout state.
- Cyan identifies the current user; purple identifies the partner.
- Show at most three recent workouts, newest first.
- Keep all content clear of the fixed bottom navigation and safe areas.
- Never render a raw Firebase UID as a participant name.

---

## File structure

- Create `app/src/dashboard/dashboardState.js`: pure derivation of today's workout totals, routine-completion state, participant ordering, and recent activity.
- Create `app/src/dashboard/dashboardState.test.js`: focused domain tests without React or Firebase.
- Create `app/src/components/DailyMissionCard.jsx`: presentational three-state mission hero.
- Create `app/src/components/DashboardDuelSummary.jsx`: presentational compact duel card.
- Create `app/src/components/DashboardHome.test.jsx`: component accessibility and action tests.
- Modify `app/src/pages/Dashboard.jsx`: data composition and final information hierarchy.
- Modify `app/src/pages/Dashboard.test.jsx`: page integration, mission state, navigation, ordering, and fallback coverage.

### Task 1: Dashboard state derivation

**Files:**
- Create: `app/src/dashboard/dashboardState.js`
- Create: `app/src/dashboard/dashboardState.test.js`

**Interfaces:**
- Consumes: workout objects accepted by `resolvePerformedAt`, `routineDayKey` day strings, routine exercise ID arrays, and participant A/B data.
- Produces: `deriveTodaySummary(workouts, uid, dayKey)`, `isRoutineComplete(storedValue, requiredIds)`, `orderDashboardParticipants({ currentUid, uidA, uidB, nameA, nameB, profileA, profileB, activityA, activityB })`, and `recentWorkouts(workouts, limit = 3)`.

- [ ] **Step 1: Write failing pure-function tests**

```js
it('totals only the current user workouts from today', () => {
  expect(deriveTodaySummary(workouts, 'aaron', '2026-08-01')).toEqual({
    workoutCount: 2,
    totalMinutes: 45,
    hasWorkout: true,
  });
});

it('requires every generated routine exercise to be completed', () => {
  expect(isRoutineComplete('["warmup-1","main-1"]', ['warmup-1', 'main-1'])).toBe(true);
  expect(isRoutineComplete('["warmup-1"]', ['warmup-1', 'main-1'])).toBe(false);
  expect(isRoutineComplete('{bad', ['warmup-1'])).toBe(false);
});

it('orders current user first even when they are participant B', () => {
  expect(orderDashboardParticipants(input).mine.uid).toBe('alexandra');
});

it('returns only the three newest workouts', () => {
  expect(recentWorkouts(workouts).map(({ workoutId }) => workoutId)).toEqual(['w4', 'w3', 'w2']);
});
```

- [ ] **Step 2: Run the domain test and verify RED**

Run: the project Vitest programmatic runner with `src/dashboard/dashboardState.test.js`.

Expected: FAIL because `dashboardState.js` does not exist.

- [ ] **Step 3: Implement the pure derivations**

```js
export function deriveTodaySummary(workouts, uid, dayKey) {
  const matches = safeWorkouts(workouts).filter((workout) => (
    workout?.userId === uid && formatDayKey(resolvePerformedAt(workout)) === dayKey
  ));
  return {
    workoutCount: matches.length,
    totalMinutes: matches.reduce((sum, workout) => sum + Math.max(0, Number(workout.totalMinutes) || 0), 0),
    hasWorkout: matches.length > 0,
  };
}

export function isRoutineComplete(storedValue, requiredIds) {
  try {
    const completed = JSON.parse(storedValue ?? '[]');
    return Array.isArray(requiredIds) && requiredIds.length > 0
      && Array.isArray(completed)
      && requiredIds.every((id) => completed.includes(id));
  } catch {
    return false;
  }
}
```

Sort recent workouts by `resolvePerformedAt(workout)?.getTime() ?? 0`, descending, without mutating the hook array. Return `{ mine, partner }` records from participant ordering.

- [ ] **Step 4: Run the domain test and verify GREEN**

Run the same focused test command.

Expected: all dashboard-state tests PASS.

- [ ] **Step 5: Commit the domain boundary**

```bash
git add app/src/dashboard/dashboardState.js app/src/dashboard/dashboardState.test.js
git commit -m "feat: derive dashboard daily state"
```

### Task 2: Mission and duel presentation components

**Files:**
- Create: `app/src/components/DailyMissionCard.jsx`
- Create: `app/src/components/DashboardDuelSummary.jsx`
- Create: `app/src/components/DashboardHome.test.jsx`

**Interfaces:**
- Consumes: `DailyMissionCard({ state, workoutCount, totalMinutes, onPrimaryAction, onReview })`; `DashboardDuelSummary({ mine, partner, comparisonCopy, onOpen })`.
- Produces: accessible presentational components with no Firebase or storage access.

- [ ] **Step 1: Write failing component tests**

```jsx
it.each([
  ['ready', 'Tu misión está lista', 'Comenzar rutina'],
  ['routine-complete', 'Rutina completada', 'Registrar entrenamiento'],
  ['workout-complete', 'Misión cumplida', 'Ver entrenamiento'],
])('renders the %s mission', (state, heading, action) => {
  render(<DailyMissionCard state={state} workoutCount={2} totalMinutes={45} />);
  expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: action })).toBeInTheDocument();
});

it('renders current user first and opens the full duel', async () => {
  const onOpen = vi.fn();
  render(<DashboardDuelSummary mine={mine} partner={partner} comparisonCopy="Vas adelante" onOpen={onOpen} />);
  await userEvent.click(screen.getByRole('button', { name: /ver duelo/i }));
  expect(onOpen).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Run the component test and verify RED**

Run the project Vitest programmatic runner with `src/components/DashboardHome.test.jsx`.

Expected: FAIL because both modules are absent.

- [ ] **Step 3: Implement `DailyMissionCard`**

Use a single Kinetic Glow hero card. Map exact visible copy and action behavior:

```js
const CONTENT = {
  ready: { eyebrow: 'Acción de hoy', title: 'Tu misión está lista', action: 'Comenzar rutina' },
  'routine-complete': { eyebrow: 'Siguiente paso', title: 'Rutina completada', action: 'Registrar entrenamiento' },
  'workout-complete': { eyebrow: 'Objetivo diario', title: 'Misión cumplida', action: 'Ver entrenamiento' },
};
```

For `workout-complete`, render `${workoutCount} entrenamiento(s) · ${totalMinutes} min`. Use the existing `Card` and `Button` components and one restrained cyan radial glow.

- [ ] **Step 4: Implement `DashboardDuelSummary`**

Render `mine` at left in cyan and `partner` at right in purple, using `Avatar`. Show each participant's `activeDays`, the visible `comparisonCopy`, and a `Ver duelo` button. Do not render progress rings.

- [ ] **Step 5: Run component tests and verify GREEN**

Run the same focused component command.

Expected: all component tests PASS.

- [ ] **Step 6: Commit the visual components**

```bash
git add app/src/components/DailyMissionCard.jsx app/src/components/DashboardDuelSummary.jsx app/src/components/DashboardHome.test.jsx
git commit -m "feat: add dashboard mission components"
```

### Task 3: Dashboard integration and production verification

**Files:**
- Modify: `app/src/pages/Dashboard.jsx`
- Modify: `app/src/pages/Dashboard.test.jsx`

**Interfaces:**
- Consumes: Task 1 derivations, Task 2 components, `useUserProfile`, `generateDailyRoutine`, `routineProgressKey`, and `routineDayKey`.
- Produces: final authenticated Dashboard and routes to `/rutina`, `/subir-prueba`, `/revisar-prueba`, and `/duelo`.

- [ ] **Step 1: Replace ring-centric integration tests with mission-centric failing tests**

Add `useUserProfile` mock data and assert:

```jsx
expect(screen.getByRole('heading', { name: /tu misión está lista/i })).toBeInTheDocument();
expect(screen.queryAllByRole('progressbar')).toHaveLength(0);
expect(screen.getByRole('button', { name: /comenzar rutina/i })).toBeInTheDocument();
expect(screen.getAllByTestId('recent-workout')).toHaveLength(3);
```

Add separate cases for complete local routine progress, today's workout precedence, participant-B ordering, malformed storage, navigation calls, loading, error, and empty activity.

- [ ] **Step 2: Run `Dashboard.test.jsx` and verify RED**

Expected: failures for missing mission heading, old progress rings, and missing three-item feed.

- [ ] **Step 3: Compose profile and routine state**

Use `useUserProfile()`. Derive `dayKey = routineDayKey(now, duel?.timezone)`, generate the deterministic daily routine with the current profile and UID, flatten its exercise IDs, and read only `localStorage.getItem(routineProgressKey(uid, dayKey))`. Select mission state in this order:

```js
const missionState = today.hasWorkout
  ? 'workout-complete'
  : isRoutineComplete(storedProgress, requiredIds)
    ? 'routine-complete'
    : 'ready';
```

Include profile loading/error in the existing page-level state so the personalized header never flashes incorrect identity.

- [ ] **Step 4: Implement final visual hierarchy**

Render personalized header, `DailyMissionCard`, `DashboardDuelSummary`, a seven-segment current-user weekly strip, and the three latest workout rows. Use `navigate` callbacks for all actions. Add `pb-4`/existing Layout spacing so the final row clears the bottom navigation.

- [ ] **Step 5: Run focused Dashboard tests and verify GREEN**

Expected: all Dashboard integration tests PASS.

- [ ] **Step 6: Run full frontend regression**

Run Vitest with `include: ['src/**/*.test.js', 'src/**/*.test.jsx']` and existing setup.

Expected: all included tests PASS; existing React Router future warnings are non-blocking.

- [ ] **Step 7: Build production and inspect the output**

Run the Vite production build with the React plugin and `configFile: false` if the sandbox blocks the normal Vite config loader.

Expected: build succeeds, `dist/index.html` and hashed assets are emitted, and no source/build errors occur. The existing large-chunk warning is non-blocking and outside this feature scope.

- [ ] **Step 8: Commit the integrated Dashboard**

```bash
git add app/src/pages/Dashboard.jsx app/src/pages/Dashboard.test.jsx
git commit -m "feat: focus dashboard on daily mission"
```

- [ ] **Step 9: Push and verify deployment**

Push `main` to `origin`, then verify the Vercel commit status is `success` for the pushed SHA. Do not stage local authentication logs.
