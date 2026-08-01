# COMAR-FIT Active-Days Duel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace server-scored duels with a weekly `active days / 7` comparison that works on Firebase Spark without Cloud Functions.

**Architecture:** Firestore remains the source of workout documents and React listeners derive active days, streaks, percentages, and comparison status through pure date utilities. Owner history keeps its filtered listener; Dashboard adds a participant-authorized listener for all duel workouts. Saves confirm when Firestore resolves, and production rules calculate the ten-minute edit window from `createdAt`.

**Tech Stack:** React 18, React Router, Firebase Authentication, Cloud Firestore, Vitest, Testing Library, Firebase Emulator Suite, Vite, Vercel.

## Global Constraints

- A calendar date counts at most once per participant.
- Weekly progress is always `unique active days / 7` in `America/Mexico_City`.
- Racha ends today or yesterday and ignores duplicate workouts on a date.
- No screen may depend on `status`, `sessionScore`, `scoredAt`, weekly aggregates, or Cloud Functions.
- Existing scoring fields on old documents are ignored but do not prevent reads.
- Keep Firebase on Spark; do not deploy Functions or enable billing.
- Preserve participant isolation and the ten-minute owner edit/delete window.

---

## File Structure

- Create `app/src/duel/activeDays.js`: pure weekly activity, streak, progress, and comparison derivation.
- Create `app/src/duel/activeDays.test.js`: timezone, deduplication, week boundaries, streak, and comparison tests.
- Modify `app/src/firebase/workouts.js`: add an all-participant duel listener while keeping owner history listener.
- Create `app/src/hooks/useDuelWorkouts.js`: lifecycle wrapper for the new listener.
- Create `app/src/hooks/useDuelWorkouts.test.jsx`: listener wiring and cleanup tests.
- Modify `app/firestore.rules` and `app/test/firestore.rules.test.js`: participant reads and server-timestamp-based edit policy.
- Modify `app/src/pages/SubirPrueba.jsx` and its tests: immediate saved/updated confirmation.
- Modify `app/src/components/WorkoutCard.jsx` and its tests: permanent completed state without scoring.
- Modify `app/src/pages/Dashboard.jsx` and its tests: derive both participants' days and rachas from workouts.
- Modify `app/src/components/VSDisplay.jsx`, `app/src/components/ProgressRing.jsx`, and component tests only as needed for day labels.
- Modify `app/src/pages/Perfil.jsx` and its tests: derive current user's activity and remove weekly score hook.

---

### Task 1: Pure active-day domain

**Files:**
- Create: `app/src/duel/activeDays.js`
- Create: `app/src/duel/activeDays.test.js`

**Interfaces:**
- Consumes: workout objects with `userId` and `performedAt`; duel with `weekStartDate` and `weekEndDate`.
- Produces: `deriveParticipantActivity(workouts, userId, duel, now?) -> { activeDays, percentage, streak, dayKeys }` and `compareActiveDays(currentDays, rivalDays) -> 'ahead' | 'behind' | 'tied'`.

- [ ] **Step 1: Write failing domain tests**

```js
import { describe, expect, it } from 'vitest';
import { compareActiveDays, deriveParticipantActivity } from './activeDays';

const duel = {
  weekStartDate: new Date('2026-07-27T06:00:00.000Z'),
  weekEndDate: new Date('2026-08-03T05:59:59.999Z'),
};

it('counts one active day for duplicate workouts on the same Mexico City date', () => {
  const workouts = [
    { userId: 'a', performedAt: new Date('2026-07-28T03:30:00Z') },
    { userId: 'a', performedAt: new Date('2026-07-28T04:30:00Z') },
  ];
  expect(deriveParticipantActivity(workouts, 'a', duel, new Date('2026-07-29T12:00:00Z')))
    .toMatchObject({ activeDays: 1, percentage: 14 });
});

it('excludes workouts outside the duel week and calculates consecutive streaks', () => {
  const workouts = [
    { userId: 'a', performedAt: new Date('2026-07-27T15:00:00Z') },
    { userId: 'a', performedAt: new Date('2026-07-28T15:00:00Z') },
    { userId: 'a', performedAt: new Date('2026-07-20T15:00:00Z') },
  ];
  expect(deriveParticipantActivity(workouts, 'a', duel, new Date('2026-07-28T18:00:00Z')))
    .toMatchObject({ activeDays: 2, streak: 2 });
});

it.each([[3, 2, 'ahead'], [2, 3, 'behind'], [2, 2, 'tied']])(
  'compares %s and %s as %s',
  (mine, rival, expected) => expect(compareActiveDays(mine, rival)).toBe(expected),
);
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run src/duel/activeDays.test.js`
Expected: FAIL because `./activeDays` does not exist.

