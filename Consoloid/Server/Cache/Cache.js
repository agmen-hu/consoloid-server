defineClass('Consoloid.Server.Cache.Cache', 'Consoloid.Server.Cache.NoCache',
  {
    __constructor: function(options)
    {
      this.__base($.extend({
      }, options));

      this.data = this.create('Consoloid.Base.DeepAssoc', {});
    },

    store: function(key, content)
    {
      this.data.set(key, content);
      return this;
    },

    get: function(key, defaultValue)
    {
      return this.data.get(key, defaultValue);
    }
  }
);