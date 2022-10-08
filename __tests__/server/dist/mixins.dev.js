"use strict";

var assert = require('assert');

var _ = require('lodash');

var lodashId = require('lodash-id');

var mixins = require('../../src/server/mixins');

describe('mixins', function () {
  var db;
  beforeAll(function () {
    _.mixin(lodashId);

    _.mixin(mixins);
  });
  beforeEach(function () {
    db = {
      posts: [{
        id: 1,
        comment: 1
      }],
      comments: [{
        id: 1,
        postId: 1
      }, // Comments below references a post that doesn't exist
      {
        id: 2,
        postId: 2
      }, {
        id: 3,
        postId: 2
      }],
      photos: [{
        id: '1'
      }, {
        id: '2'
      }]
    };
  });
  describe('getRemovable', function () {
    test('should return removable documents', function () {
      var expected = [{
        name: 'comments',
        id: 2
      }, {
        name: 'comments',
        id: 3
      }];
      assert.deepStrictEqual(_.getRemovable(db, {
        foreignKeySuffix: 'Id'
      }), expected);
    });
    test('should support custom foreignKeySuffix', function () {
      var expected = [{
        name: 'comments',
        id: 2
      }, {
        name: 'comments',
        id: 3
      }];
      assert.deepStrictEqual(_.getRemovable(db, {
        foreignKeySuffix: 'Id'
      }), expected);
    });
  });
  describe('createId', function () {
    test('should return a new id', function () {
      assert.strictEqual(_.createId(db.comments), 4);
    });
    test('should return a new uuid', function () {
      assert.notStrictEqual(_.createId(db.photos), 3);
    });
  });
});