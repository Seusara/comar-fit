# DuoFit Weekly Dashboard Design

## Goal

Make the deterministic weekly training plan the first useful thing a participant sees after opening the Dashboard. The interface must make today's action obvious while preserving DuoFit's existing dark, competitive visual identity.

## Scope

This iteration presents and operates the functionality that already exists:

- the immutable seven-day weekly plan;
- workout exercise progress;
- pending and active run sessions;
- the existing duel score, streaks, and recent activity.

GPS tracking, monthly scoring, rematches, exercise substitution, and history-based progression remain out of scope.

## Information hierarchy

The Dashboard content order will be:

1. Weekly plan card.
2. Duel comparison and participant progress.
3. Countdown and recent activity.
4. Existing upload-workout action.

The weekly plan card is a vertical seven-day training log. Six rows stay compact. The current day expands to reveal its instructions and action. This is the page's signature element.

## Visual direction

The implementation keeps the current DuoFit tokens and components:

- dark surface and container colors;
- neon primary green for the current day and primary actions;
- existing headline, body, and label typography;
- rounded cards and restrained borders;
- compact uppercase utility labels for dates and workout types.

The selected mockup's light background is not part of the implementation. It communicated layout only. The production card remains dark and visually continuous with the existing app.

## Weekly plan states

Each row shows the short weekday, plan type, and a status marker.

- Past workout with at least 80% progress: completed.
- Past or current workout below 80%: pending or partial, according to persisted progress.
- Future workout: planned.
- Run: planned, active, or completed when supported by the current run-session data.
- Rest: rest marker with no completion requirement.
- Current day: highlighted and expanded regardless of type.

Missing progress does not mutate the plan and displays as pending.

## Current-day actions

### Workout

The expanded row shows focus, exercises, completion checkboxes, completed count, and percentage. Toggling an exercise uses the existing deterministic workout-progress document. Reaching 80% displays the completed state.

### Run

The expanded row shows the 2 km or 20 minute target. A pending session exposes **Iniciar carrera**. Activating it uses the existing run-session API and changes the visible state to active. No GPS controls or simulated distance are added.

### Rest

The expanded row clearly says that today is for recovery. It has no primary action.

## Data flow and component boundaries

Dashboard remains responsible for loading the active duel and workout activity. Weekly-plan presentation is extracted into a focused component that receives plan days, current weekday, progress, run-session state, and callbacks.

The plan-loading effect:

1. derives the deterministic week ID;
2. creates the plan only when missing;
3. loads the immutable plan;
4. loads or creates workout progress only for the current workout day;
5. loads or creates a run session only when the current day is a run day.

The presentation component does not call Firebase directly. Dashboard owns async actions and passes state down, keeping visual tests independent from the emulator.

## Loading and errors

The existing Dashboard loading state remains visible while duel data loads. The weekly card then uses its own contained loading state.

If weekly-plan loading fails, the card displays a specific message and **Reintentar** action. Duel comparison and recent activity remain usable. Async callbacks disable their initiating control while pending and retain the last confirmed persisted state on failure.

## Responsive and accessibility behavior

- Mobile uses a single vertical list with a full-width expanded current day.
- Wider screens keep the same reading order and cap the content width rather than introducing a separate desktop interaction.
- Status is communicated by text and icon, never color alone.
- Buttons and checkboxes retain visible keyboard focus and accessible labels.
- Dynamic progress and run-state updates use an appropriate live region.
- Motion is limited to the current-row expansion and respects reduced-motion preferences.

## Testing

Component tests cover:

- all seven rows and current-day emphasis;
- workout, run, and rest expanded states;
- workout percentage and the 80% completion threshold;
- starting a pending run session;
- loading, retryable error, and loading-to-loaded transitions;
- no regression in Dashboard routing and existing duel information.

Firebase integration tests remain the source of truth for plan immutability, progress ownership, read access, and the `pending → active` run transition.

## Acceptance criteria

- A signed-in duel participant immediately sees the full current week at the top of Dashboard.
- Today's plan is visually dominant and understandable without opening another page.
- Workout exercise changes survive reloads.
- Saturday exposes a working **Iniciar carrera** action backed by `runSessions`.
- Rest days expose no misleading completion action.
- A weekly-plan failure never turns the entire Dashboard blank.
- Existing relevant tests, new UI regression tests, and the production build pass before publication.
