# COMAR-FIT Dashboard Daily Mission — Design

## Goal

Make the Dashboard answer one question immediately: **what should I do today?** The primary visual hierarchy shifts from a full duel comparison to a daily mission, while preserving a compact view of the couple's progress.

## Scope

This change redesigns only the authenticated Dashboard. It reuses existing duel, workout, profile, routine, and navigation data. It does not add Firestore collections, server functions, scoring, notifications, or new persistence.

## Information hierarchy

1. Personalized header with the current user's name/photo, weekday, and `Día X de 7`.
2. Daily mission hero with one primary action.
3. Compact weekly duel summary linking to `/duelo`.
4. Combined streak and weekly-progress strip.
5. The three most recent workouts.

## Daily mission states

The state is derived from workouts performed in the current Mexico City day and available routine progress.

- **No workout today:** show `Tu misión está lista` and a primary `Comenzar rutina` action to `/rutina`.
- **Routine completed but no workout registered:** when existing routine progress explicitly reports completion, show `Rutina completada` and a primary `Registrar entrenamiento` action to `/subir-prueba`.
- **Workout registered today:** show `Misión cumplida`, today's accumulated workout count and minutes, with a secondary `Ver entrenamiento` action to `/revisar-prueba`.

If routine completion is unavailable or malformed, the Dashboard safely falls back to the no-workout state. A workout registered today always takes precedence.

## Duel summary

The compact card shows both participant photos and names, current-week active days, and user-relative copy: `Vas adelante`, `Van iguales`, or `<partner> va adelante`. The entire summary offers a clear `Ver duelo` action to `/duelo`. Cyan identifies the current user and purple identifies the partner regardless of whether the user is participant A or B.

## Weekly momentum

A single compact strip presents:

- the current user's streak;
- active days out of seven;
- a seven-segment weekly track based on unique workout days.

This replaces the two large progress rings on the Dashboard. Detailed comparison remains on the Duelo screen.

## Recent activity

Show at most three workouts, newest first. Each row includes exercise title, participant name when available, formatted date, and total minutes when present. The empty state directs the user toward the daily mission instead of repeating another large CTA.

## Visual direction

- Preserve the existing Kinetic Glow tokens and dark surface system.
- Use one dominant hero card with a restrained cyan glow.
- Use purple only for partner identity and duel contrast.
- Keep typography and spacing mobile-first, with all content clear of the fixed bottom navigation and device safe areas.
- Avoid decorative gradients behind every card; the mission hero is the visual focal point.
- Motion is optional and must respect `prefers-reduced-motion`.

## Components and boundaries

- `Dashboard.jsx` composes data and chooses the mission state.
- `DailyMissionCard` renders the three mission variants and navigation actions.
- `DashboardDuelSummary` renders the user-relative compact duel card.
- Small pure helpers derive today's workout summary and participant ordering.

Components receive prepared values and callbacks; they do not query Firebase directly.

## Error and loading behavior

Keep the existing page-level loading and error states. Missing participant names use safe generic labels, never raw Firebase UIDs. Missing photos use the existing initial avatar. Invalid workout minutes count as zero and do not break totals.

## Accessibility

- One page-level `h1` and descriptive card headings.
- Mission state announced in visible text, not color alone.
- Buttons and links have explicit action labels.
- Weekly segments expose accessible active/inactive day labels.
- Color contrast follows existing Kinetic Glow tokens.

## Testing

Tests cover:

- no-workout, routine-completed, and workout-registered mission states;
- correct navigation for each mission action;
- current-user/partner ordering for both duel participant positions;
- active-day comparison copy and weekly segments;
- recent activity limited to three newest entries;
- loading, error, empty, malformed, and missing-profile fallbacks;
- production build and the existing frontend regression suite.

## Acceptance criteria

- The daily mission is the first dominant card on mobile and desktop.
- The primary CTA always reflects the best-known state for today.
- The Dashboard no longer duplicates the full Duelo screen's two-ring layout.
- Both real names/photos and current-week values remain live through existing listeners.
- No backend schema or production Firebase rules change is required.
