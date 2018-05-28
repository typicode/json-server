const path = require('path')
const CleanWebpackPlugin = require('clean-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  entry: './src/front/index.js',
  module: {
    rules: [
      { test: /\.css$/, use: 'css-loader' },
      { test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader' }
    ]
  },
  plugins: [
    new CleanWebpackPlugin(['dist']),
    new HtmlWebpackPlugin({ template: 'src/front/index.html' })
  ]
}
