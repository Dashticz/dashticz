/* global blocks */

// eslint-disable-next-line no-unused-vars
class _Dashticz  {
    constructor() {
        this.components=[]
    }
    init() {
        console.log("loading");
        return $.when(
            $.ajax({ url: 'js/specials/streamplayer.js', dataType: 'script' }),
            $.ajax({ url: 'js/specials/frame.js', dataType: 'script' }),
            $.ajax({ url: 'js/specials/news.js', dataType: 'script' }),
            $.ajax({ url: 'js/specials/longfonds.js', dataType: 'script' }),
            $.ajax({ url: 'js/specials/traffic.js', dataType: 'script' }),
            $.ajax({ url: 'js/specials/train.js', dataType: 'script' }),
            $.ajax({ url: 'js/specials/publictransport.js', dataType: 'script' }),
            $.ajax({ url: 'js/specials/button.js', dataType: 'script' })
        )
    }
    mountSpecialBlock(mountPoint, blockdef, special) {
        const me = Dashticz.getDefaultBlockConfig(mountPoint, blockdef, special);
        $(mountPoint).append(me.getSpecialBlock(me));
        me.run(me);
    }
    getDefaultBlockConfig(mountPoint, block, special) {
        var defaultConfig = {
            width: 12,
            containerExtra: '',
            dataId: '',
            mountPoint: mountPoint,
            block: block,
            key: '',
            containerClass: '',
            getIcon: (me) => (me.block && me.block.icon) || me.icon,
            getImage: (me) => (me.block && me.block.image) || me.image,
            getTitle: (me) => (me.block && me.block.title) || me.title,
            renderTitle: function (me) {
                if (me.getTitle(me)) {
                    let res = '<div class="dt_title">' + me.getTitle(me) + '</div>';
                    console.log(res);
                    return res;
                } else return ''
            },
            getColIcon: (me) => {
                const icon = me.getIcon(me);
                let html = '';
                if (icon) {
                    html += '<div class="col-icon">';
                    html += '<em class="' + icon + '"></em>';
                    html += '</div>';
                }
                const image = me.getImage(me);
                if (image) {
                    html += '<div class="col-icon">';
                    html += '<img src="img/' + image + '" class="icon"/>';
                    html += '</div>';
                }
                return html;
            },
            getState: () => '',
            renderStateDiv: (me) => {
                return '<div class="dt_state">' + me.getState(me) + '</div>'
            },
            getSpecialBlock(me) {
                var html = '<div ' + me.containerExtra +
                    (me.dataId ? ' data-id="' + me.dataId + '"' : '') +
                    ' class="transbg ' + me.containerClass + ' col-xs-' + me.width + ' ' + me.name + ' dt_block">' +
                    me.getColIcon(me) +
                    '<div class="dt_content">' +
                    me.renderTitle(me) +
                    me.renderStateDiv(me) +
                    '</div></div>'
                return html;
            }

        }
        var newConfig = {}
        if (block && typeof block.icon !== 'undefined') newConfig.icon = block.icon;
        if (block && typeof block.image !== 'undefined') newConfig.image = block.image;
        if (block && block.width) newConfig.width = block.width;
        if (block && block.key) {
            newConfig.key = block.key;
            newConfig.dataId = block.key;
        }

        var result = {}
        $.extend(result, defaultConfig);
        $.extend(result, special(block));
        $.extend(result, newConfig);
        return result
    }
    register(special) {
        this.components[special().name] = special;
    }
    mount(mountPoint,selector) {
        console.log("mount ", selector, typeof selector);
        if (typeof selector === 'string') {
            const def = this.components[selector];
            if (def) {
                this.mountSpecialBlock(mountPoint, blocks[selector], def);
                return true                
            }
        }
        if (typeof selector === 'object') {
            if (selector.frameurl) {
                this.mountSpecialBlock(mountPoint, selector, this.components['frame']);
                return true;
            } 
            if(selector.station) {
                this.mountSpecialBlock(mountPoint, selector, this.components['publictransport']);
                return true;
            }
        }
        return false;      
    }
}

var Dashticz = new _Dashticz();

