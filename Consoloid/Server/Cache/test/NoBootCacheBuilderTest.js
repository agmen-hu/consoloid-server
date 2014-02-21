require('consoloid-framework/Consoloid/Test/UnitTest');

require('../NoBootCacheBuilder');
describeUnitTest('Consoloid.Server.Cache.NoBootCacheBuilder', function(){
    var
      env,
      bootCacheBuilder;

    beforeEach(function(){
      env = new Consoloid.Test.Environment();
      bootCacheBuilder = env.create('Consoloid.Server.Cache.NoBootCacheBuilder', {});
    });

    describe("#__constructor()", function() {
      it('should add the default state', function() {
        bootCacheBuilder.should.have.property("state", Consoloid.Server.Cache.NoBootCacheBuilder.BOOTED);
      });
    });

    describe("#getState()", function() {
      it('should return state', function() {
        bootCacheBuilder.state = Consoloid.Server.Cache.NoBootCacheBuilder.NOT_BOOTED;
        bootCacheBuilder.getState().should.equal(Consoloid.Server.Cache.NoBootCacheBuilder.NOT_BOOTED);

        bootCacheBuilder.state = Consoloid.Server.Cache.NoBootCacheBuilder.BOOTING;
        bootCacheBuilder.getState().should.equal(Consoloid.Server.Cache.NoBootCacheBuilder.BOOTING);

        bootCacheBuilder.state = Consoloid.Server.Cache.NoBootCacheBuilder.BOOTED;
        bootCacheBuilder.getState().should.equal(Consoloid.Server.Cache.NoBootCacheBuilder.BOOTED);
      });
    });

    describe('#start(req)', function(){
      it('should do nothing', function( ){
        bootCacheBuilder.state = Consoloid.Server.Cache.NoBootCacheBuilder.NOT_BOOTED;
        bootCacheBuilder.start();
        bootCacheBuilder.state.should.be.eql(Consoloid.Server.Cache.NoBootCacheBuilder.NOT_BOOTED);
      });
    });

    describe('#finish()', function(){
      it('should do nothing', function( ){
        bootCacheBuilder.state = Consoloid.Server.Cache.NoBootCacheBuilder.BOOTING;
        bootCacheBuilder.finish();
        bootCacheBuilder.state.should.be.eql(Consoloid.Server.Cache.NoBootCacheBuilder.BOOTING);
      });
    });

    describe('#addBootJS(js)', function(){ describeAddMethod('addBootJS', 'bootJavascript') });

    function describeAddMethod(method, property)
    {
      it('should return itself', function(){
        bootCacheBuilder[method]('content').should.be.eql(bootCacheBuilder);
      });

      it('should store nothing', function(){
        bootCacheBuilder[method]('boot');
        (bootCacheBuilder[property] == undefined).should.be.true;
      })
    }

    describe('#addJS(js)', function(){ describeAddMethod('addJS', 'javascript') });

    describe('#addTemplate(jquote)', function(){ describeAddMethod('addTemplate', 'templates') });

    describe('#addClass(classDefinition)', function(){ describeAddMethod('addClass', 'classes') });
});
