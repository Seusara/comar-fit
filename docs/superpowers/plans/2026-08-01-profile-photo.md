# Profile Photo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow each authenticated user to upload one optimized profile photo and see it consistently in Perfil, Dashboard, and Duelo.

**Architecture:** A pure validation layer and a browser Canvas processor prepare a 512×512 WebP before a focused Firebase Storage adapter uploads it. A reusable Avatar component renders image-or-initial fallback, while the existing Firestore profile update writes the download URL to private and public profiles.

**Tech Stack:** React 18, Firebase Web SDK 10 (Storage and Firestore), Canvas API, Vitest, Testing Library, Firebase Storage Rules.

## Global Constraints

- Accept only browser files whose MIME type starts with `image/` and whose original size is at most 2 MB.
- Upload a square WebP no larger than 512×512 and target a final payload below 1 MB.
- Store exactly one object at `profilePhotos/{uid}/avatar.webp`.
- Only the authenticated owner may write the object; authenticated users may read it.
- Preserve initials as fallback when no URL exists or the image fails.
- Do not add an external image-processing dependency.

---

### Task 1: Image validation and processing

**Files:**
- Create: `app/src/profile/profileImage.js`
- Test: `app/src/profile/profileImage.test.js`

**Interfaces:**
- Produces: `validateProfileImage(file): string | null`
- Produces: `processProfileImage(file, options?): Promise<Blob>` where options may inject `createImageBitmap`, `canvasFactory`, and `maxDimension` for tests.

- [ ] **Step 1: Write failing tests** for non-image rejection, files over 2 MB, valid image acceptance, centered square drawing, 512 pixel output, and WebP Blob production.
- [ ] **Step 2: Run** `npm test -- src/profile/profileImage.test.js` from `app`; expect failures because the module does not exist.
- [ ] **Step 3: Implement validation constants (`2 * 1024 * 1024`, `image/`) and Canvas processing using the shortest centered source square and `canvas.toBlob(..., 'image/webp', 0.82)`; reject when encoding returns null or output exceeds 1 MB.
- [ ] **Step 4: Re-run the focused test and expect all cases to pass.**
- [ ] **Step 5: Commit** `profileImage.js` and its test as `feat: process profile photos`.

### Task 2: Storage adapter and security rules

**Files:**
- Modify: `app/src/firebase/config.js`
- Create: `app/src/firebase/storage.js`
- Test: `app/src/firebase/storage.test.js`
- Create: `app/storage.rules`
- Modify: `app/firebase.json`

**Interfaces:**
- Consumes: processed WebP Blob from Task 1.
- Produces: exported Firebase `storage` instance.
- Produces: `uploadProfilePhoto(uid, blob, onProgress?): Promise<string>`.

- [ ] **Step 1: Write a failing adapter test** that verifies path `profilePhotos/aaron/avatar.webp`, metadata `{ contentType: 'image/webp' }`, progress forwarding, and returning `getDownloadURL`.
- [ ] **Step 2: Run** `npm test -- src/firebase/storage.test.js`; expect failure because the adapter does not exist.
- [ ] **Step 3: Add `getStorage(app)` to Firebase config and connect the Storage emulator on port 9199 in dev/test. Implement the adapter with `uploadBytesResumable` and resolve after `getDownloadURL` succeeds.**
- [ ] **Step 4: Add Storage configuration and emulator port to `firebase.json`. Add rules permitting authenticated reads and owner-only WebP writes below 1 MB at `/profilePhotos/{uid}/avatar.webp`, denying everything else.**
- [ ] **Step 5: Run the focused adapter test and `npx firebase-tools emulators:exec --only storage "npm test -- src/firebase/storage.rules.test.js"` if rule test support is available; otherwise validate rules during Firebase deploy.**
- [ ] **Step 6: Commit** as `feat: secure profile photo storage`.

### Task 3: Reusable Avatar component

**Files:**
- Create: `app/src/components/Avatar.jsx`
- Test: `app/src/components/Avatar.test.jsx`

**Interfaces:**
- Produces: `<Avatar name size className src />`, rendering an accessible image or uppercase initial.

