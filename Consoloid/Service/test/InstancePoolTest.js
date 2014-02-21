require('../InstancePool');
require('consoloid-framework/Consoloid/Test/UnitTest');

describeUnitTest('Consoloid.Service.InstancePool', function(){
  var pool;
  beforeEach(function() {
    env.container.addDefinition('foobar_service', {
      cls: Consoloid.Base.Object,
      options: {
        random: "foobar"
      }
    });

    env.container.addDefinition('barfoo_service', {
      cls: Consoloid.Base.Object,
      options: {
        foobar: "random"
      }
    });

    pool = env.create(Consoloid.Service.InstancePool, {});
  });

  describe('#__constructor(options)', function() {
    it('should add the default value', function() {
      pool.lastId.should.equal(-1);
      (typeof pool.instances === "object").should.be.true;
    })
  });

  describe('#createAndReturnId(serviceName)', function() {
    it('should get an instance of the service from the service container', function() {
      sinon.spy(env.container, "get");

      pool.createAndReturnId('foobar_service');

      env.container.get.calledWith('foobar_service').should.be.ok;
    });

    it('should add the instances to an object with incrementing instance IDs, and return with the ID', function() {
      pool.createAndReturnId('foobar_service').should.equal(0);
      pool.createAndReturnId('barfoo_service').should.equal(1);
      pool.createAndReturnId('foobar_service').should.equal(2);

      pool.instances[0].service.random.should.equal("foobar");
      pool.instances[1].service.foobar.should.equal("random");
      pool.instances[2].service.random.should.equal("foobar");
    });

    it('should store the service id as well', function() {
      pool.createAndReturnId('foobar_service').should.equal(0);
      pool.createAndReturnId('barfoo_service').should.equal(1);
      pool.createAndReturnId('foobar_service').should.equal(2);

      pool.instances[0].id.should.equal("foobar_service");
      pool.instances[1].id.should.equal("barfoo_service");
      pool.instances[2].id.should.equal("foobar_service");
    });
  });

  describe('#get(instanceId)', function() {
    it('should return with the service with said instanceID', function() {
      pool.createAndReturnId('foobar_service');
      pool.createAndReturnId('barfoo_service');
      pool.createAndReturnId('foobar_service');

      pool.get(1).foobar.should.equal("random");
    });

    it('should throw if there are no service instances with said ID', function() {
      (function() {
        pool.get('AAAAAAA');
      }).should.throw(/Unknown instance./);
    });
  });

  describe('#getServiceIdForInstance(instanceId)', function() {
    it('should return with service if for said instance id', function() {
      var id = pool.createAndReturnId('foobar_service');

      pool.getServiceIdForInstance(id).should.equal('foobar_service');
    });

    it('should throw if there are no service instances with said ID', function() {
      (function() {
        pool.getServiceIdForInstance('AAAAAAA');
      }).should.throw(/Unknown instance./);
    });
  });

  describe('#remove(instanceId)', function() {
    it('should remove the service with said instanceID', function() {
      var id = pool.createAndReturnId('foobar_service');
      pool.remove(id);

      (pool.instances[id] === undefined).should.be.ok;
    });

    it('should throw if there are no service instances with said ID', function() {
      (function() {
        pool.remove('AAAAAAA');
      }).should.throw(/Unknown instance./);
    });
  });
});