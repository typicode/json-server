# Change Log

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
