# Comar-Fit Phase 1: Setup, Auth & Partner Linking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Comar-Fit React app with Firebase Authentication and Firestore, so both users can register, log in, and link into a shared `duels/{duelId}` document — the foundation Phases 2-5 build on.

**Architecture:** A Vite + React 18 SPA talks directly to Firebase Authentication and Firestore from the client (no custom backend in this phase). Tailwind is configured with the existing "Kinetic Glow" design tokens so the auth screens already match the mockups' visual language. All automated tests run against the Firebase Local Emulator Suite (Auth + Firestore) so no real Firebase project or credentials are needed to develop or test this phase.

**Tech Stack:** React 18, Vite 5, React Router 6, Tailwind CSS 3, Firebase JS SDK 10 (Authentication + Firestore), Vitest + React Testing Library, `@firebase/rules-unit-testing`, Firebase Emulator Suite (`firebase-tools`).

## Global Constraints

- Frontend is React 18 + Vite; UI styling is Tailwind CSS reusing the existing Kinetic Glow tokens (`stitch_duofit_workout_duel/kinetic_glow/DESIGN.md`) — no new design system.
- This phase uses Firebase Authentication + Firestore directly from the client only. No Node/Express backend or Cloud Functions in Phase 1 (those come in later phases for scoring/auto-archiving).
- `users/{uid}` and `duels/{duelId}` documents must match the schemas in `docs/superpowers/specs/2026-07-31-comar-fit-design.md` exactly, including the corrected `metricsWeight: { minutes, exercises, reps, calories }` (not `weight`).
- Weekly duel window is Monday 00:00 UTC through Sunday 23:59:59.999 UTC (per spec's Weekly Duel Structure section).
- Apple HealthKit is out of scope entirely (dropped from v1 in the spec) — manual entry only, and Phase 1 doesn't touch workout entry at all.
- Mobile-first: screens must be usable down to 320px width (spec's Performance & Accessibility section).
- Exactly two users link per duel via manual email entry ("Conectar compañero") — no multi-user search/invite system.
- All automated tests must be runnable against the Firebase emulators, without a real Firebase project, API keys, or `firebase login`.

---

### Task 1: Project scaffold — Vite + React + Tailwind with Kinetic Glow tokens

**Files:**
- Create: `app/package.json`
- Create: `app/vite.config.js`
- Create: `app/vitest.config.js`
- Create: `app/tailwind.config.js`
- Create: `app/postcss.config.js`
- Create: `app/index.html`
- Create: `app/.gitignore`
- Create: `app/src/main.jsx`
- Create: `app/src/App.jsx`
- Create: `app/src/index.css`
- Create: `app/src/setupTests.js`
- Test: `app/src/App.test.jsx`

**Interfaces:**
- Produces: `App` default export from `app/src/App.jsx` (will be replaced with routing in Task 11 — this task's version is a temporary placeholder).

- [ ] **Step 1: Create `app/package.json`**

```json
{
  "name": "comar-fit",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "emulators": "firebase emulators:start --only auth,firestore"
  },
  "dependencies": {
    "firebase": "^10.13.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@firebase/rules-unit-testing": "^3.0.4",
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@tailwindcss/forms": "^0.5.7",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "firebase-tools": "^13.15.0",
    "jsdom": "^24.1.1",
    "postcss": "^8.4.41",
    "tailwindcss": "^3.4.10",
    "vite": "^5.4.1",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Create `app/.gitignore`**

```
node_modules
dist
.env
.env.local
.firebase
firebase-debug.log
firestore-debug.log
ui-debug.log
```

- [ ] **Step 3: Create `app/vite.config.js`**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

- [ ] **Step 4: Create `app/vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    globals: true,
  },
});
```

- [ ] **Step 5: Create `app/src/setupTests.js`**

```js
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 6: Create `app/postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 7: Create `app/tailwind.config.js`**

Ported directly from the existing Stitch mockups (`stitch_duofit_workout_duel/duofit_dashboard_inicio/code.html`) so the design tokens stay identical.

```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'on-error-container': '#ffdad6',
        'secondary-fixed-dim': '#e5b4ff',
        'inverse-primary': '#006970',
        'on-primary': '#00363a',
        'primary-fixed-dim': '#00dbe9',
        'tertiary-fixed-dim': '#ffaed9',
        'outline-variant': '#3b494b',
        'surface-container': '#201f1f',
        'on-primary-fixed-variant': '#004f54',
        'surface-container-lowest': '#0e0e0e',
        'on-secondary': '#4f0077',
        'surface-container-low': '#1c1b1b',
        'surface-tint': '#00dbe9',
        'inverse-surface': '#e5e2e1',
        'on-secondary-fixed': '#30004b',
        'on-surface': '#e5e2e1',
        tertiary: '#fff3f6',
        'tertiary-fixed': '#ffd8ea',
        'secondary-fixed': '#f5d9ff',
        'inverse-on-surface': '#313030',
        'surface-container-high': '#2a2a2a',
        secondary: '#e5b4ff',
        'on-tertiary-fixed-variant': '#890064',
        'on-error': '#690005',
        'on-tertiary': '#610046',
        'on-primary-fixed': '#002022',
        'on-tertiary-fixed': '#3c002a',
        'surface-container-highest': '#353534',
        'secondary-container': '#ad00fe',
        'surface-bright': '#393939',
        'primary-container': '#00f0ff',
        'on-background': '#e5e2e1',
        'surface-dim': '#131313',
        error: '#ffb4ab',
        surface: '#131313',
        'on-secondary-container': '#fef0ff',
        'on-tertiary-container': '#b40084',
        'on-primary-container': '#006970',
        'error-container': '#93000a',
        'surface-variant': '#353534',
        'on-surface-variant': '#b9cacb',
        'tertiary-container': '#ffcbe4',
        'on-secondary-fixed-variant': '#7000a7',
        background: '#131313',
        primary: '#dbfcff',
        outline: '#849495',
        'primary-fixed': '#7df4ff',
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
      spacing: {
        md: '24px',
        sm: '16px',
        margin_desktop: '48px',
        xl: '64px',
        margin_mobile: '20px',
        xs: '8px',
        lg: '40px',
        base: '4px',
        gutter: '16px',
      },
      fontFamily: {
        'headline-lg': ['Montserrat'],
        'display-lg': ['Montserrat'],
        'body-md': ['Inter'],
        'display-md': ['Montserrat'],
        'stats-num': ['Montserrat'],
        'body-lg': ['Inter'],
        'headline-lg-mobile': ['Montserrat'],
        'label-md': ['Inter'],
      },
      fontSize: {
        'headline-lg': ['24px', { lineHeight: '32px', fontWeight: '700' }],
        'display-lg': ['48px', { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '800' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'display-md': ['32px', { lineHeight: '40px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'stats-num': ['24px', { lineHeight: '24px', letterSpacing: '-0.02em', fontWeight: '800' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'headline-lg-mobile': ['20px', { lineHeight: '28px', fontWeight: '700' }],
        'label-md': ['14px', { lineHeight: '20px', letterSpacing: '0.05em', fontWeight: '600' }],
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
```

- [ ] **Step 8: Create `app/index.html`**

```html
<!doctype html>
<html lang="es" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Comar-Fit</title>
    <link
      href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Inter:wght@100..900&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
      rel="stylesheet"
    />
  </head>
  <body class="bg-background text-on-surface font-body-md">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 9: Create `app/src/index.css`**

Ported from the mockups' shared `<style>` block so `.glass-card` and `.action-gradient` are available to every page.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  .material-symbols-outlined {
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }
  .glass-card {
    background: rgba(28, 28, 30, 0.7);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
  .action-gradient {
    background: linear-gradient(135deg, #00dbe9 0%, #ad00fe 100%);
  }
}
```

- [ ] **Step 10: Create `app/src/main.jsx`**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 11: Write the failing test — `app/src/App.test.jsx`**

```jsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the Comar-Fit heading', () => {
    render(<App />);
    expect(screen.getByText('Comar-Fit')).toBeInTheDocument();
  });
});
```

- [ ] **Step 12: Install dependencies**

Run (from `app/`): `npm install`

- [ ] **Step 13: Run test to verify it fails**

Run: `npm test -- App.test.jsx`
Expected: FAIL — `app/src/App.jsx` doesn't exist yet.

- [ ] **Step 14: Create `app/src/App.jsx` (temporary placeholder, replaced in Task 11)**

```jsx
function App() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <h1 className="font-display-lg text-primary">Comar-Fit</h1>
    </main>
  );
}

