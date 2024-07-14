/* global Dashticz */
//# sourceURL=js/components/template.js
(function (Dashticz) {
  "use strict";
  var DT_template = {
    name: 'template',
    canHandle: function (block) {
      return block && false;
    },
    defaultCfg: function (block) {
      return {
        width: 12,
      };
    },
    run: function (me) {
    }
  }
  Dashticz.register(DT_template);
})(Dashticz);

