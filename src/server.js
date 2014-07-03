var fs      = require('fs');
var express = require('express');
var cors    = require('cors');
var http    = require('http');
var path    = require('path');
var low     = require('lowdb');
var utils   = require('./utils');
var routes  = require('./routes');
var methodOverride = require('method-override');

low._.createId = utils.createId;

//Export server with setup functions that can be called separately.
var expserver = {};

expserver.server = express();
expserver.server.set('port', process.env.PORT || 3000);

expserver.setupMiddleware = function(corsOptions) {
  this.server.use(express.logger('dev'));
  this.server.use(express.json());
  this.server.use(express.urlencoded());
  this.server.use(methodOverride());

  if (fs.existsSync(process.cwd() + '/public')) {
    this.server.use(express.static(process.cwd() + '/public'));
  } else {
    this.server.use(express.static(path.join(__dirname, './public')));
  }
  this.server.use(cors(corsOptions));
  this.server.use(expserver.server.router);

  if ('development' == this.server.get('env')) {
    this.server.use(express.errorHandler());
  }
};

expserver.setupRoutes = function() {
  this.server.get(   '/db'                          , routes.db);
  this.server.get(   '/:resource'                   , routes.list);
  this.server.get(   '/:parent/:parentId/:resource' , routes.list);
  this.server.get(   '/:resource/:id'               , routes.show);
  this.server.post(  '/:resource'                   , routes.create);
  this.server.put(   '/:resource/:id'               , routes.update);
  this.server.patch( '/:resource/:id'               , routes.update);
  this.server.delete('/:resource/:id'               , routes.destroy);
};

expserver.listen = function(port) {
  this.server.listen(port);
};




expserver.server.low = low;

module.exports = expserver;