export default App;
```

- [ ] **Step 15: Run test to verify it passes**

Run: `npm test -- App.test.jsx`
Expected: PASS

- [ ] **Step 16: Commit**

```bash
git add app/
git commit -m "feat: scaffold Vite + React + Tailwind app with Kinetic Glow tokens"
```

---

### Task 2: Firebase SDK, emulator configuration, and security rules

**Files:**
- Create: `app/src/firebase/config.js`
- Create: `app/firebase.json`
- Create: `app/.firebaserc`
- Create: `app/firestore.rules`
- Create: `app/firestore.indexes.json`
- Create: `app/.env.example`

**Interfaces:**
- Produces: `app`, `auth`, `db` named exports from `app/src/firebase/config.js` — the initialized Firebase App, Auth, and Firestore instances every later Firebase call uses.

**Prerequisites (cannot be scripted — verify manually first):**
- Node.js 18+ and `npm` available.
- A JRE (Java 11+) installed — the Firestore emulator requires it. Check with `java -version`.

- [ ] **Step 1: Create `app/.firebaserc`**

`comar-fit-dev` is a placeholder project id used only by the emulators — no real Firebase project is needed for this phase.

```json
{
  "projects": {
    "default": "comar-fit-dev"
  }
}
```

- [ ] **Step 2: Create `app/firestore.indexes.json`**

```json
{
  "indexes": [],
  "fieldOverrides": []
}
```

- [ ] **Step 3: Create `app/firestore.rules`**

Users can only create/update their own `users/{uid}` document (reads are open to any authenticated user — this is a private 2-person app, so exposing display data between the two linked users is an accepted simplification). Duel documents are only readable/writable by their two participants.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && request.auth.uid == userId;
      allow delete: if false;
    }

    match /duels/{duelId} {
      allow read: if request.auth != null &&
        (resource.data.userA_uid == request.auth.uid || resource.data.userB_uid == request.auth.uid);
      allow create: if request.auth != null &&
        (request.resource.data.userA_uid == request.auth.uid || request.resource.data.userB_uid == request.auth.uid);
      allow update: if request.auth != null &&
        (resource.data.userA_uid == request.auth.uid || resource.data.userB_uid == request.auth.uid);
      allow delete: if false;
    }
  }
}
```

- [ ] **Step 4: Create `app/firebase.json`**

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
```

- [ ] **Step 5: Create `app/.env.example`**

Real values are only needed for a production build against a real Firebase project (see Task 13). Local dev and all tests use the emulators with dummy values, so no `.env` file is required to get started.

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_APP_ID=
```

- [ ] **Step 6: Create `app/src/firebase/config.js`**

```js
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'comar-fit-dev.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'comar-fit-dev',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'comar-fit-dev.appspot.com',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'demo-app-id',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const useEmulator = import.meta.env.DEV || import.meta.env.MODE === 'test';

if (useEmulator && !globalThis.__FIREBASE_EMULATOR_CONNECTED__) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  globalThis.__FIREBASE_EMULATOR_CONNECTED__ = true;
}
```

- [ ] **Step 7: Verify the emulators start**

Run (from `app/`, in its own terminal — leave it running for the rest of Phase 1): `npm run emulators`
Expected: Console prints `✔  All emulators ready!` and the Emulator UI is reachable at `http://127.0.0.1:4000`. Every task from here on that touches Firebase requires this running.

- [ ] **Step 8: Commit**

```bash
git add app/
git commit -m "feat: configure Firebase SDK, emulator suite, and Firestore security rules"
```

