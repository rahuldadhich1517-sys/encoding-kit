import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

console.log('Starting consumer verification...');

const rootDir = process.cwd();
const packageName = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8')).name;

// 1. Pack tarball
console.log('Running npm pack...');
const packOutput = execSync('npm pack', { cwd: rootDir, encoding: 'utf-8' }).trim();
const tarballName = packOutput.split('\n').filter(Boolean).pop().trim();
const tarballPath = join(rootDir, tarballName);
console.log(`Generated tarball: ${tarballPath}`);

// 2. Create clean temp workspace
const tempDir = mkdtempSync(join(tmpdir(), 'encoding-kit-consumer-'));
console.log(`Created consumer temp directory: ${tempDir}`);

try {
  // Setup consumer package.json
  writeFileSync(
    join(tempDir, 'package.json'),
    JSON.stringify({
      name: 'consumer-app',
      version: '1.0.0',
      type: 'module',
    })
  );

  // 3. Install packed tarball
  console.log('Installing package tarball in clean consumer environment...');
  execSync(`npm install "${tarballPath}"`, { cwd: tempDir, stdio: 'inherit' });

  // 4. Test ESM import of root and all 10 subpaths
  console.log('Running ESM consumer tests...');
  const esmTestScript = `
import assert from 'node:assert/strict';
import * as Root from '${packageName}';
import * as Ascii85 from '${packageName}/ascii85';
import * as Base32 from '${packageName}/base32';
import * as Base58 from '${packageName}/base58';
import * as Base62 from '${packageName}/base62';
import * as Base64ToImage from '${packageName}/base64-to-image';
import * as HtmlEntity from '${packageName}/html-entity';
import * as ImageToBase64 from '${packageName}/image-to-base64';
import * as Punycode from '${packageName}/punycode';
import * as QuotedPrintable from '${packageName}/quoted-printable';
import * as StringEscape from '${packageName}/string-escape';

assert.equal(typeof Root.encodeAscii85, 'function');
assert.equal(typeof Ascii85.encodeAscii85, 'function');
assert.equal(typeof Base32.encodeBase32, 'function');
assert.equal(typeof Base58.encodeBase58, 'function');
assert.equal(typeof Base62.encodeBase62, 'function');
assert.equal(typeof Base64ToImage.parseBase64DataUri, 'function');
assert.equal(typeof HtmlEntity.escapeHtml, 'function');
assert.equal(typeof ImageToBase64.imageToBase64, 'function');
assert.equal(typeof Punycode.domainToAscii, 'function');
assert.equal(typeof QuotedPrintable.encodeQuotedPrintable, 'function');
assert.equal(typeof StringEscape.escapeJavaScript, 'function');

// Execute representative APIs
assert.equal(Base62.decodeBase62ToString(Base62.encodeBase62('hello consumer')), 'hello consumer');
assert.equal(HtmlEntity.escapeHtml('<script>'), '&lt;script&gt;');
assert.equal(Punycode.domainToAscii('münchen.de'), 'xn--mnchen-3ya.de');

console.log('  ✓ ESM consumer imports & executions verified!');
`;
  writeFileSync(join(tempDir, 'test-esm.mjs'), esmTestScript);
  execSync('node test-esm.mjs', { cwd: tempDir, stdio: 'inherit' });

  // 5. Test CommonJS require of root and all 10 subpaths
  console.log('Running CommonJS consumer tests...');
  const cjsTestScript = `
const assert = require('node:assert/strict');
const Root = require('${packageName}');
const Ascii85 = require('${packageName}/ascii85');
const Base32 = require('${packageName}/base32');
const Base58 = require('${packageName}/base58');
const Base62 = require('${packageName}/base62');
const Base64ToImage = require('${packageName}/base64-to-image');
const HtmlEntity = require('${packageName}/html-entity');
const ImageToBase64 = require('${packageName}/image-to-base64');
const Punycode = require('${packageName}/punycode');
const QuotedPrintable = require('${packageName}/quoted-printable');
const StringEscape = require('${packageName}/string-escape');

assert.equal(typeof Root.encodeAscii85, 'function');
assert.equal(typeof Ascii85.encodeAscii85, 'function');
assert.equal(typeof Base32.encodeBase32, 'function');
assert.equal(typeof Base58.encodeBase58, 'function');
assert.equal(typeof Base62.encodeBase62, 'function');
assert.equal(typeof Base64ToImage.parseBase64DataUri, 'function');
assert.equal(typeof HtmlEntity.escapeHtml, 'function');
assert.equal(typeof ImageToBase64.imageToBase64, 'function');
assert.equal(typeof Punycode.domainToAscii, 'function');
assert.equal(typeof QuotedPrintable.encodeQuotedPrintable, 'function');
assert.equal(typeof StringEscape.escapeJavaScript, 'function');

assert.equal(Base58.decodeBase58ToString(Base58.encodeBase58('hello cjs')), 'hello cjs');
console.log('  ✓ CommonJS consumer requires & executions verified!');
`;
  writeFileSync(join(tempDir, 'test-cjs.cjs'), cjsTestScript);
  execSync('node test-cjs.cjs', { cwd: tempDir, stdio: 'inherit' });

  console.log('Consumer verification passed 100% successfully!');
} finally {
  // Cleanup
  try {
    rmSync(tempDir, { recursive: true, force: true });
    rmSync(tarballPath, { force: true });
  } catch (err) {
    console.warn('Cleanup warning:', err.message);
  }
}
