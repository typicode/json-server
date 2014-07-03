var fs       = require('fs');
var chalk    = require('chalk');
var minimist = require('minimist');
var request  = require('superagent');
var low      = require('lowdb');
var server   = require('./server');

// Output version
function version() {
  var pkg = require('../package.json');
  console.log(pkg.version);
}

// Output help.txt with some colors
function help() {
  var txt = fs.readFileSync(__dirname + '/help.txt').toString();
  txt = txt.replace(/json-server/g, chalk.green('json-server'));
  console.log(txt);
}

// Start server
function start(port, corsOptions) {
  server.setupMiddleware(corsOptions);
  server.setupRoutes();

  for (var prop in low.db) {
    console.log('http://localhost:' + port + '/' + chalk.green(prop))
  }

  console.log(
    '\nEnter ' + chalk.green('`s`') + ' at any time to create a snapshot of the db\n'
  );
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', function (chunk) {
    if (chunk.trim().toLowerCase() === 's') {
      var file = 'db-' + Date.now() + '.json';
      low.save(file);
      console.log('\nSaved snapshot to ' + chalk.green(file) + '\n');
    }
  });


//  server.use(cors(corsOptions));
  server.listen(port)
}

// Load source
function load(source, port, corsOptions) {
  console.log(chalk.green('\n{^ ^} Heya!\n'));
  console.log('Loading database from ' + source + '\n');

  var path = process.cwd() + '/' + source;
  if (/\.json$/.test(source)) {
    low.path = path;
    low.db   = require(path);
    start(port, corsOptions);
  }

  if (/\.js$/.test(source)) {
    low.db   = require(path).run();
    start(port, corsOptions);
  }

  if (/^http/.test(source)) {
    request
      .get(source)
      .end(function(err, res) {
        if (err) {
          console.error(err)
        } else {
          low.db = JSON.parse(res.text);
          start(port, corsOptions);
        }
      });
  }
}

// Uses minimist parsed argv
function run(argv) {
  var source = argv._[0];
  var port   = argv.port || 3000;
  var corsOptionsArg = argv.corsoptions;
  var corsOptions;
  if (corsOptionsArg) {
    //parse string (should be 'key:value;'
    //ex: 'origin:http:localhost,credentials:true' become:
    //{origin:'http:localhost',credentials:true}
//    corsOptionsArg = "{\"origin\":\"http:localhost\",\"credentials\":true}";

    try {
      corsOptions = JSON.parse(corsOptionsArg);
      console.log(chalk.green('corsOption: ') + JSON.stringify(corsOptions));
    } catch(err) {
      corsOptions = undefined;
      console.log('Error parsing corsOption: ' + chalk.red(corsOptionsArg));
    }



  }

  if (argv.version) {return version();}
  if (source)       {return load(source, port, corsOptions);}

  help();
}

module.exports.run = run
