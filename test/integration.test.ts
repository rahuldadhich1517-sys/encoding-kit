import { describe, it, expect } from 'vitest';
import * as EncodingKit from '../src/index';

describe('Integration tests across all 10 utilities via root entry point', () => {
  it('exports all 10 utilities and required public APIs', () => {
    // 1. ascii85
    expect(typeof EncodingKit.encodeAscii85).toBe('function');
    expect(typeof EncodingKit.decodeAscii85).toBe('function');
    expect(typeof EncodingKit.isValidAscii85).toBe('function');
    expect(typeof EncodingKit.getAscii85Options).toBe('function');

    // 2. base32
    expect(typeof EncodingKit.encodeBase32).toBe('function');
    expect(typeof EncodingKit.decodeBase32).toBe('function');
    expect(typeof EncodingKit.isValidBase32).toBe('function');
    expect(typeof EncodingKit.getBase32Options).toBe('function');

    // 3. base58
    expect(typeof EncodingKit.encodeBase58).toBe('function');
    expect(typeof EncodingKit.decodeBase58).toBe('function');
    expect(typeof EncodingKit.isValidBase58).toBe('function');
    expect(typeof EncodingKit.getBase58Options).toBe('function');

    // 4. base62
    expect(typeof EncodingKit.encodeBase62).toBe('function');
    expect(typeof EncodingKit.decodeBase62).toBe('function');
    expect(typeof EncodingKit.isValidBase62).toBe('function');
    expect(typeof EncodingKit.getBase62Options).toBe('function');

    // 5. base64-to-image
    expect(typeof EncodingKit.base64ToBlob).toBe('function');
    expect(typeof EncodingKit.base64ToImageBlob).toBe('function');
    expect(typeof EncodingKit.parseBase64DataUri).toBe('function');
    expect(typeof EncodingKit.validateBase64Image).toBe('function');
    expect(typeof EncodingKit.getImageMetadata).toBe('function');

    // 6. html-entity
    expect(typeof EncodingKit.encodeHtmlEntities).toBe('function');
    expect(typeof EncodingKit.decodeHtmlEntities).toBe('function');
    expect(typeof EncodingKit.escapeHtml).toBe('function');
    expect(typeof EncodingKit.unescapeHtml).toBe('function');
    expect(typeof EncodingKit.getHtmlEntityOptions).toBe('function');

    // 7. image-to-base64
    expect(typeof EncodingKit.imageToBase64).toBe('function');
    expect(typeof EncodingKit.fileToBase64).toBe('function');
    expect(typeof EncodingKit.blobToBase64).toBe('function');
    expect(typeof EncodingKit.getImageFileMetadata).toBe('function');
    expect(typeof EncodingKit.validateImageFile).toBe('function');

    // 8. punycode
    expect(typeof EncodingKit.toPunycode).toBe('function');
    expect(typeof EncodingKit.fromPunycode).toBe('function');
    expect(typeof EncodingKit.domainToAscii).toBe('function');
    expect(typeof EncodingKit.domainToUnicode).toBe('function');
    expect(typeof EncodingKit.isValidPunycode).toBe('function');

    // 9. quoted-printable
    expect(typeof EncodingKit.encodeQuotedPrintable).toBe('function');
    expect(typeof EncodingKit.decodeQuotedPrintable).toBe('function');
    expect(typeof EncodingKit.isValidQuotedPrintable).toBe('function');
    expect(typeof EncodingKit.getQuotedPrintableOptions).toBe('function');

    // 10. string-escape
    expect(typeof EncodingKit.escapeString).toBe('function');
    expect(typeof EncodingKit.unescapeString).toBe('function');
    expect(typeof EncodingKit.escapeJavaScript).toBe('function');
    expect(typeof EncodingKit.unescapeJavaScript).toBe('function');
    expect(typeof EncodingKit.escapeJson).toBe('function');
    expect(typeof EncodingKit.unescapeJson).toBe('function');
    expect(typeof EncodingKit.escapeSql).toBe('function');
    expect(typeof EncodingKit.unescapeSql).toBe('function');
    expect(typeof EncodingKit.escapeShell).toBe('function');
    expect(typeof EncodingKit.unescapeShell).toBe('function');
    expect(typeof EncodingKit.isValidEscapedString).toBe('function');
    expect(typeof EncodingKit.getStringEscapeOptions).toBe('function');
  });

  it('executes a multi-encoding data pipeline seamlessly', async () => {
    const rawSecret = 'Secret: ⚡️ 100% pure UTF-8 & HTML <symbols>! "Quotes" included.';

    // 1. HTML Escape
    const htmlEscaped = EncodingKit.escapeHtml(rawSecret);
    expect(htmlEscaped).toContain('&lt;symbols&gt;');

    // 2. Base62 Encode
    const b62 = EncodingKit.encodeBase62(htmlEscaped);
    expect(EncodingKit.isValidBase62(b62)).toBe(true);
    const b62Decoded = EncodingKit.decodeBase62ToString(b62);
    expect(b62Decoded).toBe(htmlEscaped);

    // 3. Base58 Encode
    const b58 = EncodingKit.encodeBase58(htmlEscaped);
    expect(EncodingKit.isValidBase58(b58)).toBe(true);
    const b58Decoded = EncodingKit.decodeBase58ToString(b58);
    expect(b58Decoded).toBe(htmlEscaped);

    // 4. Base32 Encode
    const b32 = EncodingKit.encodeBase32(htmlEscaped);
    expect(EncodingKit.isValidBase32(b32)).toBe(true);
    const b32Decoded = EncodingKit.decodeBase32ToString(b32);
    expect(b32Decoded).toBe(htmlEscaped);

    // 5. Ascii85 Encode
    const a85 = EncodingKit.encodeAscii85(htmlEscaped);
    expect(EncodingKit.isValidAscii85(a85)).toBe(true);
    const a85Decoded = EncodingKit.decodeAscii85ToString(a85);
    expect(a85Decoded).toBe(htmlEscaped);

    // 6. Quoted-Printable Encode
    const qp = EncodingKit.encodeQuotedPrintable(htmlEscaped);
    expect(EncodingKit.isValidQuotedPrintable(qp)).toBe(true);
    const qpDecoded = EncodingKit.decodeQuotedPrintableToString(qp);
    expect(qpDecoded).toBe(htmlEscaped);

    // 7. String Escape
    const jsEscaped = EncodingKit.escapeJavaScript(htmlEscaped);
    const jsUnescaped = EncodingKit.unescapeJavaScript(jsEscaped);
    expect(jsUnescaped).toBe(htmlEscaped);

    // 8. Restore original HTML
    const restored = EncodingKit.unescapeHtml(qpDecoded);
    expect(restored).toBe(rawSecret);

    // 9. Punycode check in pipeline
    const domain = 'магазин.рф';
    const asciiDomain = EncodingKit.domainToAscii(domain);
    expect(asciiDomain.startsWith('xn--')).toBe(true);
    expect(EncodingKit.domainToUnicode(asciiDomain)).toBe(domain);

    // 10. Image conversion round trip
    const dotPngDataUri =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const blob = EncodingKit.base64ToImageBlob(dotPngDataUri);
    expect(blob).toBeInstanceOf(Blob);

    const convertedDataUri = await EncodingKit.imageToBase64(blob);
    expect(convertedDataUri).toContain('data:image/png;base64,');

    const meta = await EncodingKit.getImageMetadata(convertedDataUri);
    expect(meta.format).toBe('png');
    expect(meta.dimensions?.width).toBe(1);
    expect(meta.dimensions?.height).toBe(1);
  });
});
