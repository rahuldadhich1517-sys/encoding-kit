import { DecodingError, ValidationError } from '../common/errors';

export interface DomainToAsciiOptions {
  allowEmptyLabels?: boolean;
  verifyLength?: boolean;
}

export interface DomainToUnicodeOptions {
  // Configurable options if needed
}

const BASE = 36;
const TMIN = 1;
const TMAX = 26;
const SKEW = 38;
const DAMP = 700;
const INITIAL_BIAS = 72;
const INITIAL_N = 128;
const DELIMITER = '-';
const MAX_INT = 2147483647;

const PUNYCODE_PREFIX = 'xn--';
const LABEL_SEPARATOR_REGEX = /[\.\u3002\uFF0E\uFF61]/g;

function adapt(delta: number, numpoints: number, firsttime: boolean): number {
  let d = firsttime ? Math.floor(delta / DAMP) : delta >> 1;
  d += Math.floor(d / numpoints);
  let k = 0;
  while (d > ((BASE - TMIN) * TMAX) / 2) {
    d = Math.floor(d / (BASE - TMIN));
    k += BASE;
  }
  return k + Math.floor(((BASE - TMIN + 1) * d) / (d + SKEW));
}

function digitToBasic(digit: number): string {
  if (digit < 26) {
    return String.fromCharCode(digit + 97); // 'a'..'z'
  }
  return String.fromCharCode(digit - 26 + 48); // '0'..'9'
}

function basicToDigit(code: number): number {
  if (code >= 48 && code <= 57) {
    return code - 48 + 26;
  }
  if (code >= 65 && code <= 90) {
    return code - 65;
  }
  if (code >= 97 && code <= 122) {
    return code - 97;
  }
  return -1;
}

/**
 * Encodes a Unicode string to raw Punycode (RFC 3492).
 */
export function toPunycode(input: string): string {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string', 'ERR_INVALID_INPUT_TYPE');
  }

  // Convert to code points
  const codePoints: number[] = [];
  for (let i = 0; i < input.length; ) {
    const cp = input.codePointAt(i)!;
    codePoints.push(cp);
    i += cp > 0xffff ? 2 : 1;
  }

  const output: string[] = [];
  // Copy basic code points
  for (const cp of codePoints) {
    if (cp < 0x80) {
      output.push(String.fromCharCode(cp));
    }
  }

  const basicCount = output.length;
  let h = basicCount;

  if (basicCount > 0) {
    output.push(DELIMITER);
  }

  let n = INITIAL_N;
  let delta = 0;
  let bias = INITIAL_BIAS;

  while (h < codePoints.length) {
    // Find smallest code point >= n
    let m = MAX_INT;
    for (const cp of codePoints) {
      if (cp >= n && cp < m) {
        m = cp;
      }
    }

    if (m - n > Math.floor((MAX_INT - delta) / (h + 1))) {
      throw new DecodingError('Punycode overflow during encoding', 'ERR_PUNYCODE_OVERFLOW');
    }
    delta += (m - n) * (h + 1);
    n = m;

    for (const cp of codePoints) {
      if (cp < n) {
        delta++;
        if (delta > MAX_INT) {
          throw new DecodingError('Punycode overflow during encoding', 'ERR_PUNYCODE_OVERFLOW');
        }
      }

      if (cp === n) {
        let q = delta;
        for (let k = BASE; ; k += BASE) {
          const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
          if (q < t) {
            break;
          }
          output.push(digitToBasic(t + ((q - t) % (BASE - t))));
          q = Math.floor((q - t) / (BASE - t));
        }
        output.push(digitToBasic(q));
        bias = adapt(delta, h + 1, h === basicCount);
        delta = 0;
        h++;
      }
    }

    delta++;
    n++;
  }

  return output.join('');
}

/**
 * Decodes a raw Punycode string to Unicode (RFC 3492).
 */
