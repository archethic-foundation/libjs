#!/usr/bin/env node

require('esbuild').build({
  logLevel: "info",
  entryPoints: ['app.js'],
  bundle: true,
  minify: true,
  sourcemap: true,
  outfile: 'dist/app.js',
  define: {
    global: 'window'
  },
  inject: ['./esbuild.inject.js'],
}).catch(() => process.exit(1))
