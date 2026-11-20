// Common utilities and error types
export {
  EncodingError,
  DecodingError,
  ValidationError,
} from './common/errors';

export {
  stringToBytes,
  bytesToString,
  toUint8Array,
  bytesToBase64,
  base64ToBytes,
} from './common/bytes';

export {
  detectImageSignature,
  sanitizeSvgCheck,
  getMimeForFormat,
  getExtensionForFormat,
  type SupportedImageFormat,
  type ImageDimensions,
  type ImageSignatureInfo,
} from './common/image-signatures';

// 1. ascii85
export {
  encodeAscii85,
  decodeAscii85,
  decodeAscii85ToString,
  isValidAscii85,
  getAscii85Options,
  type Ascii85Options,
} from './ascii85/index';

// 2. base32
export {
  encodeBase32,
  decodeBase32,
  decodeBase32ToString,
  isValidBase32,
  getBase32Options,
  type Base32Options,
} from './base32/index';

// 3. base58
export {
  encodeBase58,
  decodeBase58,
  decodeBase58ToString,
  isValidBase58,
  getBase58Options,
  BITCOIN_ALPHABET,
  type Base58Options,
} from './base58/index';

// 4. base62
export {
  encodeBase62,
  decodeBase62,
  decodeBase62ToString,
  isValidBase62,
  getBase62Options,
  DEFAULT_BASE62_ALPHABET,
  type Base62Options,
} from './base62/index';

// 5. base64-to-image
export {
  base64ToBlob,
  base64ToImageBlob,
  parseBase64DataUri,
  validateBase64Image,
  getImageMetadata,
  type ParsedDataUri,
  type Base64ToBlobOptions,
  type Base64ToImageOptions,
  type ImageValidationResult,
  type ImageMetadata,
} from './base64-to-image/index';

// 6. html-entity
export {
  encodeHtmlEntities,
  decodeHtmlEntities,
  escapeHtml,
  unescapeHtml,
  getHtmlEntityOptions,
  NAMED_ENTITIES,
  type HtmlEntityOptions,
  type HtmlEntityMode,
} from './html-entity/index';

// 7. image-to-base64
export {
  imageToBase64,
  fileToBase64,
  blobToBase64,
  getImageFileMetadata,
  validateImageFile,
  type ImageToBase64Options,
  type ValidateImageFileOptions,
  type ImageFileMetadata,
} from './image-to-base64/index';

// 8. punycode
export {
  toPunycode,
  fromPunycode,
  domainToAscii,
  domainToUnicode,
  isValidPunycode,
  type DomainToAsciiOptions,
  type DomainToUnicodeOptions,
} from './punycode/index';

// 9. quoted-printable
export {
  encodeQuotedPrintable,
  decodeQuotedPrintable,
  decodeQuotedPrintableToString,
  isValidQuotedPrintable,
  getQuotedPrintableOptions,
  type QuotedPrintableOptions,
  type QuotedPrintableDecodeOptions,
} from './quoted-printable/index';

// 10. string-escape
export {
  escapeString,
  unescapeString,
  escapeJavaScript,
  unescapeJavaScript,
  escapeJson,
  unescapeJson,
  escapeSql,
  unescapeSql,
  escapeShell,
  unescapeShell,
  isValidEscapedString,
  getStringEscapeOptions,
  type StringEscapeType,
  type SqlDialect,
  type ShellEscapeStyle,
  type JsEscapeOptions,
  type SqlEscapeOptions,
  type ShellEscapeOptions,
  type StringEscapeOptions,
} from './string-escape/index';
