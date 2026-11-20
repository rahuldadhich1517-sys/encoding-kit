import { describe, it, expect } from 'vitest';
import {
  detectImageSignature,
  getMimeForFormat,
  getExtensionForFormat,
  sanitizeSvgCheck,
} from '../src/common/image-signatures';
import {
  stringToBytes,
  bytesToString,
  toUint8Array,
  base64ToBytes,
} from '../src/common/bytes';
import { EncodingError, DecodingError, ValidationError } from '../src/common/errors';

describe('common utilities and image signatures', () => {
  it('instantiates all error types with default and custom codes', () => {
    const encErr = new EncodingError('encode failed');
    expect(encErr.code).toBe('ERR_ENCODING');
    expect(encErr.name).toBe('EncodingError');

    const decErr = new DecodingError('decode failed', 'ERR_CUSTOM_DEC');
    expect(decErr.code).toBe('ERR_CUSTOM_DEC');

    const valErr = new ValidationError('validation failed', 'ERR_CUSTOM_VAL');
    expect(valErr.code).toBe('ERR_CUSTOM_VAL');
  });

  it('tests byte helpers and conversions', () => {
    const b = stringToBytes('hello');
    expect(toUint8Array(b)).toBe(b);
    expect(toUint8Array('hello')).toEqual(b);
    expect(() => toUint8Array(123 as unknown as string)).toThrow(ValidationError);

    // bytesToString fatal error on invalid UTF-8
    const invalidUtf8 = new Uint8Array([0xff, 0xff]);
    expect(() => bytesToString(invalidUtf8, true)).toThrow(DecodingError);

    // base64ToBytes errors
    expect(() => base64ToBytes('A')).toThrow(DecodingError); // invalid length
    expect(() => base64ToBytes('????')).toThrow(DecodingError); // invalid char
  });

  it('maps image formats to MIME types and extensions', () => {
    expect(getMimeForFormat('png')).toBe('image/png');
    expect(getMimeForFormat('jpeg')).toBe('image/jpeg');
    expect(getMimeForFormat('webp')).toBe('image/webp');
    expect(getMimeForFormat('gif')).toBe('image/gif');
    expect(getMimeForFormat('svg')).toBe('image/svg+xml');

    expect(getExtensionForFormat('png')).toBe('png');
    expect(getExtensionForFormat('jpeg')).toBe('jpg');
    expect(getExtensionForFormat('webp')).toBe('webp');
    expect(getExtensionForFormat('gif')).toBe('gif');
    expect(getExtensionForFormat('svg')).toBe('svg');
  });

  it('detects short and invalid byte arrays as null signature', () => {
    expect(detectImageSignature(new Uint8Array([1, 2]))).toBeNull();
    expect(detectImageSignature(new Uint8Array([1, 2, 3, 4, 5]))).toBeNull();
  });

  it('detects JPEG format and dimensions', () => {
    // Construct synthetic JPEG with SOF0 marker (0xFF, 0xC0)
    // 0xFF 0xD8 0xFF 0xE0 [len 2 bytes: 0 16] [14 bytes payload]
    // 0xFF 0xC0 [len 2 bytes: 0 11] [precision 8] [height 2 bytes: 0 200] [width 2 bytes: 1 68] [payload...]
    const jpegBytes = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x07, 0x01, 0x02, 0x03, 0x04, 0x05,
      0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0xc8, 0x01, 0x44, 0x03, 0x01, 0x11, 0x00,
      0xff, 0xd9,
    ]);
    const sig = detectImageSignature(jpegBytes);
    expect(sig?.format).toBe('jpeg');
    expect(sig?.dimensions?.height).toBe(200);
    expect(sig?.dimensions?.width).toBe(324);
  });

  it('detects WebP formats and dimensions (VP8, VP8L, VP8X)', () => {
    // WebP VP8
    const vp8Header = new Uint8Array(35);
    // RIFF
    vp8Header.set([0x52, 0x49, 0x46, 0x46], 0);
    // WEBP
    vp8Header.set([0x57, 0x45, 0x42, 0x50], 8);
    // VP8 [space]
    vp8Header.set([0x56, 0x50, 0x38, 0x20], 12);
    // Keyframe start code 0x9D 0x01 0x2A at offset 23
    vp8Header[23] = 0x9d;
    vp8Header[24] = 0x01;
    vp8Header[25] = 0x2a;
    // width 100 (0x64), height 50 (0x32)
    vp8Header[26] = 0x64;
    vp8Header[27] = 0x00;
    vp8Header[28] = 0x32;
    vp8Header[29] = 0x00;
    const vp8Sig = detectImageSignature(vp8Header);
    expect(vp8Sig?.format).toBe('webp');
    expect(vp8Sig?.dimensions?.width).toBe(100);
    expect(vp8Sig?.dimensions?.height).toBe(50);

    // WebP VP8L (lossless)
    const vp8lHeader = new Uint8Array(28);
    vp8lHeader.set([0x52, 0x49, 0x46, 0x46], 0);
    vp8lHeader.set([0x57, 0x45, 0x42, 0x50], 8);
    vp8lHeader.set([0x56, 0x50, 0x38, 0x4c], 12); // VP8L
    vp8lHeader[20] = 0x2f; // signature
    // 14 bits width-1 = 99 (0x63), 14 bits height-1 = 49 (0x31)
    // b1: width & 0xFF -> 0x63
    // b2: ((width >> 8) & 0x3F) | ((height & 0x03) << 6)
    // b3: (height >> 2) & 0xFF
    // b4: (height >> 10) & 0x0F
    vp8lHeader[21] = 0x63;
    vp8lHeader[22] = 0x40; // height lowest 2 bits (1) << 6
    vp8lHeader[23] = 12; // (49 >> 2) = 12
    vp8lHeader[24] = 0;
    const vp8lSig = detectImageSignature(vp8lHeader);
    expect(vp8lSig?.format).toBe('webp');
    expect(vp8lSig?.dimensions?.width).toBe(100);
    expect(vp8lSig?.dimensions?.height).toBe(50);

    // WebP VP8X (extended)
    const vp8xHeader = new Uint8Array(32);
    vp8xHeader.set([0x52, 0x49, 0x46, 0x46], 0);
    vp8xHeader.set([0x57, 0x45, 0x42, 0x50], 8);
    vp8xHeader.set([0x56, 0x50, 0x38, 0x58], 12); // VP8X
    // 24-bit width-1 = 99 at 24..26
    vp8xHeader[24] = 0x63;
    vp8xHeader[25] = 0x00;
    vp8xHeader[26] = 0x00;
    // 24-bit height-1 = 49 at 27..29
    vp8xHeader[27] = 0x31;
    vp8xHeader[28] = 0x00;
    vp8xHeader[29] = 0x00;
    const vp8xSig = detectImageSignature(vp8xHeader);
    expect(vp8xSig?.format).toBe('webp');
    expect(vp8xSig?.dimensions?.width).toBe(100);
    expect(vp8xSig?.dimensions?.height).toBe(50);
  });

  it('detects SVG with viewBox and sanitizes threats', () => {
    const svgViewbox = '<svg viewBox="0 0 400 300"><circle/></svg>';
    const sig = detectImageSignature(stringToBytes(svgViewbox));
    expect(sig?.format).toBe('svg');
    expect(sig?.dimensions?.width).toBe(400);
    expect(sig?.dimensions?.height).toBe(300);

    // Threat checks
    const threatCheck = sanitizeSvgCheck('<svg onload="alert(1)" href="javascript:doEvil()"/>');
    expect(threatCheck.isSafe).toBe(false);
    expect(threatCheck.threats).toContain('Contains inline event handlers (on*)');
    expect(threatCheck.threats).toContain('Contains javascript: URI');
  });
});
