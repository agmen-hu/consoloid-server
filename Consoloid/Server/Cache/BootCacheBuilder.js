defineClass('Consoloid.Server.Cache.BootCacheBuilder', 'Consoloid.Server.Cache.NoBootCacheBuilder',
  {
    __constructor: function(options)
    {
      this.__base($.extend({
      }, options));

      this.sessionID = false;
      this._lastRequestIsBootable = false;
      this.state = Consoloid.Server.Cache.BootCacheBuilder.NOT_BOOTED;
    },

    decideRequestIsBootable: function(req)
    {
      this._lastRequestIsBootable = this.sessionID === req.sessionID;
    },

    lastRequestIsBootable: function()
    {
      return this._lastRequestIsBootable;
    },

    start: function(req)
    {
      if (this.state == Consoloid.Server.Cache.BootCacheBuilder.NOT_BOOTED) {
        this.sessionID = req.sessionID;
        this._lastRequestIsBootable = true;
        this.classes = [];
        this.classDefinitions = {};
        this.bootJavascript = '';
        this.templates = '';
        this.javascript = '';
        this.serverTopics = [];
        this.state = Consoloid.Server.Cache.BootCacheBuilder.BOOTING;
        this.trigger('Consoloid.Server.Cache.Boot.started');
        this.container.get('logger').log('info', 'Boot cache build is started');
      }
    },

    finish: function()
    {
      if (!this.__isBootable()) {
        return;
      }

      this.sessionID = false;
      this._lastRequestIsBootable = false;
      this.state = Consoloid.Server.Cache.BootCacheBuilder.BOOTED;

      var javascript = this.bootJavascript;
      javascript += "global.CACHE_IS_BOOTED = true;\r\n";

      for (var i = 0, len = this.classes.length; i < len; i++) {
        var classDefinition = this.classDefinitions[this.classes[i][0]];
        javascript = javascript.concat(classDefinition);
      }

      javascript = javascript.concat(this.javascript);

      this.get('cache')
        .store('boot/javascript', javascript)
        .store('boot/templates', this.templates)
        .store('boot/serverTopics', this.serverTopics);

      this.classes = undefined;
      this.classDefinitions = undefined;
      this.templates = undefined;
      this.bootJavascript = undefined;
      this.javascript = undefined;
      this.serverTopics = undefined;
      this.trigger('Consoloid.Server.Cache.Boot.finished');
      this.container.get('logger').log('info', 'Boot cache build is finished');
    },

    __isBootable: function()
    {
      return this._lastRequestIsBootable && this.state == Consoloid.Server.Cache.BootCacheBuilder.BOOTING;
    },

    addBootJS: function(js)
    {
      if (this.__isBootable()) {
        this.bootJavascript = js;
      }
      return this;
    },

    addJS: function(js)
    {
      if (this.__isBootable()) {
        this.javascript = this.javascript.concat("\r\n"+js+";");
      }
      return this;
    },

    addTemplate: function(jquote)
    {
      if (this.__isBootable()) {
        this.templates = this.templates.concat("\r\n"+jquote);
      }
      return this;
    },

    addClass: function(classDefinition)
    {
      if (this.__isBootable()) {
        var classNames = this.__getClassNamesFromContent(classDefinition);
        if (classNames) {
          this.classDefinitions[classNames[0]] = classDefinition;
          var insertIndex = this.__getIndexOfFirstClassHavingParent(classNames[0]);
          this.classes.splice(insertIndex, 0, classNames);
        }
      }
      return this;
    },

    /**
    * @return: [className, parentClassName] or undefined
    */
    __getClassNamesFromContent: function(classDefinition)
    {
      var matched = classDefinition.match(/defineClass\(['"](.+)['"], ['"](.+)['"]/);
      if (matched) {
        return [matched[1], matched[2]]
      } else {
        matched = classDefinition.match(/defineClass\(['"](.+)['"]/);
        return matched ? [matched[1], ''] : undefined;
      }
    },

    __getIndexOfFirstClassHavingParent: function(parentClassName)
    {
      for (var i = 0, len = this.classes.length; i < len; i++) {
        if (this.classes[i][1] == parentClassName) {
          return i;
        }
      }

      return this.classes.length;
    },

    addServerTopic: function(topic)
    {
      if (!this.__isBootable() || this.serverTopics.indexOf(topic) != -1) {
        return this;
      }

      this.serverTopics.push(topic);
      return this;
    }
  }
);
