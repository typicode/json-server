"use strict";

var express = require('express');

module.exports = {
  create: function create() {
    return express().set('json spaces', 2);
  },
  defaults: require('./defaults'),
  router: require('./router'),
  rewriter: require('./rewriter'),
  bodyParser: require('./body-parser')
};