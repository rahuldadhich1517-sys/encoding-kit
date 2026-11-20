import { describe, it, expect } from 'vitest';
import {
  encodeQuotedPrintable,
  decodeQuotedPrintable,
  decodeQuotedPrintableToString,
  isValidQuotedPrintable,
  getQuotedPrintableOptions,
} from '../src/quoted-printable/quoted-printable';
import { DecodingError, ValidationError } from '../src/common/errors';

describe('quoted-printable', () => {
  it('returns default options', () => {
    const opts = getQuotedPrintableOptions();
    expect(opts.maxLineLength).toBe(76);
    expect(opts.crlf).toBe(true);
    expect(opts.binary).toBe(false);
  });

  it('handles empty input', () => {
    expect(encodeQuotedPrintable('')).toBe('');
    expect(decodeQuotedPrintable('')).toEqual(new Uint8Array(0));
    expect(decodeQuotedPrintableToString('')).toBe('');
    expect(isValidQuotedPrintable('')).toBe(true);
  });

  it('encodes and decodes ASCII and UTF-8 text', () => {
    const text = 'Hello world! Value is 100% pure & simple.';
    const encoded = encodeQuotedPrintable(text);
    expect(decodeQuotedPrintableToString(encoded)).toBe(text);

    const utf8Text = 'Bonjour le monde! Ça coûte 10€ et c\'est génial!';
    const encodedUtf8 = encodeQuotedPrintable(utf8Text);
    expect(encodedUtf8).toContain('=C3=87'); // 'Ç'
    expect(encodedUtf8).toContain('=E2=82=AC'); // '€'
    expect(decodeQuotedPrintableToString(encodedUtf8)).toBe(utf8Text);
  });

  it('handles equals signs (=) correctly as =3D', () => {
    const formula = 'a = b + c = d';
    const enc = encodeQuotedPrintable(formula);
    expect(enc).toBe('a =3D b + c =3D d');
    expect(decodeQuotedPrintableToString(enc)).toBe(formula);
  });

  it('encodes trailing whitespace at end of lines and input', () => {
    const withTrailing = 'Line 1 \r\nLine 2\t\r\nLine 3 ';
    const encoded = encodeQuotedPrintable(withTrailing);
    expect(encoded).toContain('=20\r\n');
    expect(encoded).toContain('=09\r\n');
    expect(encoded.endsWith('=20')).toBe(true);
    expect(decodeQuotedPrintableToString(encoded)).toBe(withTrailing);
  });

  it('handles soft line breaks with configurable line length', () => {
    const longLine = 'Now is the time for all good men to come to the aid of their country in the hour of need.';
    const encoded = encodeQuotedPrintable(longLine, { maxLineLength: 30, crlf: true });
    expect(encoded).toContain('=\r\n');

    const lines = encoded.split('\r\n');
    for (let i = 0; i < lines.length - 1; i++) {
      expect(lines[i]!.length).toBeLessThanOrEqual(30);
    }

    expect(decodeQuotedPrintableToString(encoded)).toBe(longLine);
  });

  it('preserves byte round trips for arbitrary binary data', () => {
    const binary = new Uint8Array([0, 1, 2, 61, 127, 128, 255]);
    const encoded = encodeQuotedPrintable(binary, { binary: true });
    expect(decodeQuotedPrintable(encoded)).toEqual(binary);
  });

  it('detects invalid hexadecimal sequences in strict mode', () => {
    expect(() => decodeQuotedPrintable('Invalid =ZZ escape', { fatal: true })).toThrow(DecodingError);
    expect(isValidQuotedPrintable('Invalid =ZZ escape')).toBe(false);

    expect(() => decodeQuotedPrintable('Incomplete =', { fatal: true })).toThrow(DecodingError);

    // Lenient mode recovers
    const lenient = decodeQuotedPrintable('Invalid =ZZ escape', { fatal: false });
    expect(lenient.length).toBeGreaterThan(0);
  });

  it('rejects invalid input types', () => {
    expect(() => decodeQuotedPrintable(123 as unknown as string)).toThrow(ValidationError);
  });
});
