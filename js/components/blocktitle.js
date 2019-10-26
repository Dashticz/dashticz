/* global Dashticz */

var DT_blocktitle = {
    name: "blocktitle",
    canHandle: function (block) {
        return block && block.type && block.type === 'blocktitle'
    },
    default: {
        containerClass: function () {
            return 'titlegroups'
        }
    }
}

Dashticz.register(DT_blocktitle);