import { describe, it, expect } from 'vitest';
import {
  encodeHtmlEntities,
  decodeHtmlEntities,
  escapeHtml,
  unescapeHtml,
  getHtmlEntityOptions,
} from '../src/html-entity/html-entity';
import { ValidationError } from '../src/common/errors';

describe('html-entity', () => {
  it('returns default options', () => {
    const opts = getHtmlEntityOptions();
    expect(opts.mode).toBe('specialChars');
    expect(opts.useNamed).toBe(true);
    expect(opts.avoidDoubleEncoding).toBe(true);
  });

  it('escapes and unescapes basic HTML special characters', () => {
    const raw = `<script>alert("Hello & 'Welcome' > test")</script>`;
    const escaped = escapeHtml(raw);
    expect(escaped).toBe('&lt;script&gt;alert(&quot;Hello &amp; &#39;Welcome&#39; &gt; test&quot;)&lt;/script&gt;');
    expect(unescapeHtml(escaped)).toBe(raw);
  });

  it('encodes and decodes named entities', () => {
    const input = 'Copyright ©, Euro €, Registered ®';
    const encoded = encodeHtmlEntities(input, { mode: 'named' });
    expect(encoded).toContain('&copy;');
    expect(encoded).toContain('&euro;');
    expect(encoded).toContain('&reg;');

    const decoded = decodeHtmlEntities(encoded);
    expect(decoded).toBe(input);
  });

  it('supports numeric decimal and hexadecimal modes', () => {
    const char = '©'; // code point 169
    expect(encodeHtmlEntities(char, { mode: 'numeric' })).toBe('&#169;');
    expect(encodeHtmlEntities(char, { mode: 'hex' })).toBe('&#xA9;');

    expect(decodeHtmlEntities('&#169;')).toBe('©');
    expect(decodeHtmlEntities('&#xA9;')).toBe('©');
    expect(decodeHtmlEntities('&#Xa9;')).toBe('©');
  });

  it('supports Unicode and astral plane emojis', () => {
    const emoji = '😀 🎉 🚀';
    const encodedHex = encodeHtmlEntities(emoji, { mode: 'hex' });
    expect(encodedHex).toContain('&#x1F600;');
    expect(decodeHtmlEntities(encodedHex)).toBe(emoji);
  });

  it('avoids double encoding existing entities', () => {
    const alreadyEncoded = 'Price is &amp; &lt;100&gt; &euro;';
    const encodedSafe = encodeHtmlEntities(alreadyEncoded, { avoidDoubleEncoding: true });
    expect(encodedSafe).toBe('Price is &amp; &lt;100&gt; &euro;');

    const reEncoded = encodeHtmlEntities(alreadyEncoded, { avoidDoubleEncoding: false });
    expect(reEncoded).toBe('Price is &amp;amp; &amp;lt;100&amp;gt; &amp;euro;');
  });

  it('handles malformed entities gracefully without throwing or DOM injection', () => {
    // Malformed named entity
    expect(decodeHtmlEntities('&nonexistententity;')).toBe('&nonexistententity;');

    // Incomplete entity (lacks semicolon, should not decode)
    expect(decodeHtmlEntities('&amp incomplete &')).toBe('&amp incomplete &');

    // Out-of-bounds numeric code point
    expect(decodeHtmlEntities('&#999999999;')).toBe('&#999999999;');
  });

  it('validates input types', () => {
    expect(() => escapeHtml(null as unknown as string)).toThrow(ValidationError);
    expect(() => decodeHtmlEntities(123 as unknown as string)).toThrow(ValidationError);
  });
});
