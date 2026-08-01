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
   already defines the access rules).

Then point the CLI at the new project and deploy the Firestore config:

```
npx firebase use --add
npx firebase deploy --only firestore --project <your-project-id>
```

Two things to know about those commands:

- `firebase use --add` **modifies the tracked `app/.firebaserc`**, which is
  currently pinned to `comar-fit-dev`. That change is expected — just be
  deliberate about whether you commit it.
- `--only firestore` deploys **both** `app/firestore.rules` and
  `app/firestore.indexes.json`. Use `--only firestore:rules` if you really
  want rules alone, but the indexes belong in the project too, so deploying
  them together is the normal path.

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

### Important: `npm run dev` always uses the emulators

Because that check is on `import.meta.env.DEV`, `npm run dev` connects to the
local emulators **regardless of what is in `.env.local`** — filling in real
credentials does not change where the dev server writes. To exercise the app
against the real Firebase project, build and serve the production bundle:

```
npm run build && npm run preview
```

## 3. Deploy

Follow the deployment steps in `docs/superpowers/specs/2026-07-31-comar-fit-design.md`
(Vercel for the frontend) once later phases add the remaining screens.
