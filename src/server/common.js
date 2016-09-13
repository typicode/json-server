var bodyParser = require('body-parser')
var methodOverride = require('method-override')

// common middlewares used in ./defaults.js and ./router/index.js
module.exports = [
  bodyParser.json({limit: '10mb', extended: false}),
  bodyParser.urlencoded({extended: false}),
  methodOverride()
]
