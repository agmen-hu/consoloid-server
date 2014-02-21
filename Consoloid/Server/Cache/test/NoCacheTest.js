require('consoloid-framework/Consoloid/Test/UnitTest');

require('../NoCache');
describeUnitTest('Consoloid.Server.Cache.NoCache', function(){
    var
      env,
      cache;

    beforeEach(function(){
      env = new Consoloid.Test.Environment();
      cache = env.create('Consoloid.Server.Cache.NoCache', {});
    });

    describe('#store(key, value)', function(){
      it('should return itself', function(){
        cache.store('key', 'value').should.be.eql(cache);
      });
    });

    describe('#get(key)', function(){
      it('should return nothing', function(){
        cache.store('key', 'value');
        (cache.get('key') == undefined).should.be.true;
      });
    });

    afterEach(function(){
      env.shutdown();
    });
});
