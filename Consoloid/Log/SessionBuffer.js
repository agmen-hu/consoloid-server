defineClass('Consoloid.Log.SessionBuffer', 'Consoloid.Log.Stream.DetailAddingStream',
  {
    receive: function(data)
    {
      (data.logs || []).forEach(function(log) {
        this.detailProviders.forEach(function(provider) {
          log = provider(log);
        });
      }.bind(this));

      this.nextStream.receive(data);
    }
  }
);