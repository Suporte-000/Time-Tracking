import { defineConfig } from 'vite';
import path from 'path';

const external = [
  'electron', 'path', 'fs', 'child_process', 'util', 'os', 'events',
  'better-sqlite3', 'active-win', /^node:/,
];

// Build main and preload as separate single-file bundles.
// Entry is controlled by ELECTRON_ENTRY env var.
const entry = process.env.ELECTRON_ENTRY || 'main';
const entryFile = entry === 'preload'
  ? path.resolve(__dirname, 'src/main/preload.ts')
  : path.resolve(__dirname, 'src/main/main.ts');

export default defineConfig({
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  build: {
    target: 'node20',
    ssr: true,
    outDir: 'dist-electron/main',
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: entryFile,
      formats: ['cjs'],
      fileName: () => `${entry}.js`,
    },
    rollupOptions: {
      external,
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
});
