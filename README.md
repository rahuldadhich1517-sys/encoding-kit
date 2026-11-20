# @rahul_dadhich15/encoding-kit

[![CI](https://github.com/rahul-dadhich15/encoding-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/rahul-dadhich15-sys/encoding-kit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg)]()

Production-ready, zero-runtime-dependency TypeScript encoding and decoding toolkit built for modern browser applications and Node.js environments.

---

## Highlights

- **Zero Runtime Dependencies**: Exactly 0 external production dependencies.
- **10 Core Utilities**: Ascii85, Base32, Base58, Base62, Base64-to-Image, HTML Entity, Image-to-Base64, Punycode, Quoted-Printable, and String Escape.
- **Tree-Shakeable & Modular**: Import the root package or individual subpath imports (`@rahul_dadhich15/encoding-kit/base62`).
- **Browser-Native & Worker-Safe**: Uses standard `Uint8Array`, `TextEncoder`, `TextDecoder`, `Blob`, and `File` APIs. Does not require DOM, canvas, Node `Buffer`, or filesystem access for core encoding.
- **Dual Module Support**: Full ESM and CommonJS builds with complete TypeScript declarations (`.d.ts` and `.d.cts`).
- **High Test Coverage**: Rigorous test suite with >92% statement coverage and >88% branch coverage across standards-based test vectors.

---

## Installation

```bash
npm install @rahul_dadhich15/encoding-kit
```

Or using pnpm / yarn:

```bash
pnpm add @rahul_dadhich15/encoding-kit
# or
yarn add @rahul_dadhich15/encoding-kit
```

---

## Subpath Imports

Every utility is independently importable for optimal bundle size and tree shaking:

```typescript
// Subpath import (recommended for minimal bundles)
import { encodeBase62, decodeBase62ToString } from '@rahul_dadhich15/encoding-kit/base62';

// Or root import
import { encodeBase62, decodeBase62ToString } from '@rahul_dadhich15/encoding-kit';
```

Available subpaths:
- `@rahul_dadhich15/encoding-kit/ascii85`
- `@rahul_dadhich15/encoding-kit/base32`
- `@rahul_dadhich15/encoding-kit/base58`
- `@rahul_dadhich15/encoding-kit/base62`
- `@rahul_dadhich15/encoding-kit/base64-to-image`
- `@rahul_dadhich15/encoding-kit/html-entity`
- `@rahul_dadhich15/encoding-kit/image-to-base64`
- `@rahul_dadhich15/encoding-kit/punycode`
- `@rahul_dadhich15/encoding-kit/quoted-printable`
- `@rahul_dadhich15/encoding-kit/string-escape`

---

## Utilities & API Reference

### 1. Ascii85 (`/ascii85`)

Standard Adobe Ascii85 encoding and decoding with full UTF-8, zero-block shorthand (`z`), Adobe delimiters (`<~...~>`), partial blocks, and whitespace resilience.

```typescript
import {
  encodeAscii85,
  decodeAscii85,
  decodeAscii85ToString,
  isValidAscii85,
  getAscii85Options,
} from '@rahul_dadhich15/encoding-kit/ascii85';

// String to Ascii85
const encoded = encodeAscii85('Hello World!');
// => "87cURD]j72"

// With Adobe delimiters (<~ and ~>) and line wrapping
const adobeFormatted = encodeAscii85('Hello World!', { adobeDelimiters: true, wrap: 75 });
// => "<~87cURD]j72~>"

// Decode to string or Uint8Array
const decodedText = decodeAscii85ToString(adobeFormatted);
// => "Hello World!"

const rawBytes = decodeAscii85(adobeFormatted);
// => Uint8Array(...)

// Validation
isValidAscii85(adobeFormatted); // => true
```

### 2. Base32 (`/base32`)

RFC 4648 Base32 implementation supporting optional padding (`=`), case-insensitivity, lowercase output, and non-zero unused bits validation.

```typescript
import {
  encodeBase32,
  decodeBase32,
  decodeBase32ToString,
  isValidBase32,
} from '@rahul_dadhich15/encoding-kit/base32';

// Standard RFC 4648 with padding
encodeBase32('foobar');
// => "MZXW6YTBOI======"

// Unpadded
encodeBase32('foobar', { padding: false });
// => "MZXW6YTBOI"

// Lowercase output
encodeBase32('foobar', { lowercase: true });
// => "mzxw6ytboi======"

// Decode (case-insensitive by default)
decodeBase32ToString('mzxw6ytboi======');
// => "foobar"
```

### 3. Base58 (`/base58`)

Bitcoin Base58 alphabet encoding with leading-zero byte preservation (`0x00` -> `'1'`), arbitrary-precision BigInt arithmetic, and custom alphabet validation.

```typescript
import {
  encodeBase58,
  decodeBase58,
  decodeBase58ToString,
  isValidBase58,
  BITCOIN_ALPHABET,
} from '@rahul_dadhich15/encoding-kit/base58';

encodeBase58('Hello World!');
// => "2NEpo7TZRRrLZSi2U"

// Leading zero bytes are preserved as '1'
const bytesWithZeros = new Uint8Array([0, 0, 1]);
encodeBase58(bytesWithZeros);
// => "112"

decodeBase58ToString('2NEpo7TZRRrLZSi2U');
// => "Hello World!"
```

### 4. Base62 (`/base62`)

Alphanumeric Base62 (`0-9A-Za-z`) encoding with leading-zero preservation, arbitrary-precision BigInt conversion, and configurable alphabet support.

```typescript
import {
  encodeBase62,
  decodeBase62,
  decodeBase62ToString,
  isValidBase62,
} from '@rahul_dadhich15/encoding-kit/base62';

encodeBase62('Short URL token payload');
// => "s16tW4zWw9ZJbYnC4H3vJ"

decodeBase62ToString('s16tW4zWw9ZJbYnC4H3vJ');
// => "Short URL token payload"
```

### 5. Base64 to Image (`/base64-to-image`)

Parses and validates Base64 data URIs into downloadable image `Blob` objects. Performs header signature inspection (magic numbers) for PNG, JPEG, WebP, GIF, and SVG, extracts dimensions without DOM/canvas, and detects SVG threats.

```typescript
import {
  parseBase64DataUri,
  base64ToBlob,
  base64ToImageBlob,
  validateBase64Image,
  getImageMetadata,
} from '@rahul_dadhich15/encoding-kit/base64-to-image';

const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Parse components
const parsed = parseBase64DataUri(dataUri);
// => { mimeType: 'image/png', base64Data: '...', isBase64: true, parameters: {} }

// Validate before processing
const validation = validateBase64Image(dataUri, {
  allowedFormats: ['png', 'jpeg', 'webp'],
  maxSizeBytes: 5 * 1024 * 1024,
});

if (validation.valid) {
  // Extract dimensions and format
  const meta = await getImageMetadata(dataUri);
  console.log(meta.dimensions); // { width: 1, height: 1 }

  // Create safe Blob for download
  const blob = base64ToImageBlob(dataUri);
}
```

### 6. HTML Entity (`/html-entity`)

Comprehensive HTML entity encoding and decoding with bundled named entities, numeric decimal (`&#...;`), and hexadecimal (`&#x...;`) modes. Decodes safely without DOM injection (`innerHTML`).

```typescript
import {
  escapeHtml,
  unescapeHtml,
  encodeHtmlEntities,
  decodeHtmlEntities,
} from '@rahul_dadhich15/encoding-kit/html-entity';

// Fast basic escaping for HTML injection prevention
escapeHtml('<script>alert("Hello & \'Welcome\'")</script>');
// => "&lt;script&gt;alert(&quot;Hello &amp; &#39;Welcome&#39;&quot;)&lt;/script&gt;"

unescapeHtml('&lt;b&gt;bold&lt;/b&gt;');
// => "<b>bold</b>"

// Named entities with double-encoding prevention
encodeHtmlEntities('Price: 10€ & © 2026', { mode: 'named', avoidDoubleEncoding: true });
// => "Price: 10&euro; &amp; &copy; 2026"

// Numeric and hex
encodeHtmlEntities('🚀', { mode: 'hex' });
// => "&#x1F680;"

decodeHtmlEntities('&copy; 2026 &euro; &#x1F680;');
// => "© 2026 € 🚀"
```

### 7. Image to Base64 (`/image-to-base64`)

Converts browser `File` and `Blob` objects into Base64 data URIs. Verifies magic bytes to ensure the content matches supported image formats.

```typescript
import {
  imageToBase64,
  fileToBase64,
  blobToBase64,
  getImageFileMetadata,
  validateImageFile,
} from '@rahul_dadhich15/encoding-kit/image-to-base64';

// In browser file input change handler:
async function handleFile(file: File) {
  // Validate file format and size
  const val = await validateImageFile(file, { maxSizeBytes: 10 * 1024 * 1024 });
  if (!val.valid) throw new Error(val.error);

  // Extract metadata (dimensions, mimeType, threats)
  const meta = await getImageFileMetadata(file);

  // Convert to Data URI
  const dataUri = await fileToBase64(file);
}
```

### 8. Punycode (`/punycode`)

RFC 3492 Bootstring and IDNA domain conversion supporting internationalized domain names (IDN), multiple labels, and Unicode dot normalization (`.` / `\u3002` / `\uFF0E` / `\uFF61`).

```typescript
import {
  domainToAscii,
  domainToUnicode,
  toPunycode,
  fromPunycode,
  isValidPunycode,
} from '@rahul_dadhich15/encoding-kit/punycode';

// Internationalized domain to ASCII (IDNA)
domainToAscii('münchen.de');
// => "xn--mnchen-3ya.de"

domainToAscii('点看.com');
// => "xn--3pxu8k.com"

// ASCII to Unicode
domainToUnicode('xn--mnchen-3ya.de');
// => "münchen.de"

// Label-level raw Punycode
toPunycode('münchen');
// => "mnchen-3ya"

fromPunycode('mnchen-3ya');
// => "münchen"
```

### 9. Quoted-Printable (`/quoted-printable`)

RFC 2045 Quoted-Printable encoding and decoding with soft line breaking, trailing whitespace encoding (`=20`, `=09`), configurable line lengths, and CRLF / LF handling.

```typescript
import {
  encodeQuotedPrintable,
  decodeQuotedPrintable,
  decodeQuotedPrintableToString,
  isValidQuotedPrintable,
} from '@rahul_dadhich15/encoding-kit/quoted-printable';

encodeQuotedPrintable("Bonjour le monde! Ça coûte 10€.");
// => "Bonjour le monde! =C3=87a co=C3=BBte 10=E2=82=AC."

decodeQuotedPrintableToString("Bonjour le monde! =C3=87a co=C3=BBte 10=E2=82=AC.");
// => "Bonjour le monde! Ça coûte 10€."
```

### 10. String Escape (`/string-escape`)

Multi-target string escaping and unescaping for JavaScript, JSON, ANSI/MySQL SQL literals, and POSIX shell arguments.

```typescript
import {
  escapeJavaScript,
  unescapeJavaScript,
  escapeJson,
  unescapeJson,
  escapeSql,
  unescapeSql,
  escapeShell,
  unescapeShell,
  escapeString,
  unescapeString,
} from '@rahul_dadhich15/encoding-kit/string-escape';

// JavaScript string escaping
escapeJavaScript('Hello\nWorld\t"Quotes"', { quotes: 'double' });
// => "Hello\\nWorld\\t\\\"Quotes\\\""

// JSON escaping
escapeJson('Line 1\nLine 2');
// => "Line 1\\nLine 2"

// SQL literal escaping
escapeSql("O'Connor", { dialect: 'standard', wrap: true });
// => "'O''Connor'"

// POSIX shell escaping
escapeShell("user input; rm -rf /");
// => "'user input; rm -rf /'"
```

---

## Security Warnings & Limitations

### SQL Escaping
> [!WARNING]
> `escapeSql` is intended for encoding string literals for display or debugging. It is **NOT** a substitute for parameterized queries (`?`, `$1`). For database execution, **always use prepared statements or parameterized queries** provided by your database driver or ORM.

### Shell Escaping
> [!WARNING]
> `escapeShell` quotes arguments for POSIX-compliant shells. Whenever possible, execute commands by passing argument arrays directly to `child_process.execFile` or `spawn` rather than interpolating shell strings.

### HTML Entity Decoding
> [!NOTE]
> `decodeHtmlEntities` decodes entities purely in software using string lookups. It **never** uses DOM elements (`document.createElement('div').innerHTML = ...`), protecting your application against script execution and DOM XSS vulnerabilities during decoding.

### SVG Security
> [!CAUTION]
> SVG images can contain inline JavaScript (`<script>`, `onload`, `javascript:` URIs). The image utilities scan for these vectors and report them via `threats` without rendering them to the DOM.

---

## Browser & Environment Compatibility

| Environment | Supported | Notes |
|-------------|-----------|-------|
| React / Next.js | Yes | Zero React dependency; works in client & SSR |
| Vite | Yes | Full ESM & tree shaking support |
| Chrome / Edge | Yes (76+) | Uses native Web APIs |
| Firefox | Yes (69+) | Full compatibility |
| Safari | Yes (14+) | Full compatibility |
| Web Workers | Yes | No DOM or window requirement |
| Node.js | Yes (22+, 24+) | Native ESM and CommonJS |

---

## Development & Testing

```bash
# Install dependencies
npm install

# Typecheck
npm run typecheck

# Lint
npm run lint

# Run unit and integration tests
npm test

# Run tests with coverage
npm run test:coverage

# Build ESM, CommonJS, and DTS bundles
npm run build

# Run smoke test on dist
npm run test:smoke

# Run consumer tarball installation test
npm run test:consumer
```

---

## License

MIT © [Rahul Dadhich](LICENSE)
