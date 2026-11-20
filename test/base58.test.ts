import { describe, it, expect } from 'vitest';
import {
  encodeBase58,
  decodeBase58,
  decodeBase58ToString,
  isValidBase58,
  getBase58Options,
  BITCOIN_ALPHABET,
} from '../src/base58/base58';
import { DecodingError, ValidationError } from '../src/common/errors';

describe('base58', () => {
  it('returns default options', () => {
    const opts = getBase58Options();
    expect(opts.alphabet).toBe(BITCOIN_ALPHABET);
  });

  it('matches known Bitcoin Base58 test vectors', () => {
    expect(encodeBase58('')).toBe('');
    expect(decodeBase58('')).toEqual(new Uint8Array(0));
    expect(decodeBase58ToString('')).toBe('');

    expect(encodeBase58('Hello World!')).toBe('2NEpo7TZRRrLZSi2U');
    expect(decodeBase58ToString('2NEpo7TZRRrLZSi2U')).toBe('Hello World!');

    expect(encodeBase58('The quick brown fox jumps over the lazy dog')).toBe(
      '7DdiPPYtxLjCD3wA1po2rvZHTDYjkZYiEtazrfiwJcwnKCizhGFhBGHeRdx'
    );
    expect(
      decodeBase58ToString('7DdiPPYtxLjCD3wA1po2rvZHTDYjkZYiEtazrfiwJcwnKCizhGFhBGHeRdx')
    ).toBe('The quick brown fox jumps over the lazy dog');
  });

  it('preserves leading zero bytes correctly', () => {
    const zeroBytes = new Uint8Array([0, 0, 0, 1]);
    const enc = encodeBase58(zeroBytes);
    expect(enc).toBe('1112');
    expect(decodeBase58('1112')).toEqual(zeroBytes);

    const allZeros = new Uint8Array([0, 0, 0]);
    expect(encodeBase58(allZeros)).toBe('111');
    expect(decodeBase58('111')).toEqual(allZeros);
  });

  it('supports custom alphabet with validation', () => {
    // Valid 58-character alphabet
    const reversedAlphabet = [...BITCOIN_ALPHABET].reverse().join('');
    const enc = encodeBase58('Hello World!', { alphabet: reversedAlphabet });
    expect(decodeBase58ToString(enc, { alphabet: reversedAlphabet })).toBe('Hello World!');

    // Invalid alphabet length
    expect(() => encodeBase58('test', { alphabet: 'short' })).toThrow(ValidationError);

    // Duplicate characters in alphabet
    const dupAlphabet = '1'.repeat(58);
    expect(() => encodeBase58('test', { alphabet: dupAlphabet })).toThrow(ValidationError);
  });

  it('handles large inputs and round trips', () => {
    const largeBuffer = new Uint8Array(1024);
    for (let i = 0; i < largeBuffer.length; i++) {
      largeBuffer[i] = (i * 37 + 13) & 255;
    }
    const enc = encodeBase58(largeBuffer);
    expect(isValidBase58(enc)).toBe(true);
    expect(decodeBase58(enc)).toEqual(largeBuffer);
  });

  it('rejects invalid inputs', () => {
    expect(() => decodeBase58(123 as unknown as string)).toThrow(ValidationError);

    // '0', 'O', 'I', 'l' are intentionally excluded from Bitcoin Base58
    expect(() => decodeBase58('0OIl')).toThrow(DecodingError);
    expect(isValidBase58('0OIl')).toBe(false);
  });
});
