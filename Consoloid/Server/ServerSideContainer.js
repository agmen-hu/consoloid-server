defineClass('Consoloid.Server.ServerSideContainer', 'Consoloid.Service.ChainedContainer',
  {
    __constructor: function(options)
    {
      this.__base(options);
      if(!('sessionId' in this)) {
        throw new Error('sessionId must be injected');
      };
    },

    getSessionId: function()
    {
      return this.sessionId;
    },

    addSharedObject: function(name, object, remoting, cls)
    {
      remoting = remoting || { mode: 'disabled' };
      this.definitions[name] = {
        shared: true,
        cls: cls || null,
        options: null,
        remoting: remoting
      };

      this.services[name] = object;
      return this;
    },

    getRemoteDefinition: function(name)
    {
      var definition = this.getDefinition(name);

      if (!definition || !('remoting' in definition) ||
          ('mode' in definition.remoting && definition.remoting.mode == 'disabled')
      ) {
        throw new Error('Service does not exist or not accessible; name=' + name);
      }

      var cls = typeof definition.cls == 'string' ? getClass(definition.cls) : definition.cls;
      var result = {
        id: name,
        shared: definition.shared,
        methods: this.__getMethodNames(cls ? cls.prototype : this.services[name])
      };

      return result;
    },

    __getMethodNames: function(object)
    {
      var
        methodNames = [];
      for (var property in object) {
        try {
          if (typeof(object[property]) == "function") {
            methodNames.push({ name: property });
          }
        } catch (err) {
          // inaccessible
        }
      }

      return methodNames;
    }
  }
);
