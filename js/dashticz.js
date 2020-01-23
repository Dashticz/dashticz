/* global blocks settings usrEnc pwdEnc infoMessage*/

// eslint-disable-next-line no-unused-vars
var Dashticz = function () {
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
        'tvguide',
        'trafficinfo',
        'secpanel'
    ]
    var mountedBlocks = [];
    var blockNumbering = 0;

    function _init() {
        //the $.ajax().then accepts two functions: Success and Error handler.
        // In the success handler we call the async init function from the component
        //        return Promise.all(components.map(function (component) {
        $(window).on('resize', Dashticz.onResize);
        return initDomoticz()
            .then(function () {
                $.when.apply($, components.map(function (component) {
                    return $.ajax({
                            url: 'js/components/' + component + '.js',
                            dataType: 'script'
                        })
                        .fail(function (jqXHR, textStatus, errorThrown) {

                            console.error("Error loading: ./js/components/" + component + '.js');
                            console.error('Error: ', textStatus);
                            return errorThrown;
                        })
                }))
            });
    }

    function initDomoticz() {
        return $.ajax({
            url: 'js/domoticz-api.js',
            dataType: 'script'
        })
        .then(function() {
            return Domoticz.init({url: settings['domoticz_ip'],
                                plan: settings['room_plan'],
                                usrEnc: usrEnc,
                                pwdEnc: pwdEnc
                            });
        })
    }

    function _onResize() {
        Object.keys(mountedBlocks).forEach(function (key) {
            var me = mountedBlocks[key];
            var comp = components[me.name];
            if (comp.onResize)
                comp.onResize(me)
        })
    }

    function _mountSpecialBlock(mountPoint, blockdef, special, key) {
        if (!special.initPromise) special.initPromise = special.init ? $.when(special.init(blockdef)) : $.when();
        special.initPromise.done(function () {
            var me = getDefaultBlockConfig(mountPoint, blockdef, special, key);
            $(mountPoint).append(getSpecialBlock(me));
            if (me.containerClass)
                $(mountPoint + ' .dt_block').addClass(me.containerClass(blockdef))
            if (special.get)
                $(mountPoint + ' .dt_state').append(special.get(me))
            if (special.run) special.run(me);
            mountedBlocks[mountPoint] = me
        })
    }

    function _mountDefaultBlock(mountPoint, blockdef, key) {
        _mountSpecialBlock(mountPoint, blockdef, components['button'], key)
    }

    function getSpecialBlock(me) {
        var html = '<div ' +
            (me.key ? ' data-id="' + me.key + '"' : '') +
            ' class="transbg  col-xs-' + me.width + ' ' + me.name + ' dt_block "' +
            (me.containerExtra ? me.containerExtra(me.block) : '') + '>' +
            getColIcon(me) +
            '<div class="dt_content">' +
            renderTitle(me) +
            renderStateDiv(me) +
            '</div></div>'
        return html;
    }

    function getColIcon(me) {
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
    }

    function renderTitle(me) {
        if (me.title) {
            var res = '<div class="dt_title">' + me.title + '</div>';
            return res;
        } else return ''
    }

    function renderStateDiv() {
        return '<div class="dt_state"></div>'
    }

    function getDefaultBlockConfig(mountPoint, block, special, key) {
        var defaultConfig = {
            width: 12,
            mountPoint: mountPoint,
            block: block,
            key: key,
            name: special.name
        }

        if (special.default)
            $.extend(defaultConfig, special.default)

        if (block) {
            if (typeof block.icon !== 'undefined') {
                defaultConfig.icon = block.icon;
                defaultConfig.image = ''; //reset default image in case icon is set
            }
            if (typeof block.image !== 'undefined') {
                defaultConfig.image = block.image
                defaultConfig.icon = ''; //reset default icon in case image is set
            }
            if (block.width) defaultConfig.width = block.width;
            if (block.title) defaultConfig.title = block.title;
            if (block.key) {
                defaultConfig.key = block.key;
                //            defaultConfig.dataId = block.key;
            }
        }
        return defaultConfig
    }

    function _register(special) {
        components[special.name] = special;
    }

    function _mount(mountPoint, selector) {
        if (typeof selector === 'string') {
            var def = components[selector];
            if (def) {
                _mountSpecialBlock(mountPoint, blocks[selector], def, selector);
                return true
            }
        }
        for (var comp in components) {
            if (typeof selector === 'object') {
                if (components[comp].canHandle && components[comp].canHandle(selector)) {
                    _mountSpecialBlock(mountPoint, selector, components[comp], '')
                    return true;
                }
            } else {
                if (components[comp].canHandle && components[comp].canHandle(blocks[selector], selector)) {
                    _mountSpecialBlock(mountPoint, blocks[selector], components[comp], selector)
                    return true;
                }
            }
        }

        return false;
    }

    function _mountNewContainer(column) {
        $(column).append('<div id="block_' + blockNumbering + '"</div>');
        return '#block_' + blockNumbering++;
    }

    function _loadFont(fontName, fontURL, fontFormat) {
        var newStyle = document.createElement('style');
        newStyle.appendChild(document.createTextNode("\
            @font-face {\
                font-family: " + fontName + ";\
                src: url('" + fontURL + "') format('" + fontFormat + "');\
            }\
        "));

        document.head.appendChild(newStyle);
    }

    function _loadCSS(filename) {
        $('head').append('<link rel="stylesheet" type="text/css" href="' + filename + '">');
    }

    return {
        init: _init,
        onResize: _onResize,
        mountSpecialBlock: _mountSpecialBlock,
        mount: _mount,
        register: _register,
        mountNewContainer: _mountNewContainer,
        loadFont: _loadFont,
        loadCSS: _loadCSS,
        mountDefaultBlock: _mountDefaultBlock
    }

}();

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

