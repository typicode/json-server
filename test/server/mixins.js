var assert = require('assert')
var _ = require('lodash')
var _db = require('underscore-db')
var mixins = require('../../src/server/mixins')

/* global describe, it */

describe('mixins', function () {

  describe('getRemovable', function () {

    it('should return removable documents', function () {

      var db = {
        posts: [
          {id: 1, comment: 1}
        ],
        comments: [
          {id: 1, postId: 1},
          // Comments below references a post that doesn't exist
          {id: 2, postId: 2},
          {id: 3, postId: 2}
        ]
      }

      var expected = [
        {name: 'comments', id: 2},
        {name: 'comments', id: 3}
      ]

      _.mixin(_db)
      _.mixin(mixins)

      assert.deepEqual(_.getRemovable(db), expected)

    })
  })
})
