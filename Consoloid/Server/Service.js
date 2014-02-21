defineClass('Consoloid.Server.Service', 'Consoloid.Base.Object',
  {
    sendResult: function(res, result)
    {
      this._sendResponse(res, {
        _success: true,
        result: result
      });
    },

    _sendResponse: function(res, result)
    {
      getClass('Consoloid.Service.AsyncRPC.Response');
      res.send(
        (res instanceof Consoloid.Service.AsyncRPC.Response) ? result : JSON.stringify(result)
      );
    },

    sendError: function(res, err)
    {
      this.container.get('logger').log("error", err.toString(), { stack: err.stack });

      this._sendResponse(res, {
        _success: false,
        exception: err.toString()
      });
    }
  }
);