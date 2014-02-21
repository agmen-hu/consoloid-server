defineClass('Consoloid.Server.Resource.SessionLoader', 'Consoloid.Server.Resource.BaseLoader',
  {
    __constructor: function(options)
    {
      this.__base($.extend({
        externalBootJs: [],
        storedDefinitions: {}
      }, options));

      var $this = this;
      this.bind('Consoloid.Server.Cache.Boot.started', function(event) {
        $this.__addToBootCache = $this.__addToBootCacheImpl;
      });
      this.bind('Consoloid.Server.Cache.Boot.finished', function(event) {
        $this.__addToBootCache = function(){};
      });
    },

    __addToBootCache: function(type, content, name)
    {
      // Note: This method is intended to be empty. Will be overridden during the boot period.
    },

    __addToBootCacheImpl: function(type, content, name)
    {
      switch(type)
      {
        case 'template':
          this.get('boot_cache_builder').addTemplate(content);
          break;
        case 'class':
          this.get('boot_cache_builder').addClass(content);
          break;
        case 'boot':
          this.get('boot_cache_builder').addBootJS(content);
          break;
        case 'javascript':
          this.get('boot_cache_builder').addJS(content);
          break;
        case 'topic':
          this.get('boot_cache_builder')
            .addJS("global.Consoloid.Resource.TopicLoader.CACHED_DEFINITIONS['"+name+"'] = "+JSON.stringify(content))
            .addServerTopic(name);
          break;
      }
    },

    getJsToBoot: function() {
      var sources = [];
      sources = sources.concat(this._readAllResourcesMatchingPattern('Consoloid/Base/jquery/*.js'));
      sources = sources.concat([
        this.finder.readSync('Consoloid/Ui/semantic/javascript/semantic.min.js'),
        this.finder.readSync('node_modules/socket.io-client/dist/socket.io.min.js') + ';',
        this.finder.readSync('Consoloid/Base/Object.js'),
        this.finder.readSync('Consoloid/Service/ServiceContainer.js'),
        this.finder.readSync('Consoloid/Service/BaseRemoteService.js'),
        this.finder.readSync('Consoloid/Service/RemoteSharedService.js'),
        this.finder.readSync('Consoloid/Service/ClientSideContainer.js'),
      ]);

      sources = sources.concat(this._readAllResourcesMatchingPattern('Consoloid/Resource/*.js'));
      sources = sources.concat(this._readAllResourcesMatchingPattern('Consoloid/Widget/*.js'));
      sources = sources.concat(this._readAllResourcesMatchingPattern('Consoloid/Application/*.js'));
      sources = sources.concat(this._readAllResourcesMatchingPattern('Consoloid/Error/*.js'));

      for( var i = 0, len = this.externalBootJs.length; i < len; i++) {
        sources = sources.concat(this.finder.readSync(this.externalBootJs[i]+'.js'));
      }

      var result = "window.global = window;\r\n";
      result = result.concat(sources.join("\r\n\r\n"));

      this.__addToBootCache('boot', result);

      return result;
    },

    getDefinitions: function(topic)
    {
      this.loadParametersAndServerDefinitions(topic);
      this.__exportModuleDirectories(topic);

      var result = this._getServiceDefinitionsMatchingPattern(topic + '.services');

      if (this.__isEmptyObject(result)) {
        throw new Error('There isn\'t any service in topic ' + topic);
      }

      this.__addToBootCache('topic', result, topic);
      this.__storeTopicDefinitions(topic, result);

      return result;
    },

    __exportModuleDirectories: function(topic)
    {
      var serviceDefinitionResources =
        this.finder.globSync(topic + '.services').concat(this.finder.globSync('*.' + topic + '.services'));

      serviceDefinitionResources.forEach(function(resource) {
        this.get('webserver').setAsStaticDirectory(require('path').dirname(resource));
      }, this);
    },

    __isEmptyObject: function(obj)
    {
      var count = 0;
      for (var i in obj) {
        count++;
      }

      return count == 0;
    },

    __storeTopicDefinitions: function(topic, definitions)
    {
      if ($.inArray(topic, ['framework', 'console']) != -1) {
        return;
      }

      if (this.get("boot_cache_builder").getState() === Consoloid.Server.Cache.NoBootCacheBuilder.BOOTED) {
        this.storedDefinitions[topic] = definitions;
      }
    },

    getJs: function(resourceName)
    {
      var result = this.finder.readSync(resourceName + '.js');
      this.__addToBootCache('class', result);
      return result;
    },

    getTemplate: function(name)
    {
      var lastIndex = name.lastIndexOf('-');
      if (lastIndex !== -1) {
        name = name.substr(0, lastIndex);
      }

      var result = this._readAllResourcesMatchingPattern(name.replace(/-/g, '/') + '/*.jqote');
      if (result.length == 0) {
        throw new Error('Template not found; name=' + name);
      }

      result = result.join("\r\n\r\n").toString();

      this.__addToBootCache('template', result);

      return result;
    },

    getTopics: function()
    {
      var jsyaml = require('js-yaml');
      var files = this._readAllResourcesMatchingPattern('*.topic');
      return $.map(files, function(file) {
        return jsyaml.load(file, {strict: true});
      });
    },

    getTopic: function(name)
    {
      return require('js-yaml').load(this.finder.readSync(name + '.topic'), {strict: true});
    },

    getStoredDefinitions: function()
    {
      return this.storedDefinitions;
    }
  }
);
