# COMAR-FIT Daily Routine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a protected daily-routine screen that deterministically adapts exercises to each user's profile and transfers completed exercises into the existing workout form.

**Architecture:** A pure routine domain module owns catalog filtering, seeded ordering, duration/level scaling, payload validation, and progress keys. `Rutina.jsx` consumes the existing auth/profile/duel hooks and stores daily completion locally. `SubirPrueba.jsx` accepts a validated React Router state payload and uses it only as the initial create-form value; Firestore and scoring remain unchanged.

**Tech Stack:** React 18, React Router, Vitest, Testing Library, Tailwind/Kinetic Glow, browser `localStorage`.

## Global Constraints

- No AI or external generation service.
- The same uid, duel-local date, and catalog version must produce the same routine.
- Exercise selection must not require undeclared equipment.
- Gender is not an exercise filter; profile capacity and preferences drive selection.
- Points remain server-authoritative through the existing workout creation flow.
- New behavior follows test-driven development: observe RED before production edits.

---

### Task 1: Pure routine generator

**Files:**
- Create: `app/src/routines/catalog.js`
- Create: `app/src/routines/generateDailyRoutine.js`
- Test: `app/src/routines/generateDailyRoutine.test.js`

**Interfaces:**
- Consumes: profile `{ experienceLevel, objective, equipment, preferredWorkoutMinutes }`, `uid`, `dayKey`.
- Produces: `generateDailyRoutine({ profile, uid, dayKey }) -> { id, dayKey, durationMinutes, isFallback, phases }` and `routineProgressKey(uid, dayKey)`.

- [ ] **Step 1: Write failing generator tests**

Cover identical inputs, user/day variation, equipment exclusion, beginner fallback, three phases, and duration bounds. A representative assertion:

```js
const first = generateDailyRoutine({ profile, uid: 'aaron', dayKey: '2026-08-01' });
const again = generateDailyRoutine({ profile, uid: 'aaron', dayKey: '2026-08-01' });
expect(again).toEqual(first);
expect(first.phases.map((phase) => phase.id)).toEqual(['warmup', 'main', 'recovery']);
expect(first.phases.flatMap((phase) => phase.exercises).every((item) => item.equipment === 'bodyweight' || profile.equipment.includes(item.equipment))).toBe(true);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --run src/routines/generateDailyRoutine.test.js`

Expected: FAIL because the routine modules do not exist.

- [ ] **Step 3: Implement the catalog and generator**

