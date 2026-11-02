/* global Dashticz DT_function Domoticz language */
//# sourceURL=js/components/toon.js
/* Toon widget: the sensors and controls of a (rooted) Toon thermostat, as the
 * domoticz_toon plugin creates them in Domoticz. The block (dispatched on
 * toonmode, added with the Widgets menu's Toon card) has no devices to choose:
 * the devices of the hardware whose name contains "Toon" are found by name:
 *   room temperature and thermostat setpoint (with - and + buttons),
 *   boiler pressure, boiler state and modulation,
 *   the scene (buttons), the program info and the summer mode (button).
 * With toonsource 'dashticz' the widget does not use Domoticz: the Toon is
 * asked directly, by vendor/dashticz/toon/index.php, with the settings of the
 * block (toonhost, toonport, toonpoll in seconds).
 * Only the devices that exist are drawn.
 */
var DT_toon = (function () {
  // key: a function that tells whether a Domoticz device is that Toon device.
  var FINDERS = {
    room: function (d) {
      return d.Type === 'Temp' || d.Type === 'Temp + Humidity';
    },
    setpoint: function (d) {
      return d.Type === 'Setpoint';
    },
    pressure: function (d) {
      return d.SubType === 'Pressure' || /keteldruk|pressure/i.test(d.Name);
    },
    boiler: function (d) {
      return /ketelstand|ketelmode|boiler ?(state|mode)/i.test(d.Name);
    },
    modulation: function (d) {
      return /modulat/i.test(d.Name);
    },
    scene: function (d) {
      return /scene/i.test(d.Name) && !!d.LevelNames;
    },
    program: function (d) {
      return /programinfo|program info/i.test(d.Name);
    },
    summer: function (d) {
      return /zomermodus|summer/i.test(d.Name);
    },
  };
  var ORDER = [
    'room',
    'setpoint',
    'pressure',
    'boiler',
    'modulation',
    'scene',
    'program',
    'summer',
  ];
  var STEP = 0.5;
  var SCENES = [
    [10, 'Weg'],
    [20, 'Slapen'],
    [30, 'Thuis'],
    [40, 'Comfort'],
  ];

  return {
    name: 'toon',
    canHandle: function (block) {
      return !!(block && block.toonmode === 'info');
    },
    defaultCfg: {
      width: 6,
      icon: 'fas fa-temperature-half',
      containerClass: 'toon-block',
      template: 1,
    },
    run: function (me) {
      if (usesBridge(me.block)) {
        bind(me);
        render(me);
        fetchStatus(me);
        me.timer = setInterval(
          function () {
            if (!me.$mountPoint.closest('body').length) clearInterval(me.timer);
            else fetchStatus(me);
          },
          pollSeconds(me.block) * 1000
        );
        return;
      }
      var devices = findDevices();
      ORDER.forEach(function (key) {
        if (devices[key])
          Dashticz.subscribeDevice(me, devices[key].idx, false, function () {
            render(me);
          });
      });
      bind(me);
      render(me);
    },
    refresh: function (me) {
      if (usesBridge(me.block)) fetchStatus(me);
      else render(me);
    },
    // Exposed for the tests.
    render: render,
    findDevices: findDevices,
    fromBridge: fromBridge,
    levels: levels,
    parseNumber: parseNumber,
  };

  function esc(value) {
    return DT_function.escapeHtml(value);
  }

  function label(key, fallback) {
    var misc = (typeof language !== 'undefined' && language.misc) || {};
    return misc['toon_' + key] || fallback;
  }

  function usesBridge(block) {
    return !!block && block.toonsource === 'dashticz';
  }

  function pollSeconds(block) {
    var seconds = parseInt(block.toonpoll, 10);
    return seconds >= 5 && seconds <= 600 ? seconds : 30;
  }

  function connection(block) {
    return {
      host: block.toonhost || '',
      port: parseInt(block.toonport, 10) || 80,
    };
  }

  // The answer of the Toon bridge as the devices the widget draws.
  function fromBridge(data) {
    var result = {};
    ORDER.forEach(function (key) {
      result[key] = null;
    });
    if (!data) return result;
    if (typeof data.room === 'number') result.room = { Temp: data.room };
    if (typeof data.setpoint === 'number')
      result.setpoint = { SetPoint: data.setpoint };
    if (typeof data.pressure === 'number')
      result.pressure = { Data: data.pressure + ' Bar' };
    if (data.boiler)
      result.boiler = {
        Data: label('boiler_' + data.boiler, data.boiler),
      };
    if (typeof data.modulation === 'number')
      result.modulation = { Data: data.modulation + ' %' };
    if (data.scene) result.scene = { Level: data.scene, Levels: SCENES };
    if (data.program) result.program = { Data: data.program };
    return result;
  }

  function fetchStatus(me) {
    DT_function.bridge(
      'toon/index.php',
      $.extend({ action: 'status' }, connection(me.block))
    ).then(
      function (data) {
        me.data = data || null;
        me.error = '';
        render(me);
      },
      function (jqXHR) {
        me.error = DT_function.bridgeError(
          jqXHR,
          label('error', 'Unable to reach the Toon.')
        );
        render(me);
      }
    );
  }

  function send(me, command, value) {
    DT_function.bridge(
      'toon/index.php',
      $.extend(
        { action: 'command', command: command, value: value },
        connection(me.block)
      )
    ).then(
      function () {
        setTimeout(function () {
          fetchStatus(me);
        }, 1500);
      },
      function (jqXHR) {
        me.error = DT_function.bridgeError(
          jqXHR,
          label('error', 'Unable to reach the Toon.')
        );
        render(me);
      }
    );
  }

  // {room: device, setpoint: device, ...} of the Toon hardware, or the Toon
  // itself (data of the bridge) when the block's source is Dashticz.
  function findDevices(block, data) {
    if (usesBridge(block)) return fromBridge(data);
    var all =
      (typeof Domoticz !== 'undefined' && Domoticz.getAllDevices()) || {};
    var toon = Object.keys(all)
      .map(function (idx) {
        return all[idx];
      })
      .filter(function (d) {
        return d && d.idx !== undefined && /toon/i.test(d.HardwareName || '');
      });
    var result = {};
    ORDER.forEach(function (key) {
      result[key] = toon.filter(FINDERS[key])[0] || null;
    });
    return result;
  }

  function parseNumber(value) {
    var match = /(-?\d+(?:[.,]\d+)?)/.exec(
      String(value === undefined ? '' : value)
    );
    return match ? parseFloat(match[1].replace(',', '.')) : null;
  }

  // [[level, name], ...] of a selector switch, without the hidden off level.
  function levels(dev) {
    if (dev.Levels) return dev.Levels;
    var names = '';
    try {
      names = atob(dev.LevelNames || '');
    } catch (e) {
      names = '';
    }
    return names
      .split('|')
      .map(function (name, i) {
        return [i * 10, name];
      })
      .filter(function (item) {
        return item[1] !== '' && item[0] > 0;
      });
  }

  function degrees(value) {
    return value === null ? '-' : value.toFixed(1) + '°';
  }

  function pair(key, fallback, value) {
    return (
      '<div class="toon-pair toon-' +
      key +
      '"><span class="toon-caption">' +
      esc(label(key, fallback)) +
      '</span><span class="toon-value">' +
      esc(value) +
      '</span></div>'
    );
  }

  function mainHtml(dev) {
    var room = dev.room
      ? parseNumber(dev.room.Temp !== undefined ? dev.room.Temp : dev.room.Data)
      : null;
    var parts = '';
    if (dev.room) {
      parts +=
        '<div class="toon-temp"><span class="toon-temp-value">' +
        esc(degrees(room)) +
        '</span><span class="toon-caption">' +
        esc(label('room', 'Room')) +
        '</span></div>';
    }
    if (dev.setpoint) {
      var sp = parseNumber(
        dev.setpoint.SetPoint !== undefined
          ? dev.setpoint.SetPoint
          : dev.setpoint.Data
      );
      parts +=
        '<div class="toon-setpoint"><span class="toon-caption">' +
        esc(label('setpoint', 'Setpoint')) +
        '</span><span class="toon-sp-row"><button type="button" class="toon-btn" data-act="down" aria-label="-">&minus;</button>' +
        '<span class="toon-sp-value">' +
        esc(degrees(sp)) +
        '</span><button type="button" class="toon-btn" data-act="up" aria-label="+">+</button></span></div>';
    }
    return parts ? '<div class="toon-main">' + parts + '</div>' : '';
  }

  function infoHtml(dev) {
    var html = '';
    if (dev.pressure)
      html += pair('pressure', 'Boiler pressure', dev.pressure.Data);
    if (dev.boiler) html += pair('boiler', 'Boiler', dev.boiler.Data);
    if (dev.modulation) {
      var percentage = Math.max(
        0,
        Math.min(100, parseNumber(dev.modulation.Data) || 0)
      );
      html +=
        pair('modulation', 'Modulation', dev.modulation.Data) +
        '<div class="toon-bar"><span class="toon-bar-fill" style="width:' +
        percentage +
        '%"></span></div>';
    }
    return html ? '<div class="toon-info">' + html + '</div>' : '';
  }

  function scenesHtml(dev) {
    if (!dev.scene) return '';
    var current = parseInt(dev.scene.Level, 10);
    return (
      '<div class="toon-scenes" role="group" aria-label="' +
      esc(label('scene', 'Scene')) +
      '">' +
      levels(dev.scene)
        .map(function (item) {
          return (
            '<button type="button" class="toon-btn toon-scene' +
            (item[0] === current ? ' active' : '') +
            '" data-act="scene" data-level="' +
            item[0] +
            '">' +
            esc(item[1]) +
            '</button>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  function footHtml(dev) {
    var html = '';
    if (dev.program)
      html +=
        '<span class="toon-program">' + esc(dev.program.Data || '') + '</span>';
    if (dev.summer) {
      var on = /^on$/i.test(dev.summer.Status || dev.summer.Data);
      html +=
        '<button type="button" class="toon-btn toon-summer' +
        (on ? ' active' : '') +
        '" data-act="summer" aria-pressed="' +
        on +
        '">' +
        esc(label('summer', 'Summer mode')) +
        '</button>';
    }
    return html ? '<div class="toon-foot">' + html + '</div>' : '';
  }

  function render(me) {
    var bridge = usesBridge(me.block);
    var dev = findDevices(me.block, me.data);
    var $state = me.$mountPoint.find('.dt_state');
    var html = mainHtml(dev) + infoHtml(dev) + scenesHtml(dev) + footHtml(dev);
    if (html && me.error)
      html += '<div class="toon-error">' + esc(me.error) + '</div>';
    var empty = bridge
      ? me.error || label('loading', 'Loading...')
      : label('not_found', 'No Toon devices found in Domoticz.');
    $state.html(
      html
        ? '<div class="toon-widget">' + html + '</div>'
        : '<div class="toon-empty">' + esc(empty) + '</div>'
    );
  }

  // The buttons of the tile, handled on the tile itself so that they keep
  // working when the tile is drawn again.
  function bind(me) {
    me.$mountPoint.on('click', '.toon-btn', function () {
      var dev = findDevices(me.block, me.data);
      var bridge = usesBridge(me.block);
      var act = $(this).attr('data-act');
      if (act === 'up' || act === 'down') {
        if (!dev.setpoint) return;
        var current = parseNumber(
          dev.setpoint.SetPoint !== undefined
            ? dev.setpoint.SetPoint
            : dev.setpoint.Data
        );
        if (current === null) return;
        var value =
          Math.round((current + (act === 'up' ? STEP : -STEP)) / STEP) * STEP;
        $(this)
          .closest('.toon-main')
          .find('.toon-sp-value')
          .text(degrees(value));
        if (bridge) {
          me.data.setpoint = value;
          send(me, 'setpoint', value);
        } else
          Domoticz.request(
            'type=command&param=setsetpoint&idx=' +
              dev.setpoint.idx +
              '&setpoint=' +
              value
          );
      } else if (act === 'scene' && dev.scene && bridge) {
        send(me, 'scene', parseInt($(this).attr('data-level'), 10));
      } else if (act === 'scene' && dev.scene) {
        Domoticz.request(
          'type=command&param=switchlight&idx=' +
            dev.scene.idx +
            '&switchcmd=Set%20Level&level=' +
            parseInt($(this).attr('data-level'), 10)
        );
      } else if (act === 'summer' && dev.summer) {
        var on = /^on$/i.test(dev.summer.Status || dev.summer.Data);
        Domoticz.request(
          'type=command&param=switchlight&idx=' +
            dev.summer.idx +
            '&switchcmd=' +
            (on ? 'Off' : 'On')
        );
      }
    });
  }
})();

Dashticz.register(DT_toon);
