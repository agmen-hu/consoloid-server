defineClass('Consoloid.Server.Cache.NoBootCacheBuilder', 'Consoloid.Base.Object',
  {
    __constructor: function(options)
    {
      this.__base($.extend({
        state: Consoloid.Server.Cache.NoBootCacheBuilder.BOOTED
      }, options));
    },

    getState: function()
    {
      return this.state;
    },

    decideRequestIsBootable: function(req)
    {
    },

    lastRequestIsBootable: function()
    {
      return false;
    },

    start: function(req)
    {
    },

    finish: function()
    {
    },

    addBootJS: function(js)
    {
      return this;
    },

    addJS: function(js)
    {
      return this;
    },

    addTemplate: function(jquote)
    {
      return this;
    },

    addClass: function(classDefinition)
    {
      return this;
    },

    addServerTopic: function(topic)
    {
      return this;
    }
  },
  {
    NOT_BOOTED: 0,
    BOOTING: 1,
    BOOTED: 2
  }
);