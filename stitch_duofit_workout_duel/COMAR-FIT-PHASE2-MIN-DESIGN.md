# Comar-Fit Phase 2.Mín — Design Specification

**Date:** 2026-07-31  
**Project:** Comar-Fit Phase 2 (Minimal MVP: Core Loop)  
**Users:** Aaron & Alexandra  
**Version:** 1.0

---

## Overview

Phase 2.Mín delivers the minimal viable loop: Aaron or Alexandra can register a workout, both see the updated score and streak in real-time (<1s), and review workout history. This is the "beating heart" of the app — once this works, all other screens (Rutina, Estadísticas, Calendario, Perfil, Premios, Crear Reto) are complementary.

Three screens + Cloud Function scoring + Firestore real-time listeners.

---

## Scope (Phase 2.Mín Only)

**In Scope:**
- Dashboard (home with VS, streak, countdown, recent activity)
- Subir Prueba (register workout: exercise, sets, reps, duration)
- Revisar Prueba (workout history for current user)
- Scoring Cloud Function (auto-calculate score + streak on workout creation)
- Real-time listeners (both users see updates <1s)

**Out of Scope (Phase 2b):**
- Rutina del Día (suggested workout plan)
- Estadísticas Duelo (graphs, historical stats)
- Calendario Semanal (7-day view)
- Perfil de Usuario (edit user data)
- Premios y Reglas (rules explanation)
- Crear Reto (start new duel manually)

---

## Architecture

### Component Layer (Client)

**Reusable Components** (`src/components/`):
- `Button.jsx` — Primary (action-gradient), secondary, variants with Kinetic Glow styling
- `Card.jsx` — Glass card effect (rgba(28,28,30,0.7), blur-12px, border)
- `Input.jsx` — Text/number inputs with Kinetic Glow colors
- `Select.jsx` — Dropdown for exercise picker
- `ProgressRing.jsx` — Circular progress ring (score display)
- `StreakBadge.jsx` — 🔥 + number with styling
- `Layout.jsx` — Header (with logo), bottom nav, page container
- `VSDisplay.jsx` — Side-by-side Aaron vs Alexandra comparison

**Pages** (`src/pages/`):
- `Dashboard.jsx` — Home screen (Score VS, Streak, Countdown, Recent Activity, CTA)
- `SubirPrueba.jsx` — Workout registration form
- `RevisarPrueba.jsx` — Workout history list

### Data Layer (Hooks)

**Custom Hooks** (`src/hooks/`):
- `useWorkouts.js` — Firestore listener on `workouts/` collection, filtered by userId + current week
- `useDuelScore.js` — Firestore listener on `duelScores/{duelId}`, real-time score updates
- `useCalorieEstimate.js` — Utility to calculate calories via MET formula

### Cloud Function

**Function: `calculateScore`**
- **Trigger:** Firestore create/update/delete on `duels/{duelId}/workouts/{workoutId}`
- **Input:** Workout document (or deletion event)
- **Processing:**
  1. Determine timezone: `America/Mexico_City` (not UTC)
  2. Calculate `date` (YYYY-MM-DD) and `week` (ISO week) in that timezone
  3. Set `editableUntil = createdAt + 10 minutes`
  4. Calculate totals (server-side):
     - `totalMinutes = sum(exercise.duration)`
     - `totalReps = sum(exercise.sets × exercise.reps)`
     - `totalExercises = count(distinct exercises)`
     - `estimatedCalories = sum per exercise using MET formula`
  5. Fetch both users' workouts for the current week
  6. For each metric (minutos, ejercicios, reps, calorías):
     - Normalize to 0-100 based on gender thresholds
     - Apply weight (0.25 each)
  7. Calculate score = avg(normalized metrics)
  8. Calculate streak:
     - Fetch all previous weeks' workout dates for user
     - Count consecutive days with ≥1 workout (unique dates only)
     - If no workout today but had yesterday: streak continues
     - If no workout today and no workout yesterday: streak = 0
  9. Update `duels/{duelId}/weeks/{weekId}` with new scores + streaks
- **Output:** Updated score document (Firestore listeners pick up change)
- **Error Handling:** Log error, do not partially update

---

## Data Models

### Workout Document

Location: `duels/{duelId}/workouts/{workoutId}` (auto-generated ID)