- [ ] **Step 3: Implement the pure domain**

Use `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' })` to derive sortable `YYYY-MM-DD` keys. Filter by participant and the duel's exact start/end instants, deduplicate keys with `Set`, round percentage with `Math.round(activeDays / 7 * 100)`, and count backwards from today's key then yesterday's key for streak.

```js
export function compareActiveDays(mine, rival) {
  if (mine === rival) return 'tied';
  return mine > rival ? 'ahead' : 'behind';
}
```

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- --run src/duel/activeDays.test.js`
Expected: all domain tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/duel/activeDays.js app/src/duel/activeDays.test.js
git commit -m "feat: derive weekly active days"
```

---

### Task 2: Listen to all participant workouts

**Files:**
- Modify: `app/src/firebase/workouts.js`
- Create: `app/src/hooks/useDuelWorkouts.js`
- Create: `app/src/hooks/useDuelWorkouts.test.jsx`

**Interfaces:**
- Consumes: `duelId`, Firebase `onSnapshot`.
- Produces: `subscribeToDuelWorkouts(duelId, onData, onError)` and `useDuelWorkouts(duelId) -> { workouts, loading, error }`.

- [ ] **Step 1: Write failing hook and adapter tests**

```jsx
it('subscribes once and exposes both participants workouts', () => {
  subscribeToDuelWorkouts.mockImplementation((_id, onData) => {
    onData([{ workoutId: 'a1', userId: 'a' }, { workoutId: 'b1', userId: 'b' }]);
    return unsubscribe;
  });
  const { result, unmount } = renderHook(() => useDuelWorkouts('duel-1'));
  expect(result.current.workouts).toHaveLength(2);
  unmount();
  expect(unsubscribe).toHaveBeenCalledOnce();
});
```

Add an adapter assertion that the Firestore query orders by `performedAt desc` and does not include a `where('userId', ...)` filter.

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run src/hooks/useDuelWorkouts.test.jsx src/firebase/workouts.test.js`
Expected: FAIL because the listener and hook do not exist.

- [ ] **Step 3: Implement listener and hook**

```js
export function subscribeToDuelWorkouts(duelId, onData, onError) {
  const duelQuery = query(workoutsCollection(duelId), orderBy('performedAt', 'desc'));
  return onSnapshot(duelQuery, snapshot => {
    onData(snapshot.docs.map(item => ({ workoutId: item.id, ...item.data() })));
  }, onError);
}
```

The hook must avoid subscribing when `duelId` is absent, reset errors before a new subscription, and invoke the returned cleanup function.

- [ ] **Step 4: Verify GREEN**

Run the same focused command and expect PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/firebase/workouts.js app/src/firebase/workouts.test.js app/src/hooks/useDuelWorkouts.js app/src/hooks/useDuelWorkouts.test.jsx
git commit -m "feat: listen to duel activity"
```

---

### Task 3: Spark-compatible Firestore security

**Files:**
- Modify: `app/firestore.rules`
- Modify: `app/test/firestore.rules.test.js`

**Interfaces:**
- Consumes: authenticated participant identity and workout timestamps.
- Produces: participant read access; owner-only create/update/delete; `createdAt + 10m` edit policy.

- [ ] **Step 1: Add failing rules tests**

```js
it('lets either duel participant read both participants workouts', async () => {
  await assertSucceeds(getDocs(collection(alexDb, 'duels', duelId, 'workouts')));
});

it('prevents a participant from editing the rival workout', async () => {
  await assertFails(updateDoc(doc(alexDb, 'duels', duelId, 'workouts', aaronWorkout), {
    exercises: validExercises,
    updatedAt: serverTimestamp(),
    revision: 2,
  }));
});

it('allows owner editing before createdAt plus ten minutes and rejects it afterwards', async () => {
  await assertSucceeds(updateDoc(ownerDb, recentOwnerPatch));
  await assertFails(updateDoc(ownerDb, expiredOwnerPatch));
});
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run test/firestore.rules.test.js`
Expected: participant query and owner edit cases FAIL under existing rules.

- [ ] **Step 3: Implement minimal rule changes**

