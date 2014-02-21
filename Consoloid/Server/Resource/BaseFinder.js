defineClass('Consoloid.Server.Resource.BaseFinder', 'Consoloid.Base.Object',
  {
    read: function(callback, resourceName)
    {
    },

    readSync: function(resourceName)
    {
    },

    globSync: function(pattern)
    {
      return [];
    },

    locateResource: function(pattern)
    {
      if (this._isAbsolutePath(pattern)) {
        return pattern;
      }

      var result = this.globSync(pattern);

      if (result.length > 0) {
        return result[0];
      } else {
        throw new Error('Resource not found in any installed Consoloid module; resource name="' + pattern + '"');
      }
    },

    _isAbsolutePath: function(path)
    {
      return (path[0] == '/') ? true : false;
    }
  }
);
