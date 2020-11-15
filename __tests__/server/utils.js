const assert = require('assert')
const utils = require('../../src/server/utils')

describe('utils', () => {
  describe('getPage', () => {
    const array = [1, 2, 3, 4, 5]
    const perPage = 2

    test('should return first page', () => {
      assert.deepStrictEqual(utils.getPage(array, 1, perPage), {
        items: [1, 2],
        current: 1,
        first: 1,
        next: 2,
        last: 3,
      })
    })

    test('should return second page', () => {
      assert.deepStrictEqual(utils.getPage(array, 2, perPage), {
        items: [3, 4],
        current: 2,
        first: 1,
        prev: 1,
        next: 3,
        last: 3,
      })
    })

    test('should return third page (last)', () => {
      assert.deepStrictEqual(utils.getPage(array, 3, perPage), {
        items: [5],
        current: 3,
        first: 1,
        prev: 2,
        last: 3,
      })
    })

    test('should return an empty array if page is greater than the last page', () => {
      assert.deepStrictEqual(utils.getPage(array, 99, perPage), {
        items: [],
      })
    })

    test('should return the array if perPage is greater than the array size', () => {
      assert.deepStrictEqual(utils.getPage(array, 1, 99), {
        items: array,
      })
    })

    test('should return an empty array if the array is empty', () => {
      assert.deepStrictEqual(utils.getPage([], 1, 1), {
        items: [],
      })
    })
  })
})
