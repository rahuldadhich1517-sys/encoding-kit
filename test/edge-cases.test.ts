import { describe, it, expect } from 'vitest';
import {
  base64ToBlob,
  validateBase64Image,
  getImageMetadata,
} from '../src/base64-to-image/base64-to-image';
import {
  escapeJavaScript,
  unescapeJavaScript,
  escapeSql,
  unescapeSql,
  isValidEscapedString,
} from '../src/string-escape/string-escape';
import { domainToAscii, domainToUnicode, toPunycode, fromPunycode } from '../src/punycode/punycode';
import { encodeHtmlEntities, decodeHtmlEntities } from '../src/html-entity/html-entity';
import { encodeQuotedPrintable } from '../src/quoted-printable/quoted-printable';
import { ValidationError } from '../src/common/errors';

const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

describe('additional edge cases for complete coverage', () => {
  it('covers base64-to-image edge cases', async () => {
    // Non-base64 data URI
    expect(() => base64ToBlob('data:text/plain,plain-text')).toThrow(ValidationError);

    // strictMimeCheck mismatch
    const result = validateBase64Image(`data:image/jpeg;base64,${PNG_BASE64}`, { strictMimeCheck: true });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('does not match detected');

    // getImageMetadata invalid input
    // @ts-expect-error invalid input
    await expect(getImageMetadata(12345)).rejects.toThrow(ValidationError);

    // getImageMetadata with corrupt data
    await expect(getImageMetadata('data:image/png;base64,AAAA')).rejects.toThrow(ValidationError);
  });

  it('covers string-escape edge cases', () => {
    // JS backtick escape
    expect(escapeJavaScript('Hello `world`', { quotes: 'backtick' })).toBe('Hello \\`world\\`');
    // JS single quote escape
    expect(escapeJavaScript("Hello 'world'", { quotes: 'single' })).toBe("Hello \\'world\\'");

    // JS control characters \f, \v, \b
    const controls = '\f\v\b';
    const escapedControls = escapeJavaScript(controls);
    expect(escapedControls).toContain('\\f');
    expect(escapedControls).toContain('\\v');
    expect(escapedControls).toContain('\\b');
    expect(unescapeJavaScript(escapedControls)).toBe(controls);

    // Postgres and SQLite dialects
    expect(escapeSql("It's fine", { dialect: 'postgres' })).toBe("It''s fine");
    expect(escapeSql("It's fine", { dialect: 'sqlite' })).toBe("It''s fine");
    expect(unescapeSql("''wrapped''")).toBe("'wrapped'");

    // invalid escape validation
    expect(isValidEscapedString('test', { type: 'javascript' })).toBe(true);
  });

  it('covers punycode edge cases', () => {
    // Trailing dot with allowEmptyLabels
    expect(domainToAscii('example.com.', { allowEmptyLabels: true })).toBe('example.com.');

    // Malformed xn-- label with overflow in domainToUnicode recovers safely
    const invalidLabel = 'xn--9999999999999999999999999999999999999999.com';
    expect(domainToUnicode(invalidLabel)).toBe(invalidLabel);

    // toPunycode with basic and non-basic characters
    expect(toPunycode('hello世界')).toBe('hello-ck1hg65u');
    expect(fromPunycode('hello-ck1hg65u')).toBe('hello世界');
  });

  it('covers html-entity edge cases', () => {
    // Hex and decimal entities with surrogate codes
    expect(decodeHtmlEntities('&#xD800;')).toBe('&#xD800;'); // surrogate range ignored safely
    expect(decodeHtmlEntities('&#55296;')).toBe('&#55296;');

    // Encode in numeric mode for basic and non-basic
    expect(encodeHtmlEntities('A & B', { mode: 'numeric' })).toBe('A &#38; B');
  });

  it('covers quoted-printable edge cases', () => {
    // Binary mode with CRLF
    const data = new Uint8Array([13, 10, 65]);
    const encBinary = encodeQuotedPrintable(data, { binary: true });
    expect(encBinary).toContain('=0D=0A');

    // Lone CR and LF in non-binary mode
    const textWithCR = 'Line1\rLine2\nLine3\r\nEnd';
    const encCR = encodeQuotedPrintable(textWithCR, { crlf: false });
    expect(encCR).toContain('\n');
  });
});
