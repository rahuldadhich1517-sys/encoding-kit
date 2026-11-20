import { describe, it, expect } from 'vitest';
import {
  imageToBase64,
  fileToBase64,
  blobToBase64,
  getImageFileMetadata,
  validateImageFile,
} from '../src/image-to-base64/image-to-base64';
import { base64ToBytes } from '../src/common/bytes';
import { ValidationError } from '../src/common/errors';

const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const PNG_BYTES = base64ToBytes(PNG_BASE64);
const PNG_PART = PNG_BYTES as BlobPart;

describe('image-to-base64', () => {
  it('converts a valid image Blob to a data URI', async () => {
    const blob = new Blob([PNG_PART], { type: 'image/png' });
    const dataUri = await blobToBase64(blob);
    expect(dataUri.startsWith('data:image/png;base64,')).toBe(true);
    expect(dataUri).toContain(PNG_BASE64);
  });

  it('supports raw base64 output without data URI prefix', async () => {
    const blob = new Blob([PNG_PART], { type: 'image/png' });
    const raw = await imageToBase64(blob, { includeDataUri: false });
    expect(raw).toBe(PNG_BASE64);
  });

  it('converts a File object and retains metadata', async () => {
    const file = new File([PNG_PART], 'dot.png', { type: 'image/png', lastModified: 1700000000000 });
    const dataUri = await fileToBase64(file);
    expect(dataUri).toContain('data:image/png;base64,');

    const meta = await getImageFileMetadata(file);
    expect(meta.name).toBe('dot.png');
    expect(meta.format).toBe('png');
    expect(meta.mimeType).toBe('image/png');
    expect(meta.dimensions?.width).toBe(1);
    expect(meta.dimensions?.height).toBe(1);
    expect(meta.lastModified).toBe(1700000000000);
  });

  it('validates image file signature and size limits', async () => {
    const blob = new Blob([PNG_PART], { type: 'image/png' });
    const result = await validateImageFile(blob);
    expect(result.valid).toBe(true);
    expect(result.format).toBe('png');

    // Size limit
    const sizeFail = await validateImageFile(blob, { maxSizeBytes: 5 });
    expect(sizeFail.valid).toBe(false);
    expect(sizeFail.error).toContain('exceeds limit');

    // Allowed formats
    const formatFail = await validateImageFile(blob, { allowedFormats: ['gif'] });
    expect(formatFail.valid).toBe(false);
    expect(formatFail.error).toContain('allowed list');
  });

  it('rejects empty and corrupt files', async () => {
    const emptyBlob = new Blob([], { type: 'image/png' });
    const emptyResult = await validateImageFile(emptyBlob);
    expect(emptyResult.valid).toBe(false);
    expect(emptyResult.error).toContain('empty');

    const corruptBlob = new Blob([new Uint8Array([1, 2, 3, 4, 5])], { type: 'image/png' });
    const corruptResult = await validateImageFile(corruptBlob);
    expect(corruptResult.valid).toBe(false);
    expect(corruptResult.error).toContain('signature');

    await expect(blobToBase64(corruptBlob)).rejects.toThrow(ValidationError);
  });

  it('detects SVG files and threats in file metadata and validation', async () => {
    const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
    const svgBlob = new Blob([new TextEncoder().encode(svgContent)], { type: 'image/svg+xml' });
    const val = await validateImageFile(svgBlob);
    expect(val.valid).toBe(true);
    expect(val.threats).toBeDefined();

    const meta = await getImageFileMetadata(svgBlob);
    expect(meta.format).toBe('svg');
    expect(meta.hasThreats).toBe(true);
  });

  it('rejects invalid input types', async () => {
    // @ts-expect-error Testing invalid input
    await expect(blobToBase64('not a blob')).rejects.toThrow(ValidationError);
    // @ts-expect-error Testing invalid input
    await expect(getImageFileMetadata(null)).rejects.toThrow(ValidationError);
  });
});
