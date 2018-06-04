module.exports = {
  extends: ['standard', 'standard-preact', 'prettier'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': [
      'error',
      {
        singleQuote: true,
        semi: false,
      },
    ]
  },
  env: { jest: true }
}
