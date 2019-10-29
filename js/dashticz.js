/* global blocks settings */

// eslint-disable-next-line no-unused-vars
var Dashticz = {
    components: [],
    blockNumbering: 0,
    init: function () {
        var components = [
            'streamplayer',
            'button',
            'frame',
            'news',
            'longfonds',
            'traffic',
            'train',
            'publictransport',
            'stationclock',
            'blocktitle',
            'tvguide'
        ]
        //the $.ajax().then accepts two functions: Success and Error handler.
        // In the success handler we call the async init function from the component
        //        return Promise.all(components.map(function (component) {
        return $.when.apply($, components.map(function (component) {
            return $.ajax({
                    url: 'js/components/' + component + '.js',
                    dataType: 'script'
                })
                .fail(function (jqXHR, textStatus, errorThrown) {

                    console.error("Error loading: ./js/components/" + component + '.js');
                    console.error('Error: ', textStatus);
                    return errorThrown;
                })
                .done(function () {
                    return Dashticz.components[component].init ? Dashticz.components[component].init() : 'Loaded: ' + component
                })
        }))
    },
    mountSpecialBlock: function (mountPoint, blockdef, special, key) {
        var me = Dashticz.getDefaultBlockConfig(mountPoint, blockdef, special, key);
        $(mountPoint).append(Dashticz.getSpecialBlock(me));
        if (me.containerClass)
            $(mountPoint + ' .dt_block').addClass(me.containerClass(blockdef))
        if (special.get)
            $(mountPoint + ' .dt_state').append(special.get(me))
        if (special.run) special.run(me);
    },
    getSpecialBlock: function (me) {
        var html = '<div ' +
            (me.key ? ' data-id="' + me.key + '"' : '') +
            ' class="transbg  col-xs-' + me.width + ' ' + me.name + ' dt_block "' +
            (me.containerExtra ? me.containerExtra(me.block) : '') + '>' +
            Dashticz.getColIcon(me) +
            '<div class="dt_content">' +
            Dashticz.renderTitle(me) +
            Dashticz.renderStateDiv(me) +
            '</div></div>'
        return html;
    },
    getColIcon: function (me) {
        var icon = me.icon;
        var html = '';
        if (icon) {
            html += '<div class="col-icon">';
            html += '<em class="' + icon + '"></em>';
            html += '</div>';
        }
        var image = me.image;
        if (image) {
            html += '<div class="col-icon">';
            html += '<img src="img/' + image + '" class="icon"/>';
            html += '</div>';
        }
        return html;
    },
    renderTitle: function (me) {
        if (me.title) {
            var res = '<div class="dt_title">' + me.title + '</div>';
            console.log(res);
            return res;
        } else return ''
    },
    renderStateDiv: function () {
        return '<div class="dt_state"></div>'
    },
    getDefaultBlockConfig: function (mountPoint, block, special, key) {
        var defaultConfig = {
            width: 12,
            mountPoint: mountPoint,
            block: block,
            key: key,
            name: special.name
        }

        if (special.default)
            $.extend(defaultConfig, special.default)

        if (block && typeof block.icon !== 'undefined') defaultConfig.icon = block.icon;
        if (block && typeof block.image !== 'undefined') defaultConfig.image = block.image;
        if (block && block.width) defaultConfig.width = block.width;
        if (block && block.title) defaultConfig.title = block.title;
        if (block && block.key) {
            defaultConfig.key = block.key;
            //            defaultConfig.dataId = block.key;
        }
        return defaultConfig
    },
    register: function (special) {
        this.components[special.name] = special;
    },
    mount: function (mountPoint, selector) {
        console.log("mount ", selector, typeof selector);
        if (typeof selector === 'string') {
            var def = this.components[selector];
            if (def) {
                this.mountSpecialBlock(mountPoint, blocks[selector], def, selector);
                return true
            }
        }
        for (var comp in this.components) {
            if (typeof selector === 'object') {
                if (this.components[comp].canHandle && this.components[comp].canHandle(selector)) {
                    this.mountSpecialBlock(mountPoint, selector, this.components[comp], '')
                    return true;
                }
            } else {
                if (this.components[comp].canHandle && this.components[comp].canHandle(blocks[selector], selector)) {
                    this.mountSpecialBlock(mountPoint, blocks[selector], this.components[comp], selector)
                    return true;
                }
            }
        }

        return false;
    },
    mountNewContainer: function (column) {
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
                    } else {
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