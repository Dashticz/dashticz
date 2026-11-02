/* global Dashticz DT_function Domoticz language */
//# sourceURL=js/components/mower.js
/* Mower widget: a Husqvarna robotic mower, as the Husqvarna plugin of Domoticz
 * creates its devices. The block (dispatched on mowermode, added with the
 * Widgets menu's Mower card) has no devices to choose: the devices of the
 * hardware whose name contains "Husqvarna" are found by name:
 *   state and location (texts), the battery level of the mower with a bar,
 *   the run switch (mowing on/off) and the actions (buttons).
 * With mowersource 'dashticz' the widget does not use Domoticz: Husqvarna is
 * asked directly, by vendor/dashticz/husqvarna/index.php, with the settings
 * of the block (mowerclientid, mowerclientsecret, mowername, mowerpoll in
 * minutes, mowerstart in minutes).
 * Only the devices that exist are drawn.
 */
var DT_mower = (function () {
  var FINDERS = {
    state: function (d) {
      return /[- ]state$/i.test(d.Name);
    },
    location: function (d) {
      return /[- ]location$/i.test(d.Name);
    },
    schedule: function (d) {
      return /next schedule/i.test(d.Name);
    },
    run: function (d) {
      return /[- ]run$/i.test(d.Name) && d.Type === 'Light/Switch';
    },
    // The Husqvarna plugin reports the battery of the mower as the battery
    // level of its devices (255 = no battery information).
    battery: function (d) {
      var level = parseInt(d.BatteryLevel, 10);
      return level >= 0 && level <= 100;
    },
    actions: function (d) {
      return /[- ]actions$/i.test(d.Name) && !!d.LevelNames;
    },
  };
  var ORDER = ['state', 'location', 'schedule', 'run', 'battery', 'actions'];
  // Start and Park: the levels of the actions device of the widget.
  var BRIDGE_ACTIONS = { 20: 'Start', 60: 'ParkUntilNextSchedule' };

  return {
    name: 'mower',
    canHandle: function (block) {
      return !!(block && block.mowermode === 'info');
    },
    defaultCfg: {
      width: 6,
      icon: 'fas fa-robot',
      containerClass: 'mower-block',
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
          pollMinutes(me.block) * 60000
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
    nextStartText: nextStartText,
    levels: levels,
    actionButtons: actionButtons,
    cleanText: cleanText,
  };

  function esc(value) {
    return DT_function.escapeHtml(value);
  }

  function label(key, fallback) {
    var misc = (typeof language !== 'undefined' && language.misc) || {};
    return misc['mower_' + key] || fallback;
  }

  function usesBridge(block) {
    return !!block && block.mowersource === 'dashticz';
  }

  function pollMinutes(block) {
    var minutes = parseInt(block.mowerpoll, 10);
    return minutes >= 1 && minutes <= 60 ? minutes : 5;
  }

  function connection(block) {
    return {
      clientId: block.mowerclientid || '',
      clientSecret: block.mowerclientsecret || '',
      mower: block.mowername || '',
      pollMinutes: pollMinutes(block),
    };
  }

  function two(number) {
    return (number < 10 ? '0' : '') + number;
  }

  // The next start of the mower (milliseconds, its local time written as UTC)
  // as 'Today 11:00' / 'Tomorrow 11:00' / '03-11 11:00'.
  function nextStartText(ms, now) {
    var at = new Date(ms);
    var time = two(at.getUTCHours()) + ':' + two(at.getUTCMinutes());
    var day = Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate());
    now = now || new Date();
    var today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    if (day === today) return time;
    if (day === today + 86400000)
      return label('tomorrow', 'Tomorrow') + ' ' + time;
    return two(at.getUTCDate()) + '-' + two(at.getUTCMonth() + 1) + ' ' + time;
  }

  // The answer of the Husqvarna bridge as the devices the widget draws.
  function fromBridge(data) {
    var result = {};
    ORDER.forEach(function (key) {
      result[key] = null;
    });
    if (!data) return result;
    var text = data.status || '';
    if (data.parked && data.nextStart)
      text =
        label('parked_until', 'Parked until') +
        ' ' +
        nextStartText(data.nextStart);
    result.state = { Data: text };
    if (typeof data.battery === 'number')
      result.battery = { BatteryLevel: data.battery };
    result.run = { Status: data.parked ? 'Off' : 'On' };
    result.actions = {
      Levels: [
        [20, 'Start'],
        [60, 'ParkUntilNextSchedule'],
      ],
    };
    return result;
  }

  function fetchStatus(me) {
    DT_function.bridge(
      'husqvarna/index.php',
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
          label('error', 'Unable to reach Husqvarna.')
        );
        render(me);
      }
    );
  }

  function send(me, command) {
    DT_function.bridge(
      'husqvarna/index.php',
      $.extend(
        {
          action: 'command',
          command: command,
          minutes: parseInt(me.block.mowerstart, 10) || 120,
        },
        connection(me.block)
      )
    ).then(
      function () {
        setTimeout(function () {
          fetchStatus(me);
        }, 3000);
      },
      function (jqXHR) {
        me.error = DT_function.bridgeError(
          jqXHR,
          label('error', 'Unable to reach Husqvarna.')
        );
        render(me);
      }
    );
  }

  // {state: device, location: device, ...} of the Husqvarna hardware, or the
  // mower itself (data of the bridge) when the block's source is Dashticz.
  function findDevices(block, data) {
    if (usesBridge(block)) return fromBridge(data);
    var all =
      (typeof Domoticz !== 'undefined' && Domoticz.getAllDevices()) || {};
    var mower = Object.keys(all)
      .map(function (idx) {
        return all[idx];
      })
      .filter(function (d) {
        return (
          d &&
          d.idx !== undefined &&
          /husqvarna|mower/i.test(d.HardwareName || '')
        );
      });
    var result = {};
    ORDER.forEach(function (key) {
      result[key] = mower.filter(FINDERS[key])[0] || null;
    });
    return result;
  }

  // The text of a device, without html tags: ['Tomorrow 11:00', 'Grass too short'].
  function cleanText(value) {
    return String(value === undefined ? '' : value)
      .split('\n')
      .map(function (line) {
        return line.replace(/<[^>]*>/g, '').trim();
      })
      .filter(Boolean);
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
        return item[1] !== '' && item[0] > 0 && !/^\(.*\)$/.test(item[1]);
      });
  }

  // Only the Start and Park buttons are shown; the other actions of the
  // selector (pause, resume schedule, ...) are left out.
  function actionButtons(dev) {
    var all = levels(dev);
    function find(re) {
      return all.filter(function (item) {
        return re.test(item[1]);
      })[0];
    }
    var start = find(/^start/i);
    var park = find(/^parkuntilnextschedule$/i) || find(/^park/i);
    return [
      start && { level: start[0], label: label('start', 'Start') },
      park && { level: park[0], label: label('park', 'Park') },
    ].filter(Boolean);
  }

  function pair(key, fallback, lines) {
    return (
      '<div class="mower-pair mower-' +
      key +
      '"><span class="mower-caption">' +
      esc(label(key, fallback)) +
      '</span><span class="mower-value">' +
      lines
        .map(function (line) {
          return esc(line);
        })
        .join('<br>') +
      '</span></div>'
    );
  }

  function render(me) {
    var bridge = usesBridge(me.block);
    var dev = findDevices(me.block, me.data);
    var $state = me.$mountPoint.find('.dt_state');
    var html = '';
    var buttons = '';
    if (dev.state)
      html +=
        '<div class="mower-state">' +
        esc(cleanText(dev.state.Data).join(' ') || '-') +
        '</div>';
    if (dev.location)
      html += pair('location', 'Location', cleanText(dev.location.Data));
    if (dev.battery) {
      var level = parseInt(dev.battery.BatteryLevel, 10);
      html +=
        pair('battery', 'Battery', [level + ' %']) +
        '<div class="mower-bar"><span class="mower-bar-fill" style="width:' +
        level +
        '%"></span></div>';
    }
    if (dev.run) {
      var on = /^on$/i.test(dev.run.Status || dev.run.Data);
      buttons +=
        '<button type="button" class="mower-btn mower-toggle' +
        (on ? ' active' : '') +
        '" data-act="run" aria-pressed="' +
        on +
        '">' +
        esc(label('run', 'Mowing')) +
        ': ' +
        esc(on ? label('on', 'On') : label('off', 'Off')) +
        '</button>';
    }
    if (dev.actions)
      buttons += actionButtons(dev.actions)
        .map(function (item) {
          return (
            '<button type="button" class="mower-btn" data-act="action" data-level="' +
            item.level +
            '">' +
            esc(item.label) +
            '</button>'
          );
        })
        .join('');
    if (buttons)
      html += '<div class="mower-actions" role="group">' + buttons + '</div>';
    if (html && me.error)
      html += '<div class="mower-error">' + esc(me.error) + '</div>';
    var empty = bridge
      ? me.error || label('loading', 'Loading...')
      : label('not_found', 'No mower devices found in Domoticz.');
    $state.html(
      html
        ? '<div class="mower-widget">' + html + '</div>'
        : '<div class="mower-empty">' + esc(empty) + '</div>'
    );
  }

  // The buttons of the tile, handled on the tile itself so that they keep
  // working when the tile is drawn again.
  function bind(me) {
    me.$mountPoint.on('click', '.mower-btn', function () {
      var dev = findDevices(me.block, me.data);
      var act = $(this).attr('data-act');
      if (usesBridge(me.block)) {
        var level = parseInt($(this).attr('data-level'), 10);
        if (act === 'run' && dev.run)
          send(
            me,
            /^on$/i.test(dev.run.Status)
              ? 'ParkUntilFurtherNotice'
              : 'ResumeSchedule'
          );
        else if (act === 'action' && BRIDGE_ACTIONS[level])
          send(me, BRIDGE_ACTIONS[level]);
        return;
      }
      if (act === 'run' && dev.run) {
        var on = /^on$/i.test(dev.run.Status || dev.run.Data);
        Domoticz.request(
          'type=command&param=switchlight&idx=' +
            dev.run.idx +
            '&switchcmd=' +
            (on ? 'Off' : 'On')
        );
      } else if (act === 'action' && dev.actions) {
        Domoticz.request(
          'type=command&param=switchlight&idx=' +
            dev.actions.idx +
            '&switchcmd=Set%20Level&level=' +
            parseInt($(this).attr('data-level'), 10)
        );
      }
    });
  }
})();

Dashticz.register(DT_mower);
