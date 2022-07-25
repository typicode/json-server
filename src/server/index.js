const express = require('express')

module.exports = {
  lib: {
    express,
  },
  create: () => express().set('json spaces', 2),
  defaults: require('./defaults'),
  router: require('./router'),
  rewriter: require('./rewriter'),
  bodyParser: require('./body-parser'),
}
