import { base64ToBytes, bytesToString } from '../common/bytes';
import { ValidationError } from '../common/errors';
import {
  detectImageSignature,
  sanitizeSvgCheck,
  type SupportedImageFormat,
  type ImageDimensions,
} from '../common/image-signatures';

export interface ParsedDataUri {
  mimeType: string;
  base64Data: string;
  isBase64: boolean;
  parameters: Record<string, string>;
}

export interface Base64ToBlobOptions {
  mimeType?: string;
  maxSizeBytes?: number;
}

export interface Base64ToImageOptions {
  allowedFormats?: SupportedImageFormat[];
  maxSizeBytes?: number;
  strictMimeCheck?: boolean;
}

export interface ImageValidationResult {
  valid: boolean;
  format?: SupportedImageFormat;
  mimeType?: string;
  byteLength?: number;
  error?: string;
  threats?: string[];
}

export interface ImageMetadata {
  format: SupportedImageFormat;
  mimeType: string;
  byteLength: number;
  extension: string;
  dimensions?: ImageDimensions;
  hasThreats?: boolean;
  threats?: string[];
}

/**
 * Parses a data URI string into its components.
 */
export function parseBase64DataUri(dataUri: string): ParsedDataUri {
  if (typeof dataUri !== 'string') {
    throw new ValidationError('Data URI must be a string', 'ERR_INVALID_INPUT_TYPE');
  }

  const match = /^data:([^;,]*)(;[^,]*)?,(.*)$/is.exec(dataUri.trim());
  if (!match) {
    throw new ValidationError('Invalid data URI format', 'ERR_INVALID_DATA_URI');
  }

  const declaredMime = match[1] ? match[1].toLowerCase() : 'text/plain;charset=US-ASCII';
  const paramPart = match[2] ?? '';
  const dataPart = match[3] ?? '';

  const params: Record<string, string> = {};
  let isBase64 = false;

  const rawParams = paramPart.split(';').filter(Boolean);
  for (const p of rawParams) {
    if (p.toLowerCase() === 'base64') {
      isBase64 = true;
    } else {
      const [k, v] = p.split('=');
      if (k && v !== undefined) {
        params[k.trim().toLowerCase()] = v.trim();
      }
    }
  }

  return {
    mimeType: declaredMime,
    base64Data: dataPart,
    isBase64,
    parameters: params,
  };
}

/**
 * Extracts raw base64 string and optional declared MIME type from either a data URI or raw base64.
 */
function extractBase64AndMime(dataUriOrBase64: string): { base64: string; mimeType?: string } {
  const trimmed = dataUriOrBase64.trim();
  if (trimmed.startsWith('data:')) {
    const parsed = parseBase64DataUri(trimmed);
    if (!parsed.isBase64) {
      throw new ValidationError('Data URI is not base64 encoded', 'ERR_NOT_BASE64_DATA_URI');
    }
    return { base64: parsed.base64Data, mimeType: parsed.mimeType };
  }
  return { base64: trimmed };
}

/**
 * Converts Base64 data (or data URI) into a standard Blob.
 */
export function base64ToBlob(dataUriOrBase64: string, options?: Base64ToBlobOptions): Blob {
  const { base64, mimeType } = extractBase64AndMime(dataUriOrBase64);
  const bytes = base64ToBytes(base64);

  if (options?.maxSizeBytes && bytes.length > options.maxSizeBytes) {
    throw new ValidationError(`Data exceeds maximum allowed size of ${options.maxSizeBytes} bytes`, 'ERR_SIZE_LIMIT_EXCEEDED');
  }

  const resolvedMime = options?.mimeType ?? mimeType ?? 'application/octet-stream';
  return new Blob([bytes as BlobPart], { type: resolvedMime });
}

/**
 * Validates Base64 image data and returns safe Blob.
 */
export function base64ToImageBlob(dataUriOrBase64: string, options?: Base64ToImageOptions): Blob {
  const validation = validateBase64Image(dataUriOrBase64, options);
  if (!validation.valid || !validation.mimeType) {
    throw new ValidationError(`Invalid image data: ${validation.error ?? 'Unknown error'}`, 'ERR_INVALID_IMAGE');
  }

  const { base64 } = extractBase64AndMime(dataUriOrBase64);
  const bytes = base64ToBytes(base64);
  return new Blob([bytes as BlobPart], { type: validation.mimeType });
}

/**
 * Validates a base64 image or data URI.
 */
export function validateBase64Image(
  dataUriOrBase64: string,
  options?: Base64ToImageOptions
): ImageValidationResult {
  try {
    const { base64, mimeType: declaredMime } = extractBase64AndMime(dataUriOrBase64);
    const bytes = base64ToBytes(base64);

    if (options?.maxSizeBytes && bytes.length > options.maxSizeBytes) {
      return {
        valid: false,
        byteLength: bytes.length,
        error: `Image size ${bytes.length} bytes exceeds limit of ${options.maxSizeBytes} bytes`,
      };
    }

    const sig = detectImageSignature(bytes);
    if (!sig) {
      return {
        valid: false,
        byteLength: bytes.length,
        error: 'Unsupported or unrecognised image file signature',
      };
    }

    if (options?.allowedFormats && !options.allowedFormats.includes(sig.format)) {
      return {
        valid: false,
        format: sig.format,
        mimeType: sig.mimeType,
        byteLength: bytes.length,
        error: `Image format '${sig.format}' is not in the allowed list`,
      };
    }

    if (options?.strictMimeCheck && declaredMime && declaredMime !== sig.mimeType) {
      return {
        valid: false,
        format: sig.format,
        mimeType: sig.mimeType,
        byteLength: bytes.length,
        error: `Declared MIME type '${declaredMime}' does not match detected MIME type '${sig.mimeType}'`,
      };
    }

    let threats: string[] | undefined;
    if (sig.format === 'svg') {
      const svgText = bytesToString(bytes);
      const check = sanitizeSvgCheck(svgText);
      if (!check.isSafe) {
        threats = check.threats;
      }
    }

    return {
      valid: true,
      format: sig.format,
      mimeType: sig.mimeType,
      byteLength: bytes.length,
      threats,
    };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Extracts metadata (dimensions, format, MIME, size) from a data URI or Blob.
 */
export async function getImageMetadata(
  dataUriOrBlob: string | Blob,
  _options?: unknown
): Promise<ImageMetadata> {
  let bytes: Uint8Array;

  if (typeof dataUriOrBlob === 'string') {
    const { base64 } = extractBase64AndMime(dataUriOrBlob);
    bytes = base64ToBytes(base64);
  } else if (dataUriOrBlob instanceof Blob) {
    const buffer = await dataUriOrBlob.arrayBuffer();
    bytes = new Uint8Array(buffer);
  } else {
    throw new ValidationError('Input must be a string or Blob', 'ERR_INVALID_INPUT_TYPE');
  }

  const sig = detectImageSignature(bytes);
  if (!sig) {
    throw new ValidationError('Could not detect valid image format from data', 'ERR_UNKNOWN_IMAGE_FORMAT');
  }

  let threats: string[] | undefined;
  if (sig.format === 'svg') {
    const svgText = bytesToString(bytes);
    const check = sanitizeSvgCheck(svgText);
    if (!check.isSafe) {
      threats = check.threats;
    }
  }

  return {
    format: sig.format,
    mimeType: sig.mimeType,
    byteLength: bytes.length,
    extension: sig.extension,
    dimensions: sig.dimensions,
    hasThreats: threats ? threats.length > 0 : false,
    threats,
  };
}
