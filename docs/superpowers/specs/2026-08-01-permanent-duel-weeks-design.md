# COMAR-FIT Permanent Duel Weeks Design

## Goal

Keep one permanent duel between the two existing participants while automatically dividing their activity into Monday-to-Sunday weeks. Preserve prior weekly results and make the Duelo navigation item useful without introducing multiple partners, rankings, invitations, or opponent management.

## Scope

- Exactly two participants remain attached to the existing duel.
- A new logical week starts automatically every Monday in `America/Mexico_City`.
- The current week compares unique active workout days from zero to seven.
- Prior weeks remain visible in a duel history.
- No Cloud Functions, scoring engine, partner switching, duel termination, or global leaderboard is included.

## Data Model

The existing `duels/{duelId}` document remains the durable relationship and source of participant identity.

Weekly periods use a deterministic Monday date key (`YYYY-MM-DD`) derived in the Mexico City timezone. Weekly values are derived from workouts rather than accepted as client-authored scores:

- week start and end
- participant A active days
- participant B active days
- result: participant A, participant B, or tie

The initial implementation does not require writing weekly aggregate documents. It derives current and historical weeks from the permanent duel and its workouts. This avoids synchronization races and keeps workouts as the source of truth. A persisted weekly snapshot can be added later only if query volume makes it necessary.

## Weekly Lifecycle

Opening the application calculates the current Mexico City week. Workouts are grouped into their corresponding Monday-to-Sunday bucket. Crossing into Monday naturally produces a new empty bucket (`0/7` versus `0/7`) while leaving older buckets derivable from historical workouts.

A historical week is considered final after its Sunday ends. Its winner is the participant with more unique active days; equal totals are a tie. Empty weeks are valid ties.

## User Interface

### Dashboard

- Shows only the current week.
- Day number and countdown use the current calculated week rather than the duel creation date.
- Active-day progress and streak behavior remain unchanged.
- Participant names remain the public profile names already attached to the duel.

### Duelo Page

The bottom navigation item `Duelo` routes to a dedicated page instead of returning to Dashboard.

The page contains:

- current head-to-head summary
- weekly history ordered newest first
- each row's date range
- both participants' `X/7` totals
- clear result copy: winner name or tie
- an empty-history state before the first completed week

## Security and Data Integrity

No new client-writable score or result fields are introduced. Participants continue to read duel workouts under the existing Firestore rules. Workout ownership and the ten-minute edit/delete window remain unchanged.

## Error and Empty States

- Loading and Firestore errors use the existing application patterns.
- A week without workouts renders `0/7` for both participants.
- Missing historical data does not block the current duel.
- Invalid workout timestamps are ignored rather than assigned to an incorrect week.

## Testing

- Week keys and boundaries in `America/Mexico_City`, including Sunday-to-Monday rollover.
- Multiple workouts on one day count once.
- Workouts group into the correct historical week.
- Participant A win, participant B win, tie, and empty-week tie.
- Dashboard switches to a fresh `0/7` week after Monday rollover.
- Duelo navigation route and historical list rendering.
- Existing active-day and Firestore security tests remain green.

## Deployment

The feature is a client-only React/Firestore change. It requires no new environment variables, Cloud Functions, or Firebase billing plan. After tests and a production build pass, the change can be pushed to `main` for Vercel to deploy automatically.
