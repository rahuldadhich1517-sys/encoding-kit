import { toUint8Array, bytesToString } from '../common/bytes';
import { DecodingError, ValidationError } from '../common/errors';

export interface Base62Options {
  alphabet?: string;
}

export const DEFAULT_BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

const DEFAULT_OPTIONS: Required<Base62Options> = {
  alphabet: DEFAULT_BASE62_ALPHABET,
};

export function getBase62Options(): Required<Base62Options> {
  return { ...DEFAULT_OPTIONS };
}

function validateAlphabet(alphabet: string): Record<string, number> {
  if (alphabet.length !== 62) {
    throw new ValidationError(`Base62 alphabet must be exactly 62 characters, got ${alphabet.length}`, 'ERR_INVALID_ALPHABET');
  }
  const map: Record<string, number> = {};
  for (let i = 0; i < alphabet.length; i++) {
    const ch = alphabet[i]!;
    if (map[ch] !== undefined) {
      throw new ValidationError(`Base62 alphabet contains duplicate character '${ch}'`, 'ERR_DUPLICATE_ALPHABET_CHAR');
    }
    map[ch] = i;
  }
  return map;
}

const DEFAULT_MAP: Record<string, number> = {};
for (let i = 0; i < DEFAULT_BASE62_ALPHABET.length; i++) {
  DEFAULT_MAP[DEFAULT_BASE62_ALPHABET[i]!] = i;
}

/**
 * Encodes a string or byte array to Base62.
 */
export function encodeBase62(input: string | Uint8Array, options?: Base62Options): string {
  const alphabet = options?.alphabet ?? DEFAULT_BASE62_ALPHABET;
  if (alphabet !== DEFAULT_BASE62_ALPHABET) {
    validateAlphabet(alphabet);
  }

  const bytes = toUint8Array(input);
  if (bytes.length === 0) {
    return '';
  }

  // Count leading zeros
  let leadingZeros = 0;
  while (leadingZeros < bytes.length && bytes[leadingZeros] === 0) {
    leadingZeros++;
  }

  let intVal = 0n;
  for (let i = leadingZeros; i < bytes.length; i++) {
    intVal = (intVal << 8n) | BigInt(bytes[i]!);
  }

  let result = '';
  while (intVal > 0n) {
    const rem = Number(intVal % 62n);
    intVal = intVal / 62n;
    result = alphabet[rem]! + result;
  }

  const zeroChar = alphabet[0]!;
  return zeroChar.repeat(leadingZeros) + result;
}

/**
 * Decodes a Base62 string to Uint8Array.
 */
export function decodeBase62(input: string, options?: Base62Options): Uint8Array {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string', 'ERR_INVALID_INPUT_TYPE');
  }

  const alphabet = options?.alphabet ?? DEFAULT_BASE62_ALPHABET;
  const charMap = alphabet === DEFAULT_BASE62_ALPHABET ? DEFAULT_MAP : validateAlphabet(alphabet);

  if (input.length === 0) {
    return new Uint8Array(0);
  }

  const zeroChar = alphabet[0]!;
  let leadingZeros = 0;
  while (leadingZeros < input.length && input[leadingZeros] === zeroChar) {
    leadingZeros++;
  }

  let intVal = 0n;
  for (let i = leadingZeros; i < input.length; i++) {
    const ch = input[i]!;
    const val = charMap[ch];
    if (val === undefined) {
      throw new DecodingError(`Invalid Base62 character '${ch}' at position ${i}`, 'ERR_INVALID_BASE62_CHAR');
    }
    intVal = intVal * 62n + BigInt(val);
  }

  const bytes: number[] = [];
  while (intVal > 0n) {
    bytes.push(Number(intVal & 0xffn));
    intVal = intVal >> 8n;
  }
  bytes.reverse();

  const totalLength = leadingZeros + bytes.length;
  const out = new Uint8Array(totalLength);
  for (let i = 0; i < bytes.length; i++) {
    out[leadingZeros + i] = bytes[i]!;
  }

  return out;
}

/**
 * Decodes a Base62 string to a UTF-8 string.
 */
export function decodeBase62ToString(input: string, options?: Base62Options): string {
  return bytesToString(decodeBase62(input, options));
}

/**
 * Checks if a string is valid Base62.
 */
export function isValidBase62(input: string, options?: Base62Options): boolean {
  try {
    decodeBase62(input, options);
    return true;
  } catch {
    return false;
  }
}
