require('../../Cache/NoBootCacheBuilder');
require('../BaseLoader');
require('../SessionLoader');
require('consoloid-framework/Consoloid/Base/DeepAssoc');
require('consoloid-framework/Consoloid/Test/UnitTest');
describeUnitTest('Consoloid.Server.Resource.SessionLoader', function(){
  var
    finder,
    configParser,
    resourceLoader,
    webserverMock,
    bootCacheMock;

  beforeEach(function() {
    webserverMock = {
      setAsStaticDirectory: function(){}
    };
    env.addServiceMock('webserver', webserverMock);

    bootCacheMock = {
      getState: function() {}
    };
    env.addServiceMock('boot_cache_builder', bootCacheMock);

    env.addServiceMock('config_parser', { parseTopicParameters: function(topic) {
      return {
        module1:{service:'test_service'},
        module2:{service:'unknown'},
        test_repository:{cls: 'Consoloid.Test.Repository'}
      };
    }});

    finder = {
      globSync: sinon.stub().returns([]),
      readSync: sinon.stub(),
      locateResource: sinon.stub(),
    };

    finder.globSync.withArgs('module1.services').returns(['test/module1.services']);
    finder.readSync.withArgs('test/module1.services').returns("definitions:\n  test_service: {}");

    configParser = {
      parseTopicParameters: sinon.stub().returns({})
    };

    resourceLoader = env.create('Consoloid.Server.Resource.SessionLoader', {
      resourceDirectories: ['node_modules/consoloid-server/Consoloid/Server/test/resources/*' ],
      finder: finder,
      configParser: configParser
    });
  });

  describe('#getJsToBoot()', function() {
    it('should collect and concatenate js code required to start Consoloid', function() {
      finder.readSync = function(resourceName) {
        return resourceName;
      };

      var result = resourceLoader.getJsToBoot();

      result.should.include('window.global = window;');
      result.should.include('Consoloid/Base/Object.js');
    });
  });

  describe('#getDefinitions(topic)', function() {
    it('should return service definitions for given topic', function() {
      var result = resourceLoader.getDefinitions('module1');
      result.should.have.property('test_service');
    });

    it('should throw error when there isn\'t any service in topic', function() {
      (function() { resourceLoader.getDefinitions('invalidmodule'); }).should.throwError(/There isn't any service in topic/);
    });

    it('should load server-side services for the topic', function() {
      finder.globSync.withArgs('module1.remoteservices').returns(['test/module1.remoteservices']);
      finder.readSync.withArgs('test/module1.remoteservices').returns("definitions:\n  test_repository: {}");

      resourceLoader.getDefinitions('module1');

      finder.readSync.calledWith('test/module1.remoteservices').should.be.ok;
      resourceLoader.container.definitions.should.have.property('test_repository');
    });

    it('should export the module directory as static content', function() {
      sinon.spy(webserverMock, 'setAsStaticDirectory');

      resourceLoader.getDefinitions('module1');

      webserverMock.setAsStaticDirectory.calledOnce.should.be.ok;
    });

    it('should instantiate remote services tagged create-on-topic-load', function() {
      sinon.spy(resourceLoader.container, 'getAllTagged');

      resourceLoader.getDefinitions('module1');

      resourceLoader.container.getAllTagged.calledOnce.should.be.ok;
      resourceLoader.container.getAllTagged.calledWith([ 'topic.module1', 'create-on-topic-load']).should.be.ok;
    });

    it('should replace the parameters with their values', function(){
      finder.readSync.withArgs('test/module1.services').returns(
        "definitions:\n  test_service: { options: { test: '%param1%' } }"
      );

      resourceLoader.parameters.set('param1', 'test')

      var module1ServiceDefinitions = resourceLoader.getDefinitions('module1');

      finder.readSync.calledWith('test/module1.services').should.be.ok;
      module1ServiceDefinitions.test_service.options.test.should.be.eql('test');
    });

    it("should store topic definitions for later use in session in storedDefinitions a property", function() {
      sinon.stub(bootCacheMock, "getState").returns(Consoloid.Server.Cache.NoBootCacheBuilder.BOOTED);
      resourceLoader.storedDefinitions = { original_topic: { service: "Foo.Foo" } };

      resourceLoader.getDefinitions("module1");

      resourceLoader.storedDefinitions.should.have.property('module1');
      resourceLoader.storedDefinitions.should.have.property('original_topic');

      bootCacheMock.getState.restore();
    });

    it("should not store definitions if boot cache builder is booting state", function() {
      sinon.stub(bootCacheMock, "getState").returns(Consoloid.Server.Cache.NoBootCacheBuilder.BOOTING);

      resourceLoader.getDefinitions("module1");
      resourceLoader.storedDefinitions.should.not.have.property('module1');

      bootCacheMock.getState.restore();
    });

  });

  describe('#getJs()', function() {
    it('should return content of javascript resource', function() {
      finder.readSync.withArgs('Consoloid/Base/Object.js').returns('ok');

      var js = resourceLoader.getJs('Consoloid/Base/Object');

      js.should.equal('ok');
    });

    it('should throw error when the resource is missing', function() {
      finder.readSync.withArgs('Consoloid/NonExistent/Thing.js').throws();

      (function() {
        resourceLoader.getJs('Consoloid/NonExistent/Thing');
      }).should.throwError();
    });
  });

  describe('#getTemplate()', function() {
    it('should return contents of matching template files', function() {
      finder.globSync.withArgs('Test/*.jqote').returns(['module1.jqote', 'module2.jqote']);
      finder.readSync.withArgs('module1.jqote').returns("tpl1");
      finder.readSync.withArgs('module2.jqote').returns("tpl2");

      var template = resourceLoader.getTemplate('Test-Template');

      template.should.include('tpl1');
      template.should.include('tpl2');
    });

    it('should throw error when the file is missing', function() {
      (function() { resourceLoader.getTemplate('Invalid-Template'); }).should.throwError(/Template not found/);
    });
  });

  describe('#getTopics()', function() {
    it('should return array of topic details', function() {
      finder.globSync.withArgs('*.topic').returns(['module1.topic', 'module2.topic']);
      finder.readSync.withArgs('module1.topic').returns("name: foo");
      finder.readSync.withArgs('module2.topic').returns("name: bar");

      var result = resourceLoader.getTopics();

      result.should.have.lengthOf(2);
      result[0].name.should.equal('foo');
      result[1].name.should.equal('bar');
    });
  });

  describe("__storeTopicDefinitions()", function() {
    it("should never store framework, console topic, since they are loaded by default", function() {
      sinon.stub(bootCacheMock, "getState").returns(Consoloid.Server.Cache.NoBootCacheBuilder.BOOTED);
      resourceLoader.storedDefinitions = {};

      resourceLoader.__storeTopicDefinitions("framework", {});
      resourceLoader.__storeTopicDefinitions("console", {});

      resourceLoader.storedDefinitions.should.not.have.property('framework');
      resourceLoader.storedDefinitions.should.not.have.property('console');

      bootCacheMock.getState.restore();
    });
  });

  describe("#getStoredDefinitions()", function() {
    it('should return the stored definitions', function() {
      sinon.stub(bootCacheMock, "getState").returns(Consoloid.Server.Cache.NoBootCacheBuilder.BOOTED);
      resourceLoader.getDefinitions("module1");

      resourceLoader.getStoredDefinitions().should.have.property('module1');
      bootCacheMock.getState.restore();
    });
  });
});
