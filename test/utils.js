var assert = require('assert')
var utils  = require('../src/utils')

describe('utils', function() {
  
  describe('getRemovable', function() {

    it('should return removable documents', function() {
      
      var db = {
        posts: [
          {id: 1, comment: 1}
        ],
        comments: [
          {id: 1, postId: 1},
          // Comments below references a post that doesn't exist
          {id: 2, postId: 2},
          {id: 3, postId: 2},
        ]
      }

      var expected = [
        ['comments', 2],
        ['comments', 3]
      ]

      assert.deepEqual(expected, utils.getRemovable(db))

    })
  })

  describe('toNative', function() {

    it('should convert string to native type', function() {

      assert.strictEqual(utils.toNative('1'), 1)
      assert.strictEqual(utils.toNative('true'), true)

      assert.strictEqual(utils.toNative('string'), 'string')
      assert.strictEqual(utils.toNative(1), 1)
      assert.strictEqual(utils.toNative(true), true)
      
    })

  })
})