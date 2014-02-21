defineClass('Consoloid.Log.MiniLog', 'Consoloid.Log.Stream.Stream',
  {
    __constructor: function(options)
    {
      this.__base($.extend({
        path: '',
        console: true,
        format: 'Color'
      }, options));

      this.minilog = require('minilog');
      this.logger = this.minilog('app');

      if (this.path) {
        if (this.path.charAt(0) != "/") {
          this.path = __dirname + '/../../../../' + this.path;
        }
        this.minilog
          .pipe(require('fs').createWriteStream(this.path));
      }

      if (this.console) {
        this.minilog
          .pipe(this.minilog.backends.console['format' + this.format])
          .pipe(this.minilog.backends.console);
      }
    },

    write: function(object)
    {
      var
        log,
        date;

      switch(object.l) {
        case 'debug':
          log = this.logger.debug;
          break;
        case 'warning':
          log = this.logger.warn;
          break;
        case 'error':
          log = this.logger.error;
          break;
        default:
          log = this.logger.info;
      }

      log(new Date(object.t).toLocaleString() + ' ' + JSON.stringify(object));
    }
  }
);