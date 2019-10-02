/* global blocks settings */

// eslint-disable-next-line no-unused-vars
var  Dashticz =  {
    components: [],
    blockNumbering:0,
    init() {
        return $.when(
            $.ajax({ url: 'js/specials/streamplayer.js', dataType: 'script' })
/*            $.ajax({ url: 'js/specials/frame.js', dataType: 'script' }),
            $.ajax({ url: 'js/specials/news.js', dataType: 'script' }),
            $.ajax({ url: 'js/specials/longfonds.js', dataType: 'script' }),
            $.ajax({ url: 'js/specials/traffic.js', dataType: 'script' }),
            $.ajax({ url: 'js/specials/train.js', dataType: 'script' }),
            $.ajax({ url: 'js/specials/publictransport.js', dataType: 'script' }),
            $.ajax({ url: 'js/specials/button.js', dataType: 'script' }),
            $.ajax({ url: 'js/specials/stationclock.js', dataType: 'script' })*/
        )
    },
    mountSpecialBlock(mountPoint, blockdef, special) {
        const me = Dashticz.getDefaultBlockConfig(mountPoint, blockdef, special);
        $(mountPoint).append(me.getSpecialBlock(me));
        me.run(me);
    },
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
        if (special.name) result.name=special.name;
        $.extend(result, special.init(block));
        $.extend(result, newConfig);
        return result
    },
    register(special) {
        this.components[special.name] = special;
    },
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
            for ( const comp in this.components) {
                if(this.components[comp].canHandle && this.components[comp].canHandle(selector)) {
                    this.mountSpecialBlock(mountPoint, selector, this.components[comp])
                    return true;
                }
            }
        } else {
            for ( const comp in this.components) {
                if(this.components[comp].canHandle && this.components[comp].canHandle(blocks[selector], selector)) {
                    this.mountSpecialBlock(mountPoint, selector, this.components[comp])
                    return true;
                }
            }
        }

        return false;      
    },
    mountNewContainer(column) {
        $(column).append('<div id="block_' + Dashticz.blockNumbering + '"</div>');
        return '#block_' + Dashticz.blockNumbering++;
    }

}

// eslint-disable-next-line no-unused-vars
function checkForceRefresh(m_instance, url) {
    //forcerefresh is set to 1 or true:
    //   adds current time to an url as second parameter (for webcams)
    //   adds the timestamp as first parameter if there are no parameters yet
    //forcerefresh:2
    //   calls nocache.php and prevent caching by setting headers in php.
    //forcerefresh:3
    //   adds timestamp parameter to the end of the url


    if (typeof (m_instance.forcerefresh) !== 'undefined') {
        var str = "" + (new Date()).getTime();
        var mytimestamp = 't=' + str.substr(str.length - 8, 5);
        switch (m_instance.forcerefresh) {
            case true:
            case 1:
                //try to add the timestamp as second parameter
                //it there are no parameters the timestamp will be added.
                //behavior changed to support cheap webcams
                if (url.indexOf("?") == -1) //no parameters. We will add the timestamp
                    url += '?' + mytimestamp;
                else { //we have at least one parameters
                    var pos = url.indexOf("&");
                    if (pos > 0) {
                        //we have more than one parameter
                        //insert the timestamp as second
                        url = url.substr(0, pos + 1) + '&' + mytimestamp + url.substr(pos);
                    }
                    else {
                        //there is only one parameter so we add it to the end
                        url += '&' + mytimestamp;
                    }

                }
                break;
            case 2:
                url = settings['dashticz_php_path'] + 'nocache.php?' + url;
                break;
            case 3: //add timestamp to the end
                var sep = '&';
                if (url.indexOf("?") == -1) { //there is no parameter yet
                    sep = '?';
                }
                url += sep + mytimestamp;
                break;
        }
    }
    return url;
}


