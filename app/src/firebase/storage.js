import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { storage } from './config';

export function uploadProfilePhoto(uid, blob, onProgress) {
  const photoRef = ref(storage, `profilePhotos/${uid}/avatar.webp`);
  const upload = uploadBytesResumable(photoRef, blob, { contentType: 'image/webp' });

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      callback(value);
    };
    const timeoutId = setTimeout(() => {
      upload.cancel();
      finish(reject, new Error('PROFILE_PHOTO_UPLOAD_TIMEOUT'));
    }, 15000);

    upload.on('state_changed', (snapshot) => {
      const percent = snapshot.totalBytes ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100) : 0;
      onProgress?.(percent);
    }, (error) => finish(reject, error), async () => {
      try {
        finish(resolve, await getDownloadURL(upload.snapshot.ref));
      } catch (error) {
        finish(reject, error);
      }
    });
  });
}
