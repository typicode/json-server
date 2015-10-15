# Change Log

## [0.8.2][2015-10-15]

### Added

* CLI option `-S/--snapshots` to set a custom snapshots directory.

### Fixed

* Fix plural resources: `DELETE` should return `404` if resource doesn't exist.

## [0.8.1][2015-10-06]

### Fixed

* Fix plural resources: `PUT` should replace resource instead of updating properties.
* Fix singular resources: `POST`, `PUT`, `PATCH` should not convert resource properties.

## [0.8.0][2015-09-21]

### Changed

* `jsonServer.defaults` is now a function and can take an object.
If you're using the project as a module, you need to update your code:

```js
// Before
jsonServer.defaults
// After
jsonServer.defaults()
jsonServer.defaults({ static: '/some/path'})
```

* Automatically ignore unknown query parameters.

```bash
# Before
GET /posts?author=typicode&foo=bar # []
# After
GET /posts?author=typicode&foo=bar # [{...}, {...}]
```

### Added

* CLI option for setting a custom static files directory.

```bash
json-server --static some/path
```

## [0.7.28][2015-09-09]

```bash
# Support range
GET /products?price_gte=50&price_lte=100
```

## [0.7.27][2015-09-02]

### Added

```bash
# Support OR
GET /posts?id=1&id2
GET /posts?category=javascript&category=html
```

## [0.7.26][2015-09-01]

### Added

```bash
# Support embed and expand in lists
GET /posts?embed=comments
GET /posts?expand=user
```
