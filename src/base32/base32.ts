import { toUint8Array, bytesToString } from '../common/bytes';
import { DecodingError, ValidationError } from '../common/errors';

export interface Base32Options {
  padding?: boolean;
  lowercase?: boolean;
  caseSensitive?: boolean;
}

const DEFAULT_OPTIONS: Required<Base32Options> = {
  padding: true,
  lowercase: false,
  caseSensitive: false,
};

export function getBase32Options(): Required<Base32Options> {
  return { ...DEFAULT_OPTIONS };
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const CHAR_MAP: Record<string, number> = {};
for (let i = 0; i < ALPHABET.length; i++) {
  CHAR_MAP[ALPHABET[i]!] = i;
}

/**
 * Encodes a string or byte array to RFC 4648 Base32.
 */
export function encodeBase32(input: string | Uint8Array, options?: Base32Options): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const bytes = toUint8Array(input);
  if (bytes.length === 0) {
    return '';
  }

  let result = '';
  let buffer = 0;
  let bitsLeft = 0;

  for (let i = 0; i < bytes.length; i++) {
    buffer = (buffer << 8) | bytes[i]!;
    bitsLeft += 8;

    while (bitsLeft >= 5) {
      bitsLeft -= 5;
      const index = (buffer >> bitsLeft) & 31;
      result += ALPHABET[index]!;
    }
  }

  if (bitsLeft > 0) {
    const index = (buffer << (5 - bitsLeft)) & 31;
    result += ALPHABET[index]!;
  }

  if (opts.padding) {
    while (result.length % 8 !== 0) {
      result += '=';
    }
  }

  return opts.lowercase ? result.toLowerCase() : result;
}

/**
 * Decodes an RFC 4648 Base32 string to Uint8Array.
 */
export function decodeBase32(input: string, options?: Base32Options): Uint8Array {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string', 'ERR_INVALID_INPUT_TYPE');
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };
  let sanitized = input.replace(/\s+/g, '');
  if (sanitized.length === 0) {
    return new Uint8Array(0);
  }

  if (opts.caseSensitive) {
    // In case-sensitive mode, reject lowercase letters
    if (/[a-z]/.test(sanitized)) {
      throw new DecodingError('Input contains lowercase characters in case-sensitive mode', 'ERR_INVALID_BASE32_CHAR');
    }
  } else {
    sanitized = sanitized.toUpperCase();
  }

  // Count padding '='
  let paddingCount = 0;
  let end = sanitized.length;
  while (end > 0 && sanitized[end - 1] === '=') {
    paddingCount++;
    end--;
  }

  // Padding chars can only be 0, 1, 3, 4, 6
  if (paddingCount > 0) {
    if (![1, 3, 4, 6].includes(paddingCount)) {
      throw new DecodingError(`Invalid Base32 padding count: ${paddingCount}`, 'ERR_INVALID_PADDING');
    }
    if (sanitized.length % 8 !== 0) {
      throw new DecodingError(`Padded Base32 length must be a multiple of 8, got ${sanitized.length}`, 'ERR_INVALID_LENGTH');
    }
    // Check if '=' appears anywhere else
    if (sanitized.slice(0, end).includes('=')) {
      throw new DecodingError('Base32 padding character \'=\' found before end of string', 'ERR_INVALID_PADDING_POSITION');
    }
  }

  const content = sanitized.slice(0, end);
  const remainder = content.length % 8;
  // Valid unpadded lengths mod 8 are 0, 2, 4, 5, 7. (1, 3, 6 are invalid)
  if ([1, 3, 6].includes(remainder)) {
    throw new DecodingError(`Invalid unpadded Base32 character length (mod 8 is ${remainder})`, 'ERR_INVALID_LENGTH');
  }

  let buffer = 0;
  let bitsLeft = 0;
  const result: number[] = [];

  for (let i = 0; i < content.length; i++) {
    const ch = content[i]!;
    const val = CHAR_MAP[ch];
    if (val === undefined) {
      throw new DecodingError(`Invalid Base32 character '${ch}' at position ${i}`, 'ERR_INVALID_BASE32_CHAR');
    }

    buffer = (buffer << 5) | val;
    bitsLeft += 5;

    if (bitsLeft >= 8) {
      bitsLeft -= 8;
      result.push((buffer >> bitsLeft) & 255);
    }
  }

  // Check RFC 4648: unused remaining bits must be zero
  if (bitsLeft > 0) {
    const mask = (1 << bitsLeft) - 1;
    if ((buffer & mask) !== 0) {
      throw new DecodingError('Unused bits in final Base32 character must be zero', 'ERR_NONZERO_UNUSED_BITS');
    }
  }

  return new Uint8Array(result);
}

/**
 * Decodes an RFC 4648 Base32 string to UTF-8 text.
 */
export function decodeBase32ToString(input: string, options?: Base32Options): string {
  return bytesToString(decodeBase32(input, options));
}

/**
 * Checks if a string is valid Base32.
 */
export function isValidBase32(input: string, options?: Base32Options): boolean {
  try {
    decodeBase32(input, options);
    return true;
  } catch {
    return false;
  }
}
