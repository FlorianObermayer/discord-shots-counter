// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import jestPlugin from "eslint-plugin-jest";
import globals from "globals";

export default tseslint.config(
  eslint.configs.all,
  tseslint.configs.strictTypeChecked,
  jestPlugin.configs['flat/recommended'],
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        project: true, // Auto-detects tsconfig.json
      }
    },
    files: ["**/*.{js,mjs,cjs,ts,tsx}"]
  }
);
