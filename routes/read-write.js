var _  = require('underscore'),
    utils = require('../utils/utils'),
    db = {};

_.mixin(require('../utils/db-mixins'));

exports.setDatabase = function(object) {
  db = object;
}

exports.database = function(req, res) {
  res.jsonp(db)
}

exports.db = function() {
  return db;
}

// GET /:resource?attr=&attr=
exports.list = function(req, res) {
  var collection = db[req.params.resource],
      properties = {},
      result;

  Object.keys(req.query).forEach(function (key) {
    var value = req.query[key];
    properties[key] = utils.toNative(value);
  });

  if (_(properties).isEmpty()) {
    result = collection;
  } else {
    result = _(collection).where(properties);
  }

  res.jsonp(result);
}

// GET /:resource/slice/:from/:to
exports.slice = function(req, res) {
  var startIndex = +req.params.from;
  var endIndex = +req.params.to;
  if (startIndex >= endIndex) {
    console.error('invalid start ' + startIndex + ' and end ' + endIndex + ' indices');
    return res.send(500);
  }
  var collection = db[req.params.resource],
      properties = {},
      result;

  result = collection;
  console.assert(Array.isArray(result), 'result for ' + req.params.resource + ' is not an Array');
  res.jsonp(result.slice(startIndex, endIndex));
}

// GET /:parent/:parentId/:resource
exports.nestedList = function(req, res) {
  var properties = {},
      resource;

  // Set parentID
  properties[req.params.parent.slice(0, - 1) + 'Id'] = +req.params.parentId;

  // Filter using parentID
  resource = _.where(db[req.params.resource], properties);

  res.jsonp(resource);
}

// GET /:resource/:id
exports.show = function(req, res) {
  var resource = _.get(db, req.params.resource, +req.params.id);

  res.jsonp(resource);
}

// POST /:resource
exports.create = function(req, res) {
  var resource = _.create(db, req.params.resource, req.body);

  res.jsonp(resource);
}

// PUT /:resource/:id
// PATCH /:resource/:id
exports.update = function(req, res) {
  _.update(db, req.params.resource, +req.params.id, req.body);
  var resource = _.get(db, req.params.resource, +req.params.id);

  res.jsonp(resource);
}

// DELETE /:resource/:id
exports.destroy = function(req, res) {
  _.remove(db, req.params.resource, +req.params.id);
  _.clean(db);

  res.send(204);
}

