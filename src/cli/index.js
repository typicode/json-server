const updateNotifier = require('update-notifier')
const yargs = require('yargs')
const run = require('./run')
const pkg = require('../../package.json')

module.exports = function() {
  updateNotifier({ pkg }).notify()

  const argv = yargs
    .config('config')
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
        description: 'Path to routes file'
      },
      middlewares: {
        alias: 'm',
        array: true,
        description: 'Paths to middleware files'
      },
      static: {
        alias: 's',
        description: 'Set static files directory'
      },
      'read-only': {
        alias: 'ro',
        description: 'Allow only GET requests'
      },
      'no-cors': {
        alias: 'nc',
        description: 'Disable Cross-Origin Resource Sharing'
      },
      'no-gzip': {
        alias: 'ng',
        description: 'Disable GZIP Content-Encoding'
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
      },
      foreignKeySuffix: {
        alias: 'fks',
        description: 'Set foreign key suffix (e.g. _id as in post_id)',
        default: 'Id'
      },
      quiet: {
        alias: 'q',
        description: 'Suppress log messages from output'
      },
      config: {
        alias: 'c',
        description: 'Path to config file',
        default: 'json-server.json'
      }
    })
    .boolean('watch')
    .boolean('read-only')
    .boolean('quiet')
    .boolean('no-cors')
    .boolean('no-gzip')
    .help('help')
    .alias('help', 'h')
    .version(pkg.version)
    .alias('version', 'v')
    .example('$0 db.json', '')
    .example('$0 file.js', '')
    .example('$0 http://example.com/db.json', '')
    .epilog('https://github.com/typicode/json-server')
    .require(1, 'Missing <source> argument').argv

  run(argv)
}
