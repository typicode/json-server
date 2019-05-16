const assert = require('assert')
const validateData = require('../../src/server/router/validate-data')

describe('validateData', () => {
  test('should throw an error if data contains /', () => {
    assert.throws(() => validateData({ 'a/b': [] }), /found \//)
  })

  test('should throw an error if data is an array', () => {
    assert.throws(() => validateData([]), /must be an object/)
  })

  test("shouldn't throw an error", () => {
    assert.doesNotThrow(() => validateData({ a: [] }))
  })
})
