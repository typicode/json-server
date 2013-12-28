var express = require('express'),
    cors = require('cors'),
    http = require('http'),
    path = require('path'),
    fs = require('fs'),
    _ = require('underscore'),
    logger = require('./utils/logger');


var defaultOptions = {
  port: process.env.PORT || 3000,
  readOnly: false
}

function createApp(db, options) {
  // Create app
  var app = express(),
      options = options || {},
      routes;

  // Configure all environments
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.json());
  app.use(express.urlencoded());
  app.use(express.methodOverride());


  // Configure development
  if ('development' == app.get('env')) {
    app.use(express.errorHandler());
  }

  // Configure using options provided
  app.set('port', options.port);
  routes = options.readOnly ? './routes/read-only' : './routes/read-write';
  routes = require(routes);

  // Use default or user public directory
  // Note: should be done before CORS and app.router setting
  if (fs.existsSync(process.cwd() + '/public')) {
    app.use(express.static(process.cwd() + '/public'));
  } else {
    app.use(express.static(path.join(__dirname, './public')));
  }

  // Enable CORS for everything
  app.use(cors());
  app.options('*', cors());

  // Set app.router
  app.use(app.router);

  // Set API entry points
  app.get('/db', routes.database)
  app.get('/:resource', routes.list);
  app.get('/:parent/:parentId/:resource', routes.nestedList);
  app.get('/:resource/:id', routes.show);
  app.post('/:resource', routes.create);
  app.put('/:resource/:id', routes.update);
  app.patch('/:resource/:id', routes.update);
  app.del('/:resource/:id', routes.destroy);

  // Set database
  routes.setDatabase(db);
  app.db = routes.db;

  // And done! Ready to serve JSON!
  return app;
}

function run(db, options) {
  options = _.defaults(options, defaultOptions);

  var app = createApp(db, options);

  if (_.isEmpty(db)) {
    logger.error('No resources found!');
  } else {
    logger.success('Available resources');
    for (var prop in db) {
      logger.url(options.port, prop);
    }
  }

  http
    .createServer(app)
    .listen((options.port), function(){
      logger.success('Express server listening on port ' + options.port);
      logger.success('Congrats! Open http://localhost:' + options.port);
    });
  return app;
}

exports.createApp = createApp;
exports.run = run;
