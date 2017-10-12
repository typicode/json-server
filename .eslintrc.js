module.exports = {
  extends: ['standard', 'prettier'],
  plugins: ['prettier'],
  rules: {
    'newline-per-chained-call': ["error", { "ignoreChainWithDepth": 2 }],
    'prettier/prettier': [
      'error',
      {
        singleQuote: true,
        semi: false
      },
    ]
  },
  env: { mocha: true }
}
