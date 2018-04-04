const assert = require('assert')
const _ = require('lodash')
const lodashId = require('lodash-id')
const mixins = require('../../src/server/mixins')

describe('mixins', () => {
  let db

  before(() => {
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

  describe('getDependents', () => {
    it('should return dependent documents', () => {
      const expected = [
        { name: 'comments', id: 2 },
        { name: 'comments', id: 3 }
      ]

      assert.deepEqual(_.getDependents(db, 'postId', 2), expected)
    })

    it('should return dependent documents (type insensitive)', () => {
      const expected = [
        { name: 'comments', id: 2 },
        { name: 'comments', id: 3 }
      ]

      assert.deepEqual(_.getDependents(db, 'postId', '2'), expected)
    })

    it('should not return irrelevant dead documents', () => {
      const expected = [{ name: 'comments', id: 1 }]
      assert.deepEqual(_.getDependents(db, 'postId', 1), expected)
    })
  })

  describe('createId', () => {
    it('should return a new id', () => {
      assert.equal(_.createId(db.comments), 4)
    })

    it('should return a new uuid', () => {
      assert.notEqual(_.createId(db.photos), 3)
    })
  })
})
