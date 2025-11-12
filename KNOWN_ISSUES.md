# Known Issues

## Node.js v22 + Webpack v4 Compatibility Issue

### Issue
The project currently uses Webpack v4 which has a compatibility issue with Node.js v22 (OpenSSL 3.0).

### Error Message
```
Error: error:0308010C:digital envelope routines::unsupported
    at new Hash (node:internal/crypto/hash:101:19)
    at Object.createHash (node:crypto:139:10)
```

### Impact
- Pre-commit hooks fail during build step
- Cannot run `npm run build` on Node.js v22
- Tests and linting still work correctly

### Root Cause
Webpack v4 uses the legacy MD4 hash algorithm which was removed in OpenSSL 3.0 (used by Node.js v17+).

### Workarounds

#### Option 1: Use Legacy OpenSSL Provider (Temporary)
```bash
export NODE_OPTIONS=--openssl-legacy-provider
npm run build
```

Or in package.json:
```json
{
  "scripts": {
    "build": "NODE_OPTIONS=--openssl-legacy-provider babel src -d lib && webpack -p"
  }
}
```

#### Option 2: Downgrade to Node.js v16 LTS
```bash
nvm use 16
npm run build
```

### Permanent Solution
Upgrade to Webpack v5, which is compatible with Node.js v22.

**Required Changes**:
- Update webpack from v4.31.0 to v5.x
- Update webpack-cli from v3.3.2 to v5.x
- Update html-webpack-plugin from v3.2.0 to v5.x
- Update css-loader, mini-css-extract-plugin to compatible versions
- Update webpack.config.js for v5 API changes

**Breaking Changes**:
- Webpack v5 has API changes that may require configuration updates
- Some plugins may need updates

**Tracking**: This should be done as a separate PR to avoid mixing with security fixes.

### References
- [Webpack v5 Migration Guide](https://webpack.js.org/migrate/5/)
- [Node.js OpenSSL 3.0 Changes](https://nodejs.org/en/blog/release/v17.0.0/)
- [Related Issue](https://github.com/webpack/webpack/issues/14532)

### Status
🟡 **Workaround Available** - Use `--openssl-legacy-provider` or Node.js v16
📅 **Target Resolution** - Upgrade to Webpack v5 in future PR
🔒 **Security Impact** - None (devDependency only, does not affect runtime)
