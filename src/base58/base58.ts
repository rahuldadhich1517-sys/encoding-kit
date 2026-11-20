import { toUint8Array, bytesToString } from '../common/bytes';
import { DecodingError, ValidationError } from '../common/errors';

export interface Base58Options {
  alphabet?: string;
}

export const BITCOIN_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

const DEFAULT_OPTIONS: Required<Base58Options> = {
  alphabet: BITCOIN_ALPHABET,
};

export function getBase58Options(): Required<Base58Options> {
  return { ...DEFAULT_OPTIONS };
}

function validateAlphabet(alphabet: string): Record<string, number> {
  if (alphabet.length !== 58) {
    throw new ValidationError(`Base58 alphabet must be exactly 58 characters, got ${alphabet.length}`, 'ERR_INVALID_ALPHABET');
  }
  const map: Record<string, number> = {};
  for (let i = 0; i < alphabet.length; i++) {
    const ch = alphabet[i]!;
    if (map[ch] !== undefined) {
      throw new ValidationError(`Base58 alphabet contains duplicate character '${ch}'`, 'ERR_DUPLICATE_ALPHABET_CHAR');
    }
    map[ch] = i;
  }
  return map;
}

/**
 * Encodes a string or byte array to Base58 (Bitcoin alphabet by default).
 */
export function encodeBase58(input: string | Uint8Array, options?: Base58Options): string {
  const alphabet = options?.alphabet ?? BITCOIN_ALPHABET;
  if (alphabet !== BITCOIN_ALPHABET) {
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

  // Convert remaining bytes to BigInt
  let intVal = 0n;
  for (let i = leadingZeros; i < bytes.length; i++) {
    intVal = (intVal << 8n) | BigInt(bytes[i]!);
  }

  let result = '';
  while (intVal > 0n) {
    const rem = Number(intVal % 58n);
    intVal = intVal / 58n;
    result = alphabet[rem]! + result;
  }

  // Prepend leading zero characters (e.g. '1' for Bitcoin)
  const zeroChar = alphabet[0]!;
  return zeroChar.repeat(leadingZeros) + result;
}

/**
 * Decodes a Base58 string to Uint8Array.
 */
export function decodeBase58(input: string, options?: Base58Options): Uint8Array {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string', 'ERR_INVALID_INPUT_TYPE');
  }

  const alphabet = options?.alphabet ?? BITCOIN_ALPHABET;
  const charMap = alphabet === BITCOIN_ALPHABET ? BITCOIN_MAP : validateAlphabet(alphabet);

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
      throw new DecodingError(`Invalid Base58 character '${ch}' at position ${i}`, 'ERR_INVALID_BASE58_CHAR');
    }
    intVal = intVal * 58n + BigInt(val);
  }

  // Convert BigInt to bytes
  const bytes: number[] = [];
  while (intVal > 0n) {
    bytes.push(Number(intVal & 0xffn));
    intVal = intVal >> 8n;
  }
  bytes.reverse();

  // Combine leading zero bytes with converted bytes
  const totalLength = leadingZeros + bytes.length;
  const out = new Uint8Array(totalLength);
  for (let i = 0; i < bytes.length; i++) {
    out[leadingZeros + i] = bytes[i]!;
  }

  return out;
}

const BITCOIN_MAP: Record<string, number> = {};
for (let i = 0; i < BITCOIN_ALPHABET.length; i++) {
  BITCOIN_MAP[BITCOIN_ALPHABET[i]!] = i;
}

/**
 * Decodes a Base58 string to a UTF-8 string.
 */
export function decodeBase58ToString(input: string, options?: Base58Options): string {
  return bytesToString(decodeBase58(input, options));
}

/**
 * Checks if a string is valid Base58.
 */
export function isValidBase58(input: string, options?: Base58Options): boolean {
  try {
    decodeBase58(input, options);
    return true;
  } catch {
    return false;
  }
}
