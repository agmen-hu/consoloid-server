require('../BaseFinder');
require('consoloid-framework/Consoloid/Test/UnitTest');
describeUnitTest('Consoloid.Server.Resource.BaseFinder', function() {
  var
    finder;

  beforeEach(function() {
    finder = env.create('Consoloid.Server.Resource.BaseFinder', {});
  });

  describe('#locateResource(pattern)', function() {
    it('should locate the first resource matching pattern', function() {
      finder.globSync = sinon.stub().returns(['first-match', 'second-match']);

      finder.locateResource('anything')
        .should.eql('first-match');
    });

    it('should throw exception when none of the resources matches the pattern', function() {
      (function() {
        finder.locateResource('nonexistent-resource1.txt');
      }).should.throwError(/Resource not found in any installed Consoloid module/);
    });

    it('should not search resource directories when absolute path is provided as pattern', function() {
      sinon.spy(finder, 'globSync');

      finder.locateResource('/test1/nonexistent-file1.txt');

      finder.globSync.called.should.not.be.true;
    });
  });
});
