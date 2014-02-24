require('../BaseFinder');
require('../FileFinder');
require('consoloid-framework/Consoloid/Test/UnitTest');
describeUnitTest('Consoloid.Server.Resource.FileFinder', function() {
  var
    finder,
    projectPrefix = __dirname + '/../../../../';

  beforeEach(function() {
    finder = env.create('Consoloid.Server.Resource.FileFinder', {
      resourceDirectories: [
        'Consoloid/Server/Resource/test/resources/*',
        'Consoloid/Server/Resource/test/otherResources/*'
      ],
      projectRoot: projectPrefix
    });
  });

  describe('#__constructor()', function() {
    it('should require resource directories to be specified', function() {
      (function() {
        env.create('Consoloid.Server.Resource.FileFinder', { projectRoot: 'foo' });
      }).should.throwError(/resourceDirectories must be injected/);
    });

    it('should require project root to be specified', function() {
      (function() {
        env.create('Consoloid.Server.Resource.FileFinder', { resourceDirectories: 'foo' });
      }).should.throwError(/projectRoot must be injected/);
    });

    describe('should make resource directory', function() {
      it('absolute when relative', function() {
        finder.resourceDirectories[0]
          .should.equal(projectPrefix + 'Consoloid/Server/Resource/test/resources/*/');
        finder.resourceDirectories[1]
          .should.equal(projectPrefix + 'Consoloid/Server/Resource/test/otherResources/*/');
      });

      it('unchanged when absolute', function() {
        finder = env.create('Consoloid.Server.Resource.FileFinder', {
          resourceDirectories: [
            '/tmp'
          ],
          projectRoot: projectPrefix
        });

        finder.resourceDirectories[0].should.equal('/tmp/');
      });
    })
  });

  describe('#globSync(pattern)', function() {
    it('should return empty array when no such resource exists', function() {
      finder.globSync('*.nonexistent').should.eql([]);
    });

    it('should return file names matching pattern in any configured resource directory', function() {
      var result = finder.globSync('Namespace1/Sub/Resource.js');

      result.length.should.equal(3);
      result.should.include(__dirname + '/resources/module1/Namespace1/Sub/Resource.js');
      result.should.include(__dirname + '/resources/module2/Namespace1/Sub/Resource.js');
      result.should.include(__dirname + '/otherResources/module/Namespace1/Sub/Resource.js');

      result = finder.globSync('Test/Resource.js');

      result.length.should.equal(1);
      result.should.include(__dirname + '/resources/module2/Test/Resource.js');

      result = finder.globSync('Namespace1/Sub/Resource.txt');

      result.length.should.equal(1);
      result.should.include(__dirname + '/resources/module1/Namespace1/Sub/Resource.txt');

      result = finder.globSync('Namespace1/Sub/Resource.*');

      result.length.should.equal(4);
      result.should.include(__dirname + '/resources/module1/Namespace1/Sub/Resource.txt');
      result.should.include(__dirname + '/resources/module1/Namespace1/Sub/Resource.js');
      result.should.include(__dirname + '/resources/module2/Namespace1/Sub/Resource.js');
      result.should.include(__dirname + '/otherResources/module/Namespace1/Sub/Resource.js');
    });
  });

  describe('#read(callback, resourceName)', function() {
    it('should pass error to callback when the resource does not exist', function(done) {
      finder.read(function(err, data) {
        err.should.equal('Error: Resource not found in any installed Consoloid module; resource name="test.missing"');
        done();
      }, 'test.missing');
    });

    it('should return data to callback when the file is readable', function(done) {
      finder.read(function(err, data) {
        data.should.equal('test');
        done();
      }, 'Namespace1/Sub/Resource.txt');
    });

    it('should return the data from the first resource when multiple resource matches resourceName', function(done) {
      finder.read(function(err, data) {
        data.should.equal('test');
        done();
      }, 'Namespace1/Sub/Resource.*');
    });
  });

  describe('#readSync(resourceName)', function() {
    it('should throw error the resource does not exist', function() {
      (function() {
        finder.readSync('test.missing');
      }).should.throwError();
    });

    it('should return data when the file is readable', function() {
      finder.readSync('Namespace1/Sub/Resource.txt').should.equal('test');
    });
  });
});
