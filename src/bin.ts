#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { parseArgs } from 'node:util'

import { watch } from 'chokidar'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { PackageJson } from 'type-fest'

import { createApp } from './app.js'
import { JSON5File } from './JSON5File.js'
import { Observer } from './Observer.js'
import { Data } from './service.js'

// Parse args
const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    port: {
      type: 'string',
      short: 'p',
    },
    host: {
      type: 'string',
      short: 'h',
    },
    static: {
      type: 'string',
      short: 's',
      multiple: true,
    },
    help: {
      type: 'boolean',
    },
    version: {
      type: 'boolean',
    },
  },
  allowPositionals: true,
})

if (values.help || positionals.length === 0) {
  console.log(`Usage: json-server [options] [file]
Options:
  -p, --port <port>  Port (default: 3000)
  -h, --host <host>  Host (default: localhost)
  -s, --static <dir> Static files directory (multiple allowed)
  --help  Show this message
`)
}

if (values.version) {
  const pkg = JSON.parse(
    readFileSync(join(__dirname, '../package.json'), 'utf8'),
  ) as PackageJson
  console.log(pkg.version)
  process.exit()
}

// App args and options
const file = positionals[0] ?? 'db.json'
const port = parseInt(values.port ?? process.env['PORT'] ?? '3000')
const host = values.host ?? process.env['HOST'] ?? 'localhost'

// Set up database
let adapter: JSONFile<Data> | JSON5File<Data>
if (extname(file) === '.json5') {
  adapter = new JSON5File<Data>(file)
} else {
  adapter = new JSONFile<Data>(file)
}
const observer = new Observer(adapter)

const db = new Low<Data>(observer, {})
await db.read()

// Create app
const app = createApp(db, { logger: false, static: values.static })

function routes(db: Low<Data>): string[] {
  return Object.keys(db.data).map((key) => `http://${host}:${port}/${key}`)
}

// Watch file for changes
if (process.env['NODE_ENV'] !== 'production') {
  let writing = false // true if the file is being written to by the app

  observer.onWriteStart = () => {
    writing = true
  }
  observer.onWriteEnd = () => {
    writing = false
  }
  observer.onReadStart = () => console.log(`reloading ${file}...`)
  observer.onReadEnd = () => console.log('reloaded')
  watch(file).on('change', () => {
    // Do no reload if the file is being written to by the app
    if (!writing) {
      db.read()
        .then(() => routes(db))
        .catch((e) => {
          if (e instanceof SyntaxError) {
            return console.log(e.message)
          }
          console.log(e)
        })
    }
  })
}

app.listen(port, () => {
  console.log(`Started on :${port}`)
  console.log(routes(db))
})
