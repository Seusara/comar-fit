# Duel Statistics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the duel page into a real weekly comparison and history dashboard based on active-day scoring.

**Architecture:** Extend the pure weekly-history domain with workout and minute totals, then render those results through a focused seven-day track component and a redesigned Duelo page. No new backend collections or listeners are required.

**Tech Stack:** React 18, Tailwind CSS, Vitest, Testing Library, Firestore listener hooks.

## Global Constraints

- Active days remain the only duel scoring metric.
- Participant A uses cyan and participant B uses purple.
- Monday through Sunday must remain visible on mobile.
- Motion must respect `prefers-reduced-motion`.

---

### Task 1: Weekly comparison metrics

**Files:**
- Modify: `app/src/duel/weeklyHistory.js`
- Modify: `app/src/duel/weeklyHistory.test.js`

**Interfaces:**
- Produces participant fields `workoutCount: number` and `totalMinutes: number` in every derived week.

- [ ] Add a failing test proving duplicate-day workouts count once as an active day, twice as workouts, and sum valid minutes.
- [ ] Run the focused domain test and verify the new assertions fail.
- [ ] Group workout entries per participant/week and calculate the two metrics without changing result logic.
- [ ] Run the focused domain test and verify it passes.

### Task 2: Seven-day duel track

**Files:**
- Create: `app/src/components/DuelWeekTrack.jsx`
- Create: `app/src/components/DuelWeekTrack.test.jsx`

**Interfaces:**
- Consumes `participantA`, `participantB`, `nameA`, and `nameB`.
- Produces a semantic two-lane Monday-Sunday activity visualization.

- [ ] Add failing render tests for seven labels and active/inactive accessible states.
- [ ] Run the focused component test and verify module absence fails.
- [ ] Implement the compact responsive track with cyan/purple lane cells.
- [ ] Run the focused component test and verify it passes.

### Task 3: Duel page redesign

**Files:**
- Modify: `app/src/pages/Duelo.jsx`
- Modify: `app/src/pages/Duelo.test.jsx`
- Modify: `app/src/index.css`

**Interfaces:**
- Consumes Tasks 1-2 and existing duel/workout hooks.
- Produces hero, dynamic status, current metrics, season score, and compact history.

- [ ] Add failing page assertions for lead copy, metrics, weekly track, and cumulative victories.
- [ ] Run the focused page test and verify failure.
- [ ] Implement the Stitch-informed layout and reduced-motion-safe leader treatment.
- [ ] Run the focused page test and verify it passes.

### Task 4: Verify and publish

**Files:**
- Modify only files required to correct regressions introduced above.

- [ ] Run all tests and the production build.
- [ ] Inspect the diff and secret scan; exclude unrelated authentication logs.
- [ ] Commit `feat: redesign duel statistics` and push `main` as previously authorized.
- [ ] Confirm the Vercel production deployment reaches Ready and visually inspect `/duelo`.

