require('consoloid-framework/Consoloid/Base/DeepAssoc');
require('../BaseFinder');
require('../FileFinder');
require('../BaseLoader');
require('../WebserverLoader');
require('consoloid-framework/Consoloid/Test/UnitTest');
describeUnitTest('Consoloid.Server.Resource.WebserverLoader', function() {
  var
    finder,
    configParser,
    webserver,
    loader;

  beforeEach(function() {
    finder = {
      globSync: sinon.stub().returns([]),
      readSync: sinon.stub(),
      locateResource: sinon.stub()
    };

    configParser = {
      parseTopicParameters: sinon.stub().returns({})
    };

    webserver = {
      setAsStaticDirectory: sinon.spy()
    };
    env.addServiceMock('webserver', webserver);

    loader = env.create('Consoloid.Server.Resource.WebserverLoader', {
      finder: finder,
      configParser: configParser,
      yamlParser: { load: function(yaml) { return yaml; } },
      projectRoot: __dirname + '/../../../../../../'
    });
  })

  describe('#__loadClass(event, className)', function() {
    it('should locate class file and call require on it', function() {
      finder.locateResource.returns('../Service.js');

      loader.__loadClass(undefined, 'Consoloid.Server.Service');

      finder.locateResource.calledOnce.should.be.ok;
      finder.locateResource.calledWith('Consoloid/Server/Service.js');
    });
  });

  describe('#contructor()', function() {
    it('should export static directories through the web server', function() {
      webserver.setAsStaticDirectory.calledWith(__dirname + '/../../../../../../public/').should.be.ok;
    });
  })
});