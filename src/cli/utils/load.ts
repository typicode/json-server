import fs from 'fs'
import path from 'path'
import request from 'request'
import low from 'lowdb'
import FileAsync from 'lowdb/adapters/FileAsync'
import Memory from 'lowdb/adapters/Memory'
import {FILE, JS, URL} from './is'
import chalk from 'chalk'

const example = {
  posts: [{ id: 1, title: 'json-server', author: 'typicode' }],
  comments: [{ id: 1, body: 'some comment', postId: 1 }],
  profile: { name: 'typicode' }
}

export default (source: string): Promise<low.LowdbBase<any>> => {
  return new Promise((resolve, reject) => {
    if (FILE(source)) {
      if (!fs.existsSync(source)) {
        console.log(chalk.yellow(`  Oops, ${source} doesn't seem to exist`))
        console.log(chalk.yellow(`  Creating ${source} with some default data`))
        console.log()
        fs.writeFileSync(source, JSON.stringify(example, null, 2))
      }

      resolve(low(new FileAsync(source)))
    } else if (URL(source)) {
      // Load remote data
      const opts = {
        url: source,
        json: true
      }

      request(opts, (err, response) => {
        if (err) return reject(err)
        resolve(low(new Memory(source)).setState(response.body))
      })
    } else if (JS(source)) {
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
      resolve(low(new Memory(source)).setState(data))
    } else {
      throw new Error(`Unsupported source ${source}`)
    }
  })
}
