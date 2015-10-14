var updateNotifier = require('update-notifier')
var yargs = require('yargs')
var run = require('./run')
var pkg = require('../../package.json')

module.exports = function () {

  updateNotifier({ pkg: pkg }).notify()

  var argv = yargs
    .usage('$0 [options] <source>')
    .options({
      port: {
        alias: 'p',
        description: 'Set port',
        default: 3000
      },
      host: {
        alias: 'H',
        description: 'Set host',
        default: '0.0.0.0'
      },
      watch: {
        alias: 'w',
        description: 'Watch file(s)'
      },
      routes: {
        alias: 'r',
        description: 'Load routes file'
      },
      static: {
        alias: 's',
        description: 'Set static files directory'
      },
      snapshots: {
        alias: 'S',
        description: 'Set snapshots directory',
        default: '.'
      },
      delay: {
        alias: 'd',
        description: 'Add delay to responses (ms)'
      },
      id: {
        alias: 'i',
        description: 'Set database id property (e.g. _id)',
        default: 'id'
      }
    })
    .boolean('watch')
    .help('help').alias('help', 'h')
    .version(pkg.version).alias('version', 'v')
    .example('$0 db.json', '')
    .example('$0 file.js', '')
    .example('$0 http://example.com/db.json', '')
    .epilog('https://github.com/typicode/json-server')
    .require(1, 'Missing <source> argument')
    .argv

  run(argv)

}
