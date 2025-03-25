/* global blocks settings DT_function Debug*/
/*from domoticz-api.js*/
/*global Domoticz*/

// eslint-disable-next-line no-unused-vars
var Dashticz = (function () {
  var specials = [
    'domoticzblock',
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
    'garbage',  //place before calendar, to detect company: ical with icalurl as garbage block
    'calendar',
    'dial',
    'html',
    'timegraph',
    'haymanclock',
    'flipclock',
    'basicclock',
    'owmwidget',
    'log',
    'weather',
    'simpleblock',
    'map',
    'group',
    'waqi',
  ];
  var components = [];
  var mountedBlocks = {};
  var blockNumbering = 0;

  function _init() {
    //the $.ajax().then accepts two functions: Success and Error handler.
    // In the success handler we call the async init function from the component
    //        return Promise.all(components.map(function (component) {
    $(window).on('resize', Dashticz.onResize);
    return initDomoticz().then(function () {
      return $.when.apply(
        $,
        specials.map(function (component) {
          return DT_function.loadDTScript('js/components/' + component + '.js')
            .fail(function (jqXHR, textStatus, errorThrown) {
              console.error(
                'Error loading: ./js/components/' + component + '.js'
              );
              console.error('Error: ', textStatus);
              return errorThrown;
            });
        })
      );
    });
  }

  function initDomoticz() {
    return DT_function.loadDTScript('js/domoticz-api.js')
      .then(function () {
        var cfg = {
          url: settings.domoticz_ip,
          plan: settings.room_plan,
          username: settings.user_name,
          password: settings.pass_word,
          client_id: settings.client_id,
          client_secret: settings.client_secret,
          enable_websocket: settings['enable_websocket'],
          domoticz_refresh: settings['domoticz_refresh'],
          refresh_method: settings['refresh_method'],
          domoticz_timeout: settings['domoticz_timeout'],
          use_favorites: settings['use_favorites'],
          use_hidden: settings['use_hidden']
        };
        if(settings.code) {
          cfg.code=settings.code
        }
    
        return Domoticz.init(cfg);
      })
  }

  function _onResize() {
    Object.keys(mountedBlocks).forEach(function (key) {
      var me = mountedBlocks[key].me;
      var comp = me && me.name && components[me.name];
      if (!comp) {
        return;
      }
      if (comp.onResize) comp.onResize(me);
    });
  }

  function renderBlock(me) {
    var $div = me.$mountPoint.find('.dt_block');
    var block = $(getSpecialBlock(me));
    if (me.block.containerClass)
      $div.addClass(getProperty(me.block.containerClass, me));
    if (me.block.addClass) {
      var addClass = getProperty(me.block.addClass, me);
      $div.removeClass(me.currentClass).addClass(addClass);
      me.currentClass = addClass; //store current class, so that we can remove it on next update.
    }
    if (me.block.template === 1) $div.addClass('dt_column');
    block
      .find('.dt_state')
      .append(getProperty(components[me.name].defaultContent, me));
    $div.html(block);
    var fixedHeight = false;
    if (me.block.aspectratio) {
      var blockWidth = parseInt($div.outerWidth());
      $div.css({height:blockWidth * me.block.aspectratio});
      fixedHeight = true;
    }
    else if (me.block.height) {
      $div.css({height: me.block.height})
      fixedHeight = true;
    }
    if(fixedHeight) $div.addClass('fixedheight');

  }

  function setEmpty(me, state) {
    var $div = me.$mountPoint.find('.dt_block');
    if (state)
      $div.addClass('empty');
    else
      $div.removeClass('empty');
  }

  function addClickHandler(me) {
    var clickHandler = null;
    var bCH = me.block.clickHandler;
    if (!me.block.url && !me.block.slide && !me.block.popup) return;
    if (typeof bCH === 'function') {
      clickHandler = bCH;
    } else if (typeof bCH === 'undefined' || bCH) {
      clickHandler = DT_function.clickHandler;
    }
    if (clickHandler) {
      $(me.mountPoint + ' .dt_block')
        .click(function () {
          clickHandler(me);
        })
        .addClass('hover');
    }
  }

  function removeBlock(id) {
    mountedBlocks[id].childs.forEach(function (child) {
      removeBlock(child);
    });
    mountedBlocks[id].childs = [];
    var me = mountedBlocks[id].me;
    if (me) {
      me.callbacks.timeoutList.forEach(function (el) {
        clearTimeout(el);
      });
      me.callbacks.intervalList.forEach(function (el) {
        clearInterval(el);
      });
      me.callbacks.subscriptionList.forEach(function (el) {
        el();
      });
      me.callbacks.timeoutList = [];
      me.callbacks.intervalList = [];
      me.callbacks.subscriptionList = [];
      var destroy = components[me.name].destroy;
      if (typeof destroy === 'function') destroy(me);
    }
    $(id).remove();
    delete mountedBlocks[id];
  }

  function _mountSpecialBlock(mountPoint, blockdef, special, key) {
    if (!special.initPromise)
      special.initPromise = special.init
        ? $.when(special.init(blockdef))
        : $.when();
    special.initPromise.done(function () {
      var me = createBlock(mountPoint, blockdef, special, key);
      me.$mountPoint = $(mountPoint);
      me.$mountPoint.html(getContainer(me));
      //            console.log(me);
      renderBlock(me);
      mountedBlocks[me.mountPoint].me = me;
      if (special.run) special.run(me);

      addClickHandler(me);

      if (me.block.refresh && special.refresh) {
        //install refresh handler
        _setInterval(me, special.refresh, me.block.refresh * 1000);
        special.refresh(me);
      }
      if (special.refresh) {
        blocks[me.key] = blockdef;
        Dashticz.subscribeBlock(me, function (block) {
          me.block = getBlockConfig(block, components[me.name], me.key);
          renderBlock(me);
          special.refresh(me);
        });
      }
    });
  }

  function _mountDefaultBlock(mountPoint, blockdef, key) {
    _mountSpecialBlock(mountPoint, blockdef, components['button'], key);
  }

  function getContainer(me) {
    var html =
      '<div ' +
      (me.key ? ' data-id="' + me.key + '"' : '') +
      ' class="transbg col-xs-' +
      me.block.width +
      ' ' +
      me.name +
      ' dt_block "' +
      (me.block.containerExtra
        ? getProperty(me.block.containerExtra, me.block)
        : '') +
      '></div>';
    return html;
  }

  function getSpecialBlock(me) {
    var html = '';
    if (me.block.template === 1) {
      html += '<div class="dt_content">';
      html += getColIcon(me);
      html += renderTitle(me);
      html += '</div>';
      html += renderStateDiv(me);
    } else {
      html += getColIcon(me);
      html += '<div class="dt_content">';
      html += renderTitle(me);
      html += renderStateDiv(me);
      html += '</div>';
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
    } else return '';
  }

  function renderStateDiv() {
    return '<div class="dt_state"></div>';
  }

  function getProperty(fn, me) {
    //getter functionaly
    if (typeof fn === 'function') return fn(me);
    return fn;
  }

  function getBlockConfig(block, special, key) {
    var cfg = {
      width: 12,
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
      name: special.name,
      callbacks: {
        timeoutList: [],
        intervalList: [],
        subscriptionList: [],
      },
    };
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
        return true;
      }
    }
    if (typeof selector === 'object' && components[selector.type]) {
      _mountSpecialBlock(mountPoint, selector, components[selector.type], '');
      return true;
    }
    for (var comp in components) {
      if (typeof selector === 'object') {
        if (
          components[comp].canHandle &&
          components[comp].canHandle(selector)
        ) {
          _mountSpecialBlock(mountPoint, selector, components[comp], '');
          return true;
        }
      } else {
        if (
          components[comp].canHandle &&
          components[comp].canHandle(blocks[selector], selector)
        ) {
          _mountSpecialBlock(
            mountPoint,
            blocks[selector],
            components[comp],
            selector
          );
          return true;
        }
      }
    }

    return false;
  }

  function _mountNewContainer(column) {
    var id = 'block_' + blockNumbering;
    var _id = '#' + id;
    $(column).append('<div id="' + id + '"></div>');
    mountedBlocks[_id] = {
      parent: column,
      childs: [],
    };
    if (!mountedBlocks[column])
      mountedBlocks[column] = {
        childs: [],
      };
    mountedBlocks[column].childs.push(_id);
    /*
    DT_function.onRemove($(column+' #'+id)[0], function() {
      console.log('Removed from DOM: ', id);
    })*/
    blockNumbering++;
    return _id;
  }

  var subscribeBlockList = {};

  function subscribeBlock(me, callback) {
    var key = me.key;
    if (!subscribeBlockList[key]) subscribeBlockList[key] = $.Callbacks();
    var cb = function (data) {
      setTimeout(function () {
        callback(data);
      }, 0);
    };
    subscribeBlockList[key].add(cb);

    var unsubscribe = function () {
      subscribeBlockList[key].remove(cb);
    };
    me.callbacks.subscriptionList.push(unsubscribe);
    return unsubscribe;
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
      if (subscribeBlockList[key]) subscribeBlockList[key].fire(block);
      else if (typeof key === 'string') {
        var keySplit = key.split('_');
        if (keySplit.length === 2 && subscribeBlockList[keySplit[0]]) {
          //we call the parent call back with empty block update
          subscribeBlockList[keySplit[0]].fire({});
        }
      }
    }
  }

  function isMounted(me) {
    if (me.$mountPoint.length) return true;
    removeBlock(me);
    return false;
  }

  function _setTimeout(me, callback, timeout) {
    me.callbacks.timeoutList.push(
      setTimeout(function () {
        if (isMounted(me)) callback(me);
      }, timeout)
    );
  }

  function _setInterval(me, callback, interval) {
    me.callbacks.intervalList.push(
      setInterval(function () {
        if (isMounted(me)) callback(me);
      }, interval)
    );
  }

  function _subscribeDevice(me, idx, getCurrent, callback) {
    var unsubscribe = Domoticz.subscribe(idx, getCurrent, function (data) {
      if (isMounted(me)) callback(data);
    });
    me.callbacks.subscriptionList.push(unsubscribe);
    return unsubscribe;
  }

  function isAvailable() {
      console.log('check domoticzIsAvailable');
      return $.get({
        url: window.location.href,
        type: 'GET',
        async: true,
        error: function (jqXHR, textStatus) {
          if (typeof textStatus !== 'undefined' && textStatus === 'abort') {
            console.log('Domoticz request cancelled');
          } else {
            if (jqXHR.status == 401) {
              return 'Domoticz authorizaton error';
            }
            var errorTxt = 'Domoticz error code: ' + jqXHR.status + ' ' + textStatus;
            console.error( errorTxt + '!\nPlease, double check the path to Domoticz in Settings!');
            Debug.log(
              Debug.ERROR,
              errorTxt
            );
          }
          console.log('No Domoticz');
          return textStatus;
        },
      }).then(function (res) {
        //                        console.log('ajax resolved ' + query);
        console.log('result: ', res);
        return !!res;
      });
  }

  return {
    init: _init,
    onResize: _onResize,
    mountSpecialBlock: _mountSpecialBlock,
    mount: _mount,
    register: _register,
    mountNewContainer: _mountNewContainer,
    mountDefaultBlock: _mountDefaultBlock,
    subscribeBlock: subscribeBlock,
    setBlock: setBlock,
    setTimeout: _setTimeout,
    setInterval: _setInterval,
    subscribeDevice: _subscribeDevice,
    removeBlock: removeBlock,
    setEmpty: setEmpty,
    isAvailable: isAvailable,
    mountedBlocks: mountedBlocks,
    getProperty: getProperty,
  };
})();

//# sourceURL=js/dashticz.js
