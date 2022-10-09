"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var express = require('express');

var _ = require('lodash');

var pluralize = require('pluralize');

var write = require('./write');

var getFullURL = require('./get-full-url');

var utils = require('../utils');

var delay = require('./delay');

module.exports = function (db, name, opts) {
  // Create router
  var router = express.Router();
  router.use(delay); // Embed function used in GET /name and GET /name/id

  function embed(resource, e) {
    e && [].concat(e).forEach(function (externalResource) {
      if (db.get(externalResource).value) {
        var query = {};
        var singularResource = pluralize.singular(name);
        query["".concat(singularResource).concat(opts.foreignKeySuffix)] = resource.id;
        resource[externalResource] = db.get(externalResource).filter(query).value();
      }
    });
  } // Expand function used in GET /name and GET /name/id


  function expand(resource, e) {
    e && [].concat(e).forEach(function (innerResource) {
      var plural = pluralize(innerResource);

      if (db.get(plural).value()) {
        var prop = "".concat(innerResource).concat(opts.foreignKeySuffix);
        resource[innerResource] = db.get(plural).getById(resource[prop]).value();
      }
    });
  } // GET /name
  // GET /name?q=
  // GET /name?attr=&attr=
  // GET /name?_end=&
  // GET /name?_start=&_end=&
  // GET /name?_embed=&_expand=


  function list(req, res, next) {
    // Resource chain
    var chain = db.get(name); // Remove q, _start, _end, ... from req.query to avoid filtering using those
    // parameters

    var q = req.query.q;
    var _start = req.query._start;
    var _end = req.query._end;
    var _page = req.query._page;
    var _sort = req.query._sort;
    var _order = req.query._order;
    var _limit = req.query._limit;
    var _embed = req.query._embed;
    var _expand = req.query._expand;
    delete req.query.q;
    delete req.query._start;
    delete req.query._end;
    delete req.query._sort;
    delete req.query._order;
    delete req.query._limit;
    delete req.query._embed;
    delete req.query._expand; // Automatically delete query parameters that can't be found
    // in the database

    Object.keys(req.query).forEach(function (query) {
      var arr = db.get(name).value();

      for (var i in arr) {
        if (_.has(arr[i], query) || query === 'callback' || query === '_' || /_lte$/.test(query) || /_gte$/.test(query) || /_ne$/.test(query) || /_like$/.test(query)) return;
      }

      delete req.query[query];
    });

    if (q) {
      // Full-text search
      if (Array.isArray(q)) {
        q = q[0];
      }

      q = q.toLowerCase();
      chain = chain.filter(function (obj) {
        for (var key in obj) {
          var value = obj[key];

          if (db._.deepQuery(value, q)) {
            return true;
          }
        }

        return false;
      });
    }

    Object.keys(req.query).forEach(function (key) {
      // Don't take into account JSONP query parameters
      // jQuery adds a '_' query parameter too
      if (key !== 'callback' && key !== '_') {
        // Always use an array, in case req.query is an array
        var arr = [].concat(req.query[key]);
        var isDifferent = /_ne$/.test(key);
        var isRange = /_lte$/.test(key) || /_gte$/.test(key);
        var isLike = /_like$/.test(key);
        var path = key.replace(/(_lte|_gte|_ne|_like)$/, '');
        chain = chain.filter(function (element) {
          return arr.map(function (value) {
            // get item value based on path
            // i.e post.title -> 'foo'
            var elementValue = _.get(element, path); // Prevent toString() failing on undefined or null values


            if (elementValue === undefined || elementValue === null) {
              return undefined;
            }

            if (isRange) {
              var isLowerThan = /_gte$/.test(key);
              return isLowerThan ? value <= elementValue : value >= elementValue;
            } else if (isDifferent) {
              return value !== elementValue.toString();
            } else if (isLike) {
              return new RegExp(value, 'i').test(elementValue.toString());
            } else {
              return value === elementValue.toString();
            }
          }).reduce(function (a, b) {
            return isDifferent ? a && b : a || b;
          });
        });
      }
    }); // Sort

    if (_sort) {
      var _sortSet = _sort.split(',');

      var _orderSet = (_order || '').split(',').map(function (s) {
        return s.toLowerCase();
      });

      chain = chain.orderBy(_sortSet, _orderSet);
    } // Slice result


    if (_end || _limit || _page) {
      res.setHeader('X-Total-Count', chain.size());
      res.setHeader('Access-Control-Expose-Headers', "X-Total-Count".concat(_page ? ', Link' : ''));
    }

    if (_page) {
      _page = parseInt(_page, 10);
      _page = _page >= 1 ? _page : 1;
      _limit = parseInt(_limit, 10) || 10;
      var page = utils.getPage(chain.value(), _page, _limit);
      var links = {};
      var fullURL = getFullURL(req);

      if (page.first) {
        links.first = fullURL.replace("page=".concat(page.current), "page=".concat(page.first));
      }

      if (page.prev) {
        links.prev = fullURL.replace("page=".concat(page.current), "page=".concat(page.prev));
      }

      if (page.next) {
        links.next = fullURL.replace("page=".concat(page.current), "page=".concat(page.next));
      }

      if (page.last) {
        links.last = fullURL.replace("page=".concat(page.current), "page=".concat(page.last));
      }

      res.links(links);
      chain = _.chain(page.items);
    } else if (_end) {
      _start = parseInt(_start, 10) || 0;
      _end = parseInt(_end, 10);
      chain = chain.slice(_start, _end);
    } else if (_limit) {
      _start = parseInt(_start, 10) || 0;
      _limit = parseInt(_limit, 10);
      chain = chain.slice(_start, _start + _limit);
    } // embed and expand


    chain = chain.cloneDeep().forEach(function (element) {
      embed(element, _embed);
      expand(element, _expand);
    });
    res.locals.data = chain.value();
    next();
  } // GET /name/:id
  // GET /name/:id?_embed=&_expand


  function show(req, res, next) {
    var _embed = req.query._embed;
    var _expand = req.query._expand;
    var resource = db.get(name).getById(req.params.id).value();

    if (resource) {
      // Clone resource to avoid making changes to the underlying object
      var clone = _.cloneDeep(resource); // Embed other resources based on resource id
      // /posts/1?_embed=comments


      embed(clone, _embed); // Expand inner resources based on id
      // /posts/1?_expand=user

      expand(clone, _expand);
      res.locals.data = clone;
    }

    next();
  } // POST /name


  function create(req, res, next) {
    var resource;

    if (opts._isFake) {
      var id = db.get(name).createId().value();
      resource = _objectSpread({}, req.body, {
        id: id
      });
    } else {
      resource = db.get(name).insert(req.body).value();
    }

    res.setHeader('Access-Control-Expose-Headers', 'Location');
    res.location("".concat(getFullURL(req), "/").concat(resource.id));
    res.status(201);
    res.locals.data = resource;
    next();
  } // PUT /name/:id
  // PATCH /name/:id


  function update(req, res, next) {
    var id = req.params.id;
    var resource;

    if (opts._isFake) {
      resource = db.get(name).getById(id).value();

      if (req.method === 'PATCH') {
        resource = _objectSpread({}, resource, {}, req.body);
      } else {
        resource = _objectSpread({}, req.body, {
          id: resource.id
        });
      }
    } else {
      var chain = db.get(name);
      chain = req.method === 'PATCH' ? chain.updateById(id, req.body) : chain.replaceById(id, req.body);
      resource = chain.value();
    }

    if (resource) {
      res.locals.data = resource;
    }

    next();
  } // DELETE /name/:id


  function destroy(req, res, next) {
    var resource;

    if (opts._isFake) {
      resource = db.get(name).value();
    } else {
      resource = db.get(name).removeById(req.params.id).value(); // Remove dependents documents

      var removable = db._.getRemovable(db.getState(), opts);

      removable.forEach(function (item) {
        db.get(item.name).removeById(item.id).value();
      });
    }

    if (resource) {
      res.locals.data = {};
    }

    next();
  }

  var w = write(db);
  router.route('/').get(list).post(create, w);
  router.route('/:id').get(show).put(update, w).patch(update, w)["delete"](destroy, w);
  return router;
};