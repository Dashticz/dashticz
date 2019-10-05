/* global Dashticz */

var DT_blocktitle = {
    name: "blocktitle",
    canHandle(block) {
        return block && block.type && block.type==='blocktitle'
    },
    default: {
        containerClass: () => 'titlegroups'
    }
}

Dashticz.register(DT_blocktitle);
