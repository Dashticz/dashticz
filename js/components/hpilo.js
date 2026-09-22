/* global Dashticz settings language */
//# sourceURL=js/components/hpilo.js
/* HP iLO widget: clustered server info (power, health, uptime, fan speed,
 * temperatures, ...) of an HPE server, read from its iLO Redfish API through
 * vendor/dashticz/hpilo/index.php - a same-origin PHP bridge, like the PostNL
 * and Lyrion widgets, so the LAN-only, self-signed iLO never has to be
 * reachable from the browser. Based on the domoticz_HP_ilo plugin.
 *
 * The iLO host/port/credentials, poll interval, font size and which rows are
 * visible (in order, hpilo_rows) are global settings (Settings -> Widgets -> HP iLO, see
 * js/widgeteditor.js), same as Weather, Garbage or PostNL. Icon, title and
 * background of the tile are the usual block options.
 *
 * Every row is: a small icon, the label and the value right-aligned.
 */
var DT_hpilo = (function () {
  // key: metric (also the backend's result field), icon, English label,
  // formatter and whether it is shown by default.
  var METRICS = [
    { key: 'name', icon: 'fa-server', def: 0 },
    { key: 'model', icon: 'fa-microchip', def: 0 },
    { key: 'power', icon: 'fa-power-off', def: 1, fmt: 'power' },
    { key: 'health', icon: 'fa-heart-pulse', def: 1, fmt: 'health' },
    { key: 'uptime', icon: 'fa-clock', def: 1, fmt: 'duration' },
    { key: 'fanspeed', icon: 'fa-fan', def: 1, unit: ' %' },
    { key: 'cputemp', icon: 'fa-temperature-half', def: 1, unit: ' °C' },
    { key: 'inlettemp', icon: 'fa-temperature-half', def: 1, unit: ' °C' },
    { key: 'watts', icon: 'fa-bolt', def: 0, unit: ' W' },
    { key: 'storage', icon: 'fa-hard-drive', def: 0, fmt: 'health' },
    { key: 'ssdlife', icon: 'fa-hard-drive', def: 0, unit: ' %' },
    { key: 'firmware', icon: 'fa-code-branch', def: 0 },
    { key: 'network', icon: 'fa-network-wired', def: 0 },
    { key: 'serial', icon: 'fa-barcode', def: 0 },
    { key: 'minfan', icon: 'fa-fan', def: 0, unit: ' %' },
    { key: 'thermalconfig', icon: 'fa-gauge-high', def: 0 },
    { key: 'powerregulator', icon: 'fa-plug', def: 0 },
  ];
  var LABELS = {
    name: 'Server name',
    model: 'Model',
    power: 'Server power',
    health: 'Server health',
    uptime: 'Server uptime',
    fanspeed: 'Server fanspeed',
    cputemp: 'CPU temperature',
    inlettemp: 'Inlet temperature',
    watts: 'Power usage',
    storage: 'Storage health',
    ssdlife: 'SSD lifetime',
    firmware: 'iLO firmware',
    network: 'Network',
    serial: 'Serial number',
    minfan: 'Minimum fan speed',
    thermalconfig: 'Thermal configuration',
    powerregulator: 'Power regulator',
  };
  var VALUES = {
    on: 'On',
    off: 'Off',
    ok: 'OK',
    warning: 'Warning',
    critical: 'Critical',
  };

  return {
    name: 'hpilo',
    canHandle: function (block) {
      return !!(block && block.type === 'hpilo');
    },
    defaultCfg: {
      width: 4,
      icon: 'fas fa-server',
      refresh: pollSeconds(),
      containerClass: 'hpilo-block',
      // Same reasoning as Cluster's own defaultCfg (js/components/cluster.js):
      // template: 1 puts the icon/title in their own header row and lets the
      // rows below use the block's full width, instead of the framework
      // default that reserves a .col-icon-wide column beside the rows for
      // the whole block height.
      template: 1,
    },
    run: function (me) {
      refresh(me);
    },
    refresh: refresh,
  };

  function misc() {
    return (typeof language !== 'undefined' && language.misc) || {};
  }

  function pollSeconds() {
    return Math.max(30, parseInt(settings['hpilo_pollseconds'], 10) || 300);
  }

  function fontSize() {
    var size = parseInt(settings['hpilo_fontsize'], 10);
    return size >= 8 && size <= 60 ? size : 14;
  }

  // hpilo_rows: ordered, comma-separated metric keys (the order on the tile).
  function visibleMetrics() {
    var setting = settings['hpilo_rows'];
    var keys =
      typeof setting === 'string'
        ? setting.split(',')
        : METRICS.filter(function (metric) {
            return metric.def;
          }).map(function (metric) {
            return metric.key;
          });
    var result = [];
    keys.forEach(function (key) {
      var metric = METRICS.filter(function (m) {
        return m.key === key.trim();
      })[0];
      if (metric && result.indexOf(metric) === -1) result.push(metric);
    });
    return result;
  }

  function label(key) {
    return misc()['hpilo_' + key] || LABELS[key];
  }

  function esc(text) {
    return String(text).replace(/[&<>"']/g, function (c) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[c];
    });
  }

  // Minutes -> "12d 3h 5m" (units are language independent).
  function formatDuration(totalMinutes) {
    var minutes = Math.max(0, Math.floor(Number(totalMinutes) || 0));
    var days = Math.floor(minutes / 1440);
    var hours = Math.floor((minutes % 1440) / 60);
    var parts = [];
    if (days) parts.push(days + 'd');
    if (days || hours) parts.push(hours + 'h');
    parts.push((minutes % 60) + 'm');
    return parts.join(' ');
  }

  function formatValue(metric, value) {
    if (metric.fmt === 'duration') return formatDuration(value);
    if (metric.fmt) {
      var key = String(value).toLowerCase();
      return misc()['hpilo_value_' + key] || VALUES[key] || value;
    }
    return value + (metric.unit || '');
  }

  // hpilo_icons: JSON map of row key -> icon chosen per row in the widget
  // config ('none' hides the icon); rows without an entry keep their own
  // default icon (METRICS).
  function iconOverrides() {
    var raw = settings['hpilo_icons'];
    try {
      return typeof raw === 'object' && raw
        ? raw
        : JSON.parse(raw || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function iconHtml(metric, overrides) {
    var icon = overrides[metric.key];
    if (icon === 'none') return '';
    if (typeof icon !== 'string' || !/^[A-Za-z0-9 _-]{1,60}$/.test(icon))
      icon = 'fas ' + metric.icon;
    return '<i class="' + icon + ' hpilo-icon" aria-hidden="true"></i>';
  }

  function rowsHtml(res, metrics) {
    var overrides = iconOverrides();
    return metrics
      .filter(function (metric) {
        return res[metric.key] !== null && res[metric.key] !== undefined;
      })
      .map(function (metric) {
        var value = res[metric.key];
        var state =
          metric.fmt === 'health'
            ? ' hpilo-' +
              String(value)
                .toLowerCase()
                .replace(/[^a-z]/g, '')
            : '';
        return (
          '<div class="hpilo-row' +
          state +
          '">' +
          iconHtml(metric, overrides) +
          '<span class="hpilo-label">' +
          esc(label(metric.key)) +
          '</span>' +
          '<span class="hpilo-value">' +
          esc(formatValue(metric, value)) +
          '</span>' +
          '</div>'
        );
      })
      .join('');
  }

  function showMessage(me, text) {
    me.$mountPoint
      .find('.dt_state')
      .html('<div class="hpilo-rows hpilo-error">' + esc(text) + '</div>');
  }

  function refresh(me) {
    me.$mountPoint.find('.dt_state').css('font-size', fontSize() + 'px');
    var host = settings['hpilo_host'] || '';
    var username = settings['hpilo_username'] || '';
    var password = settings['hpilo_password'] || '';
    if (!host || !username || !password) {
      showMessage(
        me,
        misc().hpilo_not_configured ||
          'Configure your iLO in Settings -> Widgets -> HP iLO.'
      );
      return;
    }
    var metrics = visibleMetrics();

    $.ajax({
      url: settings['dashticz_php_path'] + 'hpilo/index.php',
      method: 'POST',
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify({
        host: host,
        port: parseInt(settings['hpilo_port'], 10) || 443,
        username: username,
        password: password,
        pollSeconds: pollSeconds(),
        metrics: metrics.map(function (metric) {
          return metric.key;
        }),
      }),
    }).then(
      function (res) {
        me.$mountPoint
          .find('.dt_state')
          .html(
            '<div class="hpilo-rows">' + rowsHtml(res || {}, metrics) + '</div>'
          );
      },
      function (jqXHR) {
        showMessage(
          me,
          (jqXHR && jqXHR.responseJSON && jqXHR.responseJSON.error) ||
            misc().hpilo_error ||
            'Unable to fetch the iLO data.'
        );
      }
    );
  }
})();

Dashticz.register(DT_hpilo);
