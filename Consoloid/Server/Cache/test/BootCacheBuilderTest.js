require('consoloid-framework/Consoloid/Base/DeepAssoc');
require('consoloid-framework/Consoloid/Test/UnitTest');
require('../NoBootCacheBuilder');
require('../BootCacheBuilder');
describeUnitTest('Consoloid.Server.Cache.BootCacheBuilder', function(){
  var
    env,
    bootCacheBuilder;

  beforeEach(function() {
    env = new Consoloid.Test.Environment();
    bootCacheBuilder = env.create('Consoloid.Server.Cache.BootCacheBuilder', {});
  });

  describe('#lastRequestIsBootable()', function(){
    it('should return false if the last request is not bootable', function(){
      bootCacheBuilder.lastRequestIsBootable().should.be.false;
    });

    it('should return false if the last request is not bootable', function(){
      bootCacheBuilder._lastRequestIsBootable = true;
      bootCacheBuilder.lastRequestIsBootable().should.be.true;
    });
  });

  describe('#decideRequestIsBootable(req)', function(){
    it('should set false if request sessionID is not same as current boot session id', function(){
      bootCacheBuilder.decideRequestIsBootable({sessionID: 123456});
      bootCacheBuilder.lastRequestIsBootable().should.be.false;

      bootCacheBuilder.sessionID = 123;
      bootCacheBuilder.decideRequestIsBootable({sessionID: 123456});
      bootCacheBuilder.lastRequestIsBootable().should.be.false;
    });

    it('should set true if request sessionID is same as current boot session id', function(){
      bootCacheBuilder.sessionID = 123456;
      bootCacheBuilder.decideRequestIsBootable({sessionID: 123456});
      bootCacheBuilder.lastRequestIsBootable().should.be.true;
    });
  });

  describe('#start(req)', function(){
    var
      startEventSpy,
      start = function(state, sessionID)
      {
        bootCacheBuilder.state = state || Consoloid.Server.Cache.BootCacheBuilder.NOT_BOOTED;
        bootCacheBuilder.start({sessionID: sessionID || 'alma'});
      }

    beforeEach(function(){
      startEventSpy = sinon.spy();
      $(document).bind('Consoloid.Server.Cache.Boot.started', startEventSpy);

      env.mockConsoleLog();
    });

    describe('when state is not NOT_BOOTED', function(){
      it('should not trigger a Consoloid.Server.Cache.Boot.started event', function(){
        start(Consoloid.Server.Cache.BootCacheBuilder.BOOTING);
        startEventSpy.called.should.be.false;
      });

      it('should not set the session id', function(){
        start(Consoloid.Server.Cache.BootCacheBuilder.BOOTED);
        bootCacheBuilder.sessionID.should.be.false;
      });

      it('should not change the state', function(){
        start(Consoloid.Server.Cache.BootCacheBuilder.BOOTING);
        bootCacheBuilder.state.should.be.eql(Consoloid.Server.Cache.BootCacheBuilder.BOOTING);
      });

      it('should not reset the boot values', function(){
        bootCacheBuilder.classes = [['alma']];
        bootCacheBuilder.classDefinitions = {'Consoloid.Test.Class': 'defineClass'};
        bootCacheBuilder.templates = 'templates';
        bootCacheBuilder.bootJavascript = 'boot';
        bootCacheBuilder.javascript = 'javascript';

        start(Consoloid.Server.Cache.BootCacheBuilder.BOOTED);

        bootCacheBuilder.classes.should.be.not.empty;
        bootCacheBuilder.classDefinitions.should.have.property('Consoloid.Test.Class');
        bootCacheBuilder.templates.should.be.ok;
        bootCacheBuilder.bootJavascript.should.be.ok;
        bootCacheBuilder.javascript.should.be.ok;
      });
    });

    describe('when state is NOT_BOOTED', function(){
      it('should trigger an Consoloid.Server.Cache.Boot.started event', function(){
        start();
        startEventSpy.called.should.be.true;
      });

      it('should set the session id', function(){
        start();
        bootCacheBuilder.sessionID.should.be.eql('alma');
      });

      it('should change the state to Consoloid.Server.Cache.BootCacheBuilder.BOOTING', function(){
        start();
        bootCacheBuilder.state.should.be.eql(Consoloid.Server.Cache.BootCacheBuilder.BOOTING);
      });

      it('should reset the boot values', function(){
        bootCacheBuilder.classes = [['alma']];
        bootCacheBuilder.classDefinitions = {'Consoloid.Test.Class': 'defineClass'};
        bootCacheBuilder.templates = 'templates';
        bootCacheBuilder.bootJavascript = 'boot';
        bootCacheBuilder.javascript = 'javascript';

        start();

        bootCacheBuilder.classes.should.be.empty;
        bootCacheBuilder.classDefinitions.should.not.have.property('Consoloid.Test.Class');
        bootCacheBuilder.templates.should.be.not.ok;
        bootCacheBuilder.bootJavascript.should.be.not.ok;
        bootCacheBuilder.javascript.should.be.not.ok;
      });
    });
  });

  describe('#__isBootable()', function(){
    it('should return false if last request is not bootable', function(){
      bootCacheBuilder._lastRequestIsBootable = false;
      bootCacheBuilder.__isBootable().should.be.false;
    });

    it('should return false if the state is not Consoloid.Server.Cache.BootCacheBuilder.BOOTING', function(){
      bootCacheBuilder._lastRequestIsBootable = true;
      bootCacheBuilder.state = Consoloid.Server.Cache.BootCacheBuilder.NOT_BOOTED;
      bootCacheBuilder.__isBootable().should.be.false;

      bootCacheBuilder.state = Consoloid.Server.Cache.BootCacheBuilder.BOOTED;
      bootCacheBuilder.__isBootable().should.be.false;
    });

    it('should return true if last request is bootable and the state is Consoloid.Server.Cache.BootCacheBuilder.BOOTING', function(){
      bootCacheBuilder._lastRequestIsBootable = true;
      bootCacheBuilder.state = Consoloid.Server.Cache.BootCacheBuilder.BOOTING;
      bootCacheBuilder.__isBootable().should.be.true;
    });
  })

  describe('#addBootJS(js)', function() { describeAddMethod('addBootJS', 'bootJavascript', 'korte') });

  function describeAddMethod(methodName, property, expected)
  {
    beforeEach(startBeforeEach);

    it('should not store if it is not bootable', function(){
      bootCacheBuilder.__isBootable.returns(false);
      bootCacheBuilder[property] = 'alma;';
      bootCacheBuilder[methodName]('korte');
      bootCacheBuilder[property].should.be.eql('alma;');
    });

    it('should store if it is bootable', function(){
      bootCacheBuilder[property] = 'alma;';
      bootCacheBuilder[methodName]('korte');
      bootCacheBuilder[property].should.be.eql(expected);
    });
  }

  function startBeforeEach()
  {
    env.mockConsoleLog();

    sinon.stub(bootCacheBuilder, '__isBootable').returns(true);
    bootCacheBuilder.start({sessionID: 'session'});
  }

  describe('#addJS(js)', function() { describeAddMethod('addJS', 'javascript', 'alma;\r\nkorte;') });

  describe('#addTemplate(jquote)', function() { describeAddMethod('addTemplate', 'templates', 'alma;\r\nkorte') });

  describe('#addClass(classDefinition)', function(){

    function define(cls, parentCls)
    {
      return 'defineClass("' + cls + '", "'+parentCls+'", {})';
    }

    beforeEach(startBeforeEach);

    it('should not store if it is not bootable', function(){
      bootCacheBuilder.__isBootable.returns(false);
      bootCacheBuilder.addClass(define('Class', 'Unknown'));
      bootCacheBuilder.classes.should.be.empty;
    });

    it('should store class if it is bootable', function(){
      bootCacheBuilder.addClass(define('Class', 'Unknown'));
      bootCacheBuilder.classes.should.be.not.empty;
      bootCacheBuilder.classes[0][0].should.be.eql('Class');
      bootCacheBuilder.classes[0][1].should.be.eql('Unknown');
    });

    it('should watch for class dependencies', function(){
      bootCacheBuilder.addClass(define('Class', 'Unknown'));
      bootCacheBuilder.classes[0][0].should.be.eql('Class');

      bootCacheBuilder.addClass(define('GrandGrandClass', 'GrandClass'));
      bootCacheBuilder.classes[0][0].should.be.eql('Class');
      bootCacheBuilder.classes[1][0].should.be.eql('GrandGrandClass');

      bootCacheBuilder.addClass(define('GrandClass', 'SubClass'));
      bootCacheBuilder.classes[0][0].should.be.eql('Class');
      bootCacheBuilder.classes[1][0].should.be.eql('GrandClass');
      bootCacheBuilder.classes[2][0].should.be.eql('GrandGrandClass');

      bootCacheBuilder.addClass(define('SubClass', 'Class'));
      bootCacheBuilder.classes[0][0].should.be.eql('Class');
      bootCacheBuilder.classes[1][0].should.be.eql('SubClass');
      bootCacheBuilder.classes[2][0].should.be.eql('GrandClass');
      bootCacheBuilder.classes[3][0].should.be.eql('GrandGrandClass');

      bootCacheBuilder.addClass('defineClass("Class2", {})');
      bootCacheBuilder.classes[0][0].should.be.eql('Class');
      bootCacheBuilder.classes[1][0].should.be.eql('SubClass');
      bootCacheBuilder.classes[2][0].should.be.eql('GrandClass');
      bootCacheBuilder.classes[3][0].should.be.eql('GrandGrandClass');
      bootCacheBuilder.classes[4][0].should.be.eql('Class2');
      bootCacheBuilder.classes[4][1].should.be.eql('');
    });
  });

  describe('#finish()', function(){

    beforeEach(startBeforeEach);

    describe('when it is not bootable', function(){

      beforeEach(function(){
        bootCacheBuilder.__isBootable.returns(false);
      });

      it('should not trigger a Consoloid.Server.Cache.Boot.finished event', function(){
        var finishEventSpy = sinon.spy();
        $(document).bind('Consoloid.Server.Cache.Boot.finished', finishEventSpy);

        bootCacheBuilder.finish();
        finishEventSpy.called.should.be.false;
      });

      it('should not reset the values', function(){
        bootCacheBuilder.bootJavascript = 'alma';
        bootCacheBuilder.javascript = 'alma';
        bootCacheBuilder.templates = 'alma';
        bootCacheBuilder.classes = [['cls', 'parentCls']];

        bootCacheBuilder.finish();

        bootCacheBuilder.sessionID.should.be.eql('session');
        bootCacheBuilder.state.should.be.eql(Consoloid.Server.Cache.BootCacheBuilder.BOOTING);
        bootCacheBuilder.bootJavascript.should.be.not.empty;
        bootCacheBuilder.javascript.should.be.not.empty;
        bootCacheBuilder.templates.should.be.not.empty;
        bootCacheBuilder.classes.should.be.not.empty;
      });

      it('should store nothing in the cache', function(){
        env.addServiceMock('cache', { store: sinon.spy() });
        bootCacheBuilder.finish();

        env.container.get('cache').store.called.should.false;
      });
    });

    describe('when it is bootable', function(){

      beforeEach(function(){
        var cache = { store: function() { return this; } }
        sinon.spy(cache, 'store');
        env.addServiceMock('cache', cache);

        bootCacheBuilder.bootJavascript = 'boot\r\n';
        bootCacheBuilder.javascript = 'javascript';
        bootCacheBuilder.templates = 'templates';
        bootCacheBuilder.classes = [['cls', 'parentCls']];
        bootCacheBuilder.classDefinitions = {'cls': 'defineClass("cls");'};
      });

      it('should trigger a Consoloid.Server.Cache.Boot.finished event', function(){
        var finishEventSpy = sinon.spy();
        $(document).bind('Consoloid.Server.Cache.Boot.finished', finishEventSpy);

        bootCacheBuilder.finish();

        finishEventSpy.called.should.be.true;
      });

      it('should reset the values', function(){
        bootCacheBuilder.finish();

        bootCacheBuilder.sessionID.should.be.false;
        bootCacheBuilder.state.should.be.eql(Consoloid.Server.Cache.BootCacheBuilder.BOOTED);
        (bootCacheBuilder.bootJavascript == undefined).should.be.true;
        (bootCacheBuilder.javascript == undefined).should.be.true;
        (bootCacheBuilder.templates == undefined).should.be.true;
        (bootCacheBuilder.classes == undefined).should.be.true;
      });

      it('should store in the cache', function(){
        bootCacheBuilder.finish();

        var cache = env.container.get('cache');
        cache.store.calledThrice.should.true;
        cache.store.calledWith('boot/javascript', 'boot\r\ndefineClass("cls");\r\njavascript;');
        cache.store.calledWith('boot/templates', '\r\ntemplates');
        cache.store.calledWith('boot/serverTopics', []);
      });
    });

  });

  afterEach(function(){
    env.unmockConsoleLog();
    env.shutdown();
  })
});