**Client-side (input only):**
```json
{
  "exercises": [
    {
      "name": "string (Flexiones, Sentadillas, etc.)",
      "sets": "number (>0)",
      "reps": "number (>0)",
      "duration": "number (minutes, >0)"
    }
  ],
  "createdAt": "timestamp (client generates, but server overwrites)"
}
```

**Server-side (Cloud Function adds):**
```json
{
  "workoutId": "string (auto-generated)",
  "duelId": "string",
  "userId": "string (uid of creator)",
  "date": "YYYY-MM-DD (calculated server-side, timezone America/Mexico_City)",
  "week": "number (ISO week number, calculated server-side)",
  "exercises": [
    {
      "name": "string",
      "sets": "number",
      "reps": "number",
      "duration": "number"
    }
  ],
  "totalMinutes": "number (server-calculated)",
  "totalReps": "number (server-calculated)",
  "totalExercises": "number (server-calculated)",
  "estimatedCalories": "number (server-calculated via MET)",
  "createdAt": "timestamp (server-set)",
  "updatedAt": "timestamp (server-set)",
  "editableUntil": "timestamp (createdAt + 10 minutes)",
  "editHistory": [
    {
      "editedAt": "timestamp",
      "changedBy": "uid",
      "changes": "object (what changed)"
    }
  ]
}
```

**Security:** Client submits only `exercises` array. Server calculates all totals. Client cannot write `totalMinutes`, `totalReps`, `totalExercises`, `estimatedCalories`.

### Duel Score Document

Location: `duels/{duelId}/weeks/{weekId}` (where weekId = "week_{ISO_WEEK_NUMBER}")

```json
{
  "duelId": "string",
  "week": "number (ISO week)",
  "userA_uid": "string (Aaron)",
  "userB_uid": "string (Alexandra)",
  "userA": {
    "score": "number (0-100)",
    "minScore": "number (0-100, normalized minutes)",
    "exScore": "number (0-100, normalized exercises)",
    "repScore": "number (0-100, normalized reps)",
    "calScore": "number (0-100, normalized calories)",
    "streak": "number (consecutive days with ≥1 workout)",
    "lastWorkoutDate": "YYYY-MM-DD"
  },
  "userB": {
    // same as userA
  },
  "updatedAt": "timestamp",
  "weekStart": "YYYY-MM-DD (Monday)",
  "weekEnd": "YYYY-MM-DD (Sunday)"
}
```

---

## Screen Designs

### Screen 1: Dashboard

**Purpose:** Home screen. At a glance, see who's winning, your streak, time pressure.

**Layout:**
```
Header: Logo + "Comar-Fit" + notification bell
Main:
  - "Día X de 7" + "🔥 Y días" (streak)
  - VS Display: Aaron [score] vs Alexandra [score] (live updated)
  - Countdown: "7h 42m restante hoy" (animated, updates every minute)
  - CTA Button: "Comenzar entrenamiento" (action-gradient)
  - Recent Activity:
    - "Alexandra completó su entrenamiento hace 2 min"
    - "Quedan 3 horas para la misión"
Bottom Nav: Inicio (active) | Rutina | Duelo | Pruebas | Perfil
```

**Real-time Behavior:**
- Subscribes to `duelScores/{duelId}`
- When Aaron or Alexandra's score updates, both users' screens refresh instantly

**Interactions:**
- Tap "Comenzar entrenamiento" → navigate to SubirPrueba

---

### Screen 2: Subir Prueba

**Purpose:** Register a workout. User inputs exercise, sets, reps, duration → app calculates calories server-side.

**Layout:**
```
Header: Back button | "Subir Entrenamiento"
Main:
  - Exercise Dropdown: [Select Ejercicio]
    Options: Flexiones, Sentadillas, Abdominales, Burpees, Mountain Climbers, 
             Fondos, Sentadillas con Pistol, Lagartijas con Palmadas, 
             Sentadillas Búlgaras, Planchas, Planchas Laterales
  - Sets Input: "Sets" (number, >0)
  - Reps Input: "Reps" (number, >0)
  - Duration Input: "Duración (minutos)" (number, >0)
  - [+ Add Another Exercise] (optional, to stack multiple exercises in one session)
  - Estimated Calories Display: "~240 cal" (updated as user types)
  - Submit Button: "Guardar Entrenamiento" (action-gradient)
  - Toast on success: "Guardado. +60 puntos esta sesión. Alexandra verá en vivo."
Bottom Nav: Same as Dashboard
```