export function fromPunycode(input: string): string {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string', 'ERR_INVALID_INPUT_TYPE');
  }

  const output: number[] = [];
  const delimIndex = input.lastIndexOf(DELIMITER);

  let pos = 0;
  if (delimIndex > 0) {
    for (; pos < delimIndex; pos++) {
      const c = input.charCodeAt(pos);
      if (c >= 0x80) {
        throw new DecodingError(`Illegal non-ASCII character in Punycode basic part at position ${pos}`, 'ERR_INVALID_PUNYCODE_CHAR');
      }
      output.push(c);
    }
    pos++; // Skip delimiter
  } else if (delimIndex === 0) {
    // Empty basic part, skip delimiter
    pos = 1;
  }

  let n = INITIAL_N;
  let i = 0;
  let bias = INITIAL_BIAS;

  while (pos < input.length) {
    const oldi = i;
    let w = 1;

    for (let k = BASE; ; k += BASE) {
      if (pos >= input.length) {
        throw new DecodingError('Incomplete Punycode sequence', 'ERR_INCOMPLETE_PUNYCODE');
      }

      const digit = basicToDigit(input.charCodeAt(pos++));
      if (digit < 0) {
        throw new DecodingError(`Invalid Punycode character at position ${pos - 1}`, 'ERR_INVALID_PUNYCODE_CHAR');
      }

      if (digit > Math.floor((MAX_INT - i) / w)) {
        throw new DecodingError('Punycode overflow during decoding', 'ERR_PUNYCODE_OVERFLOW');
      }
      i += digit * w;

      const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
      if (digit < t) {
        break;
      }

      if (w > Math.floor(MAX_INT / (BASE - t))) {
        throw new DecodingError('Punycode overflow during decoding', 'ERR_PUNYCODE_OVERFLOW');
      }
      w *= BASE - t;
    }

    const outLen = output.length + 1;
    bias = adapt(i - oldi, outLen, oldi === 0);

    if (Math.floor(i / outLen) > MAX_INT - n) {
      throw new DecodingError('Punycode overflow during decoding', 'ERR_PUNYCODE_OVERFLOW');
    }
    n += Math.floor(i / outLen);
    i %= outLen;

    output.splice(i, 0, n);
    i++;
  }

  return String.fromCodePoint(...output);
}

/**
 * Checks if a string is valid Punycode.
 */
export function isValidPunycode(input: string): boolean {
  try {
    const raw = input.toLowerCase().startsWith(PUNYCODE_PREFIX) ? input.slice(PUNYCODE_PREFIX.length) : input;
    fromPunycode(raw);
    return true;
  } catch {
    return false;
  }
}

/**
 * Converts an internationalized domain name to ASCII/Punycode (IDNA).
 */
export function domainToAscii(domain: string, options?: DomainToAsciiOptions): string {
  if (typeof domain !== 'string') {
    throw new ValidationError('Domain must be a string', 'ERR_INVALID_INPUT_TYPE');
  }

  const verifyLength = options?.verifyLength ?? true;
  const allowEmpty = options?.allowEmptyLabels ?? false;

  const labels = domain.split(LABEL_SEPARATOR_REGEX);
  const encodedLabels: string[] = [];

  for (let idx = 0; idx < labels.length; idx++) {
    const label = labels[idx]!;

    if (label.length === 0) {
      if (idx === labels.length - 1 || allowEmpty) {
        encodedLabels.push('');
        continue;
      }
      throw new ValidationError(`Empty label in domain at position ${idx}`, 'ERR_EMPTY_DOMAIN_LABEL');
    }

    let encoded: string;
    // Check if label contains non-ASCII characters
    if (/[\u0080-\uFFFF]/.test(label)) {
      encoded = PUNYCODE_PREFIX + toPunycode(label.toLowerCase());
    } else {
      // Check if it's already an xn-- label
      if (label.toLowerCase().startsWith(PUNYCODE_PREFIX)) {
        if (!isValidPunycode(label)) {
          throw new ValidationError(`Invalid Punycode label: ${label}`, 'ERR_INVALID_PUNYCODE_LABEL');
        }
      }
      encoded = label.toLowerCase();
    }

    if (verifyLength && encoded.length > 63) {
      throw new ValidationError(`Domain label exceeds maximum length of 63 characters: ${encoded}`, 'ERR_LABEL_TOO_LONG');
    }

    encodedLabels.push(encoded);
  }

  const result = encodedLabels.join('.');
  if (verifyLength && result.length > 253) {
    throw new ValidationError(`Domain exceeds maximum total length of 253 characters: ${result}`, 'ERR_DOMAIN_TOO_LONG');
  }

  return result;
}

/**
 * Converts a domain from ASCII/Punycode back to Unicode.
 */
export function domainToUnicode(domain: string, _options?: DomainToUnicodeOptions): string {
  if (typeof domain !== 'string') {
    throw new ValidationError('Domain must be a string', 'ERR_INVALID_INPUT_TYPE');
  }

  const labels = domain.split(LABEL_SEPARATOR_REGEX);
  const decodedLabels = labels.map((label) => {
    const lower = label.toLowerCase();
    if (lower.startsWith(PUNYCODE_PREFIX)) {
      try {
        return fromPunycode(lower.slice(PUNYCODE_PREFIX.length));
      } catch {
        return label;
      }
    }
    return label;
  });

  return decodedLabels.join('.');
}
