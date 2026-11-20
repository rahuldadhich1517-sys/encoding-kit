import { describe, it, expect } from 'vitest';
import {
  encodeBase62,
  decodeBase62,
  decodeBase62ToString,
  isValidBase62,
  getBase62Options,
  DEFAULT_BASE62_ALPHABET,
} from '../src/base62/base62';
import { DecodingError, ValidationError } from '../src/common/errors';

describe('base62', () => {
  it('returns default options', () => {
    const opts = getBase62Options();
    expect(opts.alphabet).toBe(DEFAULT_BASE62_ALPHABET);
  });

  it('handles empty input', () => {
    expect(encodeBase62('')).toBe('');
    expect(decodeBase62('')).toEqual(new Uint8Array(0));
    expect(decodeBase62ToString('')).toBe('');
  });

  it('encodes and decodes strings correctly', () => {
    const text = 'Hello Base62 World!';
    const enc = encodeBase62(text);
    expect(isValidBase62(enc)).toBe(true);
    expect(decodeBase62ToString(enc)).toBe(text);
  });

  it('preserves leading zero bytes', () => {
    const zeros = new Uint8Array([0, 0, 42]);
    const enc = encodeBase62(zeros);
    expect(enc.startsWith('00')).toBe(true);
    expect(decodeBase62(enc)).toEqual(zeros);
  });

  it('handles all alphabet characters', () => {
    // Encodes each value 0..61
    for (let i = 0; i < 62; i++) {
      const b = new Uint8Array([i]);
      const enc = encodeBase62(b);
      expect(decodeBase62(enc)).toEqual(b);
    }
  });

  it('supports custom alphabet with validation', () => {
    // Custom alphabet: reversed
    const customAlpha = [...DEFAULT_BASE62_ALPHABET].reverse().join('');
    const enc = encodeBase62('Test custom', { alphabet: customAlpha });
    expect(decodeBase62ToString(enc, { alphabet: customAlpha })).toBe('Test custom');

    // Invalid length
    expect(() => encodeBase62('test', { alphabet: 'abc' })).toThrow(ValidationError);

    // Duplicates
    const dupAlpha = '0'.repeat(62);
    expect(() => encodeBase62('test', { alphabet: dupAlpha })).toThrow(ValidationError);
  });

  it('handles large input round trips', () => {
    const large = new Uint8Array(512);
    for (let i = 0; i < large.length; i++) {
      large[i] = (i * 17 + 5) & 255;
    }
    const enc = encodeBase62(large);
    expect(isValidBase62(enc)).toBe(true);
    expect(decodeBase62(enc)).toEqual(large);
  });

  it('rejects invalid inputs', () => {
    expect(() => decodeBase62(123 as unknown as string)).toThrow(ValidationError);

    // Symbols like '-', '_', '+' are not in Base62
    expect(() => decodeBase62('abc-xyz')).toThrow(DecodingError);
    expect(isValidBase62('abc-xyz')).toBe(false);
  });
});
