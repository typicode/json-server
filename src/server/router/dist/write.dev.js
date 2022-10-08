"use strict";

module.exports = function write(db) {
  return function (req, res, next) {
    db.write();
    next();
  };
};