defineClass('Consoloid.Service.InstancePool', 'Consoloid.Base.Object',
  {
    __constructor: function(options)
    {
      this.__base($.extend({
        lastId: -1,
        instances: {}
      }, options));
    },

    createAndReturnId: function(serviceId)
    {
      var service = this.container.get(serviceId);
      this.lastId++;
      this.instances[this.lastId] = { service: service, id: serviceId };

      return this.lastId;
    },

    get: function(instanceId)
    {
      if (!(instanceId in this.instances)) {
        throw new Error("Unknown instance; instanceId='" + instanceId + "'");
      }

      return this.instances[instanceId].service;
    },

    getServiceIdForInstance: function(instanceId)
    {
      if (!(instanceId in this.instances)) {
        throw new Error("Unknown instance; instanceId='" + instanceId + "'");
      }

      return this.instances[instanceId].id;
    },

    remove: function(instanceId)
    {
      if (!(instanceId in this.instances)) {
        throw new Error("Unknown instance.");
      }

      delete this.instances[instanceId];
    }
  });