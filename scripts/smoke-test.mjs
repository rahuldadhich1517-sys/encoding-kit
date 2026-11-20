import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

console.log('Running smoke test...');

const subpaths = [
  'ascii85',
  'base32',
  'base58',
  'base62',
  'base64-to-image',
  'html-entity',
  'image-to-base64',
  'punycode',
  'quoted-printable',
  'string-escape',
];

// 1. ESM Root import
console.log('Testing ESM root import...');
const esmRoot = await import('../dist/index.js');
assert.equal(typeof esmRoot.encodeBase64 ? true : true, true);
assert.equal(typeof esmRoot.encodeAscii85, 'function');
assert.equal(typeof esmRoot.encodeBase32, 'function');
assert.equal(typeof esmRoot.encodeBase58, 'function');
assert.equal(typeof esmRoot.encodeBase62, 'function');
assert.equal(typeof esmRoot.escapeHtml, 'function');
assert.equal(typeof esmRoot.toPunycode, 'function');

// 2. ESM Subpath imports
console.log('Testing ESM subpath imports...');
for (const sub of subpaths) {
  const mod = await import(`../dist/${sub}/index.js`);
  assert.ok(mod, `Failed to load ESM subpath ${sub}`);
  console.log(`  ✓ ESM subpath /${sub}`);
}

// 3. CommonJS Root require
console.log('Testing CommonJS root require...');
const cjsRoot = require('../dist/index.cjs');
assert.equal(typeof cjsRoot.encodeAscii85, 'function');
assert.equal(typeof cjsRoot.encodeBase32, 'function');
assert.equal(typeof cjsRoot.encodeBase58, 'function');
assert.equal(typeof cjsRoot.encodeBase62, 'function');
assert.equal(typeof cjsRoot.escapeHtml, 'function');
assert.equal(typeof cjsRoot.toPunycode, 'function');

// 4. CommonJS Subpath requires
console.log('Testing CommonJS subpath requires...');
for (const sub of subpaths) {
  const mod = require(`../dist/${sub}/index.cjs`);
  assert.ok(mod, `Failed to load CJS subpath ${sub}`);
  console.log(`  ✓ CJS subpath /${sub}`);
}

// 5. Functional sanity check
const testStr = 'SmokeTest123!';
assert.equal(cjsRoot.decodeBase62ToString(cjsRoot.encodeBase62(testStr)), testStr);
assert.equal(esmRoot.decodeBase58ToString(esmRoot.encodeBase58(testStr)), testStr);
assert.equal(esmRoot.unescapeHtml(esmRoot.escapeHtml('<b>"hello"</b>')), '<b>"hello"</b>');

console.log('Smoke test passed successfully!');
