import { describe, it, expect } from 'vitest';
import {
  toPunycode,
  fromPunycode,
  domainToAscii,
  domainToUnicode,
  isValidPunycode,
} from '../src/punycode/punycode';
import { ValidationError, DecodingError } from '../src/common/errors';

describe('punycode', () => {
  it('encodes and decodes raw Punycode strings (RFC 3492 vectors)', () => {
    const vectors: [string, string][] = [
      ['münchen', 'mnchen-3ya'],
      ['bücher', 'bcher-kva'],
      ['☕', '53h'],
      ['点看', '3pxu8k'],
      ['點看', 'c1yn36f'],
      ['hello-world', 'hello-world-'],
      ['propositum', 'propositum-'],
    ];

    for (const [unicode, punycode] of vectors) {
      expect(toPunycode(unicode)).toBe(punycode);
      expect(fromPunycode(punycode)).toBe(unicode);
      expect(isValidPunycode(punycode)).toBe(true);
      expect(isValidPunycode('xn--' + punycode)).toBe(true);
    }
  });

  it('handles internationalized domain names (IDNA)', () => {
    expect(domainToAscii('münchen.de')).toBe('xn--mnchen-3ya.de');
    expect(domainToUnicode('xn--mnchen-3ya.de')).toBe('münchen.de');

    expect(domainToAscii('bücher.example.com')).toBe('xn--bcher-kva.example.com');
    expect(domainToUnicode('xn--bcher-kva.example.com')).toBe('bücher.example.com');

    expect(domainToAscii('sub.☕.org')).toBe('sub.xn--53h.org');
    expect(domainToUnicode('sub.xn--53h.org')).toBe('sub.☕.org');
  });

  it('normalizes alternative full-width and ideographic dot separators', () => {
    // Unicode ideographic full stop \u3002
    expect(domainToAscii('münchen\u3002de')).toBe('xn--mnchen-3ya.de');
    // Fullwidth full stop \uFF0E
    expect(domainToAscii('münchen\uFF0Ede')).toBe('xn--mnchen-3ya.de');
  });

  it('preserves standard ASCII domain names', () => {
    expect(domainToAscii('example.com')).toBe('example.com');
    expect(domainToUnicode('example.com')).toBe('example.com');
  });

  it('enforces RFC domain and label length constraints', () => {
    // Label > 63 chars
    const longLabel = 'a'.repeat(64) + '.com';
    expect(() => domainToAscii(longLabel)).toThrow(ValidationError);

    // Total domain > 253 chars
    const longDomain = ('a'.repeat(50) + '.').repeat(6) + 'com';
    expect(() => domainToAscii(longDomain)).toThrow(ValidationError);
  });

  it('rejects invalid Punycode labels', () => {
    expect(() => fromPunycode('invalid_non_ascii_⚡')).toThrow(DecodingError);
    expect(isValidPunycode('invalid_⚡')).toBe(false);

    expect(() => domainToAscii('xn--invalid_punycode_9999999999.com')).toThrow(ValidationError);
  });

  it('rejects invalid input types', () => {
    expect(() => toPunycode(123 as unknown as string)).toThrow(ValidationError);
    expect(() => fromPunycode(123 as unknown as string)).toThrow(ValidationError);
    expect(() => domainToAscii(null as unknown as string)).toThrow(ValidationError);
    expect(() => domainToUnicode(undefined as unknown as string)).toThrow(ValidationError);
  });
});
