# Comar-Fit Phase 3 — Design Specification

**Date:** 2026-08-01  
**Project:** Comar-Fit Phase 3 (Adaptive Workout Experience)  
**Users:** Aaron & Alexandra  
**Version:** 1.0

---

## Overview

Phase 3 enhances Phase 2.Mín with **adaptive workout guidance, real-time feedback, and automatic progression**. Users get visual form cues, rate exercise difficulty post-set, and the app adjusts future workouts based on performance.

---

## Features

### 1. Exercise Form References (Visual Guides)

**Purpose:** Show users correct technique for each exercise to avoid injury and maximize effectiveness.

**Implementation:**
- Video/GIF library for each exercise (11 exercises)
- "Ver cómo hacerlo" button in SubirPrueba form
- Modal overlay with 15-30 second demo
- Options:
  - A) Embed YouTube shorts/videos
  - B) Host custom GIFs (file size constrained)
  - C) Link to external fitness site (Fitbod, ExRx, etc.)

**Data Model:**
```json
{
  "exerciseId": "flexiones",
  "name": "Flexiones",
  "formReferenceUrl": "https://youtube.com/...",
  "formReferenceType": "youtube | gif | external_link",
  "tips": ["Elbows at 45 degrees", "Keep core tight", "Full range of motion"]
}
```

**UI Flow:**
1. SubirPrueba: Exercise dropdown
2. User taps "Ver técnica" → Modal opens
3. 30-second video plays
4. Close modal, continue with sets/reps

**Effort:** 1-2 weeks (sourcing videos, hosting, player integration)

---

### 2. Post-Exercise Difficulty Feedback

**Purpose:** Capture user perception after each exercise to enable adaptive difficulty adjustment.

**Implementation:**
- After completing all sets of an exercise, ask:
  ```
  ¿Cómo te sentiste en las Flexiones?
  [ 😰 Difícil ] [ 😐 Regular ] [ 💪 Fácil ]
  ```
- Store feedback in Firestore workout document

**Data Model:**
```json
{
  "workoutId": "w123",
  "exercises": [
    {
      "name": "Flexiones",
      "sets": 3,
      "reps": 15,
      "difficulty_feedback": "easy",  // easy | moderate | hard
      "feedback_timestamp": "2026-08-01T14:32:00Z"
    }
  ]
}
```

**UI Flow:**
1. Complete last rep of exercise
2. "Guardar y evaluar" button
3. Rating modal appears (3 options with emojis)
4. Selection stored, move to next exercise

**Scoring:**
- easy → +1 to progression score
- moderate → 0 (maintain)
- hard → -1 (reduce or hold)

**Effort:** 2-3 days (form, validation, storage)

---

### 3. Adaptive Progression (Auto-Adjust Reps/Exercises)

**Purpose:** Automatically suggest increased difficulty if user finds workouts too easy; reduce if too hard.

**Implementation:**
- Post-duel analysis (weekly): aggregate difficulty feedback
- Algorithm:
  - If 70%+ exercises rated "easy" → increase reps by +2-5 or add exercise
  - If 50%+ exercises rated "hard" → hold or reduce reps
  - Otherwise → maintain
- Suggest changes at start of next duel week

**Data Model:**
```json
{
  "duelId": "duel-123",
  "weekNumber": 32,
  "progression": {
    "previousWeekStats": {
      "easyCount": 7,
      "moderateCount": 2,
      "hardCount": 1,
      "easyPercentage": 0.7
    },
    "suggestedAdjustments": [
      { "exercise": "Flexiones", "oldReps": 15, "newReps": 18, "reason": "easy" },
      { "exercise": "Sentadillas", "oldReps": 20, "newReps": 25, "reason": "easy" },
      { "exercise": "Abdominales", "oldReps": 25, "action": "add_exercise", "suggested": "Mountain Climbers 3x10" }
    ],
    "adjustmentAccepted": false,
    "acceptedAt": null
  }
}
```

**UI Flow:**
1. Start new duel week
2. Dashboard shows: "¡Tu progreso está mejorando! Aquí hay sugerencias:"
3. Display suggested changes with "Aceptar" / "Mantener igual"
4. If accepted, update duel routine

**Effort:** 1 week (analytics, algorithm, UI)

---

### 4. Automatic Rest Timer (Post-Exercise Countdown)

**Purpose:** Remove manual time-tracking between sets. When user completes exercise, timer starts automatically.

**Implementation:**
- Rest timers vary by exercise:
  - Strength (Flexiones, Sentadillas): 60-90 seconds
  - Cardio (Burpees, Mountain Climbers): 45-60 seconds
  - Core (Abdominales, Planchas): 30-45 seconds
- Timer starts immediately after "Completado" button
- Large countdown display, sound notification when done

**Data Model:**
```json
{
  "exerciseId": "flexiones",
  "name": "Flexiones",
  "category": "strength",
  "restSeconds": 75,  // Default rest time
  "allowCustomRest": true  // User can adjust
}
```

**UI Flow:**
1. User taps "Completado" for exercise set
2. Fullscreen timer appears: countdown from 75s
3. User can tap "Descansar menos" (-15s) or "Más tiempo" (+15s)
4. Sound + vibration when timer hits 0
5. "Siguiente set" button appears, or move to next exercise

**Optional Features:**
- Audio cue: "Descanso completado, ¡preparate!"
- Estimated total workout time at top
- Show upcoming exercises while resting

**Effort:** 3-4 days (timer component, audio, customization)

---

## Implementation Priority

**Phase 3.1 (Weeks 1-2):** Exercise Form References + Post-Exercise Feedback
- Lower dependencies
- Quick wins on UX
- Data collection for progression

**Phase 3.2 (Weeks 3-4):** Automatic Rest Timer
- Improves session flow
- High user satisfaction
- No external dependencies

**Phase 3.3 (Weeks 5-6):** Adaptive Progression
- Depends on 2 weeks of feedback data
- Complex algorithm, testing required

---

## Testing Strategy

**Unit Tests:**
- Difficulty feedback scoring logic
- Progression algorithm (70% threshold, adjustment calculations)
- Rest timer countdown logic

**Integration Tests:**
- Feedback saved to Firestore correctly
- Progression suggestions generated weekly
- Timer interrupts/resumes correctly

**E2E Tests (Emulator):**
- Full session: exercise selection → completion → feedback → timer → next exercise
- Progression suggestions appear at week start
- Form reference videos load and play

---

## Success Criteria

- ✅ Users can access form references for all 11 exercises
- ✅ Difficulty feedback captured for 90%+ of exercises
- ✅ Progression algorithm adjusts ~20% of workouts per week (based on feedback)
- ✅ Rest timer reduces manual timing overhead (user satisfaction survey)
- ✅ No negative impact on Phase 2 features (backward compatible)

---

## Notes

- Form reference sourcing (videos) may require licensing or partnerships
- Rest timers customizable per user preference (learning curve)
- Progression algorithm threshold (70%) should be validated with real user data
- Consider adding "skip timer" option for advanced users

---

**Status: READY FOR BRAINSTORMING → PLANNING → IMPLEMENTATION (Post-Phase 2)**
