import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    plugins: ["js", "ts", "jest"],
    extends: ["js/recommended", "ts/recommended", "plugin:@typescript-eslint/recommended", "plugin:@typescript-eslint/recommended-requiring-type-checking"],
  },
  { files: ["**/*.{js,mjs,cjs,ts,tsx}"], languageOptions: { globals: globals.node } },
]);