var should = require("should");

require('../NoCache');
describe('Consoloid.Server.Cache.NoCache', function(){
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
        should.strictEqual(cache.get('key'), undefined);
      });
    });

    afterEach(function(){
      env.shutdown();
    });
});