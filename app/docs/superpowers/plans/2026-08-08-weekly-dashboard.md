# Weekly Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the immutable seven-day plan the primary Dashboard experience, with persisted workout controls, an operational run-session action, and recoverable loading errors.

**Architecture:** Extract a presentational `WeeklyPlanCard` from Dashboard and keep Firebase orchestration in Dashboard. The card receives normalized plan/progress/run state and callbacks, so its complete visual state matrix is testable without emulators; existing Firebase modules remain the persistence boundary.

**Tech Stack:** React 18, Vite 5, Tailwind CSS 3, Firebase Auth/Firestore, Vitest 2, Testing Library.

## Global Constraints

- Preserve the current dark DuoFit palette, typography, rounded-card language, and neon primary actions.
- Keep the weekly plan immutable; progress and run state remain in their separate deterministic documents.
- Workout completion remains `completionRate >= 80`.
- Run activation remains the existing `pending -> active` transition; do not add GPS or simulated metrics.
- A weekly-plan failure must not blank the rest of Dashboard.
- Use text plus icons for state; color alone is insufficient.
- Do not change `createDuel`, Firestore rules, scoring, or production configuration.

---

### Task 1: Weekly plan presentation component

**Files:**
- Create: `src/components/WeeklyPlanCard.jsx`
- Create: `src/components/WeeklyPlanCard.test.jsx`

**Interfaces:**
- Consumes: `{ plan, currentDay, progress, runSession, loading, error, actionPending, onToggleExercise, onStartRun, onRetry }`.
- Produces: default React component `WeeklyPlanCard`; no Firebase imports.
- `plan.days` uses string keys `"1"` through `"7"`; `currentDay` is an ISO weekday number from 1 through 7.

- [ ] **Step 1: Write failing structure and state tests**

```jsx
it('renders seven days and expands the current workout', () => {
  render(<WeeklyPlanCard plan={WORKOUT_PLAN} currentDay={1} progress={PARTIAL_PROGRESS} />);
  expect(screen.getAllByTestId('week-day')).toHaveLength(7);
  expect(screen.getByText(/pecho \+ tríceps/i)).toBeInTheDocument();
  expect(screen.getByText('50% completado')).toBeInTheDocument();
});

it('renders the current run target and starts it', async () => {
  const onStartRun = vi.fn();
  render(<WeeklyPlanCard plan={RUN_PLAN} currentDay={6} runSession={{ status: 'pending' }} onStartRun={onStartRun} />);
  await userEvent.click(screen.getByRole('button', { name: /iniciar carrera/i }));
  expect(onStartRun).toHaveBeenCalledOnce();
});

it('renders rest without an action', () => {
  render(<WeeklyPlanCard plan={REST_PLAN} currentDay={7} />);
  expect(screen.getByText(/recuperación/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /iniciar/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npx vitest run src/components/WeeklyPlanCard.test.jsx`

Expected: FAIL because `WeeklyPlanCard.jsx` does not exist.

- [ ] **Step 3: Implement the seven-day card**

Implement these exact state rules:

```js
const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function dayStatus(dayNumber, dayPlan, currentDay, progress, runSession) {
  if (dayPlan.type === 'rest') return 'Descanso';
  if (dayNumber > currentDay) return 'Planeado';
  if (dayPlan.type === 'run') return runSession?.status === 'active' ? 'En curso' : 'Pendiente';
  if (dayNumber === currentDay && progress) return progress.status === 'completed' ? 'Completado' : progress.status === 'partial' ? 'Parcial' : 'Pendiente';
  return dayNumber < currentDay ? 'Pendiente' : 'Hoy';
}
```

Render a semantic list of seven `data-testid="week-day"` rows. Use a compact dark row for non-current days and an expanded `border-primary-fixed-dim/60 bg-surface-container-high` row for today. The expanded content must render:

- workout focus via a `FOCUS_LABELS` Spanish lookup, checkbox list, count, percentage, and an `aria-live="polite"` summary;
- run target plus **Iniciar carrera**, disabled while `actionPending`, or **Carrera en curso** for active state;
- rest copy **Hoy toca recuperación** and no button;
- contained loading copy **Preparando tu semana…**;
- `role="alert"` error plus **Reintentar**.

