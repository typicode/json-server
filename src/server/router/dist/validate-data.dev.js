"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

var _ = require('lodash');

function validateKey(key) {
  if (key.indexOf('/') !== -1) {
    var msg = ["Oops, found / character in database property '".concat(key, "'."), '', "/ aren't supported, if you want to tweak default routes, see", 'https://github.com/typicode/json-server/#add-custom-routes'].join('\n');
    throw new Error(msg);
  }
}

module.exports = function (obj) {
  if (_.isPlainObject(obj)) {
    Object.keys(obj).forEach(validateKey);
  } else {
    throw new Error("Data must be an object. Found ".concat(_typeof(obj), ".") + 'See https://github.com/typicode/json-server for example.');
  }
};