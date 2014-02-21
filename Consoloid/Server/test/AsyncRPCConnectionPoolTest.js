require('../AsyncRPCConnectionPool');
require('consoloid-framework/Consoloid/Test/UnitTest');

describeUnitTest('Consoloid.Server.AsyncRPCConnectionPool', function() {
  var
    pool,
    io;

  beforeEach(function() {
    socketMock = {
      emit: sinon.spy(),
      on: sinon.spy()
    };

    io = {
      sockets: {
        on: sinon.stub()
      }
    };

    env.addServiceMock('webserver', { getSocketIO: function() { return io; } });

    pool = env.create('Consoloid.Server.AsyncRPCConnectionPool', {});
  });

  describe("#__constructor(object)", function() {
    it("should start listening socket.io connections", function() {
      io.sockets.on.calledOnce.should.be.ok;
      io.sockets.on.args[0][0].should.be.eql('connection');
    });

    it("should the listening function create an AsyncRPCPeer and add the socket and the container to it", function() {
      pool.create = sinon.stub();
      io.sockets.on.args[0][1]({ id: "foobar" });

      pool.create.calledOnce.should.be.ok;
      pool.create.args[0][0].should.equal('Consoloid.Server.AsyncRPCPeer');
      pool.create.args[0][1].socket.id.should.equal('foobar');
      pool.create.args[0][1].container.should.equal(pool.container);
    });
  });

  describe("#getPeer(socketId, sessionId)", function() {
    beforeEach(function() {
      pool.peers.foosessionId = {
        barsocketId: { foo: "bar" }
      }
    });

    it("should return the peer if it belongs to that session", function() {
      pool.getPeer("foosessionId", "barsocketId").foo.should.equal("bar");
    });

    it("should throw if no such peer belongs to the session.", function() {
      (function() { pool.getPeer("foosessionId", "barbar"); }).should.throwError();
      (function() { pool.getPeer("foofoo", "barsocketId"); }).should.throwError();
    });
  });

  describe("#addPeerToSession(sessionId, socketId, asyncPeer)", function() {
    it("should add the peer to an array of sessions", function() {
      pool.addPeerToSession("barionId", "foocketId", { foo: "bar" });

      pool.getPeer("barionId", "foocketId").foo.should.equal("bar");
    });

    it("should throw if socketId is alread added to a session.", function() {
      pool.addPeerToSession("barionId", "foocketId", { foo: "bar" });

      (function() {
        pool.addPeerToSession("anotherSessionId", "foocketId", { foo: "bar" });
      }).should.throwError();
    });
  });
});