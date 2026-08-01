import { describe, expect, it, vi } from 'vitest';
import { processProfileImage, validateProfileImage } from './profileImage';

describe('validateProfileImage', () => {
  it('accepts an image up to 2 MB', () => {
    expect(validateProfileImage(new File(['ok'], 'avatar.png', { type: 'image/png' }))).toBeNull();
  });

  it('rejects non-images', () => {
    expect(validateProfileImage(new File(['x'], 'avatar.txt', { type: 'text/plain' }))).toMatch(/imagen/i);
  });

  it('rejects files over 2 MB', () => {
    expect(validateProfileImage({ type: 'image/jpeg', size: 2 * 1024 * 1024 + 1 })).toMatch(/2 MB/i);
  });
});

describe('processProfileImage', () => {
  it('center-crops, scales and encodes a 512px WebP', async () => {
    const drawImage = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toBlob: (callback, type, quality) => callback(new Blob(['webp'], { type })),
    };
    const bitmap = { width: 800, height: 600, close: vi.fn() };

    const result = await processProfileImage(new File(['x'], 'a.png', { type: 'image/png' }), {
      createImageBitmap: vi.fn().mockResolvedValue(bitmap),
      canvasFactory: () => canvas,
    });

    expect(canvas.width).toBe(512);
    expect(canvas.height).toBe(512);
    expect(drawImage).toHaveBeenCalledWith(bitmap, 100, 0, 600, 600, 0, 0, 512, 512);
    expect(result.type).toBe('image/webp');
    expect(bitmap.close).toHaveBeenCalledOnce();
  });

  it('rejects an encoded payload over 1 MB', async () => {
    const canvas = {
      getContext: () => ({ drawImage: vi.fn() }),
      toBlob: (callback) => callback(new Blob([new Uint8Array(1024 * 1024 + 1)], { type: 'image/webp' })),
    };
    await expect(processProfileImage(new File(['x'], 'a.png', { type: 'image/png' }), {
      createImageBitmap: vi.fn().mockResolvedValue({ width: 10, height: 10, close: vi.fn() }),
      canvasFactory: () => canvas,
    })).rejects.toThrow(/procesada/i);
  });
});
