export type SupportedImageFormat = 'png' | 'jpeg' | 'webp' | 'gif' | 'svg';

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageSignatureInfo {
  format: SupportedImageFormat;
  mimeType: string;
  extension: string;
  dimensions?: ImageDimensions;
}

const MIME_MAP: Record<SupportedImageFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
};

const EXT_MAP: Record<SupportedImageFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
  gif: 'gif',
  svg: 'svg',
};

export function getMimeForFormat(format: SupportedImageFormat): string {
  return MIME_MAP[format];
}

export function getExtensionForFormat(format: SupportedImageFormat): string {
  return EXT_MAP[format];
}

/**
 * Checks byte array against known image magic numbers and structure.
 */
export function detectImageSignature(bytes: Uint8Array): ImageSignatureInfo | null {
  if (bytes.length < 4) {
    return null;
  }

  // 1. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    const dimensions = parsePngDimensions(bytes);
    return {
      format: 'png',
      mimeType: MIME_MAP.png,
      extension: EXT_MAP.png,
      dimensions,
    };
  }

  // 2. JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    const dimensions = parseJpegDimensions(bytes);
    return {
      format: 'jpeg',
      mimeType: MIME_MAP.jpeg,
      extension: EXT_MAP.jpeg,
      dimensions,
    };
  }

  // 3. GIF: GIF87a or GIF89a
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    const dimensions = parseGifDimensions(bytes);
    return {
      format: 'gif',
      mimeType: MIME_MAP.gif,
      extension: EXT_MAP.gif,
      dimensions,
    };
  }

  // 4. WebP: RIFF .... WEBP
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    const dimensions = parseWebpDimensions(bytes);
    return {
      format: 'webp',
      mimeType: MIME_MAP.webp,
      extension: EXT_MAP.webp,
      dimensions,
    };
  }

  // 5. SVG check (text based)
  const svgInfo = parseSvgInfo(bytes);
  if (svgInfo) {
    return svgInfo;
  }

  return null;
}

function parsePngDimensions(bytes: Uint8Array): ImageDimensions | undefined {
  if (bytes.length < 24) return undefined;
  // bytes 16-19 width, 20-23 height (big endian)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  return { width, height };
}

function parseJpegDimensions(bytes: Uint8Array): ImageDimensions | undefined {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;
  const len = bytes.length;

  while (offset + 4 < len) {
    if (bytes[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = bytes[offset + 1]!;
    // Standalone markers without length
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const segmentLength = view.getUint16(offset + 2, false);
    // SOF markers: SOF0 to SOF3, SOF5 to SOF7, SOF9 to SOF11, SOF13 to SOF15
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isSof && offset + 9 < len) {
      const height = view.getUint16(offset + 5, false);
      const width = view.getUint16(offset + 7, false);
      return { width, height };
    }

    offset += 2 + segmentLength;
  }
  return undefined;
}

function parseGifDimensions(bytes: Uint8Array): ImageDimensions | undefined {
  if (bytes.length < 10) return undefined;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint16(6, true);
  const height = view.getUint16(8, true);
  return { width, height };
}

function parseWebpDimensions(bytes: Uint8Array): ImageDimensions | undefined {
  if (bytes.length < 25) return undefined;
  const chunkType = String.fromCharCode(bytes[12]!, bytes[13]!, bytes[14]!, bytes[15]!);

  if (chunkType === 'VP8 ') {
    // Lossy VP8
    if (bytes.length >= 30 && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
      const width = (bytes[26]! | (bytes[27]! << 8)) & 0x3fff;
      const height = (bytes[28]! | (bytes[29]! << 8)) & 0x3fff;
      return { width, height };
    }
  } else if (chunkType === 'VP8L') {
    // Lossless VP8L
    if (bytes.length >= 25 && bytes[20] === 0x2f) {
      const b1 = bytes[21]!;
      const b2 = bytes[22]!;
      const b3 = bytes[23]!;
      const b4 = bytes[24]!;
      const width = 1 + (((b2 & 0x3f) << 8) | b1);
      const height = 1 + ((((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6)));
      return { width, height };
    }
  } else if (chunkType === 'VP8X') {
    // Extended VP8X
    if (bytes.length >= 30) {
      const width = 1 + (bytes[24]! | (bytes[25]! << 8) | (bytes[26]! << 16));
      const height = 1 + (bytes[27]! | (bytes[28]! << 8) | (bytes[29]! << 16));
      return { width, height };
    }
  }
  return undefined;
}

function parseSvgInfo(bytes: Uint8Array): ImageSignatureInfo | null {
  // Check the first 4KB for SVG header
  const sampleLength = Math.min(bytes.length, 4096);
  const sample = new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(0, sampleLength)).trim();

  // Basic SVG check: contains <svg or starts with <?xml and contains <svg
  const hasSvgTag = /<svg[\s>]/i.test(sample);
  if (!hasSvgTag) {
    return null;
  }

  // Extract width/height or viewBox
  let width = 0;
  let height = 0;

  const widthMatch = /width=["']([0-9.]+)(px)?["']/i.exec(sample);
  const heightMatch = /height=["']([0-9.]+)(px)?["']/i.exec(sample);
  if (widthMatch?.[1] && heightMatch?.[1]) {
    width = parseFloat(widthMatch[1]);
    height = parseFloat(heightMatch[1]);
  } else {
    const viewBoxMatch = /viewBox=["']([0-9.\s,-]+)["']/i.exec(sample);
    if (viewBoxMatch?.[1]) {
      const parts = viewBoxMatch[1].trim().split(/[\s,]+/);
      if (parts.length === 4 && parts[2] && parts[3]) {
        width = parseFloat(parts[2]);
        height = parseFloat(parts[3]);
      }
    }
  }

  return {
    format: 'svg',
    mimeType: MIME_MAP.svg,
    extension: EXT_MAP.svg,
    dimensions: width > 0 && height > 0 ? { width, height } : undefined,
  };
}

/**
 * Checks if SVG text contains script or event handlers.
 */
export function sanitizeSvgCheck(text: string): { isSafe: boolean; threats: string[] } {
  const threats: string[] = [];
  if (/<script[\s>]/i.test(text)) {
    threats.push('Contains <script> tags');
  }
  if (/on[a-z]+\s*=/i.test(text)) {
    threats.push('Contains inline event handlers (on*)');
  }
  if (/javascript:/i.test(text)) {
    threats.push('Contains javascript: URI');
  }
  return {
    isSafe: threats.length === 0,
    threats,
  };
}
