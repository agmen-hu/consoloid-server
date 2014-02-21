defineClass('Consoloid.Server.Resource.WebserverLoader', 'Consoloid.Server.Resource.BaseLoader',
  {
    __constructor: function(options)
    {
      this.__base($.extend({
        staticDirectories: [ 'public' ]
      }, options));

      this.__exportStaticDirectories();
      this.bind('Consoloid.Base.Object.loadClass', this.__loadClass.bind(this));

      this.loadParametersAndServerDefinitions('server');
    },

    __exportStaticDirectories: function()
    {
      var
        webserver = this.get('webserver');

      for (var i = 0, len = this.staticDirectories.length; i < len; i++) {
        var path = this.projectRoot + this.staticDirectories[i] + '/';
        webserver.setAsStaticDirectory(path, '/' + this.staticDirectories[i]);
        this.get('logger').log('info', 'Exported directory as static content', { path: path });
      }
    },

    __loadClass: function(event, className)
    {
      var file = this.finder.locateResource(className.replace(/\./gi,'/') + '.js');
      require(file);
    }
  }
);