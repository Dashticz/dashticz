/* global Dashticz */

var DT_blocktitle = {
  name: 'blocktitle',
  canHandle: function (block) {
    return block && block.type && block.type === 'blocktitle';
  },
  defaultCfg: {
    containerClass: 'titlegroups',
    icon: 'fas fa-divide',
  },
};

Dashticz.register(DT_blocktitle);
