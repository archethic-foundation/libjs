#!/usr/bin/env node

require('esbuild').build({
  logLevel: "info",
  entryPoints: ['index.js'],
  bundle: true,
  minify: true,
  sourcemap: true,
  globalName: 'Archethic',
  define: {
    global: 'window'
  },
  outfile: 'dist/index.js',
  inject: ['./esbuild.inject.js']
}).catch(() => process.exit(1))
