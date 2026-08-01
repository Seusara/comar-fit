# Cloudinary Profile Photo Design

## Goal

Replace Firebase Storage profile-photo uploads with Cloudinary unsigned uploads so COMAR-FIT can upload avatars on the free production setup.

## Design

- Keep the existing client-side validation and 512 px WebP processing.
- Upload the processed blob to Cloudinary with `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET`.
- Send the authenticated user's UID as upload context only; Cloudinary generates the public ID.
- Read and persist only Cloudinary's HTTPS `secure_url` in the existing Firestore `avatarUrl` field.
- Report XMLHttpRequest upload progress and fail after 20 seconds instead of remaining at 0% indefinitely.
- Never include a Cloudinary API key or API secret in the client.

## Error handling

Missing configuration produces a configuration-specific error. Timeout, non-2xx responses, malformed responses, and network failures reject cleanly and the profile page shows a useful Spanish message.

## Testing

Unit-test URL/form construction, progress reporting, successful secure URL extraction, missing configuration, HTTP failure, and timeout. Update the profile integration test to mock the Cloudinary adapter and run the complete test and production build suites.

