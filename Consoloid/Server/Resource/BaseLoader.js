/**
 * This is the base class for resource loaders.
 *
 * It holds protected methods that are useful in most loaders. It is capable of
 * loading service definitions with parameters compiled.
 */
defineClass('Consoloid.Server.Resource.BaseLoader', 'Consoloid.Base.Object',
  {
    __constructor: function(options)
    {
      this.__base($.extend({
        resourceDirectories: [ 'config', 'src/*', 'node_modules/*' ],
        projectRoot: __dirname + '/../../../../../',
        finder: null,
        configParser: null,
        yamlParser: require('js-yaml')
      }, options));

      if (this.finder === null) {
        this._createDefaultFinder();
      }

      if (this.configParser === null) {
        this.configParser = this.get('config_parser');
      }

      this.parameters = this.create('Consoloid.Base.DeepAssoc', {delimiter: '.'});
    },

    getParameter: function(path, defaultValue)
    {
      return this.parameters.get(path, defaultValue);
    },

    _createDefaultFinder: function()
    {
      this.finder = this.create('Consoloid.Server.Resource.FileFinder', {
        container: this.container,
        resourceDirectories: this.resourceDirectories,
        projectRoot: this.projectRoot
      });

      // Note: finder updated its own resourceDirectories to absolute path. Use that instead relative.
      this.resourceDirectories = this.finder.getResourceDirectories();
    },

    _getServiceDefinitionsMatchingPattern: function(pattern)
    {
      var result = {};
      this._readAllResourcesMatchingPatterns([ pattern, '*.' + pattern ])
        .reverse()
        .forEach(function(resource) {
          this._addDefinitionsFromYamlResourceToResult(resource, result);
        }, this);

      return result;
    },

    _addDefinitionsFromYamlResourceToResult: function(resource, result)
    {
      var config = this.yamlParser.load(resource, {strict: true});
      if (config && 'definitions' in config) {
        this._replaceDefinitionParametersWithValues(config.definitions);
        $.extend(result, config.definitions);
      }
    },

    _readAllResourcesMatchingPatterns: function(patterns)
    {
      var result = [];

      patterns.forEach(function(pattern) {
        result = result.concat(this._readAllResourcesMatchingPattern(pattern));
      }, this);

      return result;
    },

    /**
     *
     * @param pattern String Glob pattern to match.
     * @returns {Array} Containing content of matching resources.
     */
    _readAllResourcesMatchingPattern: function(pattern)
    {
      var result = [];
      this.finder.globSync(pattern).forEach(function(resourceName) {
        result.push(this.finder.readSync(resourceName));
      }, this);

      return result;
    },

    _replaceDefinitionParametersWithValues: function(object)
    {
      for (var name in object) {
        if (typeof object[name] == 'string') {
          var match = object[name].match(/^%(.+)%$/);
          if (match !== null) {
            object[name] = this.parameters.get(match[1], object[name]);
          }
        } else if (typeof object[name] == 'object'){
          this._replaceDefinitionParametersWithValues(object[name]);
        }
      }
    },

    _loadParameters: function(topic)
    {
      var parameters = this.configParser.parseTopicParameters(topic);
      this.parameters.merge(parameters);
    },

    _loadServerDefinitions: function(topic)
    {
      var
        serverDefinitions = this._getServiceDefinitionsMatchingPattern(topic + '.remoteservices');

      this.container.addDefinitions(serverDefinitions, 'topic.' + topic);
      this.container.getAllTagged(['topic.' + topic, 'create-on-topic-load']);
    },

    getFinder: function()
    {
      return this.finder;
    },

    loadParametersAndServerDefinitions: function(topic)
    {
      this._loadParameters(topic);
      this._loadServerDefinitions(topic);
    }
  }
);
