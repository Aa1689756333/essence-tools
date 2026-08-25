import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

export default [...nextCoreWebVitals, ...compat.config({
  extends: ["prettier"],

  rules: {
    "react/no-unescaped-entities": "off",
    "@next/next/no-img-element": "off",
    "react/display-name": "off",
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "react-hooks/set-state-in-effect": "off",
    "react-hooks/refs": "off"
  }
}), {
  ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"]
}];
