const transformReactJsx = require("@babel/plugin-transform-react-jsx");


module.exports = {
  "presets": [
    "@babel/preset-env",
    // "preact" disabling temporary
  ],
  // remove plugins and deps when preact preset supports Babel 7
  "plugins": [
    [ transformReactJsx, { "pragma": "h" }],
    require("@babel/plugin-syntax-jsx"),
  ]
}
