# COMAR-FIT Profile — Design

## Goal

Turn the inactive Profile navigation item into a useful, Firebase-backed profile screen inspired by the supplied Stitch design while preserving COMAR-FIT's Kinetic Glow identity and scoring integrity.

## Scope

- Add a protected `/perfil` route and activate the Profile navigation item.
- Load the signed-in user's private Firestore profile.
- Show real personal statistics derived from the active duel, week aggregate, and workouts: workouts completed, accumulated minutes, current/best available streak, and score.
- Persist notification and screenshot-location privacy preferences.
- Edit display name, age, height, experience level, objective, available equipment, preferred workout duration, and usual workout time.
- Allow gender and weight changes only when at least 30 days have elapsed since the last physical-profile change.
- Keep every active duel's `scoringSnapshot` immutable; physical changes affect only future duels.
- Provide a confirmed sign-out action.

## Architecture

`Perfil.jsx` composes existing `Layout`, `Card`, `Button`, and input styles. A focused `useUserProfile` hook owns loading and refresh state. Firestore helpers read and update the private `users/{uid}` document and mirror `displayName`/`avatarUrl` to `publicProfiles/{uid}` in a batch.

Preference and editable profile fields live in `users/{uid}`. `physicalProfileUpdatedAt` records the last gender/weight update. The client exposes the next eligible date, while Firestore rules enforce the same 30-day constraint using server time.

Statistics reuse the active-duel, workout, and duel-score listeners already used elsewhere. Missing aggregates render zero rather than failing the page.

## Data and integrity

New optional private profile fields:

- `objective: string`
- `equipment: string[]`
- `preferredWorkoutMinutes: number`
- `usualWorkoutTime: string`
- `notificationsEnabled: boolean`
- `hideScreenshotLocation: boolean`
- `physicalProfileUpdatedAt: timestamp`

General profile updates set `updatedAt` to server time. A physical update additionally sets `physicalProfileUpdatedAt` to server time and is rejected until 30 days after the prior value. `scoringProfiles/{uid}` mirrors gender/weight for future duel creation but existing duel snapshots are never rewritten.

## UX

The profile opens with identity and live performance, then presents editable training preferences and privacy controls. Physical fields visibly explain the 30-day rule and show the next available edit date when locked. Saving displays a success status; Firestore errors remain actionable. Sign-out requires confirmation.

## Testing

- Protected route and active navigation.
- Loading, error, populated, and missing-profile states.
- Real statistics mapping.
- General-profile save and public-name mirroring.
- Physical update eligibility and 30-day lock.
- Preference persistence.
- Sign-out confirmation and execution.
- Firestore rules reject premature physical changes and accept eligible changes.

## Out of scope

Avatar uploads, password reset UI, push-notification delivery, and rewriting active duel scoring snapshots.
