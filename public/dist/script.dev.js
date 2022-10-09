"use strict";

function ResourceItem(_ref) {
  var name = _ref.name,
      length = _ref.length;
  return "\n    <li>\n      <a href=\"".concat(name, "\">/").concat(name, "</a>\n      <sup>").concat(length ? "".concat(length, "x") : 'object', "</sup>\n    </li>\n  ");
}

function ResourceList(_ref2) {
  var db = _ref2.db;
  return "\n    <ul>\n      ".concat(Object.keys(db).map(function (name) {
    return ResourceItem({
      name: name,
      length: Array.isArray(db[name]) && db[name].length
    });
  }).join(''), "\n    </ul>\n  ");
}

function NoResources() {
  return "<p>No resources found</p>";
}

function ResourcesBlock(_ref3) {
  var db = _ref3.db;
  return "\n    <div>\n      <h1>Resources</h1>\n      ".concat(Object.keys(db).length ? ResourceList({
    db: db
  }) : NoResources(), "\n    </div>\n  ");
}

window.fetch('db').then(function (response) {
  return response.json();
}).then(function (db) {
  return document.getElementById('resources').innerHTML = ResourcesBlock({
    db: db
  });
});

function CustomRoutesBlock(_ref4) {
  var customRoutes = _ref4.customRoutes;
  var rules = Object.keys(customRoutes);

  if (rules.length) {
    return "\n      <div>\n        <h1>Custom Routes</h1>\n        <table>\n          ".concat(rules.map(function (rule) {
      return "<tr>\n              <td>".concat(rule, "</td>\n              <td><code>\u21E2</code> ").concat(customRoutes[rule], "</td>\n            </tr>");
    }).join(''), "\n        </table>\n      </div>\n    ");
  }
}

window.fetch('__rules').then(function (response) {
  return response.json();
}).then(function (customRoutes) {
  return document.getElementById('custom-routes').innerHTML = CustomRoutesBlock({
    customRoutes: customRoutes
  });
});