#!/usr/bin/env node

import esbuild from "esbuild"

esbuild.build({
  logLevel: "info",
  entryPoints: ['index.js'],
  bundle: true,
  minify: true,
  sourcemap: true,
  outfile: 'dist/archethic.js',
  platform: 'browser',
  define: {
    global: 'window'
  },
  globalName: "archethic",
  footer: {
    js: "Archethic = archethic.default; Archethic.Utils = archethic.Utils; Archethic.Crypto = archethic.Crypto;"
  }
}).catch(() => process.exit(1))
