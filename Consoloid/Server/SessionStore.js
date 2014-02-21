defineClass('Consoloid.Server.SessionStore',
  {
    __constructor: function(options)
    {
      $.extend(this, {
        sourceStore: 'express/node_modules/connect/lib/middleware/session/memory',
        containers: {}
      }, options);

      if (!("container" in this)) {
        throw new Error('ServiceContainer must be injected');
      }
      this.sourceStore = new (require(this.sourceStore))(this.sourceOptions);
      this.__createDecoratedFunctions();
    },

    __createDecoratedFunctions: function()
    {
      var
        sourceFunctions = this.__getFunctionNames(this.sourceStore),
        $this = this;

      $.each(sourceFunctions, function(index, func) {
        if (!(func in $this)) {
          $this[func] = function() {
            $this.sourceStore[func].apply($this.sourceStore, arguments);
          }
        }
      });
    },

    __getFunctionNames: function(object)
    {
      var result = [];
      for (var name in object) {
        if (typeof object[name] == "function") {
          result.push(name);
        }
      }
      return result;
    },

    destroy: function(sid, fn)
    {
      this.container.get('logger').log('info', 'Resetting session', { sid: sid });
      this.removeContainer(sid);

      this.sourceStore.destroy(sid, fn);
    },

    addContainer: function(sid, container) {
      this.containers[sid] = container;
    },

    getContainer: function(req) {
      if (!(req.sessionID in this.containers)) {
        this.container.get('logger').log('info', 'Expired session', { sid: req.sessionID, ip: req.ip });
        throw new (getClass('Consoloid.Error.UserMessage'))({message: 'Your session expired. Please reload the page to start a new session.'});
      }
      return this.containers[req.sessionID];
    },

    hasContainer: function(sid) {
      return (sid in this.containers);
    },

    removeContainer: function(sid) {
      if (!(sid in this.containers)) {
        throw new Error("No container for session id: " + sid);
      }
      delete this.containers[sid];
    },
  });
