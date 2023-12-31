/* global Dashticz */
//# sourceURL=js/components/template.js
var DT_template = (function () {

  return {
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
})();

Dashticz.register(DT_simpleblock);
