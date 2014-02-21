require('consoloid-framework/Consoloid/Log/Stream/Stream');
require('consoloid-framework/Consoloid/Log/Stream/DetailAddingStream');
require('../SessionBuffer');
require('consoloid-framework/Consoloid/Test/UnitTest');
describeUnitTest('Consoloid.Log.SessionBuffer', function() {
  describe('#receive()', function() {
    it('should add provider data to received log lines', function() {
      var nextStream = {
        receive: sinon.spy()
      };

      var buffer = env.create('Consoloid.Log.SessionBuffer', {
        nextStream: nextStream
      });

      var provider1 = function(params) {
        return $.extend(params, { foo: 'bar' });
      }

      buffer.addDetailProviderFunction(provider1);

      buffer.receive({ logs: [ { row: 1}, {row: 2} ]});

      nextStream.receive.calledOnce.should.be.ok;
      nextStream.receive.args[0][0].should.eql({ logs: [ { row: 1, foo: 'bar'}, {row: 2, foo: 'bar'} ] });
    });
  });
});