**Validation:**
- All fields required, >0
- On error: Show inline error message + disable submit

**Interactions:**
- User types duration → automatically recalculate estimated calories (client-side preview only)
- Tap "Guardar Entrenamiento" → write to Firestore → wait for server confirmation → success toast → navigate back to Dashboard
- Toast message: "Guardado. +{points} puntos esta sesión."

---

### Screen 3: Revisar Prueba

**Purpose:** View all workouts (current week + older). Edit/delete if needed (for testing; long-term, deletions might need permission).

**Layout:**
```
Header: Back button | "Historial de Entrenamientos"
Main:
  - Tab/Filter: "Esta semana" (default) | "Todas"
  - List of workouts (reverse chronological):
    Per item:
      - Date (ej: "Jueves, 31 Jul")
      - Exercises summary: "Flexiones 3×15 + Sentadillas 3×20"
      - Stats: "180 reps, 30 min, ~300 cal"
      - Actions: [Edit] [Delete]
  - If no workouts: "No hay entrenamientos. ¡Comenzar uno!"
Bottom Nav: Same as Dashboard
```

**Interactions:**
- Tap [Edit] or [Delete] → Only available if workout was created < 10 minutes ago
- If > 10 min old: buttons disabled, show "Edición expirada"
- [Delete] → confirmation dialog → delete from Firestore → Cloud Function recalculates score
- [Edit] → Navigate to edit screen → modify exercise details → submit → Cloud Function recalculates

---

## Scoring Algorithm (Cloud Function)

### Normalization Thresholds (by Gender)

**Minutes Entrenados (per day):**
- Aaron (M): 60 min = 100 pts
- Alexandra (F): 50 min = 100 pts

**Ejercicios Completados:**
- Both: 8+ distinct exercises = 100 pts

**Reps Totales (sets × reps):**
- Aaron (M): 200+ reps = 100 pts
- Alexandra (F): 150+ reps = 100 pts

**Calorías Quemadas (estimated):**
- Aaron (M): 400+ cal = 100 pts
- Alexandra (F): 300+ cal = 100 pts

### Calculation Flow

When a workout is created:

```
1. Fetch all workouts for this week for both users
2. For Aaron & Alexandra separately:
   a. Sum totalMinutes, totalExercises, totalReps, estimatedCalories
   b. Normalize each to 0-100:
      minScore = min(totalMinutes / 60 * 100, 100)
      exScore = min(totalExercises / 8 * 100, 100)
      repScore = min(totalReps / 200 * 100, 100)  [if M]
      calScore = min(totalCalories / 400 * 100, 100)  [if M]
   c. Calculate weighted score:
      score = (minScore × 0.25) + (exScore × 0.25) + (repScore × 0.25) + (calScore × 0.25)
   d. Check streak:
      if workout created today AND yesterday had ≥1 workout:
         streak += 1
      else if no workout yesterday:
         streak = 1  (restart)
3. Update duelScores/{duelId}/week_{weekNumber} with new scores + streaks
4. Both users' Firestore listeners fire → UI updates
```

### Example (Corrected)

**Aaron's workout:**
- 3×15 Flexiones (30 min, ~240 cal)
- Total: 30 min, 1 exercise, 45 reps, ~240 cal

**Calculation (Aaron is M):**
- minScore = min(30 / 60 * 100, 100) = 50
- exScore = min(1 / 8 * 100, 100) = 12.5
- repScore = min(45 / 200 * 100, 100) = 22.5
- calScore = min(240 / 400 * 100, 100) = 60
- **score = (50 + 12.5 + 22.5 + 60) / 4 = 36.25 pts (rounded to 36)**

(Original example was incorrect: showed 135 reps instead of 45, producing wrong score.)

---

## Calorie Estimation (MET Formula)

**Formula:**
```
Calories = MET × weight_kg × duration_hours
```

**MET Values (Metabolic Equivalent) by Exercise:**

