var assert = require('assert')
var utils = require('../src/utils')

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
        {name: 'comments', id: 2},
        {name: 'comments', id: 3}
      ]

      assert.deepEqual(utils.getRemovable(db), expected)

    })
  })

  describe('toNative', function() {

    it('should convert string to native type', function() {
      // should convert
      assert.strictEqual(utils.toNative('1'), 1)
      assert.strictEqual(utils.toNative('true'), true)
      // should not convert
      assert.strictEqual(utils.toNative(''), '')
      assert.strictEqual(utils.toNative('\t\n'), '\t\n')
      assert.strictEqual(utils.toNative('1 '), '1 ')
      assert.strictEqual(utils.toNative(' 1'), ' 1')
      assert.strictEqual(utils.toNative('string'), 'string')
      assert.strictEqual(utils.toNative(1), 1)
      assert.strictEqual(utils.toNative(true), true)
    })

  })

  describe('limitArray', function() {
    it('should return limited array', function() {
      var testArray = [
        {id: 2, postId: 2},
        {id: 3, postId: 4},
        {id: 4, postId: 6},
        {id: 5, postId: 8},
        {id: 6, postId: 9},
        {id: 7, postId: 10},
        {id: 8, postId: 11},
        {id: 9, postId: 12},
        {id: 10, postId: 13},
        {id: 11, postId: 14},
        {id: 12, postId: 15},
        {id: 13, postId: 16},
        {id: 14, postId: 17},
        {id: 15, postId: 18},
        {id: 16, postId: 19}
      ]
      assert.deepEqual(utils.limitArray(testArray, 3, 3), testArray.slice(3, 6))
      assert.deepEqual(utils.limitArray(testArray, 5, 3), testArray.slice(5, 8))
    })
  })
})