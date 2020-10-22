(function ($, Handlebars) {
  'use strict';

  var namespace = window,
    pluginName = 'TemplateEngine';

  var TemplateEngine = function TemplateEngine(options) {
    if (!(this instanceof TemplateEngine)) {
      return new TemplateEngine(options);
    }

    this.settings = $.extend({}, TemplateEngine.Defaults, options);
    this._storage = {};

    return this;
  };
  TemplateEngine.Defaults = {
    templateDir: './tpl/',
    templateExt: '.tpl',
  };

  TemplateEngine.prototype = {
    constructor: TemplateEngine,

    load: function (name) {
      var self = this;
      if (!self.isCached(name)) {
        self._storage[name] = $.ajax(self.urlFor(name)).then(function (raw) {
          return Handlebars.compile(raw);
        });
      }
      return self._storage[name];
    },
    isCached: function (name) {
      return !!this._storage[name];
    },
    urlFor: function (name) {
      return this.settings.templateDir + name + this.settings.templateExt;
    },
  };

  window[pluginName] = TemplateEngine;
})(jQuery, Handlebars);
