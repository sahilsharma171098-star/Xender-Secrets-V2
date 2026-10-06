import js from '@eslint/js';

const browserGlobals = {
  window: 'readonly', document: 'readonly', navigator: 'readonly', location: 'readonly', globalThis: 'readonly',
  URL: 'readonly', URLSearchParams: 'readonly', Node: 'readonly', fetch: 'readonly', AbortController: 'readonly',
  setTimeout: 'readonly', clearTimeout: 'readonly', requestAnimationFrame: 'readonly', console: 'readonly'
};
const nodeGlobals = { process: 'readonly', console: 'readonly', structuredClone: 'readonly', URL: 'readonly', setTimeout: 'readonly' };

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['src/core/audit.js'],
    languageOptions: { sourceType: 'script', ecmaVersion: 2020, globals: { ...browserGlobals, module: 'writable' } },
    rules: { 'no-var': 'off', 'no-unused-vars': ['error', { caughtErrors: 'none' }] }
  },
  {
    files: ['src/**/*.js'],
    ignores: ['src/core/audit.js'],
    languageOptions: { sourceType: 'module', ecmaVersion: 2022, globals: browserGlobals }
  },
  {
    files: ['scripts/**/*.mjs', 'tests/**/*.mjs', 'eslint.config.js'],
    languageOptions: { sourceType: 'module', ecmaVersion: 2022, globals: { ...nodeGlobals, ...browserGlobals, chrome: 'readonly' } }
  },
  { rules: { 'no-implied-eval': 'error', 'no-new-func': 'error', 'no-eval': 'error' } }
];
