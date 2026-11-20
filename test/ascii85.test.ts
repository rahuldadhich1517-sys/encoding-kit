import { describe, it, expect } from 'vitest';
import {
  encodeAscii85,
  decodeAscii85,
  decodeAscii85ToString,
  isValidAscii85,
  getAscii85Options,
} from '../src/ascii85/ascii85';
import { DecodingError, ValidationError } from '../src/common/errors';

describe('ascii85', () => {
  it('returns default options', () => {
    const opts = getAscii85Options();
    expect(opts.adobeDelimiters).toBe(false);
    expect(opts.useZeroShorthand).toBe(true);
    expect(opts.wrap).toBe(0);
  });

  it('handles empty input', () => {
    expect(encodeAscii85('')).toBe('');
    expect(encodeAscii85(new Uint8Array(0))).toBe('');
    expect(encodeAscii85('', { adobeDelimiters: true })).toBe('<~~>');
    expect(decodeAscii85('')).toEqual(new Uint8Array(0));
    expect(decodeAscii85ToString('')).toBe('');
    expect(isValidAscii85('')).toBe(true);
  });

  it('encodes and decodes standard text without delimiters', () => {
    const input = 'Man is distinguished, not only by his reason, but by this singular passion';
    const encoded = encodeAscii85(input);
    expect(isValidAscii85(encoded)).toBe(true);
    expect(decodeAscii85ToString(encoded)).toBe(input);
  });

  it('handles zero blocks and z shorthand correctly', () => {
    const zeros = new Uint8Array([0, 0, 0, 0]);
    expect(encodeAscii85(zeros, { useZeroShorthand: true })).toBe('z');
    expect(decodeAscii85('z')).toEqual(zeros);
    expect(decodeAscii85ToString('z')).toBe('\0\0\0\0');

    // Without zero shorthand
    const encodedNoZ = encodeAscii85(zeros, { useZeroShorthand: false });
    expect(encodedNoZ).toBe('!!!!!');
    expect(decodeAscii85(encodedNoZ)).toEqual(zeros);

    // Multiple zeros
    const eightZeros = new Uint8Array(8);
    expect(encodeAscii85(eightZeros)).toBe('zz');
    expect(decodeAscii85('zz')).toEqual(eightZeros);
  });

  it('handles partial blocks (1, 2, 3 trailing bytes)', () => {
    // 1 byte -> 2 chars
    const b1 = new Uint8Array([65]); // 'A'
    const enc1 = encodeAscii85(b1);
    expect(enc1.length).toBe(2);
    expect(decodeAscii85(enc1)).toEqual(b1);

    // 2 bytes -> 3 chars
    const b2 = new Uint8Array([65, 66]);
    const enc2 = encodeAscii85(b2);
    expect(enc2.length).toBe(3);
    expect(decodeAscii85(enc2)).toEqual(b2);

    // 3 bytes -> 4 chars
    const b3 = new Uint8Array([65, 66, 67]);
    const enc3 = encodeAscii85(b3);
    expect(enc3.length).toBe(4);
    expect(decodeAscii85(enc3)).toEqual(b3);

    // Partial block with trailing zeros should NOT produce 'z'
    const partialZeros = new Uint8Array([0, 0]);
    const encPZ = encodeAscii85(partialZeros);
    expect(encPZ).toBe('!!!');
    expect(decodeAscii85(encPZ)).toEqual(partialZeros);
  });

  it('handles Adobe delimiters and whitespace correctly', () => {
    const input = 'Hello World!';
    const encoded = encodeAscii85(input, { adobeDelimiters: true, wrap: 4 });
    expect(encoded.startsWith('<~')).toBe(true);
    expect(encoded.endsWith('~>')).toBe(true);
    expect(encoded.includes('\n')).toBe(true);

    // Decoding with whitespace and delimiters
    const decoded = decodeAscii85ToString(encoded);
    expect(decoded).toBe(input);

    // Requiring delimiters
    expect(() => decodeAscii85('87cURD]j72', { adobeDelimiters: true })).toThrow(DecodingError);
  });

  it('handles Unicode round trips', () => {
    const unicodeStrings = [
      'こんにちは世界',
      '🌟🚀🎉 Encoded unicode 🍕',
      'مرحبا بالعالم',
      'Привет мир!',
    ];
    for (const str of unicodeStrings) {
      const enc = encodeAscii85(str);
      expect(isValidAscii85(enc)).toBe(true);
      expect(decodeAscii85ToString(enc)).toBe(str);
    }
  });

  it('throws descriptive errors on malformed input', () => {
    // Non-string input to decode
    expect(() => decodeAscii85(123 as unknown as string)).toThrow(ValidationError);

    // Invalid character
    expect(() => decodeAscii85('~invalid')).toThrow(DecodingError);
    expect(isValidAscii85('~invalid')).toBe(false);

    // Unexpected z inside block
    expect(() => decodeAscii85('!z!!!')).toThrow(DecodingError);

    // Invalid single-character final block
    expect(() => decodeAscii85('!!!!!8')).toThrow(DecodingError);

    // Value overflow (> 0xFFFFFFFF)
    // 's8W-!' -> in ascii85 85^4 * 82 + ... exceeds 2^32
    expect(() => decodeAscii85('uuuuu')).toThrow(DecodingError);
  });
});
