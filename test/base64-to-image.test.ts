import { describe, it, expect } from 'vitest';
import {
  parseBase64DataUri,
  base64ToBlob,
  base64ToImageBlob,
  validateBase64Image,
  getImageMetadata,
} from '../src/base64-to-image/base64-to-image';
import { ValidationError } from '../src/common/errors';
import { bytesToBase64, stringToBytes } from '../src/common/bytes';

const PNG_1X1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const GIF_1X1 = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const SVG_SAMPLE = 'data:image/svg+xml;base64,' + bytesToBase64(stringToBytes('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100"/></svg>'));
const SVG_DANGEROUS = 'data:image/svg+xml;base64,' + bytesToBase64(stringToBytes('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'));

describe('base64-to-image', () => {
  it('parses valid data URIs', () => {
    const parsed = parseBase64DataUri(PNG_1X1);
    expect(parsed.mimeType).toBe('image/png');
    expect(parsed.isBase64).toBe(true);
    expect(parsed.base64Data).toBe('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
  });

  it('rejects malformed data URIs in parser', () => {
    expect(() => parseBase64DataUri('not a data uri')).toThrow(ValidationError);
    expect(() => parseBase64DataUri(123 as unknown as string)).toThrow(ValidationError);
  });

  it('converts base64 to standard Blob', () => {
    const blob = base64ToBlob(PNG_1X1);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('validates image data correctly', () => {
    const validPng = validateBase64Image(PNG_1X1);
    expect(validPng.valid).toBe(true);
    expect(validPng.format).toBe('png');
    expect(validPng.mimeType).toBe('image/png');

    const validGif = validateBase64Image(GIF_1X1);
    expect(validGif.valid).toBe(true);
    expect(validGif.format).toBe('gif');
  });

  it('detects SVG security threats without DOM injection', () => {
    const safeCheck = validateBase64Image(SVG_SAMPLE);
    expect(safeCheck.valid).toBe(true);
    expect(safeCheck.format).toBe('svg');
    expect(safeCheck.threats).toBeUndefined();

    const dangerCheck = validateBase64Image(SVG_DANGEROUS);
    expect(dangerCheck.valid).toBe(true);
    expect(dangerCheck.threats).toBeDefined();
    expect(dangerCheck.threats?.[0]).toContain('<script>');
  });

  it('enforces size limits and allowed formats', () => {
    const sizeFail = validateBase64Image(PNG_1X1, { maxSizeBytes: 10 });
    expect(sizeFail.valid).toBe(false);
    expect(sizeFail.error).toContain('exceeds limit');

    const formatFail = validateBase64Image(PNG_1X1, { allowedFormats: ['jpeg', 'webp'] });
    expect(formatFail.valid).toBe(false);
    expect(formatFail.error).toContain('allowed list');
  });

  it('extracts image metadata and dimensions', async () => {
    const metadata = await getImageMetadata(PNG_1X1);
    expect(metadata.format).toBe('png');
    expect(metadata.mimeType).toBe('image/png');
    expect(metadata.dimensions?.width).toBe(1);
    expect(metadata.dimensions?.height).toBe(1);

    const blob = base64ToBlob(GIF_1X1);
    const gifMeta = await getImageMetadata(blob);
    expect(gifMeta.format).toBe('gif');
    expect(gifMeta.dimensions?.width).toBe(1);
    expect(gifMeta.dimensions?.height).toBe(1);
  });

  it('creates safe image Blobs via base64ToImageBlob', () => {
    const blob = base64ToImageBlob(PNG_1X1);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');

    // Throws on corrupt data
    expect(() => base64ToImageBlob('data:image/png;base64,AAAA')).toThrow(ValidationError);
  });
});
