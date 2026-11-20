import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'ascii85/index': 'src/ascii85/index.ts',
    'base32/index': 'src/base32/index.ts',
    'base58/index': 'src/base58/index.ts',
    'base62/index': 'src/base62/index.ts',
    'base64-to-image/index': 'src/base64-to-image/index.ts',
    'html-entity/index': 'src/html-entity/index.ts',
    'image-to-base64/index': 'src/image-to-base64/index.ts',
    'punycode/index': 'src/punycode/index.ts',
    'quoted-printable/index': 'src/quoted-printable/index.ts',
    'string-escape/index': 'src/string-escape/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  splitting: false,
});