| Exercise | MET |
|----------|-----|
| Flexiones | 6.0 |
| Sentadillas | 5.5 |
| Abdominales | 3.8 |
| Burpees | 8.0 |
| Mountain Climbers | 7.5 |
| Fondos (Dips) | 6.5 |
| Sentadillas con Pistol | 7.0 |
| Lagartijas con Palmadas | 7.0 |
| Sentadillas Búlgaras | 6.0 |
| Planchas | 3.8 |
| Planchas Laterales | 4.5 |

**Example:**
- Aaron: 80 kg, 30 min of Flexiones (MET 6.0)
- Calories = 6.0 × 80 × 0.5 = **240 cal**

---

## Real-time Data Flow

**Scenario: Aaron registers a workout, both see update with server confirmation**

1. Aaron on SubirPrueba:
   - Fills form: 3×15 Flexiones, 30 min
   - Taps "Guardar"
   - UI shows loading spinner

2. React submits to Firestore (client-side data only):
   ```
   duels/duel-123/workouts/{newId} = {
     exercises: [{name: "Flexiones", sets: 3, reps: 15, duration: 30}],
     createdAt: <client-timestamp>
   }
   ```

3. Firestore triggers Cloud Function `calculateScore` (server-side)
   - Calculates totals: 30 min, 1 exercise, 45 reps, ~240 cal
   - Sets server timestamp & date (America/Mexico_City timezone)
   - Calculates Aaron's score (36 pts)
   - Updates `duels/duel-123/weeks/week_31`:
     ```json
     {
       "userA": { "score": 36, "minScore": 50, "exScore": 12.5, "repScore": 22.5, "calScore": 60, "streak": 7 }
     }
     ```

4. Firestore listener confirms write to client
   - Toast appears: "Guardado. +36 puntos esta sesión."
   - Aaron's UI updates locally

5. Both Aaron & Alexandra have listeners on `duels/duel-123/weeks/week_31`:
   - Listener fires (both subscribed)
   - React state updates
   - Both dashboards re-render Aaron's new score

6. **Result:** Both see "Aaron: 36 pts" within <1s (measured target, not contractual guarantee)

---

## Component Composition

```
<Layout>
  <Header logo="logofit.png" />
  
  <Dashboard>
    <VSDipslay aaron={score} alexandra={score} />
    <StreakBadge days={7} />
    <CountdownTimer endOfDay={...} />
    <Button>Comenzar Entrenamiento</Button>
    <RecentActivityList />
  </Dashboard>

  OR

  <SubirPrueba>
    <Select label="Ejercicio" options={EXERCISES} />
    <Input type="number" label="Sets" />
    <Input type="number" label="Reps" />
    <Input type="number" label="Duración (min)" />
    <CalorieDisplay estimate={240} />
    <Button>Guardar Entrenamiento</Button>
  </SubirPrueba>

  OR

  <RevisarPrueba>
    <Tabs>
      <Tab label="Esta semana">
        <WorkoutList workouts={...} onDelete={...} onEdit={...} />
      </Tab>
      <Tab label="Todas">
        <WorkoutList workouts={...} />
      </Tab>
    </Tabs>
  </RevisarPrueba>

  <BottomNav />
</Layout>
```

---

## Security Rules (Hardened)

**Profiles (`users/{uid}`):**
- User can only read own profile + partner's profile (if in active duel)
- User can only write to own fields: name, avatarUrl
- **Fields locked:** gender, age, weight, height, experienceLevel (immutable after creation)

**Duels (`duels/{duelId}/...`):**
- Only users in the duel can read it
- Only system/Cloud Function can write (users cannot create duels directly; only ConnectPartner can)
- Duel rules (scoring weights, thresholds) are immutable

**Workouts (`duels/{duelId}/workouts/{workoutId}`):**
- User can only write their own workouts
- User can only read workouts from their own duel
- User can only delete/edit within 10 minutes (enforced via `editableUntil` timestamp)
- Fields sent by client: exercises array only
- All totals/calorías calculated server-side (client cannot write)

**Weeks (`duels/{duelId}/weeks/{weekId}`):**
- Users can read only
- Only Cloud Function can write

**Audit Logging:**
- Each edit tracked in `editHistory` array (optional, for future analytics)

---

## Testing Strategy