---

### Task 3: Week-boundary utility

**Files:**
- Create: `app/src/firebase/firestore.js`
- Test: `app/src/firebase/firestore.test.js`

**Interfaces:**
- Produces: `computeWeekBoundaries(referenceDate: Date): { weekStartDate: Date, weekEndDate: Date }` from `app/src/firebase/firestore.js`. `weekStartDate` is Monday 00:00:00.000 UTC of that week; `weekEndDate` is the following Sunday 23:59:59.999 UTC.

No emulator needed for this task — pure date math.

- [ ] **Step 1: Write the failing test — `app/src/firebase/firestore.test.js`**

Anchored on 2024-01-01, a confirmed Monday, so the expected values are unambiguous.

```js
import { describe, it, expect } from 'vitest';
import { computeWeekBoundaries } from './firestore';

describe('computeWeekBoundaries', () => {
  it('returns Monday 00:00 UTC through Sunday 23:59:59.999 UTC for a mid-week date', () => {
    const wednesday = new Date('2024-01-03T15:30:00.000Z');
    const { weekStartDate, weekEndDate } = computeWeekBoundaries(wednesday);

    expect(weekStartDate.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    expect(weekEndDate.toISOString()).toBe('2024-01-07T23:59:59.999Z');
  });

  it('keeps Sunday in the same week as the preceding Monday', () => {
    const sunday = new Date('2024-01-07T10:00:00.000Z');
    const { weekStartDate, weekEndDate } = computeWeekBoundaries(sunday);

    expect(weekStartDate.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    expect(weekEndDate.toISOString()).toBe('2024-01-07T23:59:59.999Z');
  });

  it('maps Monday at midnight to itself as the week start', () => {
    const monday = new Date('2024-01-01T00:00:00.000Z');
    const { weekStartDate, weekEndDate } = computeWeekBoundaries(monday);

    expect(weekStartDate.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    expect(weekEndDate.toISOString()).toBe('2024-01-07T23:59:59.999Z');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- firestore.test.js`
Expected: FAIL — `app/src/firebase/firestore.js` doesn't exist yet.

- [ ] **Step 3: Create `app/src/firebase/firestore.js`**

```js
export function computeWeekBoundaries(referenceDate) {
  const day = referenceDate.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysSinceMonday = (day + 6) % 7;

  const weekStartDate = new Date(referenceDate);
  weekStartDate.setUTCDate(referenceDate.getUTCDate() - daysSinceMonday);
  weekStartDate.setUTCHours(0, 0, 0, 0);

  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setUTCDate(weekStartDate.getUTCDate() + 6);
  weekEndDate.setUTCHours(23, 59, 59, 999);

  return { weekStartDate, weekEndDate };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- firestore.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/firebase/firestore.js app/src/firebase/firestore.test.js
git commit -m "feat: add computeWeekBoundaries utility"
```

---

### Task 4: User document create/read

**Files:**
- Modify: `app/src/firebase/firestore.js`
- Modify: `app/src/firebase/firestore.test.js`

**Interfaces:**
- Consumes: `db` from `app/src/firebase/config.js` (Task 2).
- Produces: `createUserDocument(uid: string, profile: { email, displayName, gender, age, weight, height, experienceLevel }): Promise<void>` and `getUserDocument(uid: string): Promise<object|null>` from `app/src/firebase/firestore.js`.

**Requires the emulators running** (`npm run emulators` from Task 2, Step 7).

- [ ] **Step 1: Write the failing test — append to `app/src/firebase/firestore.test.js`**

```js
import { createUserDocument, getUserDocument } from './firestore';

function randomUid() {
  return `uid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

describe('createUserDocument / getUserDocument', () => {
  it('creates a user document and reads it back', async () => {
    const uid = randomUid();
    const profile = {
      email: 'comar@example.com',
      displayName: 'Comar',
      gender: 'M',
      age: 30,
      weight: 75,
      height: 178,
      experienceLevel: 'Intermediate',
    };

    await createUserDocument(uid, profile);
    const stored = await getUserDocument(uid);

    expect(stored).toMatchObject(profile);
  });

  it('returns null for a user document that does not exist', async () => {
    const stored = await getUserDocument('does-not-exist');
    expect(stored).toBeNull();
  });
});
```

(Add the `createUserDocument, getUserDocument` import to the existing `import { computeWeekBoundaries } from './firestore';` line instead of a separate import line.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- firestore.test.js`
Expected: FAIL — `createUserDocument` and `getUserDocument` are not exported yet.

- [ ] **Step 3: Add to `app/src/firebase/firestore.js`**

```js
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

export async function createUserDocument(uid, profile) {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, {
    ...profile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getUserDocument(uid) {
  const ref = doc(db, 'users', uid);
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? snapshot.data() : null;
}
```

