# COMAR-FIT PWA Design

## Goal

Convert the deployed Vite/React application into an installable Progressive Web App while preserving Firebase Authentication and Firestore correctness. The installed app must retain the Kinetic Glow identity and provide a useful shell when the device is offline.

## User Experience

- Browsers that support installation can install the app with the name `COMAR-FIT`.
- The installed app opens in standalone mode and uses the existing dark visual identity.
- The application shell remains available without connectivity.
- A visible, accessible notice explains when the device is offline.
- Authentication, partner linking, workout writes, and other Firebase operations continue to require connectivity. The PWA will not invent an offline mutation queue.
- Updated static assets are activated automatically on a later app load without interrupting an active session.

## Architecture

Use `vite-plugin-pwa` with Workbox-generated service worker assets. The Vite build remains the single production build used by Vercel.

The web app manifest will define:

- name and short name: `COMAR-FIT`
- `display: standalone`
- application theme and background colors matching Kinetic Glow
- start URL `/`
- portrait-friendly behavior
- 192px and 512px icons, including maskable support

The service worker precaches only the application shell and generated static assets. Navigation requests use an app-shell fallback so React Router routes can load when launched directly or while offline.

Firebase endpoints, Firestore requests, authentication traffic, and cross-origin API calls are not runtime-cached by the service worker. Firebase remains authoritative for all user and duel data.

## Components and Files

- `vite.config.js`: configure the PWA plugin, manifest, update behavior, and Workbox navigation fallback.
- `src/main.jsx`: register the generated service worker using the plugin's virtual registration module.
- `src/components/ConnectivityNotice.jsx`: observe browser `online` and `offline` events and render a persistent accessible notice while disconnected.
- `src/App.jsx` or the shared layout boundary: mount the connectivity notice once for the complete application.
- `public/`: application icons and Apple touch icon derived from the existing COMAR-FIT visual identity.
- `index.html`: theme color, Apple mobile web app metadata, manifest-related metadata, and favicon/icon links where needed.

## Caching and Updates

- Precache fingerprinted Vite assets and the HTML shell.
- Exclude Firebase/API responses from runtime caching.
- Do not cache authenticated Firestore data in Workbox.
- Register the service worker with automatic update checks.
- Let a newly downloaded worker activate safely on a subsequent load; do not force-reload the UI during form submission.

## Offline Behavior

When offline, existing static screens can render from cache. The global notice tells the user that actions requiring Firebase are unavailable. Existing error handling remains responsible for failed network operations. No workout is represented as saved unless Firebase confirms the write.

## Testing and Verification

- Component test: connectivity notice appears after an `offline` event and disappears after an `online` event.
- Configuration test: manifest contains the required installability fields and icons.
- Registration test: the app imports and invokes the PWA registration boundary.
- Production build: emits manifest and service worker artifacts.
- Browser verification: manifest is discoverable, service worker controls a reload, production URL has no console errors, and the installability requirements are satisfied.

## Deployment

Commit the implementation to `main` and push to GitHub. Vercel builds from the existing `app` root and deploys the PWA assets with the same Firebase environment variables. No Firebase Functions or additional backend service is required.
