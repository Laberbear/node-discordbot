import pluginJs from '@eslint/js';
import pluginJest from 'eslint-plugin-jest';
import jsdoc from 'eslint-plugin-jsdoc';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ['**/*.js'], languageOptions: { sourceType: 'commonjs' } },
  { languageOptions: { globals: globals.node } },
  pluginJs.configs.recommended,
  {
    files: ['**/*.spec.js', '**/*.test.js'],
    plugins: { jest: pluginJest },
    languageOptions: {
      globals: pluginJest.environments.globals.globals,
    },
  },

  {
    rules: {
      'no-unused-vars': [
        'error',
        {
          caughtErrors: 'none',
        },
      ],
      'no-empty': ['error', { 'allowEmptyCatch': true }],
    },
  },
  {
    files: ['**/*.js'],
    plugins: {
      jsdoc,
    },
    rules: {
      'jsdoc/no-undefined-types': 1,
    },
  },
];
