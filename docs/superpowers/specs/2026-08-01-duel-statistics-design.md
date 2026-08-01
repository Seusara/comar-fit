# Duel Statistics Design

## Purpose

Make `/duelo` the competitive center of COMAR-FIT for Aaron and Alexandra. The page must answer three questions immediately: who leads this week, which days each person trained, and how the pair has performed over time.

## Visual direction

Use the existing Kinetic Glow graphite surfaces, cyan participant A accent, purple participant B accent, Montserrat data typography, and Inter body copy. The signature element is a seven-day dual-lane activity track inspired by the Stitch "DuoFit - Estadísticas Duelo" screen. It replaces decorative progress rings with evidence of the exact active days.

## Information hierarchy

1. Duel hero: avatars, names, current active days, VS marker, and dynamic lead/tie message.
2. Weekly track: Monday through Sunday with an accessible active/inactive cell for each participant.
3. Current-week metrics: days, workouts, minutes, and streak for both participants.
4. Season summary: total completed-week wins and ties.
5. Compact completed-week history, newest first.

## Data behavior

The existing weekly derivation remains the source of truth. Each participant week gains `workoutCount` and `totalMinutes`; duplicate workouts still count as one active day but remain separate workouts and contribute their minutes. Completed-week results determine cumulative wins and ties. Future workouts and invalid timestamps remain ignored.

## Responsive and accessible behavior

The design is mobile-first and remains readable in the existing centered desktop shell. The weekly lanes expose participant/day/status labels to assistive technology, all text meets existing contrast tokens, and optional glow/pulse motion respects `prefers-reduced-motion`.

