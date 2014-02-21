require('consoloid-framework/Consoloid/Test/UnitTest');
require('../NoCache.js');
require('../Cache');
describeUnitTest('Consoloid.Server.Cache.Cache', function(){
    var
      env,
      cache;

    beforeEach(function(){
      env = new Consoloid.Test.Environment();
      cache = env.create('Consoloid.Server.Cache.Cache', {});
    });

    describe('#store(key, value)', function(){
      it('should return itself', function(){
        cache.store('key', 'value').should.be.eql(cache);
      });
    });

    describe('#get(key)', function(){
      it('should return the stored value', function(){
        cache.store('key', 'value').get('key').should.be.eql('value');
      });
    });
});