(Add these imports and functions above `computeWeekBoundaries` in the file.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- firestore.test.js`
Expected: PASS (5 tests total: 3 from Task 3, 2 new)

- [ ] **Step 5: Commit**

```bash
git add app/src/firebase/firestore.js app/src/firebase/firestore.test.js
git commit -m "feat: add createUserDocument and getUserDocument"
```

---

### Task 5: Firebase Authentication wrapper

**Files:**
- Create: `app/src/firebase/auth.js`
- Test: `app/src/firebase/auth.test.js`

**Interfaces:**
- Consumes: `auth` from `app/src/firebase/config.js` (Task 2).
- Produces: `registerUser(email: string, password: string): Promise<UserCredential>`, `loginUser(email: string, password: string): Promise<UserCredential>`, `logoutUser(): Promise<void>` from `app/src/firebase/auth.js`.

**Requires the emulators running.**

- [ ] **Step 1: Write the failing test — `app/src/firebase/auth.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { registerUser, loginUser, logoutUser } from './auth';

function randomEmail() {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

describe('auth', () => {
  it('registers a new user with email and password', async () => {
    const email = randomEmail();
    const credential = await registerUser(email, 'secret123');
    expect(credential.user.email).toBe(email);
  });

  it('logs in a user that was already registered', async () => {
    const email = randomEmail();
    await registerUser(email, 'secret123');
    await logoutUser();

    const credential = await loginUser(email, 'secret123');
    expect(credential.user.email).toBe(email);
  });

  it('rejects login with the wrong password', async () => {
    const email = randomEmail();
    await registerUser(email, 'secret123');
    await logoutUser();

    await expect(loginUser(email, 'wrong-password')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- auth.test.js`
Expected: FAIL — `app/src/firebase/auth.js` doesn't exist yet.

- [ ] **Step 3: Create `app/src/firebase/auth.js`**

```js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from './config';

export function registerUser(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function loginUser(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function logoutUser() {
  return signOut(auth);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- auth.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/firebase/auth.js app/src/firebase/auth.test.js
git commit -m "feat: add registerUser, loginUser, logoutUser"
```

---

### Task 6: Partner lookup and duel creation

**Files:**
- Modify: `app/src/firebase/firestore.js`
- Modify: `app/src/firebase/firestore.test.js`

**Interfaces:**
- Consumes: `computeWeekBoundaries` (Task 3), `db` (Task 2).
- Produces: `findUserByEmail(email: string): Promise<{ uid: string, ... } | null>`, `findActiveDuelForUser(uid: string): Promise<{ duelId: string, ... } | null>`, `createDuel(userAUid: string, userBUid: string): Promise<string>` (resolves to the new `duelId`) from `app/src/firebase/firestore.js`.

**Requires the emulators running.**

- [ ] **Step 1: Write the failing test — append to `app/src/firebase/firestore.test.js`**

The `users` and `duels` security rules (Task 2) require a real signed-in Firebase Auth user whose uid matches the document being written or queried — a bare `randomUid()` with no authentication is correctly rejected by the rules. So these tests authenticate real emulator users via the Auth SDK directly (`app/src/firebase/auth.js` doesn't exist until Task 5, so import straight from `firebase/auth` here, just for test setup) and use their real uids, switching the signed-in user with `signInWithEmailAndPassword` where a test needs to act as a specific participant.

```js
import { findUserByEmail, findActiveDuelForUser, createDuel } from './firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './config';

describe('findUserByEmail', () => {
  it('finds a user document by email', async () => {
    const email = `find-${Date.now()}@example.com`;
    const credential = await createUserWithEmailAndPassword(auth, email, 'secret123');
    const uid = credential.user.uid;
    await createUserDocument(uid, {
      email,
      displayName: 'Alex',
      gender: 'F',
      age: 28,
      weight: 60,
      height: 165,
      experienceLevel: 'Advanced',
    });

    const found = await findUserByEmail(email);
    expect(found).toMatchObject({ uid, email, displayName: 'Alex' });
  });

  it('returns null when no user has that email', async () => {
    await createUserWithEmailAndPassword(auth, randomEmail(), 'secret123');
    const found = await findUserByEmail(`nobody-${Date.now()}@example.com`);
    expect(found).toBeNull();
  });
});

describe('createDuel / findActiveDuelForUser', () => {
  it('creates a duel and finds it for both participants', async () => {
    const emailA = randomEmail();
    const emailB = randomEmail();

    const credentialA = await createUserWithEmailAndPassword(auth, emailA, 'secret123');
    const userAUid = credentialA.user.uid;

    const credentialB = await createUserWithEmailAndPassword(auth, emailB, 'secret123');
    const userBUid = credentialB.user.uid;

    // createUserWithEmailAndPassword left the emulator signed in as B; the duel
    // create rule requires the caller to be one of the two participants, so
    // switch back to A before creating it (matching how ConnectPartner calls
    // createDuel as the currently signed-in user in Task 10).
    await signInWithEmailAndPassword(auth, emailA, 'secret123');

    const duelId = await createDuel(userAUid, userBUid);
    expect(duelId).toEqual(expect.any(String));

    const duelForA = await findActiveDuelForUser(userAUid);
    expect(duelForA).toMatchObject({ duelId, userA_uid: userAUid, userB_uid: userBUid, status: 'active' });

    // Reading B's side of the duel requires being signed in as B (the read
    // rule checks the caller against userA_uid/userB_uid on each document).
    await signInWithEmailAndPassword(auth, emailB, 'secret123');
    const duelForB = await findActiveDuelForUser(userBUid);
    expect(duelForB).toMatchObject({ duelId, userA_uid: userAUid, userB_uid: userBUid, status: 'active' });
  });

  it('returns null when the user has no active duel', async () => {
    const credential = await createUserWithEmailAndPassword(auth, randomEmail(), 'secret123');
    const duel = await findActiveDuelForUser(credential.user.uid);
    expect(duel).toBeNull();
  });
});
```

(Merge the new imports into the existing `import { ... } from './firestore';` and `import { ... } from './auth'`-style lines as applicable — there's already a `randomEmail()` helper defined in `app/src/firebase/auth.test.js`; add an equivalent one to `firestore.test.js` if it isn't already there from a Task 4 fix: `function randomEmail() { return \`test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com\`; }`. `randomUid()` may now be unused — remove it if so, keep it if Task 4's tests still reference it.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- firestore.test.js`
Expected: FAIL — `findUserByEmail`, `findActiveDuelForUser`, `createDuel` are not exported yet.

- [ ] **Step 3: Add to `app/src/firebase/firestore.js`**

```js
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';

export async function findUserByEmail(email) {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', email));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { uid: docSnap.id, ...docSnap.data() };
}

export async function findActiveDuelForUser(uid) {
  const duelsRef = collection(db, 'duels');
  const [asUserA, asUserB] = await Promise.all([
    getDocs(query(duelsRef, where('userA_uid', '==', uid), where('status', '==', 'active'))),
    getDocs(query(duelsRef, where('userB_uid', '==', uid), where('status', '==', 'active'))),
  ]);

  const match = asUserA.docs[0] ?? asUserB.docs[0];
  return match ? { duelId: match.id, ...match.data() } : null;
}

export async function createDuel(userAUid, userBUid) {
  const { weekStartDate, weekEndDate } = computeWeekBoundaries(new Date());
  const duelsRef = collection(db, 'duels');
  const docRef = doc(duelsRef);
  await setDoc(docRef, {
    duelId: docRef.id,
    userA_uid: userAUid,
    userB_uid: userBUid,
    weekStartDate: Timestamp.fromDate(weekStartDate),
    weekEndDate: Timestamp.fromDate(weekEndDate),
    status: 'active',
    rules: {
      normalizeByGender: true,
      metricsWeight: {
        minutes: 0.25,
        exercises: 0.25,
        reps: 0.25,
        calories: 0.25,
      },
    },
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}
```

(Merge the new `firebase/firestore` imports into the existing import block; add these functions after `getUserDocument`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- firestore.test.js`
Expected: PASS (9 tests total)

- [ ] **Step 5: Commit**

```bash
git add app/src/firebase/firestore.js app/src/firebase/firestore.test.js
git commit -m "feat: add findUserByEmail, findActiveDuelForUser, createDuel"
```

---

### Task 7: AuthContext

**Files:**
- Create: `app/src/contexts/AuthContext.jsx`
- Test: `app/src/contexts/AuthContext.test.jsx`

**Interfaces:**
- Consumes: `auth` from `app/src/firebase/config.js`, `onAuthStateChanged` from `firebase/auth`.
- Produces: `AuthProvider` (component, wraps children) and `useAuth(): { currentUser: FirebaseUser|null, authLoading: boolean }` from `app/src/contexts/AuthContext.jsx`.

- [ ] **Step 1: Write the failing test — `app/src/contexts/AuthContext.test.jsx`**

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { onAuthStateChanged } from 'firebase/auth';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
}));
vi.mock('../firebase/config', () => ({
  auth: {},
}));

function Consumer() {
  const { currentUser, authLoading } = useAuth();
  if (authLoading) return <p>loading</p>;
  return <p>{currentUser ? currentUser.uid : 'no-user'}</p>;
}

describe('AuthContext', () => {
  it('provides the authenticated user once Firebase reports one', async () => {
    onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback({ uid: 'uid-123' });
      return () => {};
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('uid-123')).toBeInTheDocument();
    });
  });

  it('provides null when no user is signed in', async () => {
    onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback(null);
      return () => {};
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('no-user')).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- AuthContext.test.jsx`
Expected: FAIL — `app/src/contexts/AuthContext.jsx` doesn't exist yet.

- [ ] **Step 3: Create `app/src/contexts/AuthContext.jsx`**

```jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, authLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- AuthContext.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/contexts/AuthContext.jsx app/src/contexts/AuthContext.test.jsx
git commit -m "feat: add AuthContext"
```

---

### Task 8: Register page

**Files:**
- Create: `app/src/pages/Register.jsx`
- Test: `app/src/pages/Register.test.jsx`

**Interfaces:**
- Consumes: `registerUser` (Task 5), `createUserDocument` (Task 4).
- Produces: `Register` default export from `app/src/pages/Register.jsx`. On success, navigates to `/connect-partner`.

- [ ] **Step 1: Write the failing test — `app/src/pages/Register.test.jsx`**

```jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Register from './Register';
import { registerUser } from '../firebase/auth';
import { createUserDocument } from '../firebase/firestore';

vi.mock('../firebase/auth');
vi.mock('../firebase/firestore');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('Register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers a new user and navigates to /connect-partner', async () => {
    registerUser.mockResolvedValue({ user: { uid: 'uid-123' } });
    createUserDocument.mockResolvedValue();

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/nombre completo/i), { target: { value: 'Comar' } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'comar@example.com' } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'secret123' } });
    fireEvent.change(screen.getByLabelText(/género/i), { target: { value: 'M' } });
    fireEvent.change(screen.getByLabelText(/edad/i), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText(/peso/i), { target: { value: '75' } });
    fireEvent.change(screen.getByLabelText(/altura/i), { target: { value: '178' } });
    fireEvent.change(screen.getByLabelText(/nivel de experiencia/i), { target: { value: 'Intermediate' } });

    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(registerUser).toHaveBeenCalledWith('comar@example.com', 'secret123');
      expect(createUserDocument).toHaveBeenCalledWith('uid-123', {
        email: 'comar@example.com',
        displayName: 'Comar',
        gender: 'M',
        age: 30,
        weight: 75,
        height: 178,
        experienceLevel: 'Intermediate',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/connect-partner');
    });
  });

  it('shows an error message when registration fails', async () => {
    registerUser.mockRejectedValue(new Error('email already in use'));

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/nombre completo/i), { target: { value: 'Comar' } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'comar@example.com' } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'secret123' } });
    fireEvent.change(screen.getByLabelText(/edad/i), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText(/peso/i), { target: { value: '75' } });
    fireEvent.change(screen.getByLabelText(/altura/i), { target: { value: '178' } });

    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));

    expect(await screen.findByText(/no pudimos crear tu cuenta/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- Register.test.jsx`
Expected: FAIL — `app/src/pages/Register.jsx` doesn't exist yet.

- [ ] **Step 3: Create `app/src/pages/Register.jsx`**

```jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../firebase/auth';
import { createUserDocument } from '../firebase/firestore';

const inputClass =
  'w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface';

const initialForm = {
  displayName: '',
  email: '',
  password: '',
  gender: 'M',
  age: '',
  weight: '',
  height: '',
  experienceLevel: 'Beginner',
};

function Register() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const credential = await registerUser(form.email, form.password);
      await createUserDocument(credential.user.uid, {
        email: form.email,
        displayName: form.displayName,
        gender: form.gender,
        age: Number(form.age),
        weight: Number(form.weight),
        height: Number(form.height),
        experienceLevel: form.experienceLevel,
      });
      navigate('/connect-partner');
    } catch (err) {
      setError('No pudimos crear tu cuenta. Verifica tus datos e intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 glass-card rounded-xl p-6">
        <h1 className="font-headline-lg text-on-surface">Crear tu cuenta</h1>

        <label className="block" htmlFor="displayName">Nombre completo</label>
        <input id="displayName" name="displayName" type="text" required value={form.displayName} onChange={handleChange} className={inputClass} />

        <label className="block" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required value={form.email} onChange={handleChange} className={inputClass} />

        <label className="block" htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" required minLength={6} value={form.password} onChange={handleChange} className={inputClass} />

        <label className="block" htmlFor="gender">Género</label>
        <select id="gender" name="gender" value={form.gender} onChange={handleChange} className={inputClass}>
          <option value="M">Masculino</option>
          <option value="F">Femenino</option>
        </select>

        <label className="block" htmlFor="age">Edad</label>
        <input id="age" name="age" type="number" required min={1} value={form.age} onChange={handleChange} className={inputClass} />

        <label className="block" htmlFor="weight">Peso (kg)</label>
        <input id="weight" name="weight" type="number" required min={1} value={form.weight} onChange={handleChange} className={inputClass} />

        <label className="block" htmlFor="height">Altura (cm)</label>
        <input id="height" name="height" type="number" required min={1} value={form.height} onChange={handleChange} className={inputClass} />

        <label className="block" htmlFor="experienceLevel">Nivel de experiencia</label>
        <select id="experienceLevel" name="experienceLevel" value={form.experienceLevel} onChange={handleChange} className={inputClass}>
          <option value="Beginner">Principiante</option>
          <option value="Intermediate">Intermedio</option>
          <option value="Advanced">Avanzado</option>
        </select>

        {error && <p className="text-error">{error}</p>}

        <button type="submit" disabled={submitting} className="w-full h-[56px] action-gradient rounded-xl font-label-md font-bold">
          Crear cuenta
        </button>

        <p className="text-on-surface-variant text-sm">
          ¿Ya tienes cuenta? <Link to="/login" className="text-primary-fixed-dim">Inicia sesión</Link>
        </p>
      </form>
    </main>
  );
}

export default Register;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- Register.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/Register.jsx app/src/pages/Register.test.jsx
git commit -m "feat: add Register page"
```

---

### Task 9: Login page

**Files:**
- Create: `app/src/pages/Login.jsx`
- Test: `app/src/pages/Login.test.jsx`

**Interfaces:**
- Consumes: `loginUser` (Task 5).
- Produces: `Login` default export from `app/src/pages/Login.jsx`. On success, navigates to `/`. Renders an `<h1>` reading "Iniciar sesión".

- [ ] **Step 1: Write the failing test — `app/src/pages/Login.test.jsx`**

```jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';
import { loginUser } from '../firebase/auth';

vi.mock('../firebase/auth');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs in and navigates to /', async () => {
    loginUser.mockResolvedValue({ user: { uid: 'uid-123' } });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'comar@example.com' } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(loginUser).toHaveBeenCalledWith('comar@example.com', 'secret123');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows an error message when login fails', async () => {
    loginUser.mockRejectedValue(new Error('invalid credentials'));

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'comar@example.com' } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByText(/email o contraseña incorrectos/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- Login.test.jsx`
Expected: FAIL — `app/src/pages/Login.jsx` doesn't exist yet.

- [ ] **Step 3: Create `app/src/pages/Login.jsx`**

```jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../firebase/auth';

const inputClass =
  'w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await loginUser(email, password);
      navigate('/');
    } catch (err) {
      setError('Email o contraseña incorrectos.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 glass-card rounded-xl p-6">
        <h1 className="font-headline-lg text-on-surface">Iniciar sesión</h1>

        <label className="block" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />

        <label className="block" htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />

        {error && <p className="text-error">{error}</p>}

        <button type="submit" disabled={submitting} className="w-full h-[56px] action-gradient rounded-xl font-label-md font-bold">
          Entrar
        </button>

        <p className="text-on-surface-variant text-sm">
          ¿No tienes cuenta? <Link to="/register" className="text-primary-fixed-dim">Regístrate</Link>
        </p>
      </form>
    </main>
  );
}

export default Login;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- Login.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/Login.jsx app/src/pages/Login.test.jsx
git commit -m "feat: add Login page"
```

---

### Task 10: ConnectPartner page

**Files:**
- Create: `app/src/pages/ConnectPartner.jsx`
- Test: `app/src/pages/ConnectPartner.test.jsx`

**Interfaces:**
- Consumes: `useAuth` (Task 7), `findUserByEmail`, `createDuel` (Task 6).
- Produces: `ConnectPartner` default export from `app/src/pages/ConnectPartner.jsx`. On success, navigates to `/dashboard`. Renders an `<h1>` containing "Conecta con tu pareja".

- [ ] **Step 1: Write the failing test — `app/src/pages/ConnectPartner.test.jsx`**

```jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ConnectPartner from './ConnectPartner';
import { findUserByEmail, createDuel } from '../firebase/firestore';

vi.mock('../firebase/firestore');
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ currentUser: { uid: 'comar-uid', email: 'comar@example.com' } }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('ConnectPartner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a duel and navigates to /dashboard when the partner exists', async () => {
    findUserByEmail.mockResolvedValue({ uid: 'alex-uid', email: 'alex@example.com' });
    createDuel.mockResolvedValue('duel-123');

    render(
      <MemoryRouter>
        <ConnectPartner />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email de tu pareja/i), { target: { value: 'alex@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /conectar/i }));

    await waitFor(() => {
      expect(createDuel).toHaveBeenCalledWith('comar-uid', 'alex-uid');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows an error when the partner email is not registered', async () => {
    findUserByEmail.mockResolvedValue(null);

    render(
      <MemoryRouter>
        <ConnectPartner />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email de tu pareja/i), { target: { value: 'nadie@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /conectar/i }));

    expect(await screen.findByText(/no encontramos ese email/i)).toBeInTheDocument();
    expect(createDuel).not.toHaveBeenCalled();
  });

  it('rejects connecting to your own email', async () => {
    render(
      <MemoryRouter>
        <ConnectPartner />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email de tu pareja/i), { target: { value: 'comar@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /conectar/i }));

    expect(await screen.findByText(/no puedes conectarte contigo mismo/i)).toBeInTheDocument();
    expect(findUserByEmail).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ConnectPartner.test.jsx`
Expected: FAIL — `app/src/pages/ConnectPartner.jsx` doesn't exist yet.

- [ ] **Step 3: Create `app/src/pages/ConnectPartner.jsx`**

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { findUserByEmail, createDuel } from '../firebase/firestore';

const inputClass =
  'w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-on-surface';

function ConnectPartner() {
  const { currentUser } = useAuth();
  const [partnerEmail, setPartnerEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (partnerEmail.trim().toLowerCase() === currentUser.email.toLowerCase()) {
      setError('No puedes conectarte contigo mismo.');
      return;
    }

    setSubmitting(true);
    try {
      const partner = await findUserByEmail(partnerEmail.trim());
      if (!partner) {
        setError('No encontramos ese email. Asegúrate de que tu pareja ya se registró.');
        return;
      }
      await createDuel(currentUser.uid, partner.uid);
      navigate('/dashboard');
    } catch (err) {
      setError('No pudimos conectar con tu pareja. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 glass-card rounded-xl p-6">
        <h1 className="font-headline-lg text-on-surface">Conecta con tu pareja</h1>
        <p className="text-on-surface-variant text-sm">
          Ingresa el email con el que tu pareja ya se registró para iniciar el duelo.
        </p>

        <label className="block" htmlFor="partnerEmail">Email de tu pareja</label>
        <input
          id="partnerEmail"
          name="partnerEmail"
          type="email"
          required
          value={partnerEmail}
          onChange={(e) => setPartnerEmail(e.target.value)}
          className={inputClass}
        />

        {error && <p className="text-error">{error}</p>}

        <button type="submit" disabled={submitting} className="w-full h-[56px] action-gradient rounded-xl font-label-md font-bold">
          Conectar
        </button>
      </form>
    </main>
  );
}

export default ConnectPartner;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- ConnectPartner.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/ConnectPartner.jsx app/src/pages/ConnectPartner.test.jsx
git commit -m "feat: add ConnectPartner page"
```

---

### Task 11: App routing — protect routes and dispatch to the right screen

**Files:**
- Modify: `app/src/App.jsx`
- Modify: `app/src/App.test.jsx`
- Create: `app/src/pages/Home.jsx`
- Create: `app/src/pages/Dashboard.jsx`

**Interfaces:**
- Consumes: `AuthProvider`, `useAuth` (Task 7); `Register` (Task 8); `Login` (Task 9); `ConnectPartner` (Task 10); `findActiveDuelForUser` (Task 6).
- Produces: final `App` default export wiring `/register`, `/login`, `/connect-partner`, `/dashboard`, `/`. `Dashboard` default export from `app/src/pages/Dashboard.jsx` (placeholder — real dashboard is Phase 2). `Home` default export from `app/src/pages/Home.jsx` — redirects `/` to `/connect-partner` or `/dashboard` based on whether the user has an active duel.

- [ ] **Step 1: Write the failing test — replace the contents of `app/src/App.test.jsx`**

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';
import { useAuth } from './contexts/AuthContext';
import { findActiveDuelForUser } from './firebase/firestore';

vi.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: vi.fn(),
}));
vi.mock('./firebase/firestore');

function setRoute(path) {
  window.history.pushState({}, '', path);
}

describe('App routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects unauthenticated users to /login from a protected route', async () => {
    useAuth.mockReturnValue({ currentUser: null, authLoading: false });
    setRoute('/dashboard');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /iniciar sesión/i })).toBeInTheDocument();
    });
  });

  it('sends an authenticated user with no duel to /connect-partner', async () => {
    useAuth.mockReturnValue({ currentUser: { uid: 'uid-1' }, authLoading: false });
    findActiveDuelForUser.mockResolvedValue(null);
    setRoute('/');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /conecta con tu pareja/i })).toBeInTheDocument();
    });
  });

  it('sends an authenticated user with an active duel to /dashboard', async () => {
    useAuth.mockReturnValue({ currentUser: { uid: 'uid-1' }, authLoading: false });
    findActiveDuelForUser.mockResolvedValue({ duelId: 'duel-1' });
    setRoute('/');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/fase 2/i)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- App.test.jsx`
Expected: FAIL — current `App` renders a static "Comar-Fit" heading, not routes; `Home` and `Dashboard` don't exist yet.

- [ ] **Step 3: Create `app/src/pages/Dashboard.jsx`**

```jsx
function Dashboard() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <p className="font-headline-lg text-on-surface">Dashboard — construido en la Fase 2.</p>
    </main>
  );
}

export default Dashboard;
```

- [ ] **Step 4: Create `app/src/pages/Home.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { findActiveDuelForUser } from '../firebase/firestore';

function Home() {
  const { currentUser } = useAuth();
  const [destination, setDestination] = useState(null);

  useEffect(() => {
    findActiveDuelForUser(currentUser.uid).then((duel) => {
      setDestination(duel ? '/dashboard' : '/connect-partner');
    });
  }, [currentUser.uid]);

  if (!destination) {
    return <p className="text-on-surface p-8">Cargando...</p>;
  }

  return <Navigate to={destination} replace />;
}

export default Home;
```

- [ ] **Step 5: Replace `app/src/App.jsx`**

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Register from './pages/Register';
import Login from './pages/Login';
import ConnectPartner from './pages/ConnectPartner';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';

function RequireAuth({ children }) {
  const { currentUser, authLoading } = useAuth();
  if (authLoading) return <p className="text-on-surface p-8">Cargando...</p>;
  if (!currentUser) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/connect-partner"
            element={
              <RequireAuth>
                <ConnectPartner />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Home />
              </RequireAuth>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- App.test.jsx`
Expected: PASS

- [ ] **Step 7: Run the full test suite**

Run: `npm test`
Expected: All tests across every task pass (make sure the emulators from Task 2 are still running for the Firebase-backed suites).

- [ ] **Step 8: Commit**

```bash
git add app/src/App.jsx app/src/App.test.jsx app/src/pages/Home.jsx app/src/pages/Dashboard.jsx
git commit -m "feat: wire up protected routing and duel-aware home redirect"
```

---

### Task 12: Firestore security rules tests

**Files:**
- Test: `app/tests/firestore.rules.test.js`

**Interfaces:**
- Consumes: `app/firestore.rules` (Task 2, unchanged by this task).

**Requires the emulators running.** This task only adds tests — the rules were already written in Task 2.

- [ ] **Step 1: Write the failing test — `app/tests/firestore.rules.test.js`**

```js
// @vitest-environment node
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, afterEach, describe, it } from 'vitest';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc } from 'firebase/firestore';

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'comar-fit-dev',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('firestore.rules', () => {
  it('lets a user create their own user document', async () => {
    const alice = testEnv.authenticatedContext('alice-uid');
    const ref = doc(alice.firestore(), 'users', 'alice-uid');
    await assertSucceeds(setDoc(ref, { email: 'alice@example.com' }));
  });

  it("blocks a user from creating another user's document", async () => {
    const alice = testEnv.authenticatedContext('alice-uid');
    const ref = doc(alice.firestore(), 'users', 'bob-uid');
    await assertFails(setDoc(ref, { email: 'bob@example.com' }));
  });

  it('blocks unauthenticated writes to a user document', async () => {
    const anon = testEnv.unauthenticatedContext();
    const ref = doc(anon.firestore(), 'users', 'alice-uid');
    await assertFails(setDoc(ref, { email: 'alice@example.com' }));
  });

  it('lets a duel participant read the duel document', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'duels', 'duel-1'), {
        userA_uid: 'alice-uid',
        userB_uid: 'bob-uid',
        status: 'active',
      });
    });

    const alice = testEnv.authenticatedContext('alice-uid');
    const ref = doc(alice.firestore(), 'duels', 'duel-1');
    await assertSucceeds(getDoc(ref));
  });

  it('blocks a non-participant from reading the duel document', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'duels', 'duel-1'), {
        userA_uid: 'alice-uid',
        userB_uid: 'bob-uid',
        status: 'active',
      });
    });

    const carol = testEnv.authenticatedContext('carol-uid');
    const ref = doc(carol.firestore(), 'duels', 'duel-1');
    await assertFails(getDoc(ref));
  });
});
```

- [ ] **Step 2: Run test to verify current behavior**

Run (from `app/`): `npx vitest run tests/firestore.rules.test.js`
Expected: PASS — the rules were already written correctly in Task 2. This test suite exists to catch future regressions, so if any assertion fails here, stop and fix `firestore.rules` before continuing (do not weaken a test to make it pass).

- [ ] **Step 3: Commit**

```bash
git add app/tests/firestore.rules.test.js
git commit -m "test: add Firestore security rules coverage"
```

---

### Task 13: Real Firebase project setup docs and manual end-to-end verification

**Files:**
- Create: `docs/firebase-setup.md`

**Interfaces:** None — this is a documentation and manual-verification task, no new code interfaces.

- [ ] **Step 1: Create `docs/firebase-setup.md`**

```markdown
# Setting up a real Firebase project for Comar-Fit

Phase 1 development and all automated tests run against the Firebase Local
Emulator Suite and need no real Firebase project. A real project is only
needed to deploy Comar-Fit somewhere Comar and Alexandra can actually use it.

## 1. Create the project

1. Go to the Firebase console and create a new project (e.g. `comar-fit`).
2. In the project, add a Web App (</> icon) and copy the resulting config
   values (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `appId`).
3. Enable **Authentication → Sign-in method → Email/Password**.
4. Enable **Firestore Database** (production mode — `app/firestore.rules`
   already defines the access rules; deploy them with
   `npx firebase deploy --only firestore:rules --project <your-project-id>`
   after running `npx firebase use --add` once to point the CLI at it).

## 2. Configure the app

Copy `app/.env.example` to `app/.env.local` and fill in the values from
step 1:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_APP_ID=...
```

`app/src/firebase/config.js` only connects to the emulators when
`import.meta.env.DEV` or the test runner is active, so a production build
(`npm run build`) automatically uses these real values instead.

## 3. Deploy

Follow the deployment steps in `docs/superpowers/specs/2026-07-31-comar-fit-design.md`
(Vercel for the frontend) once later phases add the remaining screens.
```

- [ ] **Step 2: Manual end-to-end verification**

With the emulators running (`npm run emulators`) and the dev server running (`npm run dev`, from `app/`):

1. Open the app, go to `/register`, register as "Comar" (any email/password).
2. Confirm you land on `/connect-partner`.
3. Open a second browser profile/incognito window, register as "Alexandra" with a different email.
4. As Alexandra, on `/connect-partner`, enter Comar's email and submit.
5. Confirm Alexandra lands on `/dashboard` (placeholder text).
6. As Comar, reload the app (still logged in) — confirm Comar also lands on `/dashboard` directly (the `Home` redirect now finds the active duel).
7. Open the Emulator UI (`http://127.0.0.1:4000`) → Firestore, and confirm a single `duels/{duelId}` document exists with both `userA_uid`/`userB_uid` set, `status: "active"`, and `rules.metricsWeight` containing `reps` (not `weight`).

If any step fails, fix the underlying task before proceeding — do not move on to Phase 2 with a broken auth/linking flow.

- [ ] **Step 3: Commit**

```bash
git add docs/firebase-setup.md
git commit -m "docs: add real Firebase project setup guide"
```

---

## Phase 1 Definition of Done

- [ ] All tasks above complete, all automated tests passing (`npm test` inside `app/`, emulators running).
- [ ] Firestore rules tests (Task 12) pass.
- [ ] Manual end-to-end verification (Task 13, Step 2) completed successfully for both users.
- [ ] Nothing from Phases 2-5 (UI screens beyond auth/linking, workout tracking, scoring, real-time dashboards, PWA/deploy) implemented yet — that's intentional, re-brainstorm each as we reach it.
