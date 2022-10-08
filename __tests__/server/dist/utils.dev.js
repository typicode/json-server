"use strict";

var assert = require('assert');

var utils = require('../../src/server/utils');

describe('utils', function () {
  describe('getPage', function () {
    var array = [1, 2, 3, 4, 5];
    var perPage = 2;
    test('should return first page', function () {
      assert.deepStrictEqual(utils.getPage(array, 1, perPage), {
        items: [1, 2],
        current: 1,
        first: 1,
        next: 2,
        last: 3
      });
    });
    test('should return second page', function () {
      assert.deepStrictEqual(utils.getPage(array, 2, perPage), {
        items: [3, 4],
        current: 2,
        first: 1,
        prev: 1,
        next: 3,
        last: 3
      });
    });
    test('should return third page (last)', function () {
      assert.deepStrictEqual(utils.getPage(array, 3, perPage), {
        items: [5],
        current: 3,
        first: 1,
        prev: 2,
        last: 3
      });
    });
    test('should return an empty array if page is greater than the last page', function () {
      assert.deepStrictEqual(utils.getPage(array, 99, perPage), {
        items: []
      });
    });
    test('should return the array if perPage is greater than the array size', function () {
      assert.deepStrictEqual(utils.getPage(array, 1, 99), {
        items: array
      });
    });
    test('should return an empty array if the array is empty', function () {
      assert.deepStrictEqual(utils.getPage([], 1, 1), {
        items: []
      });
    });
  });
});