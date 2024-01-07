#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { parseArgs } from 'node:util'

import chalk from 'chalk'
import { watch } from 'chokidar'
import JSON5 from 'json5'
import { Adapter, Low } from 'lowdb'
import { DataFile, JSONFile } from 'lowdb/node'
import { PackageJson } from 'type-fest'

import { createApp } from './app.js'
import { Observer } from './observer.js'
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
  console.log(`Usage: json-server [options] <file>
Options:
  -p, --port <port>  Port (default: 3000)
  -h, --host <host>  Host (default: localhost)
  -s, --static <dir> Static files directory (multiple allowed)
  --help  Show this message
`)
  process.exit()
}

if (values.version) {
  const pkg = JSON.parse(
    readFileSync(join(__dirname, '../package.json'), 'utf8'),
  ) as PackageJson
  console.log(pkg.version)
  process.exit()
}

// App args and options
const file = positionals[0] ?? ''
const port = parseInt(values.port ?? process.env['PORT'] ?? '3000')
const host = values.host ?? process.env['HOST'] ?? 'localhost'

if (!existsSync(file)) {
  console.log(chalk.red(`File ${file} not found`))
  process.exit(1)
}

// Set up database
let adapter: Adapter<Data>
if (extname(file) === '.json5') {
  adapter = new DataFile<Data>(file, {
    parse: JSON5.parse,
    stringify: JSON5.stringify,
  })
} else {
  adapter = new JSONFile<Data>(file)
}
const observer = new Observer(adapter)

const db = new Low<Data>(observer, {})
await db.read()

// Create app
const app = createApp(db, { logger: false, static: values.static })

function logRoutes(data: Data) {
  console.log(
    [
      chalk.bold('Endpoints:'),
      ...Object.keys(data).map(
        (key) => `${chalk.gray(`http://${host}:${port}/`)}${chalk.blue(key)}`,
      ),
    ].join('\n'),
  )
}

const kaomojis = ['♡⸜(˶˃ ᵕ ˂˶)⸝♡', '♡( ◡‿◡ )', '( ˶ˆ ᗜ ˆ˵ )', '(˶ᵔ ᵕ ᵔ˶)']

// Get system current language

app.listen(port, () => {
  console.log(
    [
      chalk.bold(`JSON Server started on PORT :${port}`),
      chalk.gray('Press CTRL-C to stop'),
      chalk.gray(`Watching ${file}...`),
      '',
      chalk.magenta(kaomojis[Math.floor(Math.random() * kaomojis.length)]),
      '',
      chalk.bold('Index:'),
      chalk.gray(`http://localhost:${port}/`),
      '',
      chalk.bold('Static files:'),
      chalk.gray('Serving ./public directory if it exists'),
      '',
    ].join('\n'),
  )
  logRoutes(db.data)
})

// Watch file for changes
if (process.env['NODE_ENV'] !== 'production') {
  let writing = false // true if the file is being written to by the app
  let prevEndpoints = ''

  observer.onWriteStart = () => {
    writing = true
  }
  observer.onWriteEnd = () => {
    writing = false
  }
  observer.onReadStart = () => {
    prevEndpoints = JSON.stringify(Object.keys(db.data).sort())
  }

  observer.onReadEnd = (data) => {
    if (data === null) {
      return
    }

    const nextEndpoints = JSON.stringify(Object.keys(data).sort())
    if (prevEndpoints !== nextEndpoints) {
      console.log()
      logRoutes(data)
    }
  }
  watch(file).on('change', () => {
    // Do no reload if the file is being written to by the app
    if (!writing) {
      db.read().catch((e) => {
        if (e instanceof SyntaxError) {
          return console.log(
            chalk.red(['', `Error parsing ${file}`, e.message].join('\n')),
          )
        }
        console.log(e)
      })
    }
  })
}
