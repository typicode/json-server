module.exports = {
  extends: ['standard', 'prettier'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': [
      'error',
      {
        singleQuote: true,
        semi: false,
      },
    ],
    'prefer-template': "error"
  },
  env: { mocha: true }
}
