import { ValidationError } from '../common/errors';

export type StringEscapeType = 'javascript' | 'json' | 'sql' | 'shell';
export type SqlDialect = 'standard' | 'mysql' | 'postgres' | 'sqlite';
export type ShellEscapeStyle = 'single-quote' | 'backslash';

export interface JsEscapeOptions {
  quotes?: 'single' | 'double' | 'backtick' | 'none';
  escapeUnicode?: boolean;
}

export interface SqlEscapeOptions {
  dialect?: SqlDialect;
  wrap?: boolean;
}

export interface ShellEscapeOptions {
  style?: ShellEscapeStyle;
}

export interface StringEscapeOptions {
  type?: StringEscapeType;
  jsOptions?: JsEscapeOptions;
  sqlOptions?: SqlEscapeOptions;
  shellOptions?: ShellEscapeOptions;
}

const DEFAULT_OPTIONS: Required<StringEscapeOptions> = {
  type: 'javascript',
  jsOptions: {
    quotes: 'none',
    escapeUnicode: false,
  },
  sqlOptions: {
    dialect: 'standard',
    wrap: false,
  },
  shellOptions: {
    style: 'single-quote',
  },
};

export function getStringEscapeOptions(): Required<StringEscapeOptions> {
  return { ...DEFAULT_OPTIONS };
}

/**
 * Escapes JavaScript string characters.
 */
export function escapeJavaScript(input: string, options?: JsEscapeOptions): string {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string', 'ERR_INVALID_INPUT_TYPE');
  }

  const quotes = options?.quotes ?? 'none';
  const escapeUnicode = options?.escapeUnicode ?? false;

  let out = '';
  for (let i = 0; i < input.length; ) {
    const cp = input.codePointAt(i)!;
    const ch = String.fromCodePoint(cp);
    const chLen = ch.length;

    switch (ch) {
      case '\\':
        out += '\\\\';
        break;
      case '\b':
        out += '\\b';
        break;
      case '\f':
        out += '\\f';
        break;
      case '\n':
        out += '\\n';
        break;
      case '\r':
        out += '\\r';
        break;
      case '\t':
        out += '\\t';
        break;
      case '\v':
        out += '\\v';
        break;
      case '\0':
        out += '\\0';
        break;
      case "'":
        out += quotes === 'single' ? "\\'" : "'";
        break;
      case '"':
        out += quotes === 'double' ? '\\"' : '"';
        break;
      case '`':
        out += quotes === 'backtick' ? '\\`' : '`';
        break;
      case '\u2028':
        out += '\\u2028';
        break;
      case '\u2029':
        out += '\\u2029';
        break;
      default:
        if (cp < 32 || cp === 127) {
          const hex = cp.toString(16).padStart(2, '0');
          out += `\\x${hex}`;
        } else if (escapeUnicode && cp > 127) {
          if (cp <= 0xffff) {
            out += `\\u${cp.toString(16).padStart(4, '0')}`;
          } else {
            out += `\\u{${cp.toString(16)}}`;
          }
        } else {
          out += ch;
        }
        break;
    }

    i += chLen;
  }

  return out;
}

/**
 * Unescapes JavaScript string escapes.
 */
export function unescapeJavaScript(input: string): string {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string', 'ERR_INVALID_INPUT_TYPE');
  }

  let out = '';
  const len = input.length;

  for (let i = 0; i < len; i++) {
    const ch = input[i]!;
    if (ch === '\\' && i + 1 < len) {
      i++;
      const next = input[i]!;
      switch (next) {
        case 'b':
          out += '\b';
          break;
        case 'f':
          out += '\f';
          break;
        case 'n':
          out += '\n';
          break;
        case 'r':
          out += '\r';
          break;
        case 't':
          out += '\t';
          break;
        case 'v':
          out += '\v';
          break;
        case '0':
          out += '\0';
          break;
        case "'":
          out += "'";
          break;
        case '"':
          out += '"';
          break;
        case '`':
          out += '`';
          break;
        case '\\':
          out += '\\';
          break;
        case 'x': {
          const hex = input.slice(i + 1, i + 3);
          if (/^[0-9a-fA-F]{2}$/.test(hex)) {
            out += String.fromCharCode(parseInt(hex, 16));
            i += 2;
          } else {
            out += 'x';
          }
          break;
        }
        case 'u': {
          if (input[i + 1] === '{') {
            const closeIndex = input.indexOf('}', i + 2);
            if (closeIndex !== -1) {
              const hex = input.slice(i + 2, closeIndex);
              if (/^[0-9a-fA-F]{1,6}$/.test(hex)) {
                const code = parseInt(hex, 16);
                if (code <= 0x10ffff) {
                  out += String.fromCodePoint(code);
                  i = closeIndex;
                  break;
                }
              }
            }
          }
          const hex = input.slice(i + 1, i + 5);
          if (/^[0-9a-fA-F]{4}$/.test(hex)) {
            out += String.fromCharCode(parseInt(hex, 16));
            i += 4;
          } else {
            out += 'u';
          }
          break;
        }
        default:
          out += next;
          break;
      }
    } else {
      out += ch;
    }
  }

  return out;
}

/**
 * Escapes a string for strict JSON representation.
 */
