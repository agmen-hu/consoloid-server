defineClass('Consoloid.Server.Router', 'Consoloid.Server.Service',
  {
    __constructor: function(options)
    {
      this.__base($.extend({
        defaultTopics: [],
      }, options));

      this.bind('Consoloid.Server.Cache.Boot.started', function(){
        this.__originalSendServiceDefinition = this.__sendServiceDefinition;
        this.__sendServiceDefinition = this.__sendServiceDefinitionAndStoreToBoot;
      }.bind(this));
    },

    setContainer: function(container)
    {
      this.container = container;
      this.container.addSharedObject('router', this);

      return this;
    },

    configure: function()
    {
      this.create('Consoloid.Server.Cache.CacheFactory', $.extend({container: this.container}, this.cache));

      var application = this.get('webserver').getApplication();
      application.use(this.decideRequestIsBootable.bind(this));
      application.get('/', this.index.bind(this));
      application.get('/b', this.boot.bind(this));
      application.post('/f', this.finishBoot.bind(this));
      application.post('/c', this.callSharedServiceFromAjax.bind(this));
      application.post('/d', this.sendServiceDefinition.bind(this));
      application.post('/i', this.createAndReturnInstanceId.bind(this));
      application.post('/m', this.callServiceInstanceFromAjax.bind(this));
      application.post('/x', this.resetSession.bind(this));
      return this;
    },

    decideRequestIsBootable: function(req, res, next)
    {
      this.__decideRequestIsBootable(req);
      next();
    },

    __decideRequestIsBootable: function(req)
    {
      this.get('boot_cache_builder').decideRequestIsBootable(req);
    },

    index: function(req, res)
    {
      this.__index(req, res);
    },

    __index: function(req, res) {
      this.get('boot_cache_builder').start(req);

      this.__index = function(req, res)
      {
        res.render('index', this.__getTemplateParameters(req));
      }
      this.index(req, res);
    },

    __getTemplateParameters: function(req)
    {
      return {
        baseUrl: req.protocol + '://' + req.header('host') + req.path.replace(/\/+$/, ''),
        sessionCookie: this.get('webserver').getConfig().server.session.expressOptions.key,
        environment: this.get('webserver').getEnv(),
        defaultTopics: this.__getDefaultTopics(req),
        defaultTemplates: this.get('cache').get('boot/templates')
      };
    },

    __getDefaultTopics: function(req)
    {
      var result = this.defaultTopics.slice();

      if (this.get("session_store").hasContainer(req.sessionID)) {
        var resourceLoader = this.get("session_store").getContainer(req).get("resource_loader");
        $.each(resourceLoader.getStoredDefinitions(), function(topicname, definition) {
          if ($.inArray(topicname, result) == -1) {
            result.push(topicname);
          }
        });
      }
      return result;
    },

    boot: function(req, res)
    {
      if (!this.__isSessionStarted(req)) {
        this.__startSession(req, res);
      }

      var result = this.__boot(req);

      result += this.__getPreviouslyLoadedTopicDefinitions(req);

      res.set('Content-Type', 'application/javascript');
      res.send(result);
    },

    __isSessionStarted: function(req)
    {
      return this.get("session_store").hasContainer(req.sessionID);
    },

    __startSession: function(req, res)
    {
      var container = this.create('Consoloid.Server.ServerSideContainer', {
        fallback: this.container,
        sessionId: req.sessionID
      });

      container.addSharedObject("instance_pool", this.create('Consoloid.Service.InstancePool', {
        container: container
      }));
      this.__createSessionLogger(container);
      this._createSessionResourceLoader(req, res, container);
      this._loadCachedServerTopics(container);

      this.get("session_store").addContainer(req.sessionID, container);

      this.get('logger').log('info', 'Started new session', { sessionId: req.sessionID, ip: req.ip });
      return container;
    },

    _createSessionResourceLoader: function(req, res, container)
    {
      var config = this.get('webserver').getConfig().resourceLoader;
      var resourceLoaderClass = getClass(config.cls);

      var loader = this.create(resourceLoaderClass, $.extend(
        true,
        {},
        config,
        {
          container: container
        }
      ));

      container.addSharedObject(
        'resource_loader',
        loader,
        {
          defaults: {
            access: true,
            async: false
          }
        },
        config.cls
      );
    },

    __createSessionLogger: function(container)
    {
      container.addDefinition('logger', this.container.getDefinition('logger'));
      var buffer = this.create('Consoloid.Log.SessionBuffer', {
        nextStream: this.container.get('server_log_buffer')
      })
      container.addSharedObject('server_log_buffer', buffer, { defaults: { access: true } }, 'Consoloid.Log.SessionBuffer');
    },

    _loadCachedServerTopics: function(container)
    {
      var topics = this.container.get('cache').get('boot/serverTopics', []);

      if (!topics.length) {
        return;
      }

      this.get('logger').log('debug', 'Loading cached server topics', { topics: topics });

      topics.forEach(function(topic) {
        container.get('resource_loader').loadParametersAndServerDefinitions(topic);
      });
    },

    __boot: function(req)
    {
      return this.get("session_store").getContainer(req).get('resource_loader').getJsToBoot();
    },

    __cachedBoot: function()
    {
      return this.get('cache').get('boot/javascript');
    },

    __getPreviouslyLoadedTopicDefinitions: function(req)
    {
      var definitions = this.get("session_store").getContainer(req).get('resource_loader').getStoredDefinitions();
      var response = "";
      var $this = this;

      $.each(definitions, function(topicName, definition) {
        if ($.inArray(topicName, $this.defaultTopics) == -1) {
          var js = "global.Consoloid.Resource.TopicLoader.CACHED_DEFINITIONS['"+topicName+"'] = " + JSON.stringify(definition);
          response += "\r\n" + js + ";";
        }
      });

      return response
    },

    finishBoot: function(req, res)
    {
      this.__finishBoot(req, res);
      res.send({});
    },

    __finishBoot: function(req, res)
    {
      var bootCacheBuilder = this.get('boot_cache_builder');
      if (!bootCacheBuilder.lastRequestIsBootable()) {
        return;
      }

      bootCacheBuilder.finish();
      this.__boot = this.__cachedBoot;
      this.__decideRequestIsBootable = function(){};
      if ('__originalSendServiceDefinition' in this) {
        this.__sendServiceDefinition = this.__originalSendServiceDefinition;
        delete this.__originalSendServiceDefinition;
      }

      this.__finishBoot = function(){};
    },

    callSharedServiceFromAjax: function(req, res)
    {
      try {
        var serviceInstance = this.get("session_store").getContainer(req).get(req.param('id'));
        this.callMethodOnService(req.param('id'), req, serviceInstance, res);
      } catch (err) {
        this.sendError(res, err);
      }
    },

    callMethodOnService: function (id, req, serviceInstance, res, logParameters)
    {
      var args = req.param('arguments');
      var responseMode = this.getResponseModeOfMethod(id, req.param('method'), req);

      if (!(req.param('method') in serviceInstance)) {
        this.get('logger').log('error', 'Called unexistent service method', { service: id, method: req.param('method') });
        this.sendError(res, 'Called unexistent service method on service ' + id + ', method ' + req.param('method'));
        return;
      }

      this.get('logger').log('debug', 'Calling service', $.extend(logParameters, { id: id, method:  req.param('method'), responseMode: responseMode, arguments: args}));

      switch (responseMode) {
        case "syncCall":
          this.sendResult(res, serviceInstance[req.param('method')].apply(serviceInstance, args));
          break;
        case "responsePassing":
          args = args.slice();
          args.unshift(res);
          serviceInstance[req.param('method')].apply(serviceInstance, args);
          break;
        case "callbackWrapping":
          args.unshift((function(err, result) {
            if (err == undefined) {
              this.sendResult(res, result);
            } else {
              this.sendError(res, err);
            }
          }).bind(this));
          serviceInstance[req.param('method')].apply(serviceInstance, args);
          break;
      }
    },

    getResponseModeOfMethod: function(id, method, req)
    {
      var definition = this.get("session_store").getContainer(req).getDefinition(id);
      if (!('remoting' in definition) ||
          ('mode' in definition.remoting && definition.remoting.mode == 'disabled')
      ) {
        throw new Error('Access to this service is prohibited');
      };

      var serviceDefault = (definition.remoting.defaults || {}).responseMode || "syncCall";
      return (((definition.remoting.methods || {})[method] || {}).responseMode) || serviceDefault;
    },

    callServiceInstanceFromAjax: function(req, res)
    {
      this.callServiceInstance(req, res);
    },

    callServiceInstance: function(req, res)
    {
      try {
        var instancePool = this.get("session_store").getContainer(req).get("instance_pool");

        if (req.param('method') === "destroyService") {
          instancePool.remove(req.param('instanceId'));
          this.sendResult(res, true);
          return;
        }

        var id = instancePool.getServiceIdForInstance(req.param('instanceId'));
        var serviceInstance = instancePool.get(req.param('instanceId'));

        this.callMethodOnService(id, req, serviceInstance, res, { instanceId: req.param('instanceId') });
      } catch (err) {
        this.sendError(res, err);
      }
    },

    sendServiceDefinition: function(req, res)
    {
      this.__sendServiceDefinition(req, res);
    },

    __sendServiceDefinition: function(req, res)
    {
      res.send(JSON.stringify(this.__getServiceDefinition(req)));
    },

    __getServiceDefinition: function(req)
    {
      var
        service = req.param('service');
      return {
        service: service,
        definition: this.get("session_store").getContainer(req).getRemoteDefinition(service)
      };
    },

    __sendServiceDefinitionAndStoreToBoot: function(req, res)
    {
      var
        result = this.__getServiceDefinition(req),
        service = result.service,
        definition = JSON.stringify(result);

      this.get('boot_cache_builder').addJS("global.Consoloid.Service.ClientSideContainer.CACHED_DEFINITIONS['"+service+"'] = "+definition);
      res.send(definition);
    },

    createAndReturnInstanceId: function(req, res)
    {
      try {
        var pool = this.get("session_store").getContainer(req).get("instance_pool");
        this.sendResult(res, pool.createAndReturnId(req.param('id')));
      } catch (err) {
        this.sendError(res, err);
      }
    },

    resetSession: function(req, res)
    {
      try {
        req.session.destroy();
        this.sendResult(res, true);
      } catch (err) {
        this.sendError(res, err);
      }
    }
  }
);
