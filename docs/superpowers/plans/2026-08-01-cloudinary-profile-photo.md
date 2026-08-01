# Cloudinary Profile Photo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upload processed profile avatars to Cloudinary and save the returned HTTPS URL in Firestore.

**Architecture:** A focused Cloudinary adapter owns the unsigned HTTP upload and exposes the existing `uploadProfilePhoto(uid, blob, onProgress)` contract. The profile page consumes that adapter, while Firebase remains responsible for authentication and Firestore data only.

**Tech Stack:** React 18, Vite 5, Vitest, Cloudinary Upload API, Firestore.

## Global Constraints

- Never expose or consume a Cloudinary API secret.
- Use only `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET`.
- Keep image validation and 512 px WebP processing unchanged.
- Upload timeout is 20 seconds.

---

### Task 1: Cloudinary upload adapter

**Files:**
- Create: `app/src/cloudinary/uploadProfilePhoto.js`
- Create: `app/src/cloudinary/uploadProfilePhoto.test.js`

**Interfaces:**
- Consumes: `uid: string`, `blob: Blob`, optional `onProgress(percent: number)`.
- Produces: `uploadProfilePhoto(uid, blob, onProgress): Promise<string>` resolving to `secure_url`.

- [ ] Write tests that inject a fake `XMLHttpRequest` and assert endpoint, form fields, progress, secure URL, missing configuration, HTTP errors, and timeout.
- [ ] Run `npm test -- src/cloudinary/uploadProfilePhoto.test.js` and confirm failure because the module is absent.
- [ ] Implement the minimal adapter using `XMLHttpRequest`, `FormData`, a 20-second timeout, and environment variables.
- [ ] Run the focused test and confirm it passes.

### Task 2: Profile integration and Firebase cleanup

**Files:**
- Modify: `app/src/pages/Perfil.jsx`
- Modify: `app/src/pages/Perfil.test.jsx`
- Modify: `app/src/firebase/config.js`
- Delete: `app/src/firebase/storage.js`
- Delete: `app/src/firebase/storage.test.js`
- Modify: `app/.env.example` if present.

**Interfaces:**
- Consumes: Task 1's `uploadProfilePhoto`.
- Produces: existing profile workflow with Cloudinary-specific configuration and timeout messages.

- [ ] Update the profile test mock to the Cloudinary module and add an assertion for configuration errors.
- [ ] Run the focused profile test and confirm it fails against the old import/error copy.
- [ ] Switch the profile import and messages, remove Firebase Storage initialization/emulator code, and document the two public variables.
- [ ] Run the focused profile test and confirm it passes.

### Task 3: Verification and publication

**Files:**
- Modify: only files required by failures introduced by Tasks 1-2.

**Interfaces:**
- Consumes: completed Cloudinary integration.
- Produces: tested production build on GitHub `main`, triggering Vercel.

- [ ] Run `npm test` from `app` and record the exact result.
- [ ] Run `npm run build` from `app` and confirm exit code 0.
- [ ] Inspect `git diff --check` and `git status -sb`; stage only Cloudinary integration files and docs.
- [ ] Commit with `fix: upload profile photos with cloudinary` and push `main` as explicitly requested by the user.