export function escapeJson(input: string): string {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string', 'ERR_INVALID_INPUT_TYPE');
  }

  let out = '';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
    const code = ch.charCodeAt(0);
    switch (ch) {
      case '"':
        out += '\\"';
        break;
      case '\\':
        out += '\\\\';
        break;
      case '\b':
        out += '\\b';
        break;
      case '\f':
        out += '\\f';
        break;
      case '\n':
        out += '\\n';
        break;
      case '\r':
        out += '\\r';
        break;
      case '\t':
        out += '\\t';
        break;
      default:
        if (code < 32) {
          out += `\\u${code.toString(16).padStart(4, '0')}`;
        } else {
          out += ch;
        }
        break;
    }
  }
  return out;
}

/**
 * Unescapes JSON string contents safely.
 */
export function unescapeJson(input: string): string {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string', 'ERR_INVALID_INPUT_TYPE');
  }

  try {
    return JSON.parse(`"${input.replace(/"/g, '\\"')}"`) as string;
  } catch {
    return unescapeJavaScript(input);
  }
}

/**
 * Escapes a string for SQL literals.
 * Warning: For database queries, always prefer parameterized queries.
 */
export function escapeSql(input: string, options?: SqlEscapeOptions): string {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string', 'ERR_INVALID_INPUT_TYPE');
  }

  const dialect = options?.dialect ?? 'standard';
  let escaped = '';

  if (dialect === 'mysql') {
    for (let i = 0; i < input.length; i++) {
      const ch = input[i]!;
      switch (ch) {
        case '\0':
          escaped += '\\0';
          break;
        case '\n':
          escaped += '\\n';
          break;
        case '\r':
          escaped += '\\r';
          break;
        case '\t':
          escaped += '\\t';
          break;
        case '\b':
          escaped += '\\b';
          break;
        case '\x1a': // EOF
          escaped += '\\Z';
          break;
        case "'":
          escaped += "\\'";
          break;
        case '"':
          escaped += '\\"';
          break;
        case '\\':
          escaped += '\\\\';
          break;
        default:
          escaped += ch;
          break;
      }
    }
  } else {
    // ANSI standard, postgres, sqlite
    escaped = input.replace(/'/g, "''");
  }

  if (options?.wrap) {
    return `'${escaped}'`;
  }
  return escaped;
}

/**
 * Unescapes SQL literals.
 */
export function unescapeSql(input: string, options?: SqlEscapeOptions): string {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string', 'ERR_INVALID_INPUT_TYPE');
  }

  let s = input;
  if (s.startsWith("'") && s.endsWith("'") && s.length >= 2) {
    s = s.slice(1, -1);
  }

  const dialect = options?.dialect ?? 'standard';
  if (dialect === 'mysql') {
    return s
      .replace(/\\0/g, '\0')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\b/g, '\b')
      .replace(/\\Z/g, '\x1a')
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }

  return s.replace(/''/g, "'");
}

/**
 * Escapes a string for safe POSIX shell argument usage.
 * Warning: Whenever possible, pass arguments as an argv array rather than interpolating shell strings.
 */
export function escapeShell(input: string, options?: ShellEscapeOptions): string {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string', 'ERR_INVALID_INPUT_TYPE');
  }

  if (input.length === 0) {
    return "''";
  }

  const style = options?.style ?? 'single-quote';

  if (style === 'backslash') {
    // Escape all non-safe shell characters with backslash
    return input.replace(/([^a-zA-Z0-9_\-.,/:@=])/g, '\\$1');
  }

  // Single-quote wrapping: 'it'\''s'
  return "'" + input.replace(/'/g, "'\\''") + "'";
}

/**
 * Unescapes a POSIX shell argument string.
 */
export function unescapeShell(input: string, _options?: ShellEscapeOptions): string {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string', 'ERR_INVALID_INPUT_TYPE');
  }

  let out = '';
  let inSingle = false;
  let inDouble = false;
  let escape = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;

    if (escape) {
      out += ch;
      escape = false;
      continue;
    }

    if (ch === '\\' && !inSingle) {
      escape = true;
      continue;
    }

    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }

    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }

    out += ch;
  }

  return out;
}

/**
 * Unified escape utility for all supported escape targets.
 */
export function escapeString(input: string, options?: StringEscapeOptions): string {
  const type = options?.type ?? 'javascript';
  switch (type) {
    case 'javascript':
      return escapeJavaScript(input, options?.jsOptions);
    case 'json':
      return escapeJson(input);
    case 'sql':
      return escapeSql(input, options?.sqlOptions);
    case 'shell':
      return escapeShell(input, options?.shellOptions);
    default:
      throw new ValidationError(`Unsupported escape type: ${type}`, 'ERR_UNSUPPORTED_ESCAPE_TYPE');
  }
}

/**
 * Unified unescape utility for all supported unescape targets.
 */
export function unescapeString(input: string, options?: StringEscapeOptions): string {
  const type = options?.type ?? 'javascript';
  switch (type) {
    case 'javascript':
      return unescapeJavaScript(input);
    case 'json':
      return unescapeJson(input);
    case 'sql':
      return unescapeSql(input, options?.sqlOptions);
    case 'shell':
      return unescapeShell(input, options?.shellOptions);
    default:
      throw new ValidationError(`Unsupported unescape type: ${type}`, 'ERR_UNSUPPORTED_ESCAPE_TYPE');
  }
}

/**
 * Validates whether an escaped string can be safely unescaped without errors.
 */
export function isValidEscapedString(input: string, options?: StringEscapeOptions): boolean {
  try {
    unescapeString(input, options);
    return true;
  } catch {
    return false;
  }
}