- [ ] **Step 1: Write failing component tests** for image rendering, missing URL fallback, empty-name fallback `U`, and switching to the initial after an image error.
- [ ] **Step 2: Run** `npm test -- src/components/Avatar.test.jsx`; expect import failure.
- [ ] **Step 3: Implement the component with internal failed-image state reset when `src` changes and an `alt` value `Foto de {name}`.**
- [ ] **Step 4: Re-run the focused test and expect pass.**
- [ ] **Step 5: Commit** as `feat: add reusable profile avatar`.

### Task 4: Profile upload experience

**Files:**
- Modify: `app/src/pages/Perfil.jsx`
- Modify: `app/src/pages/Perfil.test.jsx`

**Interfaces:**
- Consumes: `validateProfileImage`, `processProfileImage`, `uploadProfilePhoto`, `Avatar`, and existing `updateUserProfile(uid, { avatarUrl })`.
- Produces: working select-preview-confirm upload flow.

- [ ] **Step 1: Add failing Perfil tests** asserting that “Cambiar foto” opens a file input, invalid files show a Spanish alert without upload, a valid file processes/uploads/updates Firestore, progress is visible, and success refreshes the profile.
- [ ] **Step 2: Run** `npm test -- src/pages/Perfil.test.jsx`; verify the new cases fail due to absent controls.
- [ ] **Step 3: Implement local `photoFile`, `photoPreview`, `photoProgress`, and `photoSaving` state. Revoke object URLs on replacement/unmount, show validation errors, and require a “Guardar foto” confirmation before processing and uploading.**
- [ ] **Step 4: On success call `updateUserProfile(currentUser.uid, { avatarUrl })`, clear preview, show `Foto de perfil actualizada`, and call `refresh()`. Keep the existing avatar on any failure.**
- [ ] **Step 5: Re-run Perfil tests and expect pass.**
- [ ] **Step 6: Commit** as `feat: upload profile photo from profile`.

### Task 5: Dashboard and duel avatar integration

**Files:**
- Modify: `app/src/firebase/firestore.js`
- Modify: `app/src/firebase/firestore.test.js`
- Modify: `app/src/pages/Dashboard.jsx`
- Modify: `app/src/pages/Dashboard.test.jsx`
- Modify: `app/src/pages/Duelo.jsx`
- Modify: `app/src/pages/Duelo.test.jsx`

**Interfaces:**
- Produces: duel participant objects containing both `displayName` and `avatarUrl`.
- Consumes: Avatar from Task 3.

- [ ] **Step 1: Add failing Firestore test** requiring `getActiveDuel` to include `participantProfiles[uid].avatarUrl` from each public profile rather than only a names map.
- [ ] **Step 2: Add failing Dashboard and Duelo tests** that pass participant avatar URLs and assert images named `Foto de Aaron` and `Foto de alexa` render.
- [ ] **Step 3: Run the three focused test files and verify the expected failures.**
- [ ] **Step 4: Extend duel hydration without removing existing `participantNames`; add `participantProfiles`, then replace duplicated initial circles in Dashboard and Duelo with Avatar.**
- [ ] **Step 5: Re-run focused tests and expect pass.**
- [ ] **Step 6: Commit** as `feat: show participant photos in duel views`.

### Task 6: Full verification and production release

**Files:**
- Modify only if verification exposes a reproducible defect, beginning with a failing test.

**Interfaces:**
- Consumes: all tasks above.
- Produces: Firebase Storage rules and web app live in production.

- [ ] **Step 1: Start Auth, Firestore, and Storage emulators and run** `npm test`; expect the full suite to pass.
- [ ] **Step 2: Run** `npm run build`; expect a successful Vite production build with no unresolved imports.
- [ ] **Step 3: Run `git diff --check` and inspect `git status --short` so only intended files are committed.**
- [ ] **Step 4: Deploy** `npx firebase-tools deploy --only storage --project comar-fit` and verify successful rule compilation/release.
- [ ] **Step 5: Push `main` to GitHub and trigger/verify the matching Vercel production deployment.**
- [ ] **Step 6: Verify in production that Perfil accepts and displays a photo, Dashboard and Duelo display both avatars, fallback initials remain functional, and browser console has no errors.**

