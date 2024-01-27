module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    'jest/globals': true,
  },
  plugins: ['jest', 'jsdoc'],
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 13,
  },
  rules: {
    'no-restricted-syntax': ['off'],
    'class-methods-use-this': ['off'],
    'no-await-in-loop': ['off'],
    'jsdoc/no-undefined-types': 1,
    'max-len': ['error', 120],
  },
};
