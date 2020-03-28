/* global Dashticz */

var DT_blocktitle = {
    name: "blocktitle",
    canHandle: function (block) {
        return block && block.type && block.type === 'blocktitle'
    },
    defaultCfg: {
        containerClass: 'titlegroups'
    }
}

Dashticz.register(DT_blocktitle);