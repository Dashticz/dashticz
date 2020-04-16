/* global blocks settings usrEnc pwdEnc*/
/*from domoticz-api.js*/
/*global Domoticz*/
/*from main.js*/
/*global infoMessage*/

// eslint-disable-next-line no-unused-vars
var Dashticz = function () {
    var specials = [
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
        'alarmmeldingen',
        'secpanel',
        'graph',
        'coronavirus',
        'camera',
        'nzbget',
        'calendar'
    ]
    var components = []
    var mountedBlocks = [];
    var blockNumbering = 0;

    function _init() {
        //the $.ajax().then accepts two functions: Success and Error handler.
        // In the success handler we call the async init function from the component
        //        return Promise.all(components.map(function (component) {
        $(window).on('resize', Dashticz.onResize);
        return initDomoticz()
            .then(function () {
                $.when.apply($, specials.map(function (component) {
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
            .then(function () {
                var cfg = {
                    url: settings['domoticz_ip'],
                    plan: settings['room_plan'],
                    usrEnc: usrEnc,
                    pwdEnc: pwdEnc,
                    enable_websocket: settings['enable_websocket'],
                    domoticz_refresh: settings['domoticz_refresh'],
                    refresh_method: settings['refresh_method']
                }
                return Domoticz.init(cfg);
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

    function renderBlock(me) {
        var $div = $(me.mountPoint).find('.dt_block');
        var block = $(getSpecialBlock(me));
        if (me.block.containerClass)
            $div.addClass(getProperty(me.block.containerClass, me));
        if (me.block.addClass) {
            var addClass = getProperty(me.block.addClass, me)
            $div.removeClass(me.currentClass).addClass(addClass);
            me.currentClass = addClass; //store current class, so that we can remove it on next update.
        }
        if(me.block.template===1)
            $div.addClass('dt_column');
        block.find('.dt_state').append(getProperty(components[me.name].defaultContent, me));
        $div.html(block);
    }

    function _mountSpecialBlock(mountPoint, blockdef, special, key) {
        if (!special.initPromise) special.initPromise = special.init ? $.when(special.init(blockdef)) : $.when();
        special.initPromise.done(function () {
            var me = createBlock(mountPoint, blockdef, special, key);
            $(mountPoint).html(getContainer(me));
            //            console.log(me);
            renderBlock(me);
            mountedBlocks[me.mountPoint] = me;
            if (special.run) special.run(me);
            if (me.block.refresh && special.refresh) { //install refresh handler
                setInterval(function () {
                    special.refresh(me);
                }, (me.block.refresh * 1000));
                special.refresh(me);
            }
            if (special.refresh) {
                blocks[me.key] = blockdef;
                Dashticz.subscribeBlock(me.key, function (block) {
                    console.log('updating special block', me);
                    me.block = getBlockConfig(block, components[me.name], me.key);
                    renderBlock(me);
                    special.refresh(me)
                })
            }
        })
    }

    function _mountDefaultBlock(mountPoint, blockdef, key) {
        _mountSpecialBlock(mountPoint, blockdef, components['button'], key)
    }

    function getContainer(me) {
        var html = '<div ' +
            (me.key ? ' data-id="' + me.key + '"' : '') +
            ' class="transbg col-xs-' + me.block.width + ' ' + me.name + ' dt_block "' +
            (me.block.containerExtra ? getProperty(me.block.containerExtra, me.block) : '') + '></div>'
        return html
    }

    function getSpecialBlock(me) {
        var html = '';
        if(me.block.template===1) {
            html += '<div class="dt_content">';
            html += getColIcon(me);
            html += renderTitle(me);
            html += '</div>'
            html += renderStateDiv(me);
        }
        else {
            html += getColIcon(me);
            html += '<div class="dt_content">';
            html += renderTitle(me);
            html += renderStateDiv(me);
            html += '</div>'
        }
        return html;
    }

    function getColIcon(me) {
        var icon = me.block.icon;
        var html = '';
        if (icon) {
            html += '<div class="col-icon">';
            html += '<em class="' + icon + '"></em>';
            html += '</div>';
        }
        var image = me.block.image;
        if (image) {
            html += '<div class="col-icon">';
            html += '<img src="img/' + image + '" class="icon"/>';
            html += '</div>';
        }
        return html;
    }

    function renderTitle(me) {
        if (me.block.title) {
            var res = '<div class="dt_title">' + me.block.title + '</div>';
            return res;
        } else return ''
    }

    function renderStateDiv() {
        return '<div class="dt_state"></div>'
    }

    function getProperty(fn, me) { //getter functionaly
        if (typeof fn === 'function')
            return fn(me);
        return fn;
    }

    function getBlockConfig(block, special, key) {
        var cfg = {
            width: 12
        };
        $.extend(cfg, getProperty(special.defaultCfg, block));
        if (block) {
            if (block.icon) {
                cfg.image = ''; //reset default image in case icon is set
            }
            if (block.image) {
                cfg.icon = ''; //reset default icon in case image is set
            }
            $.extend(cfg, block);
        }
        if (typeof key !== 'undefined' && key !== '') {
            cfg.key = key;
        }
        return cfg;
    }

    function createBlock(mountPoint, block, special, key) {
        var blockdef = getBlockConfig(block, special, key);
        var newblock = {
            mountPoint: mountPoint,
            block: blockdef,
            key: blockdef.key ? blockdef.key : mountPoint.slice(1),
            name: special.name
        }
        return newblock;
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

    /** Prompt for password
     * @function
     * @param {string} password Password
     * @returns {boolean} True: password is correct, or no password required
     */
    function _promptPassword(password) {
        if (password) {
            var checkpassword = prompt('Enter password');
            if (!checkpassword) return false;
            if (checkpassword !== password) {
                //password incorrect
                infoMessage('Incorrect password', '', 3000);
                return false;
            }
        }
        return true;
    }

    var subscribeBlockList = {}

    function subscribeBlock(key, callback) {
        if (!subscribeBlockList[key]) subscribeBlockList[key] = []
        subscribeBlockList[key].push(callback)
    }

    function setBlock(key, state) {
        var block = blocks[key] || {};
        var changed = false;
        if (state) {
            for (var prop in state) {
                if (state[prop] !== block[prop]) {
                    changed = true;
                    block[prop] = state[prop];
                }
            }
            if (changed) {
                blocks[key] = block;
            }
        }
        if (changed || !state) {
            if (subscribeBlockList[key])
                subscribeBlockList[key].forEach(function (callback) {
                    setTimeout(function () {
                        callback(block)
                    }, 0);
                })
            else {
                var keySplit = key.split('_');
                if (keySplit.length === 2 && subscribeBlockList[keySplit[0]]) {
                    subscribeBlockList[keySplit[0]].forEach(function (callback) {
                        setTimeout(function () {
                            callback({}); //we call the parent call back with empty block update
                        }, 0);
                    })
                }
            }
        }
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
        mountDefaultBlock: _mountDefaultBlock,
        promptPassword: _promptPassword,
        subscribeBlock: subscribeBlock,
        setBlock: setBlock
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

//# sourceURL=js/dashticz.js