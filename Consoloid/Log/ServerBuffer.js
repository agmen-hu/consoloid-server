defineClass('Consoloid.Log.ServerBuffer', 'Consoloid.Log.Stream.PeriodicallyForwardedBuffer',
  {
    __constructor: function(options)
    {
      this.__base($.extend({
        streams: [],
        streamServices: []
      }, options));

      this.getStreamContainerFuncionality();
      this.__appendStreamsFromServices(this.streamServices);

      this.__writeLoggingDelay();
    },

    getStreamContainerFuncionality: function()
    {
      var
        streamContainer = getClass('Consoloid.Log.StreamContainer').prototype;
      this.__appendStreamsFromServices = streamContainer.__appendStreamsFromServices;
      this.addStream = streamContainer.addStream;
    },

    __writeLoggingDelay: function()
    {
      var data = {
          t: new Date().getTime(),
          l: 'info',
          m: 'Logging started. Log lines will be delayed due to buffering',
          p: { delay: this.interval/1000 + ' sec' }
        }

        this.streams.forEach(function(stream){
          stream.write(data);
        });
    },

    _forward: function()
    {
      if (!this.buffer.length) {
        return;
      }

      for (var i = 0, len = this.streams.length; i < len; i++ ) {
        for (var j = 0, jlen = this.buffer.length; j < jlen; j++ ) {
          this.streams[i].write(this.buffer[j]);
        }
      }

      this.buffer = [];
    },

    receive: function(data)
    {
      if (!data.logs) {
        return;
      }

      var
        timeShift = new Date().getTime() - data.timestamp,
        receivedItem = this.__getNextReceivedItem(data.logs, timeShift),
        i = 0;

      while(receivedItem) {
        if (!this.buffer[i] || this.buffer[i].t > receivedItem.t) {
          this.buffer.splice(i, 0, receivedItem);
          receivedItem = this.__getNextReceivedItem(data.logs, timeShift);
        }
        i++;
      }
    },

    __getNextReceivedItem: function(logs, timeShift)
    {
      var item = logs.shift();
      if (!item) {
        return;
      }

      item.t = parseInt(item.t) + timeShift;
      item.fromClient = true;
      return item;
    }
  }
);