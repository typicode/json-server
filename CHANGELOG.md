# Change Log

## [0.8.23][2016-11-03]

* Fix `Links` header

## [0.8.22][2016-10-04]

* Fix `Links` header issue when using `_page`
* Add query params support to the route rewriter

## [0.8.21][2016-09-13]

* Fix bodyParser issue when using custom routes

## [0.8.20][2016-09-12]

* Fix [#355](https://github.com/typicode/json-server/issues/355)
* Add `_page` support

## [0.8.19][2016-08-18]

* Fix [#341](https://github.com/typicode/json-server/issues/341)

## [0.8.18][2016-08-17]

* Add CLI option `--middlewares` and support them in `json-server.json` config file

## [0.8.17][2016-07-25]

* Fix snapshot creation for JS files (ex: `json-server generator.js`)

## [0.8.16][2016-07-11]

* Support `x-www-form-urlencoded`

## [0.8.15][2016-07-03]

* Bug fix: `--watch` option on OS X

## [0.8.14][2016-05-15]

* Bug fix: data wasn't written to file in `v0.8.13` and `v0.8.12`

## [0.8.13][2016-05-12]

* Make `_like` operator case insensitive

## [0.8.12][2016-05-08]

* Minor bug fix

## [0.8.11][2016-05-08]

* Support sort by nested field (e.g. `_sort=author.name`)
* Fix `graceful-fs` warning

## [0.8.10][2016-04-18]

* CLI option `-ng/--no-gzip` to disable `gzip` compression

## [0.8.9][2016-03-17]

* CLI can now read options from `json-server.json` if present
* CLI option `-c/--config` to point to a different configuration file

## [0.8.8][2016-02-13]

### Fixed

* Fix #233

## [0.8.7][2016-01-22]

### Added

* `gzip` compression to improve performances
* CLI option `-nc/--no-cors` to disable CORS

## [0.8.6][2016-01-07]

### Added

* CLI option `-ro/--read-only` to allow only GET requests

## [0.8.5][2015-12-28]

### Fixed

* Fix #177

## [0.8.4][2015-12-13]

### Added

* Like operator `GET /posts?title_like=json` (accepts RegExp)

## [0.8.3][2015-11-25]

### Added

* CLI option `-q/--quiet`
* Nested route `POST /posts/1/comments`
* Not equal operator `GET /posts?id_ne=1`

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
