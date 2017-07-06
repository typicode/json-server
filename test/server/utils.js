const assert = require('assert')
const utils = require('../../src/server/utils')

describe('utils', () => {
  describe('getPage', () => {
    const array = [1, 2, 3, 4, 5]
    const perPage = 2

    it('should return first page', () => {
      assert.deepEqual(utils.getPage(array, 1, perPage), {
        items: [1, 2],
        current: 1,
        first: 1,
        next: 2,
        last: 3
      })
    })

    it('should return second page', () => {
      assert.deepEqual(utils.getPage(array, 2, perPage), {
        items: [3, 4],
        current: 2,
        first: 1,
        prev: 1,
        next: 3,
        last: 3
      })
    })

    it('should return third page (last)', () => {
      assert.deepEqual(utils.getPage(array, 3, perPage), {
        items: [5],
        current: 3,
        first: 1,
        prev: 2,
        last: 3
      })
    })

    it('should return an empty array if page is greater than the last page', () => {
      assert.deepEqual(utils.getPage(array, 99, perPage), {
        items: []
      })
    })

    it('should return the array if perPage is greater than the array size', () => {
      assert.deepEqual(utils.getPage(array, 1, 99), {
        items: array
      })
    })

    it('should return an empty array if the array is empty', () => {
      assert.deepEqual(utils.getPage([], 1, 1), {
        items: []
      })
    })
  })
})
