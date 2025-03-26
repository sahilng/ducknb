const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  platform: 'node',
  external: [
    'vscode',
    '@duckdb/node-bindings-linux-x64',
    '@duckdb/node-bindings-linux-arm64',
    '@duckdb/node-bindings-darwin-arm64',
    '@duckdb/node-bindings-darwin-x64',
    '@duckdb/node-bindings-win32-x64'
  ]
}).catch(() => process.exit(1));
