// @ts-check

import globals from 'globals';
import jestPlugin from 'eslint-plugin-jest';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'jest.config.js',
      'eslint.config.mjs',
    ]
  },
  tseslint.configs.recommendedTypeChecked,
  jestPlugin.configs['flat/recommended'],
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        project: true,         // Auto-detects tsconfig.json
      }
    },
    rules: {
      'semi': 'error',
      'semi-spacing': 'error',
      'eqeqeq': ['error', 'always'],
      'quotes': ['error', 'single'],
    }
  },
);
