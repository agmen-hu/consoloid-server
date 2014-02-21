defineClass('Consoloid.Server.Resource.FileFinder', 'Consoloid.Server.Resource.BaseFinder',
  {
    __constructor: function(options)
    {
      this.__base(options);
      this.requireProperty('resourceDirectories');
      this.requireProperty('projectRoot');

      this.fs = require('fs');
      this.globber = require('glob');

      this.__makeResourceDirectoryNamesAbsolute();
    },

    __makeResourceDirectoryNamesAbsolute: function()
    {
      for( var i = 0, len = this.resourceDirectories.length; i < len; i++) {
        this.resourceDirectories[i] =
          ((!this._isAbsolutePath(this.resourceDirectories[i])) ? this.projectRoot : '') +
          this.resourceDirectories[i] + '/';
      }
    },

    getResourceDirectories: function()
    {
      return this.resourceDirectories;
    },

    globSync: function(pattern)
    {
      var result = [];
      this.resourceDirectories.forEach(function(resourceDirectory){
        this.globber.sync(resourceDirectory + pattern).forEach(function(path) {
          this.__appendPathToResultsWhenItsAFile(path, result);
        }, this);
      }, this);

      return result;
    },

    __appendPathToResultsWhenItsAFile: function(path, result)
    {
      try {
        if (this.fs.statSync(path).isFile()) {
          result.push(path);
        }
      } catch (err) {
        // It's not a file or not readable
      }
    },

    read: function(callback, resourceName)
    {
      try {
        this.fs.readFile(this.locateResource(resourceName), { encoding: 'utf8', flag: 'r' }, callback);
      } catch (err) {
        callback(err.toString(), undefined);
      }
    },

    readSync: function(resourceName)
    {
      return this.fs.readFileSync(this.locateResource(resourceName), { encoding: 'utf8', flag: 'r' });
    }
  }
);