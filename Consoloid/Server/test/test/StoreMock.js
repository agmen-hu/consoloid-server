var StoreMock = module.exports = function StoreMock(options) {
  this.options = options;
};

StoreMock.prototype.destroy = sinon.stub();
StoreMock.prototype.get = sinon.stub();
StoreMock.prototype.set = sinon.stub();
StoreMock.prototype.all = sinon.stub();
StoreMock.prototype.clear = sinon.stub();
StoreMock.prototype.length = sinon.stub();
StoreMock.prototype.regenerate = sinon.stub();
StoreMock.prototype.load = sinon.stub();
StoreMock.prototype.createSession = sinon.stub();
StoreMock.prototype.on = sinon.stub();
