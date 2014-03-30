require('consoloid-framework/Consoloid/Service/AsyncRPC/Response');
require('consoloid-framework/Consoloid/Service/AsyncRPC/BasePeer');
require('consoloid-framework/Consoloid/Service/ServiceContainer');
require('consoloid-framework/Consoloid/Service/ChainedContainer');
require('../ServerSideContainer');
require('../AsyncRPCPeer');
require('../AsyncRPCRequest');
require('consoloid-framework/Consoloid/Test/UnitTest');
describeUnitTest('Consoloid.Server.AsyncRPCPeer', function() {
  var
    handler,
    socket,
    req;

  beforeEach(function() {
    req = {
      callId: 1,
      sessionID: 'session_id',
      service: 'testService',
      method: 'asyncMethod',
      args: []
    }

    socket = {
      emit: sinon.spy(),
      on: sinon.spy(),
      id: 'socket_id'
    };

    handler = env.create('Consoloid.Server.AsyncRPCPeer', {
      socket: socket
    });
  });

  describe('#__constructor()', function() {
    it('should bind connect.register event on socket', function() {
      socket.on.callCount.should.equal(6);
      socket.on.args[5][0].should.equal('connect.register');
    });
  });

  describe('#_handleSharedServiceCallRequest(req)', function() {
    beforeEach(function() {
    });

    it('should send error when handler is not registered to pool', function() {
      handler._handleSharedServiceCallRequest(req);
      socket.emit.calledOnce.should.be.true;
      socket.emit.args[0][0].should.equal('rpc.result');
      socket.emit.args[0][1].should.have.property('exception');
      socket.emit.args[0][1].exception.should.equal('Error: This RPC peer was registered to a different session.');
    });

    it('should throw error if request does not include session id', function() {
      (function() {
        handler._handleSharedServiceCallRequest(
          {callId: 1, service: 'service', method: 'method', args: ['test', ['test']]}
        );
      }).should.throwError('Shared async call request requires sessionID.');
    });

    it('should call service method using Router::callMethodOnService method', function() {
      env.addServiceMock('router', {
        callMethodOnService: sinon.spy()
      });

      env.addServiceMock('async_rpc_connection_pool', {
        addPeerToSession: sinon.stub()
      });

      env.addServiceMock('session_store', {
        getContainer: sinon.stub().returns(env.container)
      });

      env.addServiceMock('testService', {
        asyncMethod: sinon.spy()
      });

      handler._registerToPool({ sessionID: 'session_id' });

      handler._handleSharedServiceCallRequest(req);

      env.container.get('router').callMethodOnService.calledOnce.should.be.true;
      env.container.get('router').callMethodOnService.args[0][0].should.equal('testService');
      (env.container.get('router').callMethodOnService.args[0][1] instanceof Consoloid.Server.AsyncRPCRequest).should.be.true;
    });
  });

  describe('#_handleServiceCallRequest(req)', function() {
    beforeEach(function() {
      req.instanceId = 12;

      env.addServiceMock('router', {
        callServiceInstance: sinon.mock()
      });

      env.addServiceMock('testService', {
        asyncMethod: sinon.spy()
      });

      env.addServiceMock('async_rpc_connection_pool', {
        addPeerToSession: sinon.stub()
      });

      env.addServiceMock('session_store', {
        getContainer: sinon.stub().returns(env.container)
      });
    });

    it('should throw when handler is not registered to pool', function() {
      (function() {
        handler._handleServiceCallRequest(req);
      }).should.throw('This RPC peer was registered to a different session.');
    });

    it('should throw error when the request does not contain required arguments', function() {
      handler._registerToPool({ sessionID: 'session_id' });

      (function() {
        handler._handleServiceCallRequest(
          { callId: 1 }
        );
      }).should.throwError('Async call request requires callId, sessionID, instanceId and method name with arguments.');

      (function() {
        handler._handleServiceCallRequest(
          { callId: 1, sessionID: 'session' }
        );
      }).should.throwError('Async call request requires callId, sessionID, instanceId and method name with arguments.');

      (function() {
        handler._handleServiceCallRequest(
          { callId: 1, sessionID: 'session', instanceId: 12 }
        );
      }).should.throwError('Async call request requires callId, sessionID, instanceId and method name with arguments.');

      (function() {
        handler._handleServiceCallRequest(
          { callId: 1, sessionID: 'session', instanceId: 12, method: 'method' }
        );
      }).should.throwError('Async call request requires callId, sessionID, instanceId and method name with arguments.');
    });

    it('should call service method using Router::callMethodOnService method', function() {
      handler._registerToPool({ sessionID: 'session_id' });
      handler._handleServiceCallRequest(req);

      env.container.get('router').callServiceInstance.calledOnce.should.be.true;
      var actualReq = env.container.get('router').callServiceInstance.args[0][0];
      actualReq.param('callId').should.be.eql(1);
      actualReq.param('instanceId').should.be.eql(12);
      actualReq.param('sessionID').should.be.eql('session_id');
      actualReq.param('service').should.be.eql('testService');
      actualReq.param('method').should.be.eql('asyncMethod');
    });
  });

  describe('#_registerToPool(req)', function() {
    var
      pool;

    beforeEach(function() {
      pool = {
        addPeerToSession: sinon.stub()
      }
      env.addServiceMock('async_rpc_connection_pool', pool);

      env.addServiceMock('session_store', {
        getContainer: sinon.stub().returns(env.container)
      });
    });

    it("should register itself to the pool according to session and socket id on first request", function() {
      handler._registerToPool({ sessionID: 'session_id' });

      pool.addPeerToSession.calledOnce.should.be.true;
      pool.addPeerToSession.args[0][0].should.equal('session_id');
      pool.addPeerToSession.args[0][1].should.equal('socket_id');

      handler._registerToPool({ sessionID: 'session_id' });
      handler._registerToPool({ sessionID: 'session_id' });
      pool.addPeerToSession.calledOnce.should.be.true;
    });

    it("should throw error when trying to re-register a different session id", function() {
      handler._registerToPool({ sessionID: 'session_id' });

      (function() {
        handler._registerToPool({ sessionID: 'other_session_id' });
      }).should.throwError('This RPC peer was registered to a different session.');
    });

    it("should register peer as async_rpc_handler_server service in the container", function() {
      (env.container.has('async_rpc_handler_server') || false).should.be.false;

      handler._registerToPool({ sessionID: 'session_id' });

      env.container.get('async_rpc_handler_server').should.equal(handler);
    })
  });
});
