if (!(global.document && global.jQuery && Consoloid && Consoloid.Base && Consoloid.Base.Object)) {
  var jsdom = require("jsdom").jsdom;
  global.document = jsdom("<html><head></head><body></body></html>");
  global.window = document.createWindow();
  global.jQuery = global.$ = require('jquery');

  require('consoloid-framework/Consoloid/Base/jquery/jquery.inherit.min.js');
  require('consoloid-framework/Consoloid/Base/Object');
  require('consoloid-framework/Consoloid/Service/ServiceContainer');

  global.jQuery.ready();
}

require('consoloid-framework/Consoloid/Base/DeepAssoc');
require('./Resource/BaseFinder');
require('./Resource/FileFinder');
require('./Resource/BaseLoader');
require('./Resource/WebserverLoader');
require('./Config/YamlParser');
require('./SessionStore');
require('consoloid-framework/Consoloid/Service/ChainedContainer');
require('./ServerSideContainer');
defineClass('Consoloid.Server.Webserver', 'Consoloid.Base.Object',
  {
    __constructor: function(options)
    {
      Error.stackTraceLimit = 1000;

      $.extend(this, {
        env: 'dev'
      }, options);

      this.statics = {};
      this.fs = require('fs');
      this.projectRoot = __dirname + '/../../../..';

      this.__createContainerAndMinimalServices();
      this.__createConfig();
      this.__createSessionStore();

      this.http = require('http');
      this.https = require('https');
      this.express = require('express');
      this.application = this.express();
      this.socketIO = undefined;
    },

    __createContainerAndMinimalServices: function()
    {
      this.container = this.create('Consoloid.Service.ServiceContainer', {});
      this.container.addSharedObject('webserver', this);

      this.container.addSharedObject('logger', {
        buffer: [],
        log: function(){
          this.buffer.push(arguments)
        }
      });

      var initialFileFinder = this.create('Consoloid.Server.Resource.FileFinder', {
        container: this.container,
        resourceDirectories: [ 'config', 'src/*', 'node_modules/*' ],
        projectRoot: this.projectRoot + '/',
      });

      this.container.addSharedObject('config_parser',
        this.create('Consoloid.Server.Config.YamlParser', {
          container: this.container,
          env: this.env,
          finder: initialFileFinder
        })
      );
    },

    __createConfig: function()
    {
      this.config = this.container.get('config_parser').parseTopicParameters('server');
      this.__resolveDefaultViewsPath();
    },

    __resolveDefaultViewsPath: function()
    {
      if (this.config.views.path === null) {
        // Defaults to views directory in project root if exists.
        // Otherwise its the consoloid-server's module views directory.
        this.config.views.path = 'node_modules/consoloid-server/views';
        try {
          var stat = this.fs.statSync(this.projectRoot + '/views');
          if (stat.isDirectory()) {
            this.config.views.path = 'views';
          }
        } catch (err) {
          // The directory does not exists.
        }
      }

      this.config.views.path = this.projectRoot + '/' + this.config.views.path;
    },

    __createSessionStore: function()
    {
      this.config.server.session.expressOptions.store =
        this.create(this.config.server.session.store.cls, $.extend(
          {
            container: this.container
          },
          this.config.server.session.store.options)
        );

      this.container.addSharedObject("session_store", this.config.server.session.expressOptions.store);
    },

    run: function()
    {
      this.__configureExpress();
      this.__setupConsoloidEnvironment();
      this.__createHttpServer();
      this.__createRpcServer();

      var config = this.config.server;
      this.httpServer.listen(config.port, config.host, function(){
        this.get('logger').log("info",
          "Consoloid server started",
          {
            address:
              (this.isSsl() ? 'https' : 'http') + "://" +
              (config.host || 'localhost') + ":" + config.port + "/"
          }
        );
      }.bind(this));
    },

    __configureExpress: function()
    {
      this.application.configure(function() {
        this.application.set('port', this.config.server.port);
        this.application.set('views', this.config.views.path);
        this.application.set('view engine', this.config.views.engine);
        if (this.config.server.logFormat) {
          this.application.use(this.express.logger(this.config.server.logFormat));
        }
        this.application.use(this.express.bodyParser());
        this.application.use(this.express.methodOverride());
        this.application.use(this.express.cookieParser());
        this.application.use(this.express.session(this.config.server.session.expressOptions));
        this.application.use(this.application.router);

        if (this.config.server.trustProxy) {
          this.application.enable('trust proxy');
        }
      }.bind(this));

      this.application.configure('development', function(){
        this.application.use(this.express.errorHandler());
      }.bind(this));
    },

    __setupConsoloidEnvironment: function()
    {
      this.__createResourceLoader();
      this.__flushBootLogs();
      this.__createRouter();
    },

    __createResourceLoader: function()
    {
      this.container.addDefinition('resource_loader', {
        shared: true,
        cls: 'Consoloid.Server.Resource.WebserverLoader',
        options: $.extend(true, {}, this.config.resourceLoader, {
          projectRoot: this.projectRoot + '/'
        }),
        remoting: {
          defaults: { access: true, async: false }
        }
      });

      this.get('resource_loader');
    },

    __flushBootLogs: function()
    {
      var logBuffer = this.container.get('logger').buffer;
      delete this.container.services['logger'];

      var
        logger = this.container.get('logger');
      for (var i = 0, len = logBuffer.length; i < len; i++) {
        logger.log.apply(logger, logBuffer[i]);
      }
    },

    __createRouter: function()
    {
      var routerClass = getClass(this.config.router.cls);
      new routerClass(this.config.router)
        .setContainer(this.container)
        .configure();
    },

    __createHttpServer: function()
    {
      this.httpServer = this.isSsl() ?
          this.https.createServer(this.__buildSslOptions(), this.application) :
          this.http.createServer(this.application);
    },

    isSsl: function()
    {
      return this.config.server.ssl ? true : false;
    },

    __buildSslOptions: function()
    {
      var currentDirectory = process.cwd();
      process.chdir(this.projectRoot);

      var result = {
        key: this.fs.readFileSync(this.config.server.ssl.privateKey).toString(),
        cert: this.fs.readFileSync(this.config.server.ssl.certificate).toString()
      };

      process.chdir(currentDirectory);
      return result;
    },

    __createRpcServer: function()
    {
      this.socketIO = require('socket.io').listen(this.httpServer, {
        log: this.config.server.logFormat ? true : false
      });
      this.get('async_rpc_connection_pool');
    },

    getApplication: function()
    {
      return this.application;
    },

    setAsStaticDirectory: function(directory, path)
    {
      if (!(directory in this.statics)) {
        this.statics[directory] = true;
        if (path === undefined) {
          this.application.use(this.express.static(directory));
        } else {
          this.application.use(path, this.express.static(directory));
        }

        this.get('logger').log("info", "Exported directory as static content", {
          directory: directory,
          path: path
        });
      }
    },

    getSocketIO: function()
    {
      return this.socketIO;
    },

    getProjectRoot: function()
    {
      return this.projectRoot;
    },

    getConfig: function()
    {
      return this.config;
    },

    getEnv: function()
    {
      return this.env;
    }
  }
);
