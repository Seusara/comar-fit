# Comar-Fit Phase 3 — Implementation Plan

**Date:** 2026-08-01  
**Project:** Comar-Fit Phase 3 (Adaptive Workout Experience)  
**Baseline:** Phase 2.Mín complete, 204/206 tests pass, live on Vercel  
**Target:** Adaptive difficulty, form guidance, auto-rest timers

---

## Phase Breakdown

### Phase 3.1: Form References + Feedback (Weeks 1-2)

**Objective:** Users can see exercise technique; provide difficulty feedback post-set.

#### Task 1: Exercise Form Reference Data Structure
- **Description:** Design + populate exercise metadata with video URLs
- **Files:**
  - `app/src/domain/exercises.js` — extend EXERCISES catalog
  - Add fields: `formReferenceUrl`, `formReferenceType`, `tips[]`
- **Work:**
  - Research/source 11 form reference videos (YouTube or GIF)
  - Update exercises catalog with URLs
  - Add TypeScript/JSDoc for new fields
- **Tests:** `exercises.test.js` — validate all 11 exercises have references
- **Effort:** 3-4 days (research + data entry)
- **Owner:** Frontend

#### Task 2: Form Reference Modal Component
- **Description:** Build reusable modal to display exercise technique
- **Files:**
  - `app/src/components/FormReferenceModal.jsx` (new)
  - `app/src/components/FormReferenceModal.test.jsx` (new)
- **Work:**
  - Modal component with video player (embed YouTube or use video tag)
  - "Ver técnica" button in SubirPrueba form
  - Modal shows: video + tips + close button
  - Responsive (mobile: fullscreen, desktop: centered)
- **Tests:** Modal opens/closes, video loads, tips display
- **Effort:** 2-3 days
- **Owner:** Frontend

#### Task 3: Post-Exercise Difficulty Feedback UI
- **Description:** Capture user perception after exercise completion
- **Files:**
  - `app/src/components/DifficultyRating.jsx` (new)
  - `app/src/components/DifficultyRating.test.jsx` (new)
  - `app/src/pages/SubirPrueba.jsx` (modify)
- **Work:**
  - 3-button component (😰 Hard, 😐 Moderate, 💪 Easy)
  - Show after "Completado" clicked
  - Store selection in form state
  - Persist to Firestore workout document
- **Tests:** Rating UI renders, selection stores correctly
- **Effort:** 2-3 days
- **Owner:** Frontend
- **Depends on:** Task 2 (SubirPrueba refactor)

#### Task 4: Firestore Schema Update (Feedback Storage)
- **Description:** Extend workout document to include difficulty feedback
- **Files:**
  - `app/functions/src/recalculateDuelWeek.js` (modify)
  - `app/src/firebase/firestore.js` (modify)
- **Work:**
  - Add `difficulty_feedback` field to exercise object
  - Cloud Function handles feedback without breaking existing logic
  - Migration: backfill existing workouts with null feedback
- **Tests:** Firestore integration tests, security rules
- **Effort:** 1-2 days
- **Owner:** Backend

#### Task 5: Integration Tests (Phase 3.1)
- **Description:** E2E test of full workflow
- **Files:**
  - `app/tests/phase3-form-feedback.e2e.test.js` (new)
- **Work:**
  - Scenario: SubirPrueba → see form reference → complete exercise → rate difficulty → verify stored
  - Run against Firestore emulator
- **Effort:** 2 days
- **Owner:** QA
- **Depends on:** Tasks 1-4

#### Phase 3.1 Milestones
- ✅ Commit 1: Exercise data structure + catalog
- ✅ Commit 2: Form reference modal
- ✅ Commit 3: Difficulty rating UI + Firestore integration
- ✅ Commit 4: E2E tests + merge to main

**Phase 3.1 Estimate:** 10-15 days (2 weeks)

---

### Phase 3.2: Automatic Rest Timer (Weeks 3-4)

**Objective:** Post-exercise, auto-start rest countdown. No manual timing.

#### Task 6: Rest Timer Logic + Data
- **Description:** Define rest durations per exercise, configurable timer
- **Files:**
  - `app/src/domain/exercises.js` (extend)
  - `app/src/utils/restTimer.js` (new)
- **Work:**
  - Add `restSeconds` and `category` to exercises
  - Build utility: `getRestDuration(exerciseId, category)` → seconds
  - Allow user override (-15s to +30s)
- **Tests:** `restTimer.test.js` — timer calculations, edge cases
- **Effort:** 1-2 days
- **Owner:** Frontend

#### Task 7: Timer Component
- **Description:** Fullscreen countdown display with controls
- **Files:**
  - `app/src/components/RestTimer.jsx` (new)
  - `app/src/components/RestTimer.test.jsx` (new)
- **Work:**
  - Large countdown display (HH:MM:SS)
  - Pause/resume buttons
  - "-15s" and "+30s" adjustment buttons
  - Sound + vibration on completion
  - "Siguiente set" CTA at end
- **Tests:** Timer counts down, controls work, sound triggers
- **Effort:** 3-4 days
- **Owner:** Frontend

#### Task 8: SubirPrueba Timer Integration
- **Description:** Trigger timer after "Completado" for each set
- **Files:**
  - `app/src/pages/SubirPrueba.jsx` (modify)
- **Work:**
  - After set completion, show RestTimer component
  - On timer end, show "Siguiente set" or next exercise
  - Flow: Select exercise → Enter reps → Completado → Timer → Next
- **Tests:** Flow integration with emulator
- **Effort:** 2 days
- **Owner:** Frontend
- **Depends on:** Tasks 6-7

#### Task 9: Audio/Vibration Notifications
- **Description:** Notify user when rest is done
- **Files:**
  - `app/src/utils/notifications.js` (new)
  - RestTimer.jsx (integrate)
- **Work:**
  - Use Web Audio API for "ding" sound
  - Use Vibration API for haptic feedback (mobile)
  - Fallback for browsers without Vibration support
- **Tests:** Audio plays, vibration triggers
- **Effort:** 1 day
- **Owner:** Frontend

#### Phase 3.2 Milestones
- ✅ Commit 1: Rest timer logic + component
- ✅ Commit 2: SubirPrueba integration
- ✅ Commit 3: Audio/vibration
- ✅ Commit 4: E2E tests + merge to main

**Phase 3.2 Estimate:** 8-12 days (2 weeks)

---

### Phase 3.3: Adaptive Progression (Weeks 5-6)

**Objective:** Auto-adjust reps/exercises based on 1 week of difficulty feedback.

#### Task 10: Difficulty Scoring Algorithm
- **Description:** Analyze weekly feedback, suggest adjustments
- **Files:**
  - `app/functions/src/progressionEngine.js` (new)
  - `app/functions/test/progressionEngine.test.js` (new)
- **Work:**
  - Input: Array of difficulty ratings from past week
  - Calculate: `easyCount / totalCount` percentage
  - Logic:
    - If > 70% easy → suggest +2-5 reps or +1 exercise
    - If > 50% hard → hold or reduce
    - Else → maintain
  - Output: Array of suggested adjustments with reasoning
- **Tests:**
  - 70% easy scenario → output +reps
  - 60% hard scenario → output hold
  - Mixed scenario → output maintain
- **Effort:** 2-3 days
- **Owner:** Backend

#### Task 11: Progression Suggestion Storage
- **Description:** Store suggested adjustments in Firestore
- **Files:**
  - `app/functions/src/generateProgressionSuggestions.js` (new, Cloud Function trigger)
  - `app/src/firebase/firestore.js` (add query methods)
- **Work:**
  - New Cloud Function triggered at end of duel week
  - Fetch all workouts for that week
  - Run progression algorithm
  - Store suggestions in `duels/{duelId}/weeks/{weekId}/suggestions`
  - Mark as `status: 'pending'` until user accepts
- **Tests:** Cloud Function test with emulator fixtures
- **Effort:** 2-3 days
- **Owner:** Backend

#### Task 12: Progression Suggestions UI
- **Description:** Display suggestions at week start, allow accept/reject
- **Files:**
  - `app/src/components/ProgressionSuggestions.jsx` (new)
  - `app/src/pages/Dashboard.jsx` (modify)
- **Work:**
  - Week-start banner: "¡Tu progreso está mejorando! Aquí hay sugerencias:"
  - Show each suggestion with: exercise name, old reps, new reps, reasoning
  - Buttons: "Aceptar" / "Mantener igual"
  - On accept, update duel routine for next week