### Unit Tests
- `ProgressRing.test.jsx` — Render with score 0-100
- `StreakBadge.test.jsx` — Format streak display
- `useCalorieEstimate.test.js` — MET calculation (client-side preview)
- `calculateScore.test.js` — Score normalization formula (36 pts for example)
- `calculateStreak.test.js` — Consecutive day calculation, handling skipped days
- `calculateStreak.test.js` — Timezone handling (America/Mexico_City, not UTC)

### Integration Tests
- `calculateScore.test.js` — Cloud Function: Workout create/edit/delete → Score recalculation
- `Firestore rules` — Security: Users can only write own workouts, cannot write totals/calorías
- `editWindow.test.js` — Edit/delete allowed < 10 min, blocked after
- `Firestore rules` — Gender/weight/duel rules are immutable

### E2E Tests (Emulator)
1. Aaron registers workout (3×15 Flexiones, 30 min) → Firestore writes
2. Cloud Function triggers → Calculates 36 pts, streak +1
3. Alexandra's Dashboard listener fires → Both see new score within target <1s
4. Aaron edits workout (5 min after creation) → allowed, score recalculated
5. Aaron tries edit again (12 min after creation) → blocked, "Edición expirada"
6. Alexandra registers at same time as Aaron → No race conditions, each gets own score
7. Timezone boundary: Register at 11:59pm Mexico City → Date correctly calculated as next day
8. Retry logic: If Cloud Function fails, client shows error; allows retry

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Workout form invalid | Show inline error, disable submit |
| Firestore write fails | Toast: "Error al guardar. Intenta de nuevo." |
| Cloud Function fails | Retry logic; if still fails, log to console |
| Listener disconnects | Attempt reconnect; show "Conectando..." |
| User logged out mid-session | Redirect to Login |

---

## Performance & Accessibility

- **Bundle size:** All 3 screens + hooks + components <50KB (gzipped)
- **Lighthouse:** Aiming for >90 Performance, >95 Accessibility
- **Mobile-first:** Responsive on 320px+
- **Contrast:** WCAG AA compliant (Kinetic Glow ensures this)
- **Real-time:** Firestore listeners keep latency <1s

---

## Deployment Notes

- Frontend: Deploy to Vercel on git push
- Cloud Function: Deploy via `firebase deploy --only functions:calculateScore`
- Firestore Emulator (dev): Running locally (for Phase 2.Mín development)
- Real Firebase (production): Set up after Phase 2 testing complete
- Service Worker / Offline: Out of scope for Phase 2.Mín (Phase 3)
- Push Notifications: Out of scope for Phase 2.Mín (Phase 3)

---

## Success Criteria

- ✅ Aaron can register a workout (Dashboard → SubirPrueba → form → save)
- ✅ Alexandra instantly sees Aaron's updated score on her Dashboard (<1s)
- ✅ Aaron can view his workout history (RevisarPrueba)
- ✅ Score calculation matches formula (69 pts for example workout)
- ✅ Streak increments/resets correctly
- ✅ Calorías estimated correctly (240 cal for example)
- ✅ All components use Kinetic Glow styling (colors, fonts, spacing)
- ✅ E2E flow works with both users simultaneously (Emulator)

---

## Timeline (Estimate)

- **Phase 2.Mín:** 1-2 weeks (3 screens + scoring + listeners)
- **Phase 2b:** 2-3 weeks (6 additional screens + graphs)
- **Phase 3:** 1 week (testing, PWA, real Firebase setup, deploy)

---

## Notes for Implementation

1. **Logo:** Use `logofit.png` in Header
2. **Real user data:** Aaron (M), Alexandra (F, 1.58m, 57-58kg) — use for threshold testing
3. **Timezone:** Use `America/Mexico_City` for all date/week calculations (not UTC)
4. **Streak calculation:** Unique dates only (prevent duplicate increments)
5. **Edit window:** `editableUntil = createdAt + 10 minutes` (enforced in Cloud Function + UI)
6. **Toast behavior:** Wait for server confirmation before showing success message
7. **Real-time latency:** Aim for <1s, measure in production, but don't promise as SLA
8. **Security:** Firestore rules enforce immutability on gender/weight/duel rules
9. **Offline:** Phase 3; not in Phase 2.Mín
10. **Notifications:** Phase 3; not in Phase 2.Mín
11. **Kinetic Glow:** Use exact colors/fonts/spacing from existing references (preserve Phase 1 identity)
