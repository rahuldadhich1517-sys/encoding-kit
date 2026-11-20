import { DecodingError, ValidationError } from './errors';

const textEncoder = new TextEncoder();
const textDecoderStrict = new TextDecoder('utf-8', { fatal: true });
const textDecoderLenient = new TextDecoder('utf-8', { fatal: false });

/**
 * Converts a UTF-8 string to a Uint8Array.
 */
export function stringToBytes(str: string): Uint8Array {
  return textEncoder.encode(str);
}

/**
 * Converts a Uint8Array to a UTF-8 string.
 */
export function bytesToString(bytes: Uint8Array, fatal = false): string {
  try {
    return fatal ? textDecoderStrict.decode(bytes) : textDecoderLenient.decode(bytes);
  } catch (err) {
    throw new DecodingError(`Invalid UTF-8 sequence: ${err instanceof Error ? err.message : String(err)}`, 'ERR_INVALID_UTF8');
  }
}

/**
 * Ensures the input is converted to a Uint8Array.
 */
export function toUint8Array(input: string | Uint8Array): Uint8Array {
  if (input instanceof Uint8Array) {
    return input;
  }
  if (typeof input === 'string') {
    return stringToBytes(input);
  }
  throw new ValidationError('Input must be a string or Uint8Array', 'ERR_INVALID_INPUT_TYPE');
}

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_LOOKUP = new Int16Array(256).fill(-1);
for (let i = 0; i < B64_CHARS.length; i++) {
  B64_LOOKUP[B64_CHARS.charCodeAt(i)] = i;
}
// Support URL-safe base64 characters '-' and '_'
B64_LOOKUP['-'.charCodeAt(0)] = 62;
B64_LOOKUP['_'.charCodeAt(0)] = 63;

/**
 * Encodes a Uint8Array to a standard Base64 string.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  const len = bytes.length;
  if (len === 0) return '';
  let result = '';
  let i = 0;

  for (; i + 2 < len; i += 3) {
    const b0 = bytes[i]!;
    const b1 = bytes[i + 1]!;
    const b2 = bytes[i + 2]!;
    const triplet = (b0 << 16) | (b1 << 8) | b2;
    result +=
      B64_CHARS.charAt((triplet >> 18) & 63) +
      B64_CHARS.charAt((triplet >> 12) & 63) +
      B64_CHARS.charAt((triplet >> 6) & 63) +
      B64_CHARS.charAt(triplet & 63);
  }

  const remaining = len - i;
  if (remaining === 1) {
    const b0 = bytes[i]!;
    result += B64_CHARS.charAt((b0 >> 2) & 63) + B64_CHARS.charAt((b0 << 4) & 63) + '==';
  } else if (remaining === 2) {
    const b0 = bytes[i]!;
    const b1 = bytes[i + 1]!;
    const doublet = (b0 << 8) | b1;
    result +=
      B64_CHARS.charAt((doublet >> 10) & 63) +
      B64_CHARS.charAt((doublet >> 4) & 63) +
      B64_CHARS.charAt((doublet << 2) & 63) +
      '=';
  }

  return result;
}

/**
 * Decodes a Base64 string into a Uint8Array.
 */
export function base64ToBytes(base64: string): Uint8Array {
  // Strip whitespace
  const sanitized = base64.replace(/\s+/g, '');
  if (sanitized.length === 0) {
    return new Uint8Array(0);
  }

  if (sanitized.length % 4 !== 0) {
    throw new DecodingError(`Base64 string length must be a multiple of 4, got ${sanitized.length}`, 'ERR_INVALID_BASE64_LENGTH');
  }

  // Count padding '='
  let padding = 0;
  if (sanitized.endsWith('==')) {
    padding = 2;
  } else if (sanitized.endsWith('=')) {
    padding = 1;
  }

  const unpaddedLength = sanitized.length - padding;
  // Calculate output bytes
  const byteLength = (sanitized.length / 4) * 3 - padding;
  const out = new Uint8Array(byteLength);
  let outIndex = 0;

  for (let i = 0; i < sanitized.length; i += 4) {
    const c0 = B64_LOOKUP[sanitized.charCodeAt(i)] ?? -1;
    const c1 = B64_LOOKUP[sanitized.charCodeAt(i + 1)] ?? -1;
    const c2 = i + 2 < unpaddedLength ? (B64_LOOKUP[sanitized.charCodeAt(i + 2)] ?? -1) : 0;
    const c3 = i + 3 < unpaddedLength ? (B64_LOOKUP[sanitized.charCodeAt(i + 3)] ?? -1) : 0;

    if (c0 === -1 || c1 === -1 || (i + 2 < unpaddedLength && c2 === -1) || (i + 3 < unpaddedLength && c3 === -1)) {
      throw new DecodingError(`Invalid character in Base64 string at position ${i}`, 'ERR_INVALID_BASE64_CHAR');
    }

    const triplet = (c0 << 18) | (c1 << 12) | (c2 << 6) | c3;
    if (outIndex < byteLength) out[outIndex++] = (triplet >> 16) & 255;
    if (outIndex < byteLength) out[outIndex++] = (triplet >> 8) & 255;
    if (outIndex < byteLength) out[outIndex++] = triplet & 255;
  }

  return out;
}
