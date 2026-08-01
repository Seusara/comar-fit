import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadProfilePhoto } from './uploadProfilePhoto';

class FakeXHR {
  static instances = [];

  constructor() {
    this.upload = {};
    this.status = 200;
    this.responseText = JSON.stringify({ secure_url: 'https://res.cloudinary.com/demo/image/upload/avatar.webp' });
    FakeXHR.instances.push(this);
  }

  open(method, url) {
    this.method = method;
    this.url = url;
  }

  send(body) {
    this.body = body;
  }

  abort() {
    this.aborted = true;
  }
}

describe('uploadProfilePhoto', () => {
  beforeEach(() => {
    FakeXHR.instances = [];
    vi.stubGlobal('XMLHttpRequest', FakeXHR);
    vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', 'dlwlv6iyab');
    vi.stubEnv('VITE_CLOUDINARY_UPLOAD_PRESET', 'comar_fit_perfil');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('uploads the processed WebP with the unsigned preset and returns secure_url', async () => {
    const blob = new Blob(['webp'], { type: 'image/webp' });
    const pending = uploadProfilePhoto('aaron', blob);
    const xhr = FakeXHR.instances[0];

    expect(xhr.method).toBe('POST');
    expect(xhr.url).toBe('https://api.cloudinary.com/v1_1/dlwlv6iyab/image/upload');
    expect(xhr.body.get('file')).toEqual(expect.objectContaining({ name: 'avatar.webp', type: 'image/webp', size: blob.size }));
    expect(xhr.body.get('upload_preset')).toBe('comar_fit_perfil');
    expect(xhr.body.get('context')).toBe('user_id=aaron');

    xhr.onload();
    await expect(pending).resolves.toBe('https://res.cloudinary.com/demo/image/upload/avatar.webp');
  });

  it('forwards upload progress', async () => {
    const onProgress = vi.fn();
    const pending = uploadProfilePhoto('aaron', new Blob(['webp']), onProgress);
    const xhr = FakeXHR.instances[0];

    xhr.upload.onprogress({ lengthComputable: true, loaded: 3, total: 4 });
    expect(onProgress).toHaveBeenCalledWith(75);
    xhr.onload();
    await pending;
  });

  it('rejects before starting when public Cloudinary configuration is missing', async () => {
    vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', '');

    await expect(uploadProfilePhoto('aaron', new Blob(['webp']))).rejects.toThrow('CLOUDINARY_CONFIG_MISSING');
    expect(FakeXHR.instances).toHaveLength(0);
  });

  it('rejects Cloudinary HTTP failures', async () => {
    const pending = uploadProfilePhoto('aaron', new Blob(['webp']));
    const xhr = FakeXHR.instances[0];
    xhr.status = 400;
    xhr.responseText = JSON.stringify({ error: { message: 'Invalid upload preset' } });

    xhr.onload();
    await expect(pending).rejects.toThrow('Invalid upload preset');
  });

  it('aborts and rejects stalled uploads', async () => {
    vi.useFakeTimers();
    const pending = uploadProfilePhoto('aaron', new Blob(['webp']));
    const rejection = expect(pending).rejects.toThrow('PROFILE_PHOTO_UPLOAD_TIMEOUT');
    const xhr = FakeXHR.instances[0];

    await vi.advanceTimersByTimeAsync(20000);
    expect(xhr.aborted).toBe(true);
    await rejection;
  });
});
