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
    socketMock,
    req;

  beforeEach(function() {
    req = {
      callId: 1,
      sessionID: 'session_id',
      service: 'testService',
      method: 'asyncMethod',
      args: []
    }

    socketMock = {
      emit: sinon.spy(),
      on: sinon.spy(),
      id: 'socket_id'
    };

    defineClass('Consoloid.Server.TestedAsyncRPCPeer', 'Consoloid.Server.AsyncRPCPeer', {
      _setupListeners: sinon.spy()
    });
    handler = env.create('Consoloid.Server.TestedAsyncRPCPeer', {
      socket: socketMock
    });
  });

  describe('#__construct()', function() {
    it('should bind events by calling _setUpListeners()', function() {
      handler._setupListeners.calledOnce.should.be.true;
    });
  });

  describe('#_handleSharedServiceCallRequest(req)', function() {
    beforeEach(function() {
      handler.__registerToPool = sinon.stub();
    });

    it('should attempt to register to pool', function() {
      handler._handleSharedServiceCallRequest(req);

      handler.__registerToPool.calledOnce.should.be.ok;
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

      env.addServiceMock('session_store', {
        getContainer: sinon.stub().returns({ get: sinon.stub().returns('serviceInstance') })
      });

      env.addServiceMock('testService', {
        asyncMethod: sinon.spy()
      });

      handler._handleSharedServiceCallRequest(req);

      env.container.get('router').callMethodOnService.calledOnce.should.be.true;
      env.container.get('router').callMethodOnService.args[0][0].should.equal('testService');
      (env.container.get('router').callMethodOnService.args[0][1] instanceof Consoloid.Server.AsyncRPCRequest).should.be.ok;
      env.container.get('router').callMethodOnService.args[0][2].should.equal('serviceInstance');
    });
  });

  describe('#_handleServiceCallRequest(req)', function() {
    beforeEach(function() {
      req.instanceId = 12;
      handler.__registerToPool = sinon.stub();

      env.addServiceMock('router', {
        callServiceInstance: sinon.mock()
      });

      env.addServiceMock('testService', {
        asyncMethod: sinon.spy()
      });
    });

    it('should attempt to register to pool', function() {
      handler._handleServiceCallRequest(req);

      handler.__registerToPool.calledOnce.should.be.ok;
    });

    it('should throw error when the request does not contain required arguments', function() {
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

  describe('#__registerToPool(sessionID)', function() {
    var
      pool;
    beforeEach(function() {
      pool = {
        addPeerToSession: sinon.stub()
      }
      env.addServiceMock('async_rpc_connection_pool', pool);
    });

    it("should register itself to the pool according to session and socket id on first request", function() {
      handler.__registerToPool('session_id');

      pool.addPeerToSession.calledOnce.should.be.ok;
      pool.addPeerToSession.args[0][0].should.equal('session_id');
      pool.addPeerToSession.args[0][1].should.equal('socket_id');

      handler.__registerToPool('session_id');
      handler.__registerToPool('session_id');
      pool.addPeerToSession.calledOnce.should.be.ok;
    });

    it("should throw on new sessionID when it's not the first request", function() {
      handler.__registerToPool('session_id');

      req.sessionID = 'something_id';
      (function() {
        handler._validateSharedCallRequest('session_id');
      }).should.throwError()
    });
  });
});