Create a small catalog containing warm-up, strength/endurance main movements, and recovery items. Implement a stable string hash plus seeded sort. Normalize Spanish/English objective and equipment labels, allow `bodyweight` universally, cap selected estimated duration near the preferred duration, and scale sets/reps by `Beginner`, `Intermediate`, or `Advanced`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- --run src/routines/generateDailyRoutine.test.js`

Expected: all generator tests PASS.

- [ ] **Step 5: Commit the domain task**

```bash
git add app/src/routines
git commit -m "Add deterministic daily routine generator"
```

### Task 2: Routine page and daily progress

**Files:**
- Create: `app/src/pages/Rutina.jsx`
- Test: `app/src/pages/Rutina.test.jsx`
- Modify: `app/src/App.jsx`
- Modify: `app/src/components/Layout.jsx`
- Modify: `app/src/components/components.test.jsx`
- Modify: `app/src/App.test.jsx`

**Interfaces:**
- Consumes: `useAuth()`, `useUserProfile()`, `useActiveDuel()`, `generateDailyRoutine(...)`.
- Produces: protected `/rutina`; navigation state `{ source: 'daily-routine', exercises: [...] }`.

- [ ] **Step 1: Write failing page and route tests**

Assert that the page renders the three phases, starts at 0%, restores a saved completion list, enables registration only after completion, sends only completed exercises, renders fallback guidance, and that `/rutina` is protected. Change the layout test expectation from `/subir-prueba` to `/rutina`.

```jsx
await user.click(screen.getByRole('checkbox', { name: /flexiones/i }));
expect(screen.getByRole('progressbar', { name: /progreso de rutina/i })).toHaveAttribute('aria-valuenow', '25');
await user.click(screen.getByRole('button', { name: /registrar como entrenamiento/i }));
expect(mockNavigate).toHaveBeenCalledWith('/subir-prueba', expect.objectContaining({ state: expect.objectContaining({ source: 'daily-routine' }) }));
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- --run src/pages/Rutina.test.jsx src/components/components.test.jsx src/App.test.jsx`

Expected: FAIL because `/rutina` and `Rutina.jsx` do not exist and Layout still targets `/subir-prueba`.

- [ ] **Step 3: Implement the routine screen**

Use `formatDayKey(new Date())`, falling back to `America/Mexico_City`. Render profile summary, fallback notice, `ProgressRing`, phase cards, accessible checkboxes, registration CTA, and manual-registration CTA. Persist an array of completed exercise IDs under `routineProgressKey(uid, dayKey)`, ignoring malformed stored JSON.

- [ ] **Step 4: Wire the protected route and navigation**

Import `Rutina` in `App.jsx`, add a `RequireAuth` route for `/rutina`, and point Layout's Rutina item to `/rutina`.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `npm test -- --run src/pages/Rutina.test.jsx src/components/components.test.jsx src/App.test.jsx`

Expected: all focused tests PASS.

- [ ] **Step 6: Commit the screen task**

```bash
git add app/src/pages/Rutina.jsx app/src/pages/Rutina.test.jsx app/src/App.jsx app/src/App.test.jsx app/src/components/Layout.jsx app/src/components/components.test.jsx
git commit -m "Add personalized daily routine screen"
```

### Task 3: Workout-form routine import

**Files:**
- Create: `app/src/routines/routinePayload.js`
- Test: `app/src/routines/routinePayload.test.js`
- Modify: `app/src/pages/SubirPrueba.jsx`
- Modify: `app/src/pages/SubirPrueba.test.jsx`

**Interfaces:**
- Consumes: React Router location state `{ source, exercises }`.
- Produces: `routineExercisesFromLocationState(state) -> ExerciseEditorExercise[] | null`.

- [ ] **Step 1: Write failing payload and page tests**

Test valid conversion, rejection of missing/unknown source, rejection of empty/invalid exercises, and initial prefill in create mode. Conversion must preserve `name`, positive integer `sets`/`reps`, and positive numeric `duration`.

```js
expect(routineExercisesFromLocationState({
  source: 'daily-routine',
  exercises: [{ name: 'Flexiones', sets: 3, reps: 10, duration: 5 }],
})).toEqual([{ id: expect.any(String), name: 'Flexiones', sets: 3, reps: 10, duration: 5 }]);
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- --run src/routines/routinePayload.test.js src/pages/SubirPrueba.test.jsx`

Expected: FAIL because the payload validator does not exist and SubirPrueba ignores location state.

- [ ] **Step 3: Implement payload validation and one-time prefill**

Use `useLocation()` in `SubirPrueba`. In create mode only, initialize `exercises` from `routineExercisesFromLocationState(location.state)` or `[createEmptyExercise()]`. Do not let later navigation-state changes overwrite edits. Edit mode continues to use the Firestore workout.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- --run src/routines/routinePayload.test.js src/pages/SubirPrueba.test.jsx`

Expected: all payload and workout-form tests PASS.

- [ ] **Step 5: Commit the integration task**

```bash
git add app/src/routines/routinePayload.js app/src/routines/routinePayload.test.js app/src/pages/SubirPrueba.jsx app/src/pages/SubirPrueba.test.jsx
git commit -m "Prefill workouts from daily routines"
```

### Task 4: Full verification and publication

**Files:**
- Modify only if verification exposes a defect in files from Tasks 1-3.

**Interfaces:**
- Consumes: completed Tasks 1-3.
- Produces: verified and published `main`.

- [ ] **Step 1: Run all available checks**

```bash
cd app
npm test -- --run
npm run build
node --test src/firebase/profilePolicy.test.mjs scripts/start-emulators.test.mjs
git diff --check
```

Expected: tests and build PASS. If the known sandbox prevents Vite/esbuild startup, run direct esbuild transforms for every changed JSX file and record the environment failure separately.

- [ ] **Step 2: Review security and data flow**

Confirm no routine code writes scores, no profile mutation occurs, navigation payload is validated, `localStorage` is uid/day scoped, and no secrets or emulator exports are tracked.

- [ ] **Step 3: Request code review and address Important/Critical findings**

Review the diff from `b965f22` through HEAD against the approved design. Add a failing regression test before every behavior correction.

- [ ] **Step 4: Push main and verify the remote commit**

```bash
git push origin main
git rev-parse HEAD
git ls-remote origin refs/heads/main
```

Expected: local and remote hashes match.
