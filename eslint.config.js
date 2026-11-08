// ESLint (flat config). Run with `npm run lint`; CI runs it on every push/PR.
// Formatting is left to Prettier (`npm run format:check`), so only rules
// about likely bugs are enabled here.
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'vendor/**',
      'docs/**',
      'custom/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  {
    linterOptions: { reportUnusedDisableDirectives: 'off' },
  },
  {
    // Browser scripts loaded one by one by js/loader.js. They share their
    // globals across files (declared in each file's /* global */ comment).
    files: ['js/**/*.js', 'themes/**/*.js', 'tools/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.browser, ...globals.jquery },
    },
  },
  {
    // Webpack entry and helpers bundled into dist/.
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.commonjs },
    },
  },
  {
    // Node: build scripts, config and node:test tests.
    files: ['build/**/*.js', 'tests/**/*.test.js', '*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
  },
  {
    // Playwright specs (ES modules) and test helpers.
    files: ['tests/**/*.spec.js', 'playwright.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
  },
  {
    // Baseline: these rules still have findings in the existing code, so
    // they warn instead of failing CI until that code is cleaned up. Every
    // other rule of eslint:recommended fails the check.
    rules: {
      'no-undef': 'warn',
      'no-unused-vars': 'warn',
      'no-useless-escape': 'warn',
      'no-useless-assignment': 'warn',
      'no-redeclare': 'warn',
      'no-prototype-builtins': 'warn',
      'no-constant-binary-expression': 'warn',
      'no-unassigned-vars': 'warn',
      'no-unreachable': 'warn',
      'no-global-assign': 'warn',
      'no-control-regex': 'warn',
      'preserve-caught-error': 'warn',
    },
  },
];
