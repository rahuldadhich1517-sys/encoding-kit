import { describe, it, expect } from 'vitest';
import {
  escapeString,
  unescapeString,
  escapeJavaScript,
  unescapeJavaScript,
  escapeJson,
  unescapeJson,
  escapeSql,
  unescapeSql,
  escapeShell,
  unescapeShell,
  isValidEscapedString,
  getStringEscapeOptions,
} from '../src/string-escape/string-escape';
import { ValidationError } from '../src/common/errors';

describe('string-escape', () => {
  it('returns default options', () => {
    const opts = getStringEscapeOptions();
    expect(opts.type).toBe('javascript');
    expect(opts.jsOptions.quotes).toBe('none');
    expect(opts.sqlOptions.dialect).toBe('standard');
    expect(opts.shellOptions.style).toBe('single-quote');
  });

  describe('JavaScript escaping', () => {
    it('escapes common control chars, backslashes, and quotes', () => {
      const raw = 'Hello\nWorld\t"Quotes" & \'Single\' \\ Backslash \0 Null';
      const escaped = escapeJavaScript(raw, { quotes: 'double' });
      expect(escaped).toContain('\\n');
      expect(escaped).toContain('\\t');
      expect(escaped).toContain('\\"');
      expect(escaped).toContain('\\\\');
      expect(escaped).toContain('\\0');

      expect(unescapeJavaScript(escaped)).toBe(raw);
    });

    it('handles unicode escapes and line separators', () => {
      const text = 'Line\u2028Separator\u2029';
      const escaped = escapeJavaScript(text);
      expect(escaped).toContain('\\u2028');
      expect(escaped).toContain('\\u2029');
      expect(unescapeJavaScript(escaped)).toBe(text);

      const unicodeText = 'Emoji 🚀';
      const escapedUni = escapeJavaScript(unicodeText, { escapeUnicode: true });
      expect(escapedUni).toContain('\\u{1f680}');
      expect(unescapeJavaScript(escapedUni)).toBe(unicodeText);
    });

    it('unescapes hex and 4-digit unicode escapes', () => {
      expect(unescapeJavaScript('\\x41')).toBe('A');
      expect(unescapeJavaScript('\\u0041')).toBe('A');
      expect(unescapeJavaScript('\\u{41}')).toBe('A');
    });
  });

  describe('JSON escaping', () => {
    it('escapes and unescapes strict JSON string format', () => {
      const text = 'Line 1\nLine 2\t"Quote" \u0005';
      const escaped = escapeJson(text);
      expect(escaped).toContain('\\n');
      expect(escaped).toContain('\\"');
      expect(escaped).toContain('\\u0005');

      expect(unescapeJson(escaped)).toBe(text);
    });
  });

  describe('SQL escaping', () => {
    it('escapes standard ANSI SQL quotes by doubling them', () => {
      const sql = "O'Connor and 'special' values";
      const escaped = escapeSql(sql);
      expect(escaped).toBe("O''Connor and ''special'' values");
      expect(unescapeSql(escaped)).toBe(sql);

      const wrapped = escapeSql(sql, { wrap: true });
      expect(wrapped).toBe("'O''Connor and ''special'' values'");
      expect(unescapeSql(wrapped)).toBe(sql);
    });

    it('handles MySQL dialect with backslash escapes', () => {
      const sql = "Line1\nLine2\t'quote' \"double\" \0 \x1a";
      const escaped = escapeSql(sql, { dialect: 'mysql' });
      expect(escaped).toContain('\\n');
      expect(escaped).toContain('\\t');
      expect(escaped).toContain("\\'");
      expect(escaped).toContain('\\"');
      expect(escaped).toContain('\\0');
      expect(escaped).toContain('\\Z');

      expect(unescapeSql(escaped, { dialect: 'mysql' })).toBe(sql);
    });
  });

  describe('Shell escaping', () => {
    it('escapes arguments safely for POSIX shell using single quotes', () => {
      expect(escapeShell('')).toBe("''");
      expect(escapeShell('simple')).toBe("'simple'");

      const dangerous = "file; rm -rf /; echo 'owned'";
      const escaped = escapeShell(dangerous);
      expect(escaped).toBe("'file; rm -rf /; echo '\\''owned'\\'''");
      expect(unescapeShell(escaped)).toBe(dangerous);
    });

    it('supports backslash escape style for shell', () => {
      const input = 'hello world $foo';
      const escaped = escapeShell(input, { style: 'backslash' });
      expect(escaped).toContain('\\ ');
      expect(escaped).toContain('\\$');
    });
  });

  describe('Unified escapeString and unescapeString', () => {
    it('dispatches to chosen escape type', () => {
      expect(unescapeShell('"double quoted"')).toBe('double quoted');
      expect(isValidEscapedString(123 as unknown as string)).toBe(false);
      expect(escapeString('a\nb', { type: 'javascript' })).toBe('a\\nb');
      expect(escapeString('a"b', { type: 'json' })).toBe('a\\"b');
      expect(escapeString("a'b", { type: 'sql' })).toBe("a''b");
      expect(escapeString('a b', { type: 'shell' })).toBe("'a b'");

      expect(unescapeString('a\\nb', { type: 'javascript' })).toBe('a\nb');
      expect(unescapeString('a\\"b', { type: 'json' })).toBe('a"b');
      expect(unescapeString("a''b", { type: 'sql' })).toBe("a'b");
      expect(unescapeString("'a b'", { type: 'shell' })).toBe('a b');

      expect(isValidEscapedString('a\\nb', { type: 'javascript' })).toBe(true);
    });

    it('rejects invalid inputs and unsupported types', () => {
      expect(() => escapeString(123 as unknown as string)).toThrow(ValidationError);
      expect(() => unescapeString(123 as unknown as string)).toThrow(ValidationError);
      // @ts-expect-error Testing invalid type
      expect(() => escapeString('test', { type: 'unknown' })).toThrow(ValidationError);
      // @ts-expect-error Testing invalid type
      expect(() => unescapeString('test', { type: 'unknown' })).toThrow(ValidationError);
    });
  });
});