```rules
allow read: if isDuelParticipant(
  get(/databases/$(database)/documents/duels/$(duelId)).data
);

allow update: if isOwner(resource.data.userId) &&
  request.resource.data.userId == resource.data.userId &&
  request.resource.data.duelId == resource.data.duelId &&
  request.resource.data.performedAt == resource.data.performedAt &&
  request.resource.data.createdAt == resource.data.createdAt &&
  request.resource.data.updatedAt == request.time &&
  request.time < resource.data.createdAt + duration.value(10, 'm') &&
  request.resource.data.diff(resource.data).affectedKeys().hasOnly([
    'exercises', 'updatedAt', 'revision'
  ]);

allow delete: if isOwner(resource.data.userId) &&
  request.time < resource.data.createdAt + duration.value(10, 'm');
```

- [ ] **Step 4: Verify GREEN**

Run the focused rules test and expect all cases PASS.

- [ ] **Step 5: Commit**

```bash
git add app/firestore.rules app/test/firestore.rules.test.js
git commit -m "fix: secure client-only workout activity"
```

---

### Task 4: Immediate workout completion UX

**Files:**
- Modify: `app/src/pages/SubirPrueba.jsx`
- Modify: `app/src/pages/SubirPrueba.test.jsx`
- Modify: `app/src/components/WorkoutCard.jsx`
- Modify: `app/src/components/WorkoutCard.test.jsx`

**Interfaces:**
- Consumes: resolved or rejected `createWorkout` / `updateWorkout` promises.
- Produces: immediate “Entrenamiento guardado ✓” or “Entrenamiento actualizado ✓”; completed history cards.

- [ ] **Step 1: Replace scoring expectations with failing completion tests**

```jsx
it('confirms a create as soon as Firestore resolves without waiting for scoring', async () => {
  createWorkout.mockResolvedValue('w-new');
  await submitValidWorkout();
  expect(await screen.findByText('Entrenamiento guardado ✓')).toBeInTheDocument();
  expect(screen.queryByText(/calculando puntos/i)).not.toBeInTheDocument();
});

it('renders every stored workout as completed without score fields', () => {
  render(<WorkoutCard workout={baseWorkout} />);
  expect(screen.getByText('Entrenamiento completado')).toBeInTheDocument();
  expect(screen.queryByText(/puntos|calculando/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run src/pages/SubirPrueba.test.jsx src/components/WorkoutCard.test.jsx`
Expected: FAIL on old scoring copy and waiting state.

- [ ] **Step 3: Remove scoring state machine and render completion**

Delete `SCORE_WAIT_TIMEOUT_MS`, `resultToken`, baseline refs, score listener effects, `pendingWorkoutId`, `timedOut`, and `scoreToast`. After a successful write set a success toast, then navigate to `/revisar-prueba` after `POST_RESULT_DISPLAY_MS`. Keep submission lock and error recovery.

Replace `StatusIndicator` with a fixed accessible status:

```jsx
<span role="status" className="flex items-center gap-1 text-xs text-primary-fixed-dim">
  <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
  Entrenamiento completado
</span>
```

Compute editability from `editableUntil` when present, otherwise `createdAt + 10 minutes`, so new client-only documents stay editable.

- [ ] **Step 4: Verify GREEN**

Run the same focused tests and expect PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/SubirPrueba.jsx app/src/pages/SubirPrueba.test.jsx app/src/components/WorkoutCard.jsx app/src/components/WorkoutCard.test.jsx
git commit -m "feat: confirm completed workouts immediately"
```

---

### Task 5: Active-days Dashboard

**Files:**
- Modify: `app/src/pages/Dashboard.jsx`
- Modify: `app/src/pages/Dashboard.test.jsx`
- Modify: `app/src/components/VSDisplay.jsx`
- Modify: `app/src/components/ProgressRing.jsx`
- Modify: `app/src/components/components.test.jsx`

**Interfaces:**
- Consumes: `useDuelWorkouts(duelId)` and Task 1 domain functions.
- Produces: both participants' `N/7 días`, progress, rachas, comparison copy, and recent duel activity.

- [ ] **Step 1: Write failing Dashboard tests**

```jsx
it('shows weekly active days for both participants and no points', () => {
  useDuelWorkouts.mockReturnValue({ workouts: duelWorkouts, loading: false, error: null });
  renderDashboard();
  expect(screen.getByText('2/7 días')).toBeInTheDocument();
  expect(screen.getByText('1/7 días')).toBeInTheDocument();
  expect(screen.queryByText(/score|pts|puntos/i)).not.toBeInTheDocument();
});

