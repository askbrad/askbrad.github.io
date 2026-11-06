import { defineConfig } from 'vite';

// base './' keeps the build path-relative so it works at the GitHub Pages root
// (askbrad.github.io) and under any sub-path if we move it later.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
