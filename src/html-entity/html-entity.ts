import { ValidationError } from '../common/errors';
import { NAMED_ENTITIES, CHAR_TO_NAMED } from './entities';

export type HtmlEntityMode = 'specialChars' | 'named' | 'numeric' | 'hex';

export interface HtmlEntityOptions {
  mode?: HtmlEntityMode;
  useNamed?: boolean;
  avoidDoubleEncoding?: boolean;
}

const DEFAULT_OPTIONS: Required<HtmlEntityOptions> = {
  mode: 'specialChars',
  useNamed: true,
  avoidDoubleEncoding: true,
};

export function getHtmlEntityOptions(): Required<HtmlEntityOptions> {
  return { ...DEFAULT_OPTIONS };
}

const SPECIAL_CHARS = new Set(['&', '<', '>', '"', "'"]);

/**
 * Escapes common HTML special characters (&, <, >, ", ').
 */
export function escapeHtml(input: string): string {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string', 'ERR_INVALID_INPUT_TYPE');
  }
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Unescapes common HTML special entities.
 */
export function unescapeHtml(input: string): string {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string', 'ERR_INVALID_INPUT_TYPE');
  }
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&(apos|#39|#x27|#X27);/g, "'");
}

/**
 * Checks if a substring looks like an existing HTML entity.
 */
function isExistingEntity(str: string, index: number): boolean {
  const rest = str.slice(index);
  // Match &name; or &#123; or &#x1F600;
  return /^&(?:[a-zA-Z][a-zA-Z0-9]+|#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6});/.test(rest);
}

/**
 * Encodes text into HTML entities according to configured mode.
 */
export function encodeHtmlEntities(input: string, options?: HtmlEntityOptions): string {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string', 'ERR_INVALID_INPUT_TYPE');
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };
  let result = '';
  const len = input.length;

  for (let i = 0; i < len; ) {
    const codePoint = input.codePointAt(i)!;
    const char = String.fromCodePoint(codePoint);
    const charLen = char.length;

    // Check avoidDoubleEncoding if this is an '&'
    if (char === '&' && opts.avoidDoubleEncoding && isExistingEntity(input, i)) {
      result += '&';
      i += charLen;
      continue;
    }

    if (opts.mode === 'specialChars') {
      if (char === '&') result += '&amp;';
      else if (char === '<') result += '&lt;';
      else if (char === '>') result += '&gt;';
      else if (char === '"') result += '&quot;';
      else if (char === "'") result += '&#39;';
      else result += char;
    } else if (opts.mode === 'numeric') {
      if (SPECIAL_CHARS.has(char) || codePoint > 127) {
        result += `&#${codePoint};`;
      } else {
        result += char;
      }
    } else if (opts.mode === 'hex') {
      if (SPECIAL_CHARS.has(char) || codePoint > 127) {
        result += `&#x${codePoint.toString(16).toUpperCase()};`;
      } else {
        result += char;
      }
    } else {
      // mode: 'named'
      if (opts.useNamed && CHAR_TO_NAMED[char]) {
        result += `&${CHAR_TO_NAMED[char]};`;
      } else if (SPECIAL_CHARS.has(char) || codePoint > 127) {
        result += `&#${codePoint};`;
      } else {
        result += char;
      }
    }

    i += charLen;
  }

  return result;
}

/**
 * Decodes all HTML entities (named, decimal, hexadecimal) to Unicode text.
 * Pure string processing - never injects into DOM.
 */
export function decodeHtmlEntities(input: string, _options?: HtmlEntityOptions): string {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string', 'ERR_INVALID_INPUT_TYPE');
  }

  return input.replace(/&([a-zA-Z][a-zA-Z0-9]+|#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6});/g, (match, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      // Hexadecimal
      const code = parseInt(entity.slice(2), 16);
      if (isValidCodePoint(code)) {
        return String.fromCodePoint(code);
      }
      return match;
    }
    if (entity.startsWith('#')) {
      // Decimal
      const code = parseInt(entity.slice(1), 10);
      if (isValidCodePoint(code)) {
        return String.fromCodePoint(code);
      }
      return match;
    }
    // Named entity
    const char = NAMED_ENTITIES[entity];
    return char !== undefined ? char : match;
  });
}

function isValidCodePoint(code: number): boolean {
  return Number.isInteger(code) && code >= 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff);
}
