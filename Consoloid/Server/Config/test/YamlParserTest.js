require('../YamlParser.js');
require('consoloid-framework/Consoloid/Test/UnitTest');
describeUnitTest('Consoloid.Server.Config.YamlParser', function(){
  var
    finder,
    parser;

  beforeEach(function() {
    finder = {
      globSync: sinon.stub().returns([]),
      readSync: sinon.stub().returns('')
    };

    parser = env.create('Consoloid.Server.Config.YamlParser', {
      finder: finder,
      env: 'dev'
    });
  });

  describe('#parseTopicParameters(topic)', function() {
    it('should read and parse yaml .parameters file', function() {
      finder.globSync.withArgs('module1*.parameters').returns([ 'test/module1.parameters' ]);
      finder.readSync.withArgs('test/module1.parameters').returns("test: test");

      var config = parser.parseTopicParameters('module1');

      config.should.eql({ test: 'test' });
    });

    it('should read .parameters file from the first resource directory it exists', function() {
      finder.globSync.withArgs('module1*.parameters').returns([ 'test/module1.parameters', 'test2/module1.parameters' ]);
      finder.readSync.withArgs('test/module1.parameters').returns("test: test");

      var config = parser.parseTopicParameters('module1');

      config.should.eql({ test: 'test' });
    });

    it('should give precedence for parameters file of the environment', function() {
      finder.globSync.withArgs('module1*.parameters').returns([
        'test/module1.parameters',
        'test/module1_dev.parameters',
        'other/module1.parameters',
      ]);
      finder.readSync.withArgs('test/module1_dev.parameters').returns("test: test");

      var config = parser.parseTopicParameters('module1');

      config.should.eql({ test: 'test' });
    });

    it('should read .parameters file matching configured environment', function() {
      finder.globSync.withArgs('module1*.parameters').returns([ 'test/module1_dev.parameters', 'test2/module1.parameters' ]);
      finder.readSync.withArgs('test/module1_dev.parameters').returns("test: test");

      var config = parser.parseTopicParameters('module1');

      config.should.eql({ test: 'test' });
    });

    it('should return empty object when parameters are not found', function() {
      finder.globSync.withArgs('module1*.parameters').returns([]);

      parser.parseTopicParameters('module1')
        .should.eql({});
    });

    it('should throw error when the config is not yaml parseable', function() {
      finder.globSync.withArgs('module1*.parameters').returns([ 'test/module1_dev.parameters' ]);

      (function() {
        parser.parseTopicParameters('module1');
      }).should.throwError(/Unable to parse parameters resource/);
    });

    it('should include resources relative to config file', function() {
      finder.globSync.withArgs('module1*.parameters').returns([ 'test/module1.parameters' ]);
      finder.readSync.withArgs('test/module1.parameters').returns("include: defaults\ntest: test");
      finder.readSync.withArgs('test/defaults').returns("test: test");

      parser.parseTopicParameters('module1')
        .should.eql({ test: 'test' });
    });

    it('should recursively include other config resources given in include key', function() {
      finder.globSync.withArgs('module1*.parameters').returns([ 'test/module1.parameters' ]);
      finder.readSync.withArgs('test/module1.parameters').returns("include: defaults");
      finder.readSync.withArgs('test/defaults').returns("include: furtherDefaults");
      finder.readSync.withArgs('test/furtherDefaults').returns("test: test");

      parser.parseTopicParameters('module1')
        .should.eql({ test: 'test' });
    });

    it('should overwrite values in included resources', function() {
      finder.globSync.withArgs('module1*.parameters').returns([ 'test/module1.parameters' ]);
      finder.readSync.withArgs('test/module1.parameters').returns("include: defaults\ntest: test");
      finder.readSync.withArgs('test/defaults').returns("include: furtherDefaults");
      finder.readSync.withArgs('test/furtherDefaults').returns("test: bar");

      parser.parseTopicParameters('module1')
        .should.eql({ test: 'test' });
    });
  });
});
