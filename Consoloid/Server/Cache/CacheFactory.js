defineClass('Consoloid.Server.Cache.CacheFactory', 'Consoloid.Base.Object',
  {
    __constructor: function(options)
    {
      this.__base($.extend({
        cls: 'Consoloid.Server.Cache.NoCache',
        bootBuilderCls: 'Consoloid.Server.Cache.NoBootCacheBuilder',
      }, options));

      this.container.addSharedObject('cache', this.create(this.cls, {container: this.container}));
      this.container.addSharedObject('boot_cache_builder', this.create(this.bootBuilderCls, {container: this.container}));
    }
  }
);