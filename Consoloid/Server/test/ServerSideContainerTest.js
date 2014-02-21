require('consoloid-framework/Consoloid/Test/UnitTest');

defineClass('Consoloid.Server.ServerSideContainerTestService', 'Consoloid.Base.Object',
  {
    addNumbers: function(a, b)
    {
      return a + b;
    }
  }
);

if (!('ChainedContainer' in Consoloid.Service)) {
  require('consoloid-framework/Consoloid/Service/ChainedContainer');
}
require('../ServerSideContainer.js');
describeUnitTest('Consoloid.Server.ServerSideContainer', function(){
  var env;
  var container;
  var definition;

  beforeEach(function() {
    definition = {
        cls: 'Consoloid.Server.ServerSideContainerTestService',
        options: {},
        remoting: { mode: 'any' }
      };
    env = new Consoloid.Test.Environment();
    container = env.create('Consoloid.Server.ServerSideContainer', {
      sessionId: 'session_id'
    });
    container.addDefinition('test_service', definition);
  });

  describe('#__constructor()', function() {
    it('should require sessionId property', function() {
      (function() {
        env.create('Consoloid.Server.ServerSideContainer', {});
      }).should.throw("sessionId must be injected");
    });
  });

  describe('#getRemoteDefinition()', function() {
    it('should generate service definition json for a defined service', function() {
      var result = container.getRemoteDefinition('test_service');
      result.should.have.property('id', 'test_service');
      result.should.have.property('methods');
      result.methods.should.includeEql({
        name: 'addNumbers'
      });
    });

    it('should throw error for undefined service', function() {
      (function() { container.getRemoteDefinition('test_service2'); }).should.throwError(/No such definition:/);
    });

    it('should throw a different error for a defined, but not remoting service', function() {
      container.definitions = {};
      definition = {
        cls: 'Consoloid.Server.ServerSideContainerTestService',
        options: {}
      }
      container.addDefinition('test_service', definition);

      (function() { container.getRemoteDefinition('test_service'); }).should.throwError(/Service does not exist or not accessible/);
    });

    it('should include id, methods and shared flag in result', function() {
      var result = container.getRemoteDefinition('test_service');
      Object.keys(result).should.be.eql(['id', 'shared', 'methods']);
    });
  });

  afterEach(function() {
    env.shutdown();
    delete container;
  });
});
