import { toUint8Array, bytesToString } from '../common/bytes';
import { DecodingError, ValidationError } from '../common/errors';

export interface Ascii85Options {
  adobeDelimiters?: boolean;
  useZeroShorthand?: boolean;
  wrap?: number;
}

const DEFAULT_OPTIONS: Required<Ascii85Options> = {
  adobeDelimiters: false,
  useZeroShorthand: true,
  wrap: 0,
};

export function getAscii85Options(): Required<Ascii85Options> {
  return { ...DEFAULT_OPTIONS };
}

const POW_85 = [52200625, 614125, 7225, 85, 1]; // 85^4, 85^3, 85^2, 85^1, 85^0

/**
 * Encodes a string or byte array to Ascii85.
 */
export function encodeAscii85(input: string | Uint8Array, options?: Ascii85Options): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const bytes = toUint8Array(input);
  if (bytes.length === 0) {
    return opts.adobeDelimiters ? '<~~>' : '';
  }

  let out = '';
  const len = bytes.length;
  let i = 0;

  for (; i + 3 < len; i += 4) {
    const b0 = bytes[i]!;
    const b1 = bytes[i + 1]!;
    const b2 = bytes[i + 2]!;
    const b3 = bytes[i + 3]!;
    const value = ((b0 << 24) >>> 0) + (b1 << 16) + (b2 << 8) + b3;

    if (value === 0 && opts.useZeroShorthand) {
      out += 'z';
    } else {
      let v = value;
      const c4 = (v % 85) + 33;
      v = Math.floor(v / 85);
      const c3 = (v % 85) + 33;
      v = Math.floor(v / 85);
      const c2 = (v % 85) + 33;
      v = Math.floor(v / 85);
      const c1 = (v % 85) + 33;
      const c0 = Math.floor(v / 85) + 33;
      out += String.fromCharCode(c0, c1, c2, c3, c4);
    }
  }

  const remaining = len - i;
  if (remaining > 0) {
    let value = 0;
    for (let r = 0; r < remaining; r++) {
      value += (bytes[i + r]! << (24 - r * 8)) >>> 0;
    }
    let v = value;
    const chars = new Array<number>(5);
    for (let c = 4; c >= 0; c--) {
      chars[c] = (v % 85) + 33;
      v = Math.floor(v / 85);
    }
    for (let c = 0; c < remaining + 1; c++) {
      out += String.fromCharCode(chars[c]!);
    }
  }

  if (opts.wrap && opts.wrap > 0) {
    const wrapped: string[] = [];
    for (let w = 0; w < out.length; w += opts.wrap) {
      wrapped.push(out.slice(w, w + opts.wrap));
    }
    out = wrapped.join('\n');
  }

  if (opts.adobeDelimiters) {
    return `<~${out}~>`;
  }
  return out;
}

/**
 * Decodes an Ascii85-encoded string into bytes.
 */
export function decodeAscii85(input: string, options?: Ascii85Options): Uint8Array {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string', 'ERR_INVALID_INPUT_TYPE');
  }

  let text = input.trim();
  const hasStart = text.startsWith('<~');
  const hasEnd = text.endsWith('~>');

  if (options?.adobeDelimiters && (!hasStart || !hasEnd)) {
    throw new DecodingError('Input lacks required Adobe Ascii85 delimiters (<~ and ~>)', 'ERR_MISSING_DELIMITERS');
  }

  if (hasStart && hasEnd) {
    text = text.slice(2, -2);
  } else if (hasStart) {
    text = text.slice(2);
  } else if (hasEnd) {
    text = text.slice(0, -2);
  }

  // Remove whitespace
  text = text.replace(/\s+/g, '');
  if (text.length === 0) {
    return new Uint8Array(0);
  }

  const result: number[] = [];
  let block: number[] = [];

  for (let idx = 0; idx < text.length; idx++) {
    const ch = text[idx]!;
    if (ch === 'z') {
      if (block.length > 0) {
        throw new DecodingError(`Unexpected 'z' character inside block at position ${idx}`, 'ERR_INVALID_Z_POSITION');
      }
      result.push(0, 0, 0, 0);
      continue;
    }

    const code = ch.charCodeAt(0);
    if (code < 33 || code > 117) {
      throw new DecodingError(`Invalid Ascii85 character '${ch}' at position ${idx}`, 'ERR_INVALID_ASCII85_CHAR');
    }

    block.push(code - 33);

    if (block.length === 5) {
      let value = 0;
      for (let b = 0; b < 5; b++) {
        value += block[b]! * POW_85[b]!;
      }
      if (value > 0xffffffff) {
        throw new DecodingError(`Ascii85 block value overflow at position ${idx}`, 'ERR_ASCII85_OVERFLOW');
      }
      result.push((value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255);
      block = [];
    }
  }

  if (block.length === 1) {
    throw new DecodingError('Invalid Ascii85 final block length (single character)', 'ERR_INVALID_BLOCK_LENGTH');
  }

  if (block.length > 1) {
    const count = block.length;
    while (block.length < 5) {
      block.push(84); // Pad with 'u' (117 - 33 = 84)
    }
    let value = 0;
    for (let b = 0; b < 5; b++) {
      value += block[b]! * POW_85[b]!;
    }
    if (value > 0xffffffff) {
      throw new DecodingError('Ascii85 block value overflow in final block', 'ERR_ASCII85_OVERFLOW');
    }
    const bytes = [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
    for (let k = 0; k < count - 1; k++) {
      result.push(bytes[k]!);
    }
  }

  return new Uint8Array(result);
}

/**
 * Decodes an Ascii85-encoded string into a UTF-8 string.
 */
export function decodeAscii85ToString(input: string, options?: Ascii85Options): string {
  return bytesToString(decodeAscii85(input, options));
}

/**
 * Validates whether a string is valid Ascii85.
 */
export function isValidAscii85(input: string, options?: Ascii85Options): boolean {
  try {
    decodeAscii85(input, options);
    return true;
  } catch {
    return false;
  }
}
