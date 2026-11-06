import { defineConfig } from 'vitest/config';

/**
 * Game tests live in tests/{sim,render}/ — pure headless suites with no
 * browser or engine dependency. The OCGS framework's own suites (tests/agents,
 * tests/e2e, tests/omp, …) are framework dev-time tooling, excluded here; they
 * run via the framework's own scripts when working on OCGS itself.
 */
export default defineConfig({
  test: {
    include: ['tests/sim/**/*.test.ts', 'tests/render/**/*.test.ts'],
    environment: 'node',
  },
});
