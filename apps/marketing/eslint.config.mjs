import base from '../../eslint.config.js';

// Marketing build scripts use Node 20+ web APIs; browser assets and CLI harness
// callbacks run in a browser. Keep these globals scoped away from application code.
const readonly = (names) => Object.fromEntries(names.split(' ').map((name) => [name, 'readonly']));
export default [
  ...base,
  {
    // Playwright CLI requires a top-level function expression, not a module export.
    files: ['apps/marketing/browser-smoke.js', 'apps/marketing/growth-browser-smoke.js'],
    rules: { '@typescript-eslint/no-unused-expressions': 'off' },
  },
  {
    files: ['apps/marketing/**/*.mjs'],
    languageOptions: {
      globals: readonly(
        'process console Buffer URL URLSearchParams fetch Response AbortSignal AbortController setTimeout clearTimeout',
      ),
    },
  },
  {
    files: ['apps/marketing/**/*.js'],
    languageOptions: {
      globals: readonly(
        'window document location localStorage sessionStorage innerWidth URL URLSearchParams FormData fetch AbortController setTimeout clearTimeout console getComputedStyle matchMedia history requestAnimationFrame Event KeyboardEvent',
      ),
    },
  },
];
