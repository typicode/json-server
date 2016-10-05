#!/usr/bin/env node
process.env.NODE_ENV === 'test'
  ? require('../src/cli')()
  : require('../lib/cli')()