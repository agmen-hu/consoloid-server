require('consoloid-framework/Consoloid/Base/DeepAssoc');
require('../BaseLoader');
require('consoloid-framework/Consoloid/Test/UnitTest');
describeUnitTest('Consoloid.Server.Resource.BaseLoader', function() {
  var
    finder,
    configParser,
    loader;

  beforeEach(function() {
    finder = {
      globSync: sinon.stub().returns([]),
      readSync: sinon.stub()
    };

    configParser = {
      parseTopicParameters: sinon.stub().returns({})
    };

    loader = env.create('Consoloid.Server.Resource.BaseLoader', {
      finder: finder,
      configParser: configParser,
      yamlParser: { load: function(yaml) { return yaml; } }
    });
  })

  describe('#_getServiceDefinitionsMatchingPattern(pattern)', function() {
    it('should return service definitions from config resources matching pattern', function() {
      finder.globSync.withArgs('module1').returns(['test1']);
      finder.readSync.withArgs('test1').returns({
        definitions: {
          test_service: {}
        }
      });

      var result = loader._getServiceDefinitionsMatchingPattern('module1');

      result.should.have.property('test_service');
    });

    it('should return service definitions from config resources matching *.pattern', function() {
      finder.globSync.withArgs('*.module1').returns(['test1']);
      finder.readSync.withArgs('test1').returns({
        definitions: {
          test_service: {}
        }
      });

      var result = loader._getServiceDefinitionsMatchingPattern('module1');

      result.should.have.property('test_service');
    });

    it('should replace configuration parameters in service definitions with configured values', function() {
      finder.globSync.returns(['test1']);
      finder.readSync.withArgs('test1').returns({
        definitions: {
          test_service: {
            options: '%testParameter%',
          }
        }
      });

      loader.parameters.set('testParameter', 'testValue');

      var result = loader._getServiceDefinitionsMatchingPattern('module1');
      result.test_service.options.should.equal('testValue');
    });

    it('should return empty object when none of the config resources matches pattern', function() {
      loader._getServiceDefinitionsMatchingPattern('missing.thing').should.eql({});
    });
  });

  describe('#_loadParameters(topic)', function() {
    it('should load parameters for topic using the config parser', function() {
      loader._loadParameters('test1');

      configParser.parseTopicParameters.calledOnce.should.be.true;
      configParser.parseTopicParameters.calledWith('test1').should.be.true;
    });
  });

  describe('#_loadServerDefinitions(topic)', function() {
    it('should load service definitions to container from .remoteservices file of topic', function() {
      finder.globSync.withArgs('module1.remoteservices').returns(['test/module1.remoteservices']);
      finder.readSync.withArgs('test/module1.remoteservices').returns({ definitions: { test_repository: {} } });

      loader._loadServerDefinitions('module1');

      finder.readSync.calledWith('test/module1.remoteservices').should.be.ok;
      loader.container.definitions.should.have.property('test_repository');
    });
  })
});