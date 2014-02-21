if (!('ChainedContainer' in Consoloid.Service)) {
  require('consoloid-framework/Consoloid/Service/ChainedContainer');
}
require('../ServerSideContainer.js');
require('../SessionStore.js');
require('consoloid-framework/Consoloid/Test/UnitTest');
require('consoloid-framework/Consoloid/Error/UserMessage');
describeUnitTest('Consoloid.Server.SessionStore', function() {
  var
    store,
    logMock,
    sourceStore,
    memoryStore;

  beforeEach(function() {
    store = env.create('Consoloid.Server.SessionStore', {
      sourceStore: './test/test/StoreMock.js',
      sourceOptions: {
        fooption: "bar"
      }
    });
    logMock = sinon.stub();
    env.addServiceMock('logger', { log: logMock });

    sourceStore = require('./test/StoreMock.js');
    memoryStore = require('express/node_modules/connect/lib/middleware/session/memory');
  });

  describe("#__constructor()", function() {
    it('should create a memory store if no requirement string added ', function() {
      store = env.create('Consoloid.Server.SessionStore', { });
      (store.sourceStore instanceof memoryStore).should.be.ok;
    });

    it('should require whatever session store requirement string was added, and add the options to it', function() {
      (store.sourceStore instanceof sourceStore).should.be.ok;
      store.sourceStore.options.fooption.should.equal("bar");
    });
  });

  describe("#destroy()", function() {
    beforeEach(function() {
      sinon.stub(store, "removeContainer");
      store.destroy('3.14sid');
    });

    it('should attempt to remove ServerSideContainer belonging to sid', function() {
      store.removeContainer.calledWith('3.14sid').should.be.ok;
    });

    it('should log about this being called', function() {
      logMock.calledOnce.should.be.true;
    });

    it("should call destroy on source session store", function() {
      store.sourceStore.destroy.called.should.be.ok;
    });
  });

  describe("#get(), #set(), #all(), #clear(), #length(), #regenerate(), #load(), #createSession()", function() {
    it('should call these functions on source store;', function() {
      store.get('bunch', 'of', 'arguments');
      store.sourceStore.get.calledOnce.should.be.ok;
      store.sourceStore.get.calledWith('bunch', 'of', 'arguments');
      store.set('bunch', 'of', 'arguments');
      store.sourceStore.set.calledOnce.should.be.ok;
      store.sourceStore.set.calledWith('bunch', 'of', 'arguments');
      store.all('bunch', 'of', 'arguments');
      store.sourceStore.all.calledOnce.should.be.ok;
      store.sourceStore.all.calledWith('bunch', 'of', 'arguments');
      store.clear('bunch', 'of', 'arguments');
      store.sourceStore.clear.calledOnce.should.be.ok;
      store.sourceStore.clear.calledWith('bunch', 'of', 'arguments');
      store.length('bunch', 'of', 'arguments');
      store.sourceStore.length.calledOnce.should.be.ok;
      store.sourceStore.length.calledWith('bunch', 'of', 'arguments');
      store.regenerate('bunch', 'of', 'arguments');
      store.sourceStore.regenerate.calledOnce.should.be.ok;
      store.sourceStore.regenerate.calledWith('bunch', 'of', 'arguments');
      store.load('bunch', 'of', 'arguments');
      store.sourceStore.load.calledOnce.should.be.ok;
      store.sourceStore.load.calledWith('bunch', 'of', 'arguments');
      store.createSession('bunch', 'of', 'arguments');
      store.sourceStore.createSession.calledOnce.should.be.ok;
      store.sourceStore.createSession.calledWith('bunch', 'of', 'arguments');
      store.on('bunch', 'of', 'arguments');
      store.sourceStore.on.calledOnce.should.be.ok;
      store.sourceStore.on.calledWith('bunch', 'of', 'arguments');
    });
  });

  describe('#getContainer(req)', function() {
    var req;
    beforeEach(function() {
      req = {
        sessionID: "foobar",
        ip: "111.111.111.111"
      }
    });
    it('should return container for session ID', function() {
      store.containers['foobar'] = "barfoo";
      store.getContainer(req).should.equal("barfoo");
    })

    it("should throw error and log if container for session ID does not exist", function() {
      (function() {
        logMock.calledOnce.should.be.true;
        store.getContainer(req)
      }).should.throw();
    });
  });

  describe('#addContainer(sid, container)', function() {
    it('should return container for session ID', function() {
      store.addContainer('foobar', "barfoo");
      store.containers['foobar'].should.equal("barfoo");
    })
  });

  describe('#removeContainer(sid)', function() {
    it('should remove container for session ID', function() {
      store.addContainer('foobar', "barfoo");
      store.removeContainer('foobar');
      (store.containers['foobar'] === undefined).should.be.ok;
    })
  });

  describe('#hasContainer(sid)', function() {
    it('should return true if there is a container for session ID', function() {
      store.hasContainer('foobar').should.equal.false;

      store.addContainer('foobar', "barfoo");
      store.hasContainer('foobar').should.equal.true;
    })
  });
});