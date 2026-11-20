# Changelog

All notable changes to `@rahul_dadhich15/encoding-kit` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-11-20

### Added
- **10 Core Encoding & Decoding Modules**:
  - `ascii85`: Adobe Ascii85 encoding/decoding, UTF-8 support, `z` zero shorthand, Adobe delimiters (`<~...~>`), partial block padding, whitespace resilience.
  - `base32`: RFC 4648 standard Base32 with uppercase/lowercase options, optional padding, case-insensitive decoding, and non-zero unused bits validation.
  - `base58`: Bitcoin standard Base58 with leading-zero preservation, arbitrary-precision BigInt arithmetic, custom alphabet support, and validation.
  - `base62`: Alphanumeric Base62 with leading-zero preservation, configurable alphabet, and BigInt conversion.
  - `base64-to-image`: Browser data URI parsing, magic-byte format detection (PNG, JPEG, WebP, GIF, SVG), dimensions extraction without DOM/canvas, SVG threat scanning, size limits, and safe `Blob` generation.
  - `html-entity`: Complete HTML entity encoding and decoding with standard named entities table, numeric decimal, hexadecimal, special chars escaping, and double-encoding avoidance without DOM injection.
  - `image-to-base64`: Browser `File` and `Blob` to Base64 data URI conversion, MIME detection, size limits, metadata extraction (dimensions, filename, last modified, threats).
  - `punycode`: RFC 3492 Bootstring implementation with IDNA domain conversion (`domainToAscii`, `domainToUnicode`), Unicode dot normalization, and RFC length checks.
  - `quoted-printable`: RFC 2045 Quoted-Printable encoding and decoding, soft line breaking, trailing whitespace handling, CRLF/LF modes, binary and UTF-8 round-tripping.
  - `string-escape`: Comprehensive string escaping for JavaScript, JSON, ANSI/MySQL SQL literals, and POSIX shell arguments.
- **Architecture & Packaging**:
  - Zero runtime dependencies (`0` dependencies in production).
  - Pure TypeScript with strict mode.
  - Dual ESM and CommonJS exports.
  - Full TypeScript declaration files (`.d.ts` and `.d.cts`) with complete declaration maps.
  - Root and 10 isolated subpath exports (`@rahul_dadhich15/encoding-kit/<utility>`).
  - GitHub Actions CI workflow supporting Node 22 and Node 24.
