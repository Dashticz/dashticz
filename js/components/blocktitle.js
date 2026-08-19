/* global Dashticz */

var DT_blocktitle = {
  name: 'blocktitle',
  canHandle: function (block) {
    return block && block.type && block.type === 'blocktitle';
  },
  defaultCfg: {
    containerClass: 'titlegroups',
    // No icon default here: getBlockConfig() (js/dashticz.js) only fills in
    // block.icon when the CONFIG.js entry defines it. A separator with no
    // icon property (legacy/hand-written config) must render without an
    // icon, exactly like one that explicitly sets icon: '' (Wizard's
    // "disabled" state) - see js/deviceeditor.js's SEPARATOR_DEFAULT_ICON,
    // which is written into CONFIG.js explicitly whenever a separator is
    // created/edited with the Icon option enabled, rather than relied on
    // here as a runtime fallback.
  },
};

Dashticz.register(DT_blocktitle);
