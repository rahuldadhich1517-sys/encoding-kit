import { toUint8Array, bytesToString } from '../common/bytes';
import { DecodingError, ValidationError } from '../common/errors';

export interface QuotedPrintableOptions {
  maxLineLength?: number;
  crlf?: boolean;
  binary?: boolean;
}

export interface QuotedPrintableDecodeOptions {
  fatal?: boolean;
}

const DEFAULT_OPTIONS: Required<QuotedPrintableOptions> = {
  maxLineLength: 76,
  crlf: true,
  binary: false,
};

export function getQuotedPrintableOptions(): Required<QuotedPrintableOptions> {
  return { ...DEFAULT_OPTIONS };
}

function byteToHex(b: number): string {
  const hex = b.toString(16).toUpperCase();
  return hex.length === 1 ? `0${hex}` : hex;
}

/**
 * Encodes a string or Uint8Array to Quoted-Printable format (RFC 2045).
 */
export function encodeQuotedPrintable(input: string | Uint8Array, options?: QuotedPrintableOptions): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const bytes = toUint8Array(input);
  if (bytes.length === 0) {
    return '';
  }

  const eol = opts.crlf ? '\r\n' : '\n';
  const maxLine = opts.maxLineLength > 4 ? opts.maxLineLength : 76;

  let result = '';
  let currentLine = '';

  const flushLine = (soft = true) => {
    if (soft) {
      result += currentLine + '=' + eol;
    } else {
      result += currentLine + eol;
    }
    currentLine = '';
  };

  const len = bytes.length;
  for (let i = 0; i < len; i++) {
    const b = bytes[i]!;

    // Check if CRLF or LF in non-binary mode
    if (!opts.binary) {
      if (b === 13) {
        // CR
        if (i + 1 < len && bytes[i + 1] === 10) {
          // CRLF
          i++;
        }
        flushLine(false);
        continue;
      }
      if (b === 10) {
        // LF
        flushLine(false);
        continue;
      }
    }

    let encoded: string;
    const isSafeAscii = (b >= 33 && b <= 60) || (b >= 62 && b <= 126);
    const isSpaceOrTab = b === 32 || b === 9;

    if (isSafeAscii) {
      encoded = String.fromCharCode(b);
    } else if (isSpaceOrTab) {
      // If at end of input or before newline, must encode as hex
      const nextByte = i + 1 < len ? bytes[i + 1] : undefined;
      const isLineEnd = nextByte === undefined || (!opts.binary && (nextByte === 10 || nextByte === 13));
      encoded = isLineEnd ? `=${byteToHex(b)}` : String.fromCharCode(b);
    } else {
      encoded = `=${byteToHex(b)}`;
    }

    // Check soft line break
    // Needs space for encoded char + possible '=' soft break indicator
    if (currentLine.length + encoded.length + 1 > maxLine) {
      if (currentLine.endsWith(' ')) {
        currentLine = currentLine.slice(0, -1);
        flushLine(true);
        currentLine = ' ';
      } else if (currentLine.endsWith('\t')) {
        currentLine = currentLine.slice(0, -1);
        flushLine(true);
        currentLine = '\t';
      } else {
        flushLine(true);
      }
    }

    currentLine += encoded;
  }

  result += currentLine;
  return result;
}

/**
 * Decodes a Quoted-Printable string to Uint8Array.
 */
export function decodeQuotedPrintable(input: string, options?: QuotedPrintableDecodeOptions): Uint8Array {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string', 'ERR_INVALID_INPUT_TYPE');
  }

  const fatal = options?.fatal ?? true;
  const out: number[] = [];
  const len = input.length;

  for (let i = 0; i < len; i++) {
    const ch = input[i]!;

    if (ch === '=') {
      if (i + 1 >= len) {
        if (fatal) throw new DecodingError('Unexpected end of input after \'=\'', 'ERR_MALFORMED_QP');
        out.push(61);
        continue;
      }

      const next1 = input[i + 1]!;

      // Check soft line breaks
      if (next1 === '\r') {
        if (i + 2 < len && input[i + 2] === '\n') {
          i += 2; // Skip =\r\n
          continue;
        }
        i += 1; // Skip =\r
        continue;
      }
      if (next1 === '\n') {
        i += 1; // Skip =\n
        continue;
      }

      // Check 2-digit hex escape
      if (i + 2 < len) {
        const next2 = input[i + 2]!;
        const hex = next1 + next2;
        if (/^[0-9a-fA-F]{2}$/.test(hex)) {
          out.push(parseInt(hex, 16));
          i += 2;
          continue;
        }
      }

      if (fatal) {
        throw new DecodingError(`Invalid Quoted-Printable escape sequence at index ${i}`, 'ERR_INVALID_QP_ESCAPE');
      } else {
        out.push(61);
      }
    } else if (ch === '\r') {
      if (i + 1 < len && input[i + 1] === '\n') {
        i++;
      }
      out.push(13, 10);
    } else if (ch === '\n') {
      out.push(13, 10);
    } else {
      out.push(ch.charCodeAt(0));
    }
  }

  return new Uint8Array(out);
}

/**
 * Decodes a Quoted-Printable string to a UTF-8 string.
 */
export function decodeQuotedPrintableToString(input: string, options?: QuotedPrintableDecodeOptions): string {
  return bytesToString(decodeQuotedPrintable(input, options));
}

/**
 * Validates whether a string is valid Quoted-Printable.
 */
export function isValidQuotedPrintable(input: string, _options?: QuotedPrintableOptions): boolean {
  try {
    decodeQuotedPrintable(input, { fatal: true });
    return true;
  } catch {
    return false;
  }
}
