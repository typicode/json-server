"use strict";

module.exports = {
  FILE: FILE,
  JS: JS,
  URL: URL
};

function FILE(s) {
  return !URL(s) && /\.json$/.test(s);
}

function JS(s) {
  return !URL(s) && /\.js$/.test(s);
}

function URL(s) {
  return /^(http|https):/.test(s);
}