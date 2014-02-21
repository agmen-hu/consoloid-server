require("consoloid-framework/Consoloid/Log/StreamContainer");
require("consoloid-framework/Consoloid/Log/Stream/Stream");
require("consoloid-framework/Consoloid/Log/Stream/PeriodicallyForwardedBuffer");
require('consoloid-framework/Consoloid/Test/UnitTest');

require("../ServerBuffer");
describeUnitTest('Consoloid.Log.ServerBuffer', function(){
    var
    env,
    clock,
    stream;

  beforeEach(function() {
    env = new Consoloid.Test.Environment();
    clock = sinon.useFakeTimers(1000);
    stream = env.create('Consoloid.Log.ServerBuffer', {interval: 5000});
  });

  describe('#_forward()', function(){
    var
      subStream1,
      subStream2;

    beforeEach(function(){
      subStream1 = env.mock('Consoloid.Log.Stream.Stream');
      subStream2 = env.mock('Consoloid.Log.Stream.Stream');

      stream.addStream(subStream1);
      stream.addStream(subStream2);
    });

    function checkStream(stream, object1, object2)
    {
      stream.write.calledTwice.should.be.true;
      stream.write.firstCall.args[0].should.be.eql(object1);
      stream.write.secondCall.args[0].should.be.eql(object2);
    };

    it('should call write method on all stream', function(){
      stream.write({foo: 'bar'});
      stream.write({bar: 'foo'});

      stream.buffer.length.should.be.eql(2);
      stream._forward();
      stream.buffer.length.should.be.eql(0);

      checkStream(subStream1, {foo: 'bar'}, {bar: 'foo'});
      checkStream(subStream2, {foo: 'bar'}, {bar: 'foo'});
    });
  });

  describe('#receive(data)', function() {
    it('should merge the received data to own buffer', function(){
      var data = {
        timestamp: 500,
        logs: [
          { t: 100, m: 'client log 1' },
          { t: 200, m: 'client log 2' },
          { t: 450, m: 'client log 3' }
        ]
      };

      stream.write({t: 500 , m: 'server log 1'});
      stream.write({t: 650 , m: 'server log 2'});
      stream.write({t: 1000, m: 'server log 3'});

      stream.receive(data);

      stream.buffer.length.should.be.eql(6);

      stream.buffer[0].t.should.be.eql(500);
      stream.buffer[0].m.should.be.eql('server log 1');

      stream.buffer[1].t.should.be.eql(600);
      stream.buffer[1].m.should.be.eql('client log 1');

      stream.buffer[2].t.should.be.eql(650);
      stream.buffer[2].m.should.be.eql('server log 2');

      stream.buffer[3].t.should.be.eql(700);
      stream.buffer[3].m.should.be.eql('client log 2');

      stream.buffer[4].t.should.be.eql(950);
      stream.buffer[4].m.should.be.eql('client log 3');

      stream.buffer[5].t.should.be.eql(1000);
      stream.buffer[5].m.should.be.eql('server log 3');
    });

    it('should handle empty buffer', function(){
      var data = {
        timestamp: 500,
        logs: [
          { t: 100, m: 'client log 1' },
          { t: 200, m: 'client log 2' },
          { t: 450, m: 'client log 3' }
        ]
      };

      stream.receive(data);

      stream.buffer.length.should.be.eql(3);

      stream.buffer[0].t.should.be.eql(600);
      stream.buffer[0].m.should.be.eql('client log 1');

      stream.buffer[1].t.should.be.eql(700);
      stream.buffer[1].m.should.be.eql('client log 2');

      stream.buffer[2].t.should.be.eql(950);
      stream.buffer[2].m.should.be.eql('client log 3');
    });
  });

  afterEach(function(){
    clock.restore();
  });
});
