defineClass('Consoloid.Server.AsyncRPCPeer', 'Consoloid.Service.AsyncRPC.BasePeer',
  {
    __constructor: function(options)
    {
      this.__base(options);
      this._setupListeners();
    },

    _setupListeners: function()
    {
      this.__base();
      this.socket.on('connect.register', this._registerToPool.bind(this));
    },

    _registerToPool: function(req)
    {
      var sessionID = req.sessionID;

      if (this.sessionID == sessionID) {
        return;
      }

      if (this.sessionID != undefined) {
        throw new Error('This RPC peer was registered to a different session.');
      }

      this.sessionID = sessionID;
      this.get('async_rpc_connection_pool').addPeerToSession(sessionID, this.socket.id, this);

      this.container = this.get('session_store').getContainer(req);
      this.container.addSharedObject('async_rpc_handler_server', this);

      this.get('logger').log('debug', 'Registered socket.io connection in session.', {
        sessionID: this.sessionID
      });
    },

    _handleActualSharedServiceCall: function(req, response)
    {
      this.__checkPoolRegistration(req.sessionID);

      req = this.create('Consoloid.Server.AsyncRPCRequest', req);
      var service = this.get("session_store").getContainer(req).get(req.service);
      this.get('router').callMethodOnService(req.service, req, service, response);
    },

    __checkPoolRegistration: function(sessionID)
    {
      if (this.sessionID === undefined || this.sessionID != sessionID) {
        throw new Error('This RPC peer was registered to a different session.');
      }
    },

    _handleServiceCallRequest: function(req)
    {
      this._validateCallRequest(req);
      this.__checkPoolRegistration(req.sessionID);

      req = this.create('Consoloid.Server.AsyncRPCRequest', req);
      var response = this.create('Consoloid.Service.AsyncRPC.Response', {
        callId: req.callId,
        socket: this.socket,
        container: this.container
      });

      this.get('router').callServiceInstance(req, response);
    },

    _validateCallRequest: function(req)
    {
      if (!req || !('callId' in req) || !('sessionID' in req) ||
          !('instanceId' in req) || !('method' in req) || !('args' in req) ||
          req.callId === undefined || !req.sessionID || req.instanceId === undefined || !req.method || !req.args
      ) {
        throw new Error('Async call request requires callId, sessionID, instanceId and method name with arguments.');
      }
    },

    _validateSharedCallRequest: function(req)
    {
      if ( !('sessionID' in req) || !req.sessionID ) {
        throw new Error('Shared async call request requires sessionID.');
      }
      this.__base(req);
    }
  }
);
