import { bytesToBase64, bytesToString } from '../common/bytes';
import { ValidationError } from '../common/errors';
import {
  detectImageSignature,
  sanitizeSvgCheck,
  type SupportedImageFormat,
  type ImageDimensions,
} from '../common/image-signatures';
import type { ImageValidationResult } from '../base64-to-image/base64-to-image';

export interface ImageToBase64Options {
  includeDataUri?: boolean;
  maxSizeBytes?: number;
  allowedFormats?: SupportedImageFormat[];
}

export interface ValidateImageFileOptions {
  maxSizeBytes?: number;
  allowedFormats?: SupportedImageFormat[];
}

export interface ImageFileMetadata {
  name?: string;
  size: number;
  lastModified?: number;
  format: SupportedImageFormat;
  mimeType: string;
  extension: string;
  dimensions?: ImageDimensions;
  hasThreats?: boolean;
  threats?: string[];
}

async function readBlobToBytes(blob: Blob): Promise<Uint8Array> {
  const buffer = await blob.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Validates an image File or Blob.
 */
export async function validateImageFile(
  fileOrBlob: Blob | File,
  options?: ValidateImageFileOptions
): Promise<ImageValidationResult> {
  if (!(fileOrBlob instanceof Blob)) {
    return {
      valid: false,
      error: 'Input must be an instance of Blob or File',
    };
  }

  if (fileOrBlob.size === 0) {
    return {
      valid: false,
      byteLength: 0,
      error: 'File or Blob is empty (0 bytes)',
    };
  }

  if (options?.maxSizeBytes && fileOrBlob.size > options.maxSizeBytes) {
    return {
      valid: false,
      byteLength: fileOrBlob.size,
      error: `File size ${fileOrBlob.size} bytes exceeds limit of ${options.maxSizeBytes} bytes`,
    };
  }

  try {
    const bytes = await readBlobToBytes(fileOrBlob);
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
        error: `Format '${sig.format}' is not in the allowed list`,
      };
    }

    let threats: string[] | undefined;
    if (sig.format === 'svg') {
      const text = bytesToString(bytes);
      const check = sanitizeSvgCheck(text);
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
 * Converts a Blob to a Base64 string or Data URI.
 */
export async function blobToBase64(blob: Blob, options?: ImageToBase64Options): Promise<string> {
  if (!(blob instanceof Blob)) {
    throw new ValidationError('Input must be an instance of Blob', 'ERR_INVALID_INPUT_TYPE');
  }

  const validation = await validateImageFile(blob, {
    maxSizeBytes: options?.maxSizeBytes,
    allowedFormats: options?.allowedFormats,
  });

  if (!validation.valid || !validation.mimeType) {
    throw new ValidationError(`Invalid image file: ${validation.error}`, 'ERR_INVALID_IMAGE');
  }

  const bytes = await readBlobToBytes(blob);
  const base64 = bytesToBase64(bytes);

  if (options?.includeDataUri === false) {
    return base64;
  }

  return `data:${validation.mimeType};base64,${base64}`;
}

/**
 * Converts a File to a Base64 string or Data URI.
 */
export async function fileToBase64(file: File, options?: ImageToBase64Options): Promise<string> {
  return blobToBase64(file, options);
}

/**
 * Converts a File or Blob to a Base64 string or Data URI.
 */
export async function imageToBase64(fileOrBlob: Blob | File, options?: ImageToBase64Options): Promise<string> {
  return blobToBase64(fileOrBlob, options);
}

/**
 * Extracts metadata from an image File or Blob.
 */
export async function getImageFileMetadata(fileOrBlob: Blob | File): Promise<ImageFileMetadata> {
  if (!(fileOrBlob instanceof Blob)) {
    throw new ValidationError('Input must be an instance of Blob or File', 'ERR_INVALID_INPUT_TYPE');
  }

  const bytes = await readBlobToBytes(fileOrBlob);
  const sig = detectImageSignature(bytes);

  if (!sig) {
    throw new ValidationError('Unrecognised or unsupported image format', 'ERR_UNKNOWN_IMAGE_FORMAT');
  }

  let threats: string[] | undefined;
  if (sig.format === 'svg') {
    const text = bytesToString(bytes);
    const check = sanitizeSvgCheck(text);
    if (!check.isSafe) {
      threats = check.threats;
    }
  }

  const isFile = typeof File !== 'undefined' && fileOrBlob instanceof File;

  return {
    name: isFile ? fileOrBlob.name : undefined,
    size: fileOrBlob.size,
    lastModified: isFile ? fileOrBlob.lastModified : undefined,
    format: sig.format,
    mimeType: sig.mimeType,
    extension: sig.extension,
    dimensions: sig.dimensions,
    hasThreats: threats ? threats.length > 0 : false,
    threats,
  };
}
