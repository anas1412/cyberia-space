const ts = require("typescript-eslint");

module.exports = ts.config(
  ...ts.configs.recommended,
  {
    ignores: ["convex/_generated/**", "node_modules/**", ".claude/**"],
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-require-imports": "off",
    },
  }
);
