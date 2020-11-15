const fs = require('fs')
const path = require('path')
const http = require('http')
const https = require('https')
const low = require('lowdb')
const FileAsync = require('lowdb/adapters/FileAsync')
const Memory = require('lowdb/adapters/Memory')
const is = require('./is')
const chalk = require('chalk')

const example = {
  posts: [{ id: 1, title: 'json-server', author: 'typicode' }],
  comments: [{ id: 1, body: 'some comment', postId: 1 }],
  profile: { name: 'typicode' },
}

module.exports = function (source) {
  return new Promise((resolve, reject) => {
    if (is.FILE(source)) {
      if (!fs.existsSync(source)) {
        console.log(chalk.yellow(`  Oops, ${source} doesn't seem to exist`))
        console.log(chalk.yellow(`  Creating ${source} with some default data`))
        console.log()
        fs.writeFileSync(source, JSON.stringify(example, null, 2))
      }

      resolve(low(new FileAsync(source)))
    } else if (is.URL(source)) {
      // Normalize the source into a URL object.
      const sourceUrl = new URL(source)
      // Pick the client based on the protocol scheme
      const client = sourceUrl.protocol === 'https:' ? https : http

      client
        .get(sourceUrl, (res) => {
          let dbData = ''
          res.on('data', (data) => {
            dbData += data
          })

          res.on('end', () => {
            resolve(low(new Memory()).setState(JSON.parse(dbData)))
          })
        })
        .on('error', (error) => {
          return reject(error)
        })
    } else if (is.JS(source)) {
      // Clear cache
      const filename = path.resolve(source)
      delete require.cache[filename]
      const dataFn = require(filename)

      if (typeof dataFn !== 'function') {
        throw new Error(
          'The database is a JavaScript file but the export is not a function.'
        )
      }

      // Run dataFn to generate data
      const data = dataFn()
      resolve(low(new Memory()).setState(data))
    } else {
      throw new Error(`Unsupported source ${source}`)
    }
  })
}
