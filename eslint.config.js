import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/**', '.cache/**', 'node_modules/**', 'public/**', 'assets/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // `catch {}` is intentional around localStorage: private mode throws.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
];
