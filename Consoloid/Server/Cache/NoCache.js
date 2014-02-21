defineClass('Consoloid.Server.Cache.NoCache', 'Consoloid.Base.Object',
  {
    store: function(key, value)
    {
      return this;
    },

    get: function(key, defaultValue)
    {
      return defaultValue;
    }
  }
);