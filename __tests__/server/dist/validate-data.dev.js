"use strict";

var assert = require('assert');

var validateData = require('../../src/server/router/validate-data');

describe('validateData', function () {
  test('should throw an error if data contains /', function () {
    assert["throws"](function () {
      return validateData({
        'a/b': []
      });
    }, /found \//);
  });
  test('should throw an error if data is an array', function () {
    assert["throws"](function () {
      return validateData([]);
    }, /must be an object/);
  });
  test("shouldn't throw an error", function () {
    assert.doesNotThrow(function () {
      return validateData({
        a: []
      });
    });
  });
});