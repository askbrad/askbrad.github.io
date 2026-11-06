import { defineConfig } from 'vite';
import pkg from './package.json';

// base './' keeps the build path-relative so it works at the GitHub Pages root
// (askbrad.github.io) and under any sub-path if we move it later.
export default defineConfig({
  base: './',
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
