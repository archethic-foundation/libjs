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
  inject: ['./esbuild.inject.js'],
}).catch(() => process.exit(1))

esbuild.build({
  logLevel: "info",
  entryPoints: ['index.js'],
  bundle: true,
  minify: true,
  sourcemap: true,
  outfile: 'dist/archethic.cjs',
  inject: ['./esbuild.inject.js'],
  platform: 'node'
}).catch(() => process.exit(1))

esbuild.build({
  logLevel: "info",
  entryPoints: ['index.js'],
  bundle: true,
  minify: true,
  sourcemap: true,
  outfile: 'dist/archethic-browser.mjs',
  inject: ['./esbuild.inject.js'],
  format: 'esm'
}).catch(() => process.exit(1))

esbuild.build({
  logLevel: "info",
  entryPoints: ['index.js'],
  bundle: true,
  minify: true,
  sourcemap: true,
  outfile: 'dist/archethic-node.mjs',
  inject: ['./esbuild.inject.js'],
  format: 'esm',
  platform: "node",
  banner: {
    js: "import { createRequire } from 'module';const require = createRequire(import.meta.url);"
  },
}).catch(() => process.exit(1))
