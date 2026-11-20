import { describe, it, expect } from 'vitest';
import {
  encodeBase32,
  decodeBase32,
  decodeBase32ToString,
  isValidBase32,
  getBase32Options,
} from '../src/base32/base32';
import { DecodingError, ValidationError } from '../src/common/errors';

describe('base32', () => {
  it('returns default options', () => {
    const opts = getBase32Options();
    expect(opts.padding).toBe(true);
    expect(opts.lowercase).toBe(false);
    expect(opts.caseSensitive).toBe(false);
  });

  it('matches RFC 4648 test vectors', () => {
    const vectors: [string, string][] = [
      ['', ''],
      ['f', 'MY======'],
      ['fo', 'MZXQ===='],
      ['foo', 'MZXW6==='],
      ['foob', 'MZXW6YQ='],
      ['fooba', 'MZXW6YTB'],
      ['foobar', 'MZXW6YTBOI======'],
    ];

    for (const [plain, encoded] of vectors) {
      expect(encodeBase32(plain)).toBe(encoded);
      expect(decodeBase32ToString(encoded)).toBe(plain);
      expect(isValidBase32(encoded)).toBe(true);
    }
  });

  it('supports unpadded Base32', () => {
    expect(encodeBase32('foobar', { padding: false })).toBe('MZXW6YTBOI');
    expect(decodeBase32ToString('MZXW6YTBOI')).toBe('foobar');
    expect(isValidBase32('MZXW6YTBOI')).toBe(true);
  });

  it('supports lowercase output and case-insensitive decoding', () => {
    const enc = encodeBase32('foobar', { lowercase: true });
    expect(enc).toBe('mzxw6ytboi======');
    expect(decodeBase32ToString(enc)).toBe('foobar');

    // In case-sensitive mode, reject lowercase
    expect(() => decodeBase32(enc, { caseSensitive: true })).toThrow(DecodingError);
  });

  it('handles Unicode round trips', () => {
    const texts = ['Привет, мир!', 'こんにちは世界', '🚀 Fast & Safe 🔒', 'À bientôt!'];
    for (const text of texts) {
      const enc = encodeBase32(text);
      expect(isValidBase32(enc)).toBe(true);
      expect(decodeBase32ToString(enc)).toBe(text);
    }
  });

  it('rejects invalid inputs and malformed padding', () => {
    expect(() => decodeBase32(123 as unknown as string)).toThrow(ValidationError);

    // Invalid character (8, 9, 0, 1 are not in RFC 4648 alphabet)
    expect(() => decodeBase32('MZX8====')).toThrow(DecodingError);
    expect(isValidBase32('MZX8====')).toBe(false);

    // Padding character in middle
    expect(() => decodeBase32('MZ=W6YTBOI======')).toThrow(DecodingError);

    // Invalid padding count (2 or 5 padding '=' chars are illegal in Base32)
    expect(() => decodeBase32('MZXW6==')).toThrow(DecodingError);
    expect(() => decodeBase32('MZXW6Y=====')).toThrow(DecodingError);

    // Invalid length (mod 8 is 1, 3, or 6 in unpadded)
    expect(() => decodeBase32('M')).toThrow(DecodingError);
    expect(() => decodeBase32('MZX')).toThrow(DecodingError);

    // Non-zero unused bits in final character
    // 'MY' is valid (1 byte, 6 '='), but 'MZ' has non-zero unused bits for 1 byte!
    expect(() => decodeBase32('MZ======')).toThrow(DecodingError);
  });
});
