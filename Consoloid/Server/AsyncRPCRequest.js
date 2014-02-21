defineClass('Consoloid.Server.AsyncRPCRequest', 'Consoloid.Base.Object',
  {
    param: function(name, defaultValue)
    {
      if (name == "arguments") {
        name = "args";
      }
      if (name in this) {
        return this[name];
      }
      return defaultValue;
    }
  }
);