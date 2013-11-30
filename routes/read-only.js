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

exports.create = function(req, res) {
  req.body.id = Math.round(new Date().getTime() / 1000); 
  res.jsonp(req.body);
}

exports.update = function(req, res) {
  var resource = _.get(db, req.params.resource, +req.params.id),
      clonedResource = _.clone(resource),
      result = _.extend(clonedResource, req.body);

  res.jsonp(result);
}

exports.destroy = function(req, res) {
  res.send(204)
}
