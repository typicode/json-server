const assert = require('assert')
const _ = require('lodash')
const lodashId = require('lodash-id')
const mixins = require('../../src/server/mixins')

describe('mixins', () => {
  let db

  beforeAll(() => {
    _.mixin(lodashId)
    _.mixin(mixins)
  })

  beforeEach(() => {
    db = {
      posts: [{ id: 1, comment: 1 }],
      comments: [
        { id: 1, postId: 1 },
        // Comments below references a post that doesn't exist
        { id: 2, postId: 2 },
        { id: 3, postId: 2 }
      ],
      photos: [{ id: '1' }, { id: '2' }]
    }
  })

  describe('getRemovable', () => {
    test('should return removable documents', () => {
      const expected = [
        { name: 'comments', id: 2 },
        { name: 'comments', id: 3 }
      ]

      assert.deepEqual(_.getRemovable(db, { foreignKeySuffix: 'Id' }), expected)
    })

    test('should support custom foreignKeySuffix', () => {
      const expected = [
        { name: 'comments', id: 2 },
        { name: 'comments', id: 3 }
      ]

      assert.deepEqual(_.getRemovable(db, { foreignKeySuffix: 'Id' }), expected)
    })
  })

  describe('createId', () => {
    test('should return a new id', () => {
      assert.equal(_.createId(db.comments), 4)
    })

    test('should return a new uuid', () => {
      assert.notEqual(_.createId(db.photos), 3)
    })
  })
})
