#!/usr/bin/env node

import esbuild from "esbuild"

// browser bundle
esbuild.build({
  entryPoints: ['./dist/index.js'],
  bundle: true,
  minify: true,
  sourcemap: true,
  outfile: 'dist/archethic.browser.js',
  platform: 'browser',
  define: {
    global: 'window'
  },
  globalName: "archethic",
  footer: {
    js: "const Archethic = archethic.default; Archethic.Utils = archethic.Utils; Archethic.Crypto = archethic.Crypto;"
  }
}).catch(() => process.exit(1))
