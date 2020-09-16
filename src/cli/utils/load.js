const fs = require('fs')
const path = require('path')
const request = require('request')
const low = require('lowdb')
const FileAsync = require('lowdb/adapters/FileAsync')
const Memory = require('lowdb/adapters/Memory')
const is = require('./is')
const chalk = require('chalk')

const example = {
  posts: [{ id: 1, title: 'json-server', author: 'typicode' }],
  comments: [{ id: 1, body: 'some comment', postId: 1 }],
  profile: { name: 'typicode' }
}

module.exports = function(source, generateFileIfMissing) {
  return new Promise((resolve, reject) => {
    if (is.FILE(source)) {
      if (!fs.existsSync(source)) {
        const err = `  Oops, ${source} doesn't seem to exist`
        if (generateFileIfMissing) {
          console.log(chalk.yellow(err))
          console.log(
            chalk.yellow(`  Creating ${source} with some default data`)
          )
          console.log()
          fs.writeFileSync(source, JSON.stringify(example, null, 2))
        } else {
          return reject(chalk.red(err))
        }
      }

      resolve(low(new FileAsync(source)))
    } else if (is.URL(source)) {
      // Load remote data
      const opts = {
        url: source,
        json: true
      }

      request(opts, (err, response) => {
        if (err) return reject(err)
        resolve(low(new Memory()).setState(response.body))
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
