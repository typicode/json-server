const prettierConfig = require('./prettier.config.js')

module.exports = {
  extends: ['standard', 'prettier'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': [
      'error',
      prettierConfig,
    ]
  },
  env: { mocha: true }
}
