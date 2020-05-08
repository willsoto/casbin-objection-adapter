const { NODE_ENV } = process.env;

const isDevelopment = NODE_ENV === "development";

module.exports = {
  root: true,
  env: {
    node: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ["./tsconfig.json"],
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier",
    "prettier/@typescript-eslint",
  ],
  overrides: [
    {
      env: {
        jest: true,
      },
      files: ["*.spec.{ts,tsx}"],
      extends: ["plugin:jest/recommended", "plugin:jest/style"],
    },
  ],
  rules: {
    "@typescript-eslint/explicit-function-return-type": [
      "error",
      {
        allowExpressions: true,
      },
    ],
    "@typescript-eslint/ban-ts-ignore": "warn",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        ignoreRestSiblings: true,
        argsIgnorePattern: "^_",
      },
    ],
    "no-console": isDevelopment ? "off" : "error",
    "no-debugger": isDevelopment ? "off" : "error",
    "no-warning-comments": "warn",
  },
};