- [ ] **Step 4: Run component tests and verify GREEN**

Run: `npx vitest run src/components/WeeklyPlanCard.test.jsx`

Expected: all WeeklyPlanCard tests pass.

- [ ] **Step 5: Commit the presentation component**

```bash
git add app/src/components/WeeklyPlanCard.jsx app/src/components/WeeklyPlanCard.test.jsx
git commit -m "add weekly plan Dashboard card"
```

---

### Task 2: Dashboard plan orchestration and retry

**Files:**
- Modify: `src/pages/Dashboard.jsx`
- Modify: `src/pages/Dashboard.test.jsx`

**Interfaces:**
- Consumes: `getWeekId`, `generatePlanIfMissing`, `getPlan`, `getOrCreateWorkoutProgress`, `toggleExerciseCompletion`, `makeProgressId`.
- Produces: Dashboard state `{ weeklyPlan, todayProgress, planLoading, planError, actionPending }` and callbacks passed to `WeeklyPlanCard`.

- [ ] **Step 1: Write failing Dashboard integration tests**

Mock Firebase modules and assert that Dashboard:

```jsx
it('places the weekly plan before the duel comparison', async () => {
  renderDashboard();
  const weekly = await screen.findByRole('heading', { name: /tu semana/i });
  const duel = screen.getByText(/vas adelante|van iguales|tu rival va adelante/i);
  expect(weekly.compareDocumentPosition(duel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

it('keeps duel content visible and retries a failed plan load', async () => {
  getPlan.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(WORKOUT_PLAN);
  renderDashboard();
  expect(await screen.findByRole('alert')).toHaveTextContent(/no pudimos cargar tu semana/i);
  expect(screen.getByText(/van iguales/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /reintentar/i }));
  expect(await screen.findByText(/pecho \+ tríceps/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run Dashboard tests and verify RED**

Run: `npx vitest run src/pages/Dashboard.test.jsx`

Expected: FAIL because the full plan and retry state are not rendered at the top.

- [ ] **Step 3: Implement stable plan loading**

In `Dashboard.jsx`:

- statically import `WeeklyPlanCard`;
- store the full plan rather than only today's entry;
- derive `weekId` and ISO weekday from the memoized `now`;
- extract `loadWeeklyPlan` with `React.useCallback`;
- set `planLoading=true` and clear `planError` before loading;
- generate-if-missing, fetch plan, then initialize progress only when today's type is workout;
- catch into `planError` without changing the page-level duel error;
- pass `loadWeeklyPlan` to `onRetry`;
- render the card before `VSDisplay` and remove the old plan block from the activity card.

The effect calls `loadWeeklyPlan()` once per stable duel/user/week dependency and guards state updates after unmount.

- [ ] **Step 4: Implement persisted exercise toggles**

Create `handleToggleExercise(exerciseId, completed)` that sets `actionPending`, calls:

```js
const progressId = makeProgressId(currentUser.uid, weekId, currentDay);
const updated = await toggleExerciseCompletion(duelId, progressId, exerciseId, completed);
setTodayProgress(updated);
```

On failure, retain previous progress and set a contained plan error. Always clear `actionPending` in `finally`.

- [ ] **Step 5: Verify Dashboard and App tests**

Run: `npx vitest run src/pages/Dashboard.test.jsx src/App.test.jsx`

Expected: all tests pass, including the loading-to-loaded regression.

- [ ] **Step 6: Commit Dashboard orchestration**

```bash
git add app/src/pages/Dashboard.jsx app/src/pages/Dashboard.test.jsx
git commit -m "connect weekly plan to Dashboard"
```

---

### Task 3: Run-session action

**Files:**
- Modify: `src/pages/Dashboard.jsx`
- Modify: `src/pages/Dashboard.test.jsx`

**Interfaces:**
- Consumes: `makeRunId(userId, weekId, isoWeekday)`, `getOrCreateRunSession(duelId, userId, weekId, isoWeekday, planSnapshot)`, and `startRunSession(duelId, runId)` from `src/firebase/runSessions.js`.
- Produces: `runSession` state and `handleStartRun()` for `WeeklyPlanCard`.

- [ ] **Step 1: Write a failing run-day integration test**

```jsx
it('creates and starts the current run session', async () => {
  getPlan.mockResolvedValue(RUN_PLAN);
  getOrCreateRunSession.mockResolvedValue({ runId: 'aaron_2026-W32_d6', status: 'pending' });
  startRunSession.mockResolvedValue({ runId: 'aaron_2026-W32_d6', status: 'active' });
  renderDashboard();
  await userEvent.click(await screen.findByRole('button', { name: /iniciar carrera/i }));
  expect(startRunSession).toHaveBeenCalledWith('duel-1', 'aaron_2026-W32_d6');
  expect(await screen.findByText(/carrera en curso/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npx vitest run src/pages/Dashboard.test.jsx -t "creates and starts"`

Expected: FAIL because Dashboard does not initialize or start run sessions.

- [ ] **Step 3: Initialize and start run sessions**

During plan load, when today's type is `run`, call `getOrCreateRunSession(...)` and store its result. Implement `handleStartRun` to call `startRunSession(duelId, runSession.runId)`, update state with the returned active session, disable the button while pending, and surface failures inside the weekly card.

- [ ] **Step 4: Verify UI and Firebase run tests**

Run: `npx vitest run src/pages/Dashboard.test.jsx src/components/WeeklyPlanCard.test.jsx`

Run with emulators: `npx firebase emulators:exec --only auth,firestore "npx vitest run src/firebase/runSessions.test.js"`

Expected: all tests pass and the persisted transition remains `pending -> active`.

- [ ] **Step 5: Commit run integration**

```bash
git add app/src/pages/Dashboard.jsx app/src/pages/Dashboard.test.jsx
git commit -m "connect run sessions to weekly Dashboard"
```

---

### Task 4: Final visual, accessibility, and regression verification

**Files:**
- Modify if required by evidence: `src/components/WeeklyPlanCard.jsx`
- Modify if required by evidence: `src/components/WeeklyPlanCard.test.jsx`

**Interfaces:**
- Consumes: completed weekly card and Dashboard orchestration.
- Produces: production-ready responsive Dashboard with no new API surface.

- [ ] **Step 1: Run focused UI regression suite**

Run: `npx vitest run src/components/WeeklyPlanCard.test.jsx src/pages/Dashboard.test.jsx src/App.test.jsx`

Expected: all tests pass with no uncaught React errors.

- [ ] **Step 2: Run feature Firebase tests**

Run: `npx firebase emulators:exec --only auth,firestore "npx vitest run src/firebase/plans.test.js src/firebase/workouts.test.js src/firebase/firestore.test.js src/firebase/workoutProgress.test.js src/firebase/runSessions.test.js"`

Expected: 23/23 tests pass. If the known emulator gRPC oversized-frame issue appears, restart the emulator and rerun the affected file in a clean instance before evaluating the result.

- [ ] **Step 3: Run production build and static diff checks**

Run: `npm run build`

Run: `git diff --check`

Expected: build exits 0; diff check emits no output.

- [ ] **Step 4: Inspect responsive rendering**

Run the Vite app locally and inspect Dashboard at 390 px and 1280 px widths. Confirm seven visible day rows, current-day expansion, keyboard focus, no horizontal overflow, and that recent activity remains below the duel section. Make only evidence-driven class changes.

- [ ] **Step 5: Re-run affected UI tests after any visual adjustment**

Run: `npx vitest run src/components/WeeklyPlanCard.test.jsx src/pages/Dashboard.test.jsx src/App.test.jsx`

Expected: all focused UI tests pass.

- [ ] **Step 6: Commit final verified polish**

```bash
git add app/src/components/WeeklyPlanCard.jsx app/src/components/WeeklyPlanCard.test.jsx app/src/pages/Dashboard.jsx app/src/pages/Dashboard.test.jsx
git commit -m "finish weekly Dashboard experience"
```
