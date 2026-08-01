export const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_PROCESSED_IMAGE_BYTES = 1024 * 1024;

export function validateProfileImage(file) {
  if (!file?.type?.startsWith('image/')) return 'Selecciona un archivo de imagen.';
  if (file.size > MAX_PROFILE_IMAGE_BYTES) return 'La imagen debe pesar como máximo 2 MB.';
  return null;
}

export async function processProfileImage(file, options = {}) {
  const validationError = validateProfileImage(file);
  if (validationError) throw new Error(validationError);

  const makeBitmap = options.createImageBitmap ?? globalThis.createImageBitmap;
  const makeCanvas = options.canvasFactory ?? (() => document.createElement('canvas'));
  const maxDimension = options.maxDimension ?? 512;
  const bitmap = await makeBitmap(file);

  try {
    const sourceSize = Math.min(bitmap.width, bitmap.height);
    const sourceX = (bitmap.width - sourceSize) / 2;
    const sourceY = (bitmap.height - sourceSize) / 2;
    const outputSize = Math.min(sourceSize, maxDimension);
    const canvas = makeCanvas();
    canvas.width = outputSize;
    canvas.height = outputSize;
    canvas.getContext('2d').drawImage(
      bitmap, sourceX, sourceY, sourceSize, sourceSize, 0, 0, outputSize, outputSize,
    );

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error('No pudimos procesar la imagen.')), 'image/webp', 0.82);
    });
    if (blob.size > MAX_PROCESSED_IMAGE_BYTES) throw new Error('La imagen procesada supera 1 MB.');
    return blob;
  } finally {
    bitmap.close?.();
  }
}
