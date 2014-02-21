if (!('ChainedContainer' in Consoloid.Service)) {
  require('consoloid-framework/Consoloid/Service/ChainedContainer');
}
require('consoloid-framework/Consoloid/Service/ServiceContainer');
require('consoloid-framework/Consoloid/Service/AsyncRPC/Response');
require('../ServerSideContainer.js');
require('../Service.js');
require('../Router.js');
require('../Cache/NoCache.js');
require('../Cache/NoBootCacheBuilder.js');
require('../Cache/CacheFactory.js');

require('consoloid-framework/Consoloid/Test/UnitTest');
describeUnitTest('Consoloid.Server.Router', function(){
  var
    router,
    serverSideContainer;

  defineClass('Consoloid.Server.RouterTestResourceLoader', 'Consoloid.Base.Object',
      {
        getJsToBoot: function()
        {
          return 'testJs';
        },

        getResourceDirectories: function()
        {
          return this.resourceDirectories;
        },

        getStaticDirectories: function()
        {
          return this.staticDirectories;
        },

        getExternalBootJs: function()
        {
          return this.externalBootJs;
        }
      }
    );

  beforeEach(function() {
    env.container = new Consoloid.Service.ServiceContainer();
    env.addServiceMock('logger', { log: function() {} });
    router = env.create('Consoloid.Server.Router', {});
    router.setContainer(env.container);

    serverSideContainer = new Consoloid.Server.ServerSideContainer({
      fallback: env.container,
      sessionId: 'test'
    });

    serverSideContainer.addDefinition('test_callable', {
      shared: true,
      cls: 'Consoloid.Server.RouterTestResourceLoader',
      options: {},
      remoting: { mode: 'any' }
    });
  });

  describe('#configure()', function() {
    it('should register index, bootstrap, service call and definition download urls', function() {
      var
        getSpy = sinon.spy(),
        postSpy = sinon.spy(),
        webserverMock = {
          getApplication: function(){
            return {
              use: function(){},
              get: getSpy,
              post: postSpy
            }
          }
        }
      env.addServiceMock('webserver', webserverMock);
      env.addServiceMock('', webserverMock);

      router.configure();

      getSpy.calledTwice.should.be.ok;
      getSpy.calledWith('/');
      getSpy.calledWith('/b');

      postSpy.callCount.should.equal(6);
      postSpy.calledWith('/c');
      postSpy.calledWith('/d');
      postSpy.calledWith('/f');
      postSpy.calledWith('/i');
      postSpy.calledWith('/m');
      postSpy.calledWith('/x');
    });
  });

  describe('#boot()', function() {
    var
      req,
      res,
      serverSideContainerMock,
      sessionStore,
      resourceLoaderMock,
      createStub;

    beforeEach(function() {
      env.addServiceMock('resource_loader', new Consoloid.Server.RouterTestResourceLoader());
      req = {
        session: {},
        sessionID: "foobar",
      };

      res = {
        send: function() {},
        set: sinon.stub()
      };

      serverSideContainerMock = {
        name: "FooBarContainer",
        addSharedObject: function() {},
        get: function() { return resourceLoaderMock },
        addDefinition: sinon.spy()
      };

      sessionStore = {
        getContainer: sinon.stub().returns(serverSideContainerMock),
        addContainer: sinon.stub(),
        hasContainer: sinon.stub().returns(false)
      }
      env.addServiceMock('session_store', sessionStore);

      resourceLoaderMock = {
        name: "FooBarLoader",
        getStoredDefinitions: function() {
          return {}
        },
        getJsToBoot: sinon.stub()
      };

      createStub = sinon.stub(router, "create");
      createStub.withArgs('Consoloid.Server.ServerSideContainer').returns(serverSideContainerMock);
      createStub.withArgs('Consoloid.Service.InstancePool').returns({ name: "FooBarPool" });
      createStub.withArgs('Consoloid.Server.Resource.SessionLoader').returns(resourceLoaderMock);

      env.addServiceMock('server_log_buffer', {});

      env.addServiceMock('webserver', {
        getConfig: sinon.stub().returns({
          resourceLoader: {
            cls: 'Consoloid.Server.RouterTestResourceLoader',
            resourceDirectories: [ 'config', 'src/*', 'node_modules/*' ]
          }
        })
      });

      env.addServiceMock('cache', {
        get: sinon.stub().returns([])
      });
    });

    it('should send boot javascript code to client', function() {
      var res = {
        send: sinon.spy(),
        set: sinon.stub()
      };
      resourceLoaderMock.getJsToBoot.returns('testJs');

      router.boot(req, res);

      res.send.calledOnce.should.be.ok;
      res.send.getCall(0).args[0].should.be.equal('testJs');
    });

    it('should add a ServierSideContainer to session', function() {
      router.boot(req, res);

      createStub.called.should.be.ok;
      sessionStore.hasContainer.called.should.be.ok;
      sessionStore.addContainer.called.should.be.ok;

      sessionStore.addContainer.args[0][0].should.equal("foobar");
      sessionStore.addContainer.args[0][1].name.should.equal("FooBarContainer");
    });

    it("should create a serviceInstancePool service to the ServerSideContainer", function() {
      sinon.stub(serverSideContainerMock, "addSharedObject");

      router.boot(req, res);

      serverSideContainerMock.addSharedObject.called.should.be.ok;
      serverSideContainerMock.addSharedObject.args[0][0].should.equal("instance_pool");
      serverSideContainerMock.addSharedObject.args[0][1].name.should.equal("FooBarPool");
    });

    it("should add an ResourceLoader service, with the correct config to the created ServerSideContainer", function() {
      env.container.get('webserver').getConfig
        .returns({ resourceLoader: {
          cls: 'Consoloid.Server.RouterTestResourceLoader',
          resourceDirectories: [ 'foo' ],
          staticDirectories: [ 'bar' ],
          externalBootJs: [ 'foobar' ]
        }});

      createStub.withArgs(Consoloid.Server.RouterTestResourceLoader).returns("FooBarLoader");

      sinon.stub(serverSideContainerMock, "addSharedObject");

      router.boot(req, res);

      var createParameters = createStub.withArgs(Consoloid.Server.RouterTestResourceLoader).args[0][1];
      createParameters.staticDirectories[0].should.equal('bar');
      createParameters.externalBootJs[0].should.equal('foobar');
      createParameters.container.name.should.equal('FooBarContainer');

      serverSideContainerMock.addSharedObject.called.should.be.ok;
      serverSideContainerMock.addSharedObject.args[2][0].should.equal("resource_loader");
      serverSideContainerMock.addSharedObject.args[2][1].should.equal("FooBarLoader");

    });

    it("should add the stored definitions from the resource loader in the session's container", function() {
      sinon.stub(resourceLoaderMock, "getStoredDefinitions", function() {
        return {
          serbar: {
            serbar_service: {
              cls: "Foonsoloid.Serbar.Foobar"
            }
          }
        }
      });

      var spy = sinon.spy();
      var res = {
        send: spy,
        set: sinon.stub()
      };

      router.boot(req, res);

      var response = spy.getCall(0).args[0];

      var lastLine = response.split('\r\n')[response.split('\r\n').length - 1];
      lastLine.should.equal("global.Consoloid.Resource.TopicLoader.CACHED_DEFINITIONS['serbar'] = {\"serbar_service\":{\"cls\":\"Foonsoloid.Serbar.Foobar\"}};");
    });

    it("should not add the stored definitions from the resource loader if they are part of the defaultTopics array of the router", function() {
      sinon.stub(resourceLoaderMock, "getStoredDefinitions", function() {
        return {
          serbar: {
            serbar_service: {
              cls: "Foonsoloid.Serbar.Foobar"
            }
          }
        }
      });

      var spy = sinon.spy();
      var res = {
        send: spy,
        set: sinon.stub()
      };

      router.defaultTopics = ['serbar'];

      router.boot(req, res);

      var response = spy.getCall(0).args[0];

      var lastLine = response.split('\r\n')[response.split('\r\n').length - 1];
      lastLine.should.not.equal("global.Consoloid.Resource.TopicLoader.CACHED_DEFINITIONS['serbar'] = {\"serbar_service\":{\"cls\":\"Foonsoloid.Serbar.Foobar\"}};");
    });

    afterEach(function() {
      router.create.restore();
    })
  });

  describe('#callSharedServiceFromAjax()', function() {
    var
      req,
      res,
      sessionStore;

    beforeEach(function() {
      req = {
        param: function(name) {
          switch(name) {
            case 'id':
              return 'test_callable';
            case 'method':
              return 'testMethod';
            case 'arguments':
              return [ 10 ];
            default:
              throw new Error('Invalid parameter requested; name=' + name);
          }
        }
      }
      sessionStore = {
        getContainer: sinon.stub().returns(serverSideContainer)
      }
      env.addServiceMock('session_store', sessionStore);
      res = {
        send: sinon.spy()
      };

      env.mockConsoleLog();
      env.mockConsoleDir();
    });

    var addTestServiceWithCallableMethod = function(method)
    {
      serverSideContainer.addSharedObject(
        'test_callable',
        {
          testMethod: method,
        },
        {
          mode: 'any'
        }
      );
    }

    it('should instantiate the given service and call the provided method', function() {
      addTestServiceWithCallableMethod(function(nr) {
        return nr + 1;
      });

      router.callSharedServiceFromAjax(req, res);
      res.send.calledOnce.should.be.ok;
      res.send.getCall(0).args[0].should.be.equal('{"_success":true,"result":11}');
      env.unmockConsoleLog();
      env.unmockConsoleDir();
    });

    var addTestServiceWithMethodThrowingError = function() {
      addTestServiceWithCallableMethod(function(nr) {
        throw new Error('testError');
      });
    };

    it('should return exception message on error', function() {
      addTestServiceWithMethodThrowingError();

      router.callSharedServiceFromAjax(req, res);
      res.send.calledOnce.should.be.ok;
      res.send.getCall(0).args[0].should.be.equal('{"_success":false,"exception":"Error: testError"}');
      env.unmockConsoleLog();
      env.unmockConsoleDir();
    });

    it('should print stack trace to console on error', function() {
      addTestServiceWithMethodThrowingError();

      var spy = sinon.spy(env.container.get('logger'), "log");
      router.callSharedServiceFromAjax(req, res);
      spy.calledTwice.should.be.ok;
      spy.getCall(1).args[1].indexOf('testError').should.not.equal(-1);
      spy.getCall(1).args[2].should.have.property('stack');
      env.unmockConsoleLog();
      env.unmockConsoleDir();
    });
  });

  describe('#callServiceInstanceFromAjax()', function() {
    var
      req,
      res,
      sessionStore,
      callMethodOnServiceStub,
      getServiceStub,
      getServiceIdStub,
      removeServiceStub,
      param;

    beforeEach(function() {
      sessionStore = {
        getContainer: sinon.stub().returns(serverSideContainer)
      }
      env.addServiceMock('session_store', sessionStore);
      callMethodOnServiceStub = sinon.stub(router, "callMethodOnService");
      getServiceStub = sinon.stub().returns("FooFooService");
      getServiceIdStub = sinon.stub().returns("test_callable");
      removeServiceStub = sinon.stub();
      env.container.addSharedObject('instance_pool', {
        get: getServiceStub,
        getServiceIdForInstance: getServiceIdStub,
        remove: removeServiceStub
      });

      param = sinon.stub();
      param.withArgs("instanceId").returns("foobar_id");
      param.withArgs("method").returns("aSpecialMethod");
      param.withArgs("arguments").returns(["foo", "bar"]);

      req = { param: param };
      res = { send: sinon.stub() };
    });

    it('should get the service instance from the instance pool', function() {
      router.callServiceInstanceFromAjax(req, res);

      getServiceStub.called.should.be.ok;
      getServiceStub.args[0][0].should.equal("foobar_id");
    });

    it('should call the callMethodOnService method of the router, so it will work the same way as callService', function() {
      router.callServiceInstanceFromAjax(req, res);

      getServiceIdStub.called.should.be.true;

      callMethodOnServiceStub.called.should.be.true;
      callMethodOnServiceStub.args[0][0].should.equal("test_callable");
      callMethodOnServiceStub.args[0][2].should.equal("FooFooService");
      callMethodOnServiceStub.args[0][3].should.equal(res);
    });

    it('should call sendError on an error', function() {
      sinon.stub(router, "sendError");
      getServiceStub.throws();

      router.callServiceInstanceFromAjax({ param: function() { } }, null);

      router.sendError.calledOnce.should.be.ok;

      router.sendError.restore();
    })

    it('should catch "destroyService" method calling and destroy the service instance', function() {
      param.withArgs("method").returns("destroyService");
      router.callServiceInstanceFromAjax(req, res);
      removeServiceStub.calledWith("foobar_id").should.be.true;
    });

    afterEach(function() {
      callMethodOnServiceStub.restore();
    });
  });

  describe('#getServiceDefinition()', function() {
    var
      req,
      res,
      sessionStore;

    beforeEach(function() {
      req = {
        param: function(name)
        {
          switch(name) {
            case 'service':
              return 'test_callable';
            default:
              throw new Error('Invalid parameter requested; name=' + name);
          }
        }
      }

      res = {
        send: sinon.spy()
      };

      sessionStore = {
        getContainer: sinon.stub().returns(serverSideContainer)
      }
      env.addServiceMock('session_store', sessionStore);
    });

    it('should send service definition provided by the container', function() {
      req.sessionID = "foobar";
      router.sendServiceDefinition(req, res);

      sessionStore.getContainer.calledWith(req).should.be.ok;
      res.send.calledOnce.should.be.ok;
      res.send.getCall(0).args[0].should.be.equal('{"service":"test_callable","definition":{"id":"test_callable","shared":true,"methods":['+
        '{"name":"constructor"},'+
        '{"name":"__self"},'+
        '{"name":"getJsToBoot"},'+
        '{"name":"getResourceDirectories"},'+
        '{"name":"getStaticDirectories"},'+
        '{"name":"getExternalBootJs"},'+
        '{"name":"__constructor"},'+
        '{"name":"_methodOverrider"},'+
        '{"name":"get"},'+
        '{"name":"create"},'+
        '{"name":"bind"},'+
        '{"name":"trigger"},'+
        '{"name":"requireProperty"}]}}'
      );
    });
  });

  describe("#createAndReturnInstanceId", function() {
    var
      sessionStore;

    beforeEach(function() {
      sessionStore = {
        getContainer: sinon.stub().returns(serverSideContainer)
      }
      env.addServiceMock('session_store', sessionStore);
    });

    it("should call the instance pool's createAndReturnId method, and return with whatever that returns", function() {
      var req = { sessionID: "foobar", param: sinon.stub().returns("awesome_remote_service_instance_id") };
      var res = {};
      sinon.stub(router, "sendResult");
      var poolMock = { createAndReturnId: sinon.stub().returns('raboof') };
      router.container.addSharedObject('instance_pool', poolMock )

      router.createAndReturnInstanceId(req, res);

      req.param.calledWith('id').should.be.ok;
      poolMock.createAndReturnId.calledWith('awesome_remote_service_instance_id').should.be.ok;
      router.sendResult.calledOnce.should.be.ok;
      router.sendResult.args[0][1].should.equal('raboof');

      router.sendResult.restore();
    });

    it('should send error on error', function() {
      sinon.stub(router, "sendError");

      router.createAndReturnInstanceId();

      router.sendError.calledOnce.should.be.ok;

      router.sendError.restore();
    });

  });

  describe("#resetSession()", function() {
    it("should clear the session", function() {
      var destroyStub = sinon.stub();
      router.resetSession({
        session: {
          destroy: destroyStub
        }
      }, { send: sinon.stub() });

      destroyStub.called.should.equal.true;
    });
  });

  describe("#__getDefaultTopics(req)", function() {
    var
      req,
      sessionStore;
    beforeEach(function() {
      req = {
        sessionID: "foobarID"
      };
      sessionStore = {
        getContainer: sinon.stub(),
        hasContainer: sinon.stub()
      };
      env.addServiceMock('session_store', sessionStore);
    });

    it("should return with the contents of the default topics property", function() {
      sessionStore.hasContainer.returns(false);

      router.defaultTopics = ["foowork", "serbar"];

      var response = router.__getDefaultTopics(req);

      response.length.should.equal(2);

      response[0].should.equal("foowork");
      response[1].should.equal("serbar");
    });

    it("should also return with the topics names stored in the session's instanced resource loader", function() {
      var resourceLoaderMock = {
          getStoredDefinitions: function() {
            return {
              serbar: {
                serbar_service: {
                  cls: "Foonsoloid.Serbar.Foobar"
                }
              }
            }
          }
      }
      sinon.spy(resourceLoaderMock, "getStoredDefinitions");
      sessionStore.hasContainer.returns(true);
      sessionStore.getContainer.withArgs(req).returns({ get: function() { return resourceLoaderMock } });

      router.defaultTopics = ["foowork"];

      var response = router.__getDefaultTopics(req);

      resourceLoaderMock.getStoredDefinitions.called.should.be.true;
      sessionStore.getContainer.calledWith(req).should.be.true;

      response.length.should.equal(2);
      response[0].should.equal("foowork");
      response[1].should.equal("serbar");
    });

    it("should not duplicate elements if theye were both in the router's array and in the session", function() {
      var resourceLoaderMock = {
          getStoredDefinitions: function() {
            return {
              serbar: {
                serbar_service: {
                  cls: "Foonsoloid.Serbar.Foobar"
                }
              }
            }
          }
      }
      sinon.spy(resourceLoaderMock, "getStoredDefinitions");
      sessionStore.hasContainer.returns(true);
      sessionStore.getContainer.withArgs(req).returns({ get: function() { return resourceLoaderMock } });

      router.defaultTopics = ["serbar"];

      var response = router.__getDefaultTopics(req);

      resourceLoaderMock.getStoredDefinitions.called.should.be.true;
      sessionStore.getContainer.calledWith(req).should.be.true;

      response.length.should.equal(1);
      response[0].should.equal("serbar");
    });

  });

  describe("#callMethodOnService(id, req, serviceInstance, res, logParameters)", function() {
    var
      multiResponseModeServiceMock,
      sessionStore,
      req;
    beforeEach(function() {
      sessionStore = {
        getContainer: sinon.stub().returns(serverSideContainer),
      };
      env.addServiceMock('session_store', sessionStore);

      serverSideContainer.addDefinition('multi-response-mode-service-mock', {
        shared: true,
        cls: 'Foo.Bar.MultResponseModeThing',
        options: {},
        remoting: {
          mode: 'any',
          defaults: {
            responseMode: 'syncCall'
          },
          methods: {
            responsePassingStub: {
              responseMode: 'responsePassing'
            },
            callbackWrappingStub: {
              responseMode: 'callbackWrapping'
            }
          }
        }
      });

      multiResponseModeServiceMock = {
        syncCallStub: function(foo, bar)
        {
          return foo + bar;
        },

        responsePassingStub:  function(res, foo, bar)
        {
          this.sendResult(res, {
            result: foo + bar,
          });
        },
        sendResult: sinon.stub(),

        callbackWrappingStub: function(callback, foo, bar)
        {
          callback(undefined, foo + bar);
        }
      };

      sinon.spy(multiResponseModeServiceMock, 'syncCallStub');
      sinon.spy(multiResponseModeServiceMock, 'responsePassingStub');
      sinon.spy(multiResponseModeServiceMock, 'callbackWrappingStub');

      req = {
        param: sinon.stub()
      }
      req.param.withArgs("arguments").returns(['foo', 'bar']);

      sinon.stub(router, "sendResult");
    });

    it("should make a sync call if syncCall is set as response Mode", function() {
      req.param.withArgs("method").returns('syncCallStub');

      router.callMethodOnService('multi-response-mode-service-mock', req, multiResponseModeServiceMock, { name: 'resMock' }, {});

      multiResponseModeServiceMock.syncCallStub.calledOnce.should.be.ok;
      multiResponseModeServiceMock.responsePassingStub.called.should.not.be.ok;
      multiResponseModeServiceMock.callbackWrappingStub.called.should.not.be.ok;

      multiResponseModeServiceMock.syncCallStub.args[0][0].should.equal('foo');
      multiResponseModeServiceMock.syncCallStub.args[0][1].should.equal('bar');

      router.sendResult.calledOnce.should.be.ok;
      router.sendResult.args[0][0].name.should.equal('resMock');
      router.sendResult.args[0][1].should.equal('foobar');
    });

    it("should pass the response if responsePassing is set as response Mode", function() {
      req.param.withArgs("method").returns('responsePassingStub');

      router.callMethodOnService('multi-response-mode-service-mock', req, multiResponseModeServiceMock, { name: 'resMock' }, {});

      multiResponseModeServiceMock.syncCallStub.called.should.not.be.ok;
      multiResponseModeServiceMock.responsePassingStub.calledOnce.should.be.ok;
      multiResponseModeServiceMock.callbackWrappingStub.called.should.not.be.ok;

      multiResponseModeServiceMock.responsePassingStub.args[0][0].name.should.equal('resMock');
      multiResponseModeServiceMock.responsePassingStub.args[0][1].should.equal('foo');
      multiResponseModeServiceMock.responsePassingStub.args[0][2].should.equal('bar');

      router.sendResult.called.should.not.be.ok;
    });

    it("should wrap the callback if callbackWrapping is set as response Mode", function() {
      req.param.withArgs("method").returns('callbackWrappingStub');

      router.callMethodOnService('multi-response-mode-service-mock', req, multiResponseModeServiceMock, { name: 'resMock' }, {});

      multiResponseModeServiceMock.syncCallStub.called.should.not.be.ok;
      multiResponseModeServiceMock.responsePassingStub.called.should.not.be.ok;
      multiResponseModeServiceMock.callbackWrappingStub.calledOnce.should.be.ok;

      (typeof multiResponseModeServiceMock.callbackWrappingStub.args[0][0]).should.equal('function');
      multiResponseModeServiceMock.callbackWrappingStub.args[0][1].should.equal('foo');
      multiResponseModeServiceMock.callbackWrappingStub.args[0][2].should.equal('bar');

      router.sendResult.calledOnce.should.be.ok;
      router.sendResult.args[0][0].name.should.equal('resMock');
      router.sendResult.args[0][1].should.equal('foobar');
    });

    afterEach(function() {
      router.sendResult.restore();
    });
  });
});
