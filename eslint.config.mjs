// @ts-check

import globals from 'globals';
import jestPlugin from 'eslint-plugin-jest';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  tseslint.configs.recommendedTypeChecked,
  jestPlugin.configs['flat/recommended'],
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
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
  }
);