it('announces a tie from the current users perspective', () => {
  useDuelWorkouts.mockReturnValue({ workouts: tiedWorkouts, loading: false, error: null });
  renderDashboard();
  expect(screen.getByText('Van iguales')).toBeInTheDocument();
});
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run src/pages/Dashboard.test.jsx src/components/components.test.jsx`
Expected: FAIL because Dashboard still reads weekly scores and rings label scores.

- [ ] **Step 3: Implement derived Dashboard**

Remove `useDuelScore`; call `useDuelWorkouts`. Derive activities for `userA_uid` and `userB_uid`. Pass `status: '${activeDays}/7 días'` to `VSDisplay`, percentages to `ProgressRing`, and `label: '${name}: ${activeDays} de 7 días activos'`. Render comparison text using the current user's participant side. Activity recent uses the all-duel list.

- [ ] **Step 4: Verify GREEN**

Run the focused Dashboard and component tests and expect PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/Dashboard.jsx app/src/pages/Dashboard.test.jsx app/src/components/VSDisplay.jsx app/src/components/ProgressRing.jsx app/src/components/components.test.jsx
git commit -m "feat: show duel progress by active days"
```

---

### Task 6: Active-days Profile and dead scoring dependency removal

**Files:**
- Modify: `app/src/pages/Perfil.jsx`
- Modify: `app/src/pages/Perfil.test.jsx`
- Modify: `app/src/App.test.jsx` when shared mocks require it.

**Interfaces:**
- Consumes: `deriveParticipantActivity(workouts, currentUser.uid, duel)`.
- Produces: profile stats `{ workouts, minutes, streak, activeDays }` with “N de 7” display.

- [ ] **Step 1: Write failing profile tests**

```jsx
it('shows weekly active days instead of weekly points', () => {
  render(<Perfil />);
  expect(screen.getByText('2 de 7')).toBeInTheDocument();
  expect(screen.getByText('Días activos')).toBeInTheDocument();
  expect(screen.queryByText(/puntuación|pts/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run src/pages/Perfil.test.jsx`
Expected: FAIL because the profile still renders weekly points.

- [ ] **Step 3: Implement profile derivation**

Remove `useDuelScore` and its loading/error dependencies. Memoize Task 1's activity result and render:

```jsx
<Stat icon="calendar_month" value={`${stats.activeDays} de 7`} label="Días activos" />
```

Keep total workout count and minutes derived from owner workouts.

- [ ] **Step 4: Verify GREEN**

Run the focused profile test and expect PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/Perfil.jsx app/src/pages/Perfil.test.jsx app/src/App.test.jsx
git commit -m "feat: report active days in profile"
```

---

### Task 7: Full verification and production deployment

**Files:**
- Modify only files required by failures uncovered in this task, with a regression test first for every production-code correction.

**Interfaces:**
- Consumes: Tasks 1–6.
- Produces: verified Spark-compatible frontend and Firestore rules deployed to production; Vercel production deployment.

- [ ] **Step 1: Prove no runtime scoring dependency remains**

Run:

```bash
rg -n "useDuelScore|Calculando puntos|sessionScore|scoredAt|Puntuación semanal" app/src --glob '!**/*.test.*'
```

Expected: no matches in runtime UI. Historical Cloud Function/domain files may remain unused outside `app/src`.

- [ ] **Step 2: Run complete tests**

Run: `npm test -- --run`
Expected: all test files PASS with zero failed tests.

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: Vite exits 0 and writes `app/dist`.

- [ ] **Step 4: Deploy only Firestore rules and indexes**

Authenticate the Firebase CLI for project `comar-fit`, then run from `app`:

```bash
firebase use comar-fit
firebase deploy --only firestore:rules,firestore:indexes
```

Expected: successful rules/index deployment. Do not include `functions` or `hosting`.

- [ ] **Step 5: Deploy Vercel production**

Use the existing Vercel import configured with root `app`, Vite preset, and the five `VITE_FIREBASE_*` variables. Click Deploy and wait for a Ready production deployment.

- [ ] **Step 6: Production smoke test**

Register two disposable users, connect them, save one workout, and verify both sessions show `1/7 días` without “Calculando puntos”. Verify the owner can edit during the window and the rival cannot.

- [ ] **Step 7: Close verification cleanly**

Run `git status --short` and `git diff --check`. If verification uncovered a production defect, return to the task that owns that file, add a failing regression test, repeat its RED–GREEN steps, and use that task's explicit commit command. If no defect was uncovered, create no extra commit.
