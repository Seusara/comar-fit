import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { ref, uploadBytesResumable, getDownloadURL } = vi.hoisted(() => ({
  ref: vi.fn(),
  uploadBytesResumable: vi.fn(),
  getDownloadURL: vi.fn(),
}));

vi.mock('firebase/storage', () => ({ ref, uploadBytesResumable, getDownloadURL }));
vi.mock('./config', () => ({ storage: { name: 'storage' } }));

import { uploadProfilePhoto } from './storage';

describe('uploadProfilePhoto', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it('uploads the owner WebP, forwards progress and returns its URL', async () => {
    const snapshot = { ref: { fullPath: 'profilePhotos/aaron/avatar.webp' } };
    ref.mockReturnValue(snapshot.ref);
    uploadBytesResumable.mockImplementation(() => ({
      on: (_event, progress, _error, complete) => {
        progress({ bytesTransferred: 25, totalBytes: 100 });
        complete();
      },
      snapshot,
    }));
    getDownloadURL.mockResolvedValue('https://storage/avatar.webp');
    const onProgress = vi.fn();
    const blob = new Blob(['webp'], { type: 'image/webp' });

    await expect(uploadProfilePhoto('aaron', blob, onProgress)).resolves.toBe('https://storage/avatar.webp');
    expect(ref).toHaveBeenCalledWith({ name: 'storage' }, 'profilePhotos/aaron/avatar.webp');
    expect(uploadBytesResumable).toHaveBeenCalledWith(snapshot.ref, blob, { contentType: 'image/webp' });
    expect(onProgress).toHaveBeenCalledWith(25);
  });

  it('cancels and reports when Storage never starts the upload', async () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    ref.mockReturnValue({ fullPath: 'profilePhotos/aaron/avatar.webp' });
    uploadBytesResumable.mockReturnValue({ on: vi.fn(), cancel, snapshot: {} });

    const pending = uploadProfilePhoto('aaron', new Blob(['webp'], { type: 'image/webp' }));
    const rejection = expect(pending).rejects.toThrow('PROFILE_PHOTO_UPLOAD_TIMEOUT');
    await vi.advanceTimersByTimeAsync(15000);

    await rejection;
    expect(cancel).toHaveBeenCalledOnce();
  });
});
