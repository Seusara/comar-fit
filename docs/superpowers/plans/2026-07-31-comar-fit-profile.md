# COMAR-FIT Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a functional Firebase-backed Profile screen with real duel statistics, persisted preferences, confirmed sign-out, and physical-profile edits limited to once every 30 days.

**Architecture:** Add focused Firestore profile helpers and a `useUserProfile` hook, then compose existing duel/workout listeners in `Perfil.jsx`. General user fields update normally; gender/weight use a dedicated transaction and preserve every active duel's immutable scoring snapshot.

**Tech Stack:** React 18, React Router 6, Firebase Auth/Firestore 10, Tailwind CSS, Vitest, Testing Library, Firebase Rules Unit Testing.

## Global Constraints

- Preserve Kinetic Glow tokens and existing reusable components.
- Existing `duels/{duelId}.scoringSnapshot` documents remain immutable.
- Physical fields are editable only 30 days after `physicalProfileUpdatedAt`.
- No avatar upload, password-reset flow, push delivery, or active-duel score rewrite.

---

### Task 1: Profile persistence and 30-day eligibility

**Files:**
- Modify: `app/src/firebase/firestore.js`
- Modify: `app/src/firebase/firestore.test.js`
- Modify: `app/firestore.rules`
- Modify: `app/tests/firestore.rules.test.js`

**Interfaces:**
- Produces: `canUpdatePhysicalProfile(profile, now): boolean`
- Produces: `updateUserProfile(uid, changes): Promise<void>`
- Produces: `updatePhysicalProfile(uid, { gender, weight }): Promise<void>`

- [ ] Write tests proving general updates mirror `displayName`, eligible physical updates write both private/scoring documents, and changes before 30 days are rejected.
- [ ] Run focused Firestore and rule tests; confirm failure because helpers and rule fields do not exist.
- [ ] Implement a batched general update with `updatedAt: serverTimestamp()` and a physical transaction that checks `physicalProfileUpdatedAt` before updating `users/{uid}` and `scoringProfiles/{uid}`.
- [ ] Expand the user rule allow-list for profile/preferences fields and enforce `request.time >= physicalProfileUpdatedAt + duration.value(30, 'd')` whenever gender or weight changes.
- [ ] Run focused tests and commit `feat: add profile persistence rules`.

### Task 2: Profile data hook

**Files:**
- Create: `app/src/hooks/useUserProfile.js`
- Create: `app/src/hooks/useUserProfile.test.jsx`

**Interfaces:**
- Consumes: `getUserDocument(uid)` and `useAuth()`.
- Produces: `useUserProfile(): { profile, loading, error, refresh }`.

- [ ] Write a hook test that resolves the authenticated user's document, exposes failures, and refreshes after save.
- [ ] Run the focused test; confirm failure because the hook does not exist.
- [ ] Implement cancellation-safe loading keyed by `currentUser.uid`, with a monotonically increasing refresh token.
- [ ] Run the focused test and commit `feat: add user profile hook`.

### Task 3: Functional Profile screen and navigation

**Files:**
- Create: `app/src/pages/Perfil.jsx`
- Create: `app/src/pages/Perfil.test.jsx`
- Modify: `app/src/App.jsx`
- Modify: `app/src/components/Layout.jsx`
- Modify: `app/src/components/components.test.jsx`

**Interfaces:**
- Consumes: `useUserProfile`, `useActiveDuel`, `useWorkouts`, `useDuelScore`, `updateUserProfile`, `updatePhysicalProfile`, `logoutUser`.
- Produces: protected `/perfil` screen and active Profile navigation link.

- [ ] Write tests for loading/error states, real name and statistics, preference saving, physical lock messaging, eligible physical saving, sign-out confirmation, route protection, and navigation.
- [ ] Run focused tests; confirm they fail because the page/route/link do not exist.
- [ ] Implement the Kinetic Glow profile header, four-stat grid, editable form, preference switches, 30-day physical section, success/error status, and confirmed sign-out.
- [ ] Add `<Route path="/perfil">` under `RequireAuth` and replace the unavailable Profile button with a link.
- [ ] Run focused tests and commit `feat: add functional profile screen`.

### Task 4: Full verification and design-source cleanup

**Files:**
- Verify: `app/stitch/a8e82b21f5a948a4b83dd779efeb7b50/`
- Verify: all modified application files.

**Interfaces:**
- Produces: verified integration branch ready for manual emulator testing.

- [ ] Run `npm test -- --run` and record exact pass/fail counts.
- [ ] Run `npm run build` and confirm exit code 0.
- [ ] Run Functions tests and Firestore rule tests with emulators when available.
- [ ] Start `npm run emulators` plus `npm run dev`, register a user, open `/perfil`, save preferences, verify the physical lock, reload, and sign out.
- [ ] Run `git diff --check`, inspect `git status --short`, exclude emulator/cache artifacts, and commit `test: verify profile integration`.
