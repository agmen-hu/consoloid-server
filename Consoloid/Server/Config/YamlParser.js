defineClass('Consoloid.Server.Config.YamlParser', 'Consoloid.Base.Object',
  {
    __constructor: function(options)
    {
      this.__base(options);

      this.requireProperty('env');
      this.requireProperty('finder');
    },

    parseTopicParameters: function(topic)
    {
      this.lastParsedTopic = topic;
      this.selectedResource = null;

      this.finder.globSync(topic + '*.parameters')
        .forEach(this.__checkMatchingResource, this);

      return this.selectedResource ? this.__parseResource(this.selectedResource, []) : {};
    },

    __checkMatchingResource: function(resourceName)
    {
      if(this.__resourceNotYetSelectedAndCurrentResourceIsSuitable(resourceName) ||
         this.__resourceSelectedButCurrentOneIsPreferred(resourceName)
      ) {
        this.selectedResource = resourceName;
      }
    },

    __resourceNotYetSelectedAndCurrentResourceIsSuitable: function(resourceName)
    {
      var
        resourceBasename = require('path').basename(resourceName);

      return (
        !this.selectedResource &&
        (
          (resourceBasename == this.lastParsedTopic + '.parameters') ||
          (resourceBasename == this.lastParsedTopic + '_' + this.env + '.parameters')
        )
      );
    },

    __resourceSelectedButCurrentOneIsPreferred: function(resourceName)
    {
      var path = require('path');

      return (
        this.selectedResource &&
        path.dirname(resourceName) == path.dirname(this.selectedResource) &&
        path.basename(resourceName) == this.lastParsedTopic + '_' + this.env + '.parameters'
      );
    },

    __parseResource: function(resourceName, included)
    {
      if (this.__isRecursiveInclude(resourceName, included)) {
        return {};
      }

      var result = this.__processIncludeDirective(resourceName, this.__loadYamlFile(resourceName), included);
      this.container.get('logger').log('info', 'Config resource parsed: ', {resourceName: resourceName});
      return result;
    },

    __isRecursiveInclude: function(resourceName, included)
    {
      if (included.indexOf(resourceName) != -1 ) {
        return true;
      }

      included.push(resourceName);
      return false;
    },

    __loadYamlFile: function(resourceName)
    {
      var result = require('js-yaml').load(this.finder.readSync(resourceName), {strict: true});
      if (result === null) {
        throw new Error('Unable to parse parameters resource ' + resourceName);
      }

      return result;
    },

    __processIncludeDirective: function(resourceName, parameters, included)
    {
      if (parameters.include) {
        if (!Array.isArray(parameters.include)) {
          parameters.include = [ parameters.include ];
        }

        for (var i = 0, len = parameters.include.length; i < len; i++) {
          parameters = $.extend(
            true,
            {},
            this.__parseResource(this.__buildResourceNameToInclude(resourceName, parameters.include[i]), included),
            parameters
          );
        }

        delete parameters.include;
      }

      return parameters;
    },

    __buildResourceNameToInclude: function(fromResource, resourceToInclude)
    {
      var path = require('path');
      return path.dirname(fromResource) + '/' + resourceToInclude;
    }
  }
);