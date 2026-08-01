const UPLOAD_TIMEOUT_MS = 20000;

function cloudinaryConfig() {
  const env = import.meta.env ?? {};
  const cloudName = env.VITE_CLOUDINARY_CLOUD_NAME?.trim();
  const uploadPreset = env.VITE_CLOUDINARY_UPLOAD_PRESET?.trim();
  if (!cloudName || !uploadPreset) throw new Error('CLOUDINARY_CONFIG_MISSING');
  return { cloudName, uploadPreset };
}

function responseError(xhr) {
  try {
    const message = JSON.parse(xhr.responseText)?.error?.message;
    if (message) return new Error(message);
  } catch {
    // Use the stable fallback below.
  }
  return new Error('PROFILE_PHOTO_UPLOAD_FAILED');
}

export function uploadProfilePhoto(uid, blob, onProgress) {
  let config;
  try {
    config = cloudinaryConfig();
  } catch (error) {
    return Promise.reject(error);
  }

  const body = new FormData();
  body.append('file', blob, 'avatar.webp');
  body.append('upload_preset', config.uploadPreset);
  body.append('context', `user_id=${uid}`);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      callback(value);
    };
    const timeoutId = setTimeout(() => {
      xhr.abort();
      finish(reject, new Error('PROFILE_PHOTO_UPLOAD_TIMEOUT'));
    }, UPLOAD_TIMEOUT_MS);

    xhr.open('POST', `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/image/upload`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => finish(reject, new Error('PROFILE_PHOTO_UPLOAD_NETWORK_ERROR'));
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) return finish(reject, responseError(xhr));
      try {
        const url = JSON.parse(xhr.responseText)?.secure_url;
        if (!url?.startsWith('https://')) throw new Error('PROFILE_PHOTO_UPLOAD_INVALID_RESPONSE');
        onProgress?.(100);
        finish(resolve, url);
      } catch (error) {
        finish(reject, error);
      }
    };
    xhr.send(body);
  });
}