- **Tests:** Suggestions render, buttons work, state updates
- **Effort:** 2-3 days
- **Owner:** Frontend

#### Task 13: Progression History Tracking
- **Description:** Maintain history of progression changes
- **Files:**
  - `app/src/duel/progressionHistory.js` (new)
  - Firestore schema: `duels/{duelId}/progressionHistory` (new collection)
- **Work:**
  - Log each adjustment (when, what changed, why)
  - Display progression timeline in new "Progression" page (optional Phase 3b)
  - Enable analysis: "You've added 50 reps over 4 weeks"
- **Tests:** History stored correctly
- **Effort:** 1-2 days
- **Owner:** Backend

#### Task 14: E2E Tests (Phase 3.3)
- **Description:** Full progression flow
- **Files:**
  - `app/tests/phase3-progression.e2e.test.js` (new)
- **Work:**
  - Scenario: Week 1 → user rates 70%+ easy → Week 2 start → suggestions appear → user accepts → routine updated
  - Run against emulator with fixtures
- **Effort:** 2 days
- **Owner:** QA

#### Phase 3.3 Milestones
- ✅ Commit 1: Progression algorithm + Cloud Function
- ✅ Commit 2: Suggestions UI + acceptance flow
- ✅ Commit 3: History tracking
- ✅ Commit 4: E2E tests + merge to main

**Phase 3.3 Estimate:** 10-15 days (2 weeks)

---

## Implementation Strategy

### Execution Model
- **Subagent-Driven:** Each task gets a dedicated subagent (same as Phase 2)
- **Isolated Worktrees:** feature/form-references, feature/rest-timer, feature/progression
- **Independent Review:** Code review + testing before each merge
- **Weekly Integration:** Merge to main at phase milestones (3.1 → main, then 3.2 → main, etc.)

### Testing Strategy
- TDD: Tests written before implementation
- Unit tests for pure functions (algorithm, timer logic)
- Integration tests for Firestore + Cloud Functions
- E2E tests on emulator before merge

### Risk Mitigation
- **Form reference sourcing:** Pre-source videos in parallel (Task 1)
- **Audio API compatibility:** Fallback for older browsers
- **Rest timer interruptions:** Handle app suspension (iOS PWA limitation)
- **Progression false positives:** Validate with 2 weeks of real data before auto-adjust

---

## Milestones & Timeline

```
Week 1-2 (Phase 3.1):
  Day 1-4: Form references data + modal
  Day 5-7: Difficulty feedback UI
  Day 8-10: Firestore integration
  Day 11-14: E2E tests + merge
  → main (Phase 3.1 complete)

Week 3-4 (Phase 3.2):
  Day 1-3: Rest timer logic
  Day 4-7: Timer UI + integration
  Day 8-9: Audio/vibration
  Day 10-14: E2E tests + merge
  → main (Phase 3.2 complete)

Week 5-6 (Phase 3.3):
  Day 1-3: Progression algorithm
  Day 4-6: Suggestions storage
  Day 7-9: Suggestions UI
  Day 10-11: History tracking
  Day 12-14: E2E tests + merge
  → main (Phase 3.3 complete)
```

---

## Success Metrics

- ✅ Form references accessible for 11/11 exercises
- ✅ 90%+ of workout sets have difficulty feedback
- ✅ Rest timer used in 95%+ of sessions (session telemetry)
- ✅ Progression suggestions accepted 70%+ of the time
- ✅ User-reported difficulty decreases over 4 weeks (satisfaction survey)
- ✅ All tests pass (>95% coverage)
- ✅ Vercel deploy time <2 minutes per phase

---

## Coordination Notes

- **Parallel work:** Tasks within a phase can run in parallel (Tasks 1-2 independent)
- **Dependencies:** Task 4 must complete before Task 5 (schema → tests)
- **Communication:** Slack/chat for blocker escalation, daily standup optional
- **Branch strategy:** feature/* for each task, PR review before main merge

---

**Status: READY FOR PHASE 3.1 KICKOFF**

Next: Coordinate with Codex/Claude Code to start Task 1 (Form References).
