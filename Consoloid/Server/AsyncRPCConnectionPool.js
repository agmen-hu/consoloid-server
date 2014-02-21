defineClass('Consoloid.Server.AsyncRPCConnectionPool', 'Consoloid.Base.Object',
  {
    __constructor: function(options)
    {
      this.__base($.extend({
        peers: {}
      }, options));
      this.__setupConnection();
    },

    __setupConnection: function()
    {
      this.get('webserver').getSocketIO().sockets.on('connection', function(socket) {
        this.create("Consoloid.Server.AsyncRPCPeer", { socket: socket, container: this.container });
        this.get('logger').log('debug', 'Client connected to socket.io server.');
      }.bind(this));
    },

    getPeer: function(sessionId, socketId)
    {
      if (this.peers[sessionId] != undefined && this.peers[sessionId][socketId] != undefined) {
        return this.peers[sessionId][socketId];
      }

      throw new Error("No peer belongs to session: " + sessionId + ", with socketId: " + socketId);
    },

    addPeerToSession: function(sessionId, socketId, peer)
    {
      $.each(this.peers, function(index, peer) {
        if (peer[socketId] != undefined) {
          throw new Error("This socketId (" + socketId + ") already belongs to a session: " + sessionId);
        }
      });

      if (this.peers[sessionId] == undefined) {
        this.peers[sessionId] = {};
      }

      this.peers[sessionId][socketId] = peer;
    }
  }
);