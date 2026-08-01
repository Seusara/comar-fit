import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { storage } from './config';

export function uploadProfilePhoto(uid, blob, onProgress) {
  const photoRef = ref(storage, `profilePhotos/${uid}/avatar.webp`);
  const upload = uploadBytesResumable(photoRef, blob, { contentType: 'image/webp' });

  return new Promise((resolve, reject) => {
    upload.on('state_changed', (snapshot) => {
      const percent = snapshot.totalBytes ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100) : 0;
      onProgress?.(percent);
    }, reject, async () => {
      try {
        resolve(await getDownloadURL(upload.snapshot.ref));
      } catch (error) {
        reject(error);
      }
    });
  });
}
