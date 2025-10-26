module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
  ],
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
    "/generated/**/*", // Ignore generated files.
  ],
  rules: {
    "quotes": ["error", "double"],
    "indent": ["error", 2],
    "no-unused-vars": "off",
  },
};
