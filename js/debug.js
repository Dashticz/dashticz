//# sourceURL=js/debug.js
/* global TemplateEngine defaultSettings config time settings Chart blocks moment*/

var Debug = (function () {
  var templateEngine = TemplateEngine();
  var messages = [];
  var memorySamples = [];
  var memoryUsedSamples = [];
  var memoryGraph;
  var visible = false;
  var requestCount = 0;
  var lastRequest = '';
  var startTime = time();
  var filteredConfig = {};

  // Server log (custom/logs/dashticz.log, written by js/log.php).
  // settings.logLevel: off, error (default), warning, action or debug.
  var LOG_LEVELS = { off: -1, error: 0, warning: 1, action: 2, debug: 3 };
  var serverQueue = [];
  var serverSeen = {};
  var serverTimer = null;
  var serverFailedAt = 0;
  var widgetSeen = {};
  var forceNext = false; // the next server log line skips the duplicate check

  var $el;
  var $elbody;

  //  window.console = dtConsole;

  return {
    init: init,
    log: log,
    tst: tst,
    saveDebug: saveDebug,
    action: action,
    widget: widget,
    maskSensitive: maskSensitive,
    INFO: 0,
    REQUEST: 1,
    ERROR: 2,
    CONFIG: 3,
    ACTION: 4,
    WARNING: 5,
  };

  function init() {
    var configKeys = Object.keys(config);
    var keysWithoutDefault = configKeys.filter(function (key) {
      return !defaultSettings.hasOwnProperty(key);
    });
    if (keysWithoutDefault.length) {
      //      Debug.log('Config settings without default:\n'+JSON.stringify(keysWithoutDefault,null, 2));
      Debug.log(
        'Config settings without default:\n' + keysWithoutDefault.join(', ')
      );
    }
    //Find config keys unequal to default setting
    filteredConfig = configKeys.reduce(function (cfg, key) {
      var val = config[key];
      if (val != defaultSettings[key]) cfg[key] = val;
      return cfg;
    }, {});

    initServerLog();

    $('body').on('click', '.logo', function () {
      $el.modal({
        show: true,
      });
    });
    return templateEngine.load('debug').then(function (template) {
      var data = {};
      $('body').append(template(data));
      $el = $('#modal-debug');
      $el.modal({
        show: false,
      });
      $elbody = $el.find('#debug-items');
      log('init');
      $el.on('show.bs.modal', function () {
        if (!settings.heartbeat) {
          logUsage();
        }

        visible = true;
        createDebug();
        var obj = $elbody[0];
        setTimeout(function () {
          obj.scrollTop = obj.scrollHeight;
        }, 100);
      });
      $el.on('hide.bs.modal', function () {
        visible = false;
      });
      $el.find('#debug-save').on('click', saveDebug);
      if (settings.heartbeat) startHeartbeat();
    });
  }

  function logUsage() {
    Debug.log(
      (settings.heartbeat
        ? 'heartbeat ' +
          Number((time() - startTime) / settings.heartbeat) +
          ', '
        : '') +
        'usedJSHeapSize: ' +
        (performance.memory.usedJSHeapSize / 1000).toFixed() +
        'kB, ' +
        'DOM element count: ' +
        $('*').length
    );
  }

  function startHeartbeat() {
    setInterval(function heartbeat() {
      logUsage();
      var memory = performance.memory;
      var newDate = new Date();
      addSample(memorySamples, {
        t: newDate,
        y: memory.totalJSHeapSize / 1000,
      });
      addSample(memoryUsedSamples, {
        t: newDate,
        y: memory.usedJSHeapSize / 1000,
      });
      //$('*').length
      if (visible) memoryGraph.update();
    }, settings['heartbeat'] * 1000);
  }

  function addSample(data, sample) {
    data.push(sample);
    limitSize(data, 40);
  }

  function limitSize(data, len) {
    if (data.length >= len) {
      var sampleRate =
        ((data[data.length - 1].t.getTime() - data[0].t.getTime()) / len) * 2;
      var startTime = data[0].t.getTime();
      var i = 0;
      while (i < data.length) {
        var keep = i - 1 == data.length;
        if (data[i].t.getTime() >= startTime) keep = true;
        if (!keep) {
          var m1 = i >= 1 ? data[i - 1].y : data[i].y;
          var m2 = i >= 2 ? data[i - 2].y : m1;
          var p1 = i <= data.length - 2 ? data[i + 1].y : data[i].y;
          var p2 = i <= data.length - 3 ? data[i + 2].y : p1;
          var myMax = Math.max(m2, m1, p1, p2);
          var myMin = Math.min(m2, m1, p1, p2);
          if (data[i].y > myMax) keep = true;
          if (data[i].y < myMin) keep = true;
        }
        if (keep) {
          startTime = data[i].t.getTime() + sampleRate;
          i++;
        } else {
          data.splice(i, 1);
        }
      }
    }
  }

  function createDebug() {
    var html = messages.reduce(function (acc, msg) {
      return acc + (msg.type === Debug.REQUEST ? '' : renderDebugRow(msg));
    }, '');
    $elbody.html(html);
    updateStatus();
    renderConfigTab();
    renderBlockTab();
    if (settings.heartbeat) renderMemoryGraph();
  }

  function renderConfigTab() {
    var div = $el.find('#debug-config');

    div.html('<pre>' + JSON.stringify(filteredConfig, null, 2) + '</pre>');
  }

  function renderMemoryGraph() {
    var div = $el.find('#debug-memory');
    var chartctx = div[0].getContext('2d');
    var graphProperties = {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'TotalHeapSize',
            lineTension: 0,
            data: memorySamples,
            backgroundColor: 'rgba(255,0,0,0.3)',
          },
          {
            label: 'UsedHeapSize',
            lineTension: 0,
            data: memoryUsedSamples,
            backgroundColor: 'rgba(0,255,0,0.3)',
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        scales: {
          xAxes: [
            {
              type: 'time',
              ticks: {
                maxTicksLimit: 11,
              },
            },
          ],
        },
      },
    };
    memoryGraph = new Chart(chartctx, graphProperties);
  }

  function renderBlockTab() {
    var div = $el.find('#debug-blocks');
    div.html('<pre>' + JSON.stringify(blocks, null, 2) + '</pre>');
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderDebugRow(msg) {
    return (
      '<div>' +
      msg.timestamp.toISOString().slice(11, 23) +
      ': ' +
      escapeHtml(msg.msg) +
      '</div>'
    );
  }

  function add(item) {
    messages.push(item);
    toServerLog(item);
    if (item.type === Debug.REQUEST) {
      lastRequest = item;
      requestCount += 1;
      updateStatus();
      return;
    }

    if (visible) {
      $elbody.append(renderDebugRow(item));
      updateStatus();
      //      $elbody[0].scrollIntoView({behavior: "smooth"});
    }
    if (messages.length > 1000) {
      messages.splice(0, 1);
      if (visible) $elbody.find(':first-child').remove();
    }
  }

  function updateStatus() {
    $el.find('.debug-status').text(requestCount + ': ' + lastRequest.msg);
  }

  function tst() {
    console.log('test');
  }

  function log() {
    return write(3, arguments);
  }

  // A user or system action (switching a device, saving settings): logged
  // when settings.logLevel is action or debug.
  function action() {
    var args = [Debug.ACTION];
    for (var i = 0; i < arguments.length; i++) args.push(arguments[i]);
    return write(3, args);
  }

  // A message of a widget (a notification of an appliance, a failed data
  // request) with the widget name in front. level 'error' for a widget that
  // does not work, otherwise (default) a warning. always: log it also when
  // the same message was logged less than 5 minutes ago (a status change).
  function widget(name, text, level, always) {
    // Widgets draw their message again at every refresh: once per 5 minutes.
    var key = name + ':' + text;
    var now = Date.now();
    if (!always && widgetSeen[key] && now - widgetSeen[key] < 300000) return;
    widgetSeen[key] = now;
    if (Object.keys(widgetSeen).length > 200) widgetSeen = {};
    forceNext = !!always;
    return write(3, [
      level === 'error' ? Debug.ERROR : Debug.WARNING,
      '[' + name + '] ' + text,
    ]);
  }

  function write(stackDepth, args) {
    var msg;
    var start = 0;
    var type = 0;
    var err = new Error('test');
    try {
      msg = err.stack ? err.stack.split('\n')[stackDepth].slice(7) + ':' : '';
    } catch (e) {
      msg = '';
    }
    if (args.length > 1 && typeof args[0] === 'number') {
      type = args[0];
      start = 1;
    }
    var text = '';
    for (var i = start; i < args.length; i++) {
      var arg = args[i];
      text += typeof arg === 'object' ? JSON.stringify(arg) : arg;
    }
    var item = {
      timestamp: new Date(),
      msg: msg + text,
      text: text,
      type: type,
    };
    add(item);
  }

  /* ---- server log ---- */

  function maskSensitive(text) {
    return String(text)
      .replace(/\/\/[^/@\s:]+:[^/@\s]+@/g, '//***@')
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer ***')
      .replace(
        /((?:pass(?:word|wd)?|pwd|pw|token|secret|api[_-]?key|apikey|authorization|auth|key|pin(?:code)?)["']?\s*[:=]\s*["']?)[^&\s"',}]+/gi,
        '$1***'
      );
  }

  function serverLogLevel() {
    var level = String(settings.logLevel || 'error').toLowerCase();
    return LOG_LEVELS.hasOwnProperty(level) ? LOG_LEVELS[level] : 0;
  }

  function toServerLog(item) {
    var force = forceNext;
    forceNext = false;
    var level;
    var text = item.text;
    if (item.type === Debug.ERROR) level = 'error';
    else if (item.type === Debug.WARNING) level = 'warning';
    else if (item.type === Debug.ACTION) level = 'action';
    else if (item.type === Debug.INFO) level = 'debug';
    else if (item.type === Debug.REQUEST) {
      // Only the commands that change something are an action.
      if (!/(^|[?&])type=command(&|$)/.test(item.text)) return;
      level = 'action';
      text = 'Domoticz command: ' + commandSummary(item.text);
    } else return;
    if (LOG_LEVELS[level] > serverLogLevel()) return;
    serverLog(level, text, force);
  }

  // type=command&param=switchlight&idx=5&switchcmd=On -> only these fields.
  function commandSummary(query) {
    var allowed = ['param', 'idx', 'switchcmd', 'level', 'setpoint', 'status'];
    var parts = [];
    String(query)
      .replace(/^[^?]*\?/, '')
      .split('&')
      .forEach(function (pair) {
        var kv = pair.split('=');
        if (allowed.indexOf(kv[0]) !== -1) parts.push(kv[0] + '=' + kv[1]);
      });
    return parts.join(' ');
  }

  function serverLog(level, text, force) {
    text = maskSensitive(text).slice(0, 1000);
    // The same message within 5 minutes is logged once (a failing request
    // that repeats on every refresh would otherwise fill the log).
    var key = level + ':' + text;
    var now = Date.now();
    if (!force && serverSeen[key] && now - serverSeen[key] < 300000) return;
    serverSeen[key] = now;
    if (Object.keys(serverSeen).length > 200) serverSeen = {};
    if (serverQueue.length >= 50) return;
    serverQueue.push({ l: level, m: text, t: new Date().toISOString() });
    if (!serverTimer) serverTimer = setTimeout(flushServerLog, 2000);
  }

  function flushServerLog() {
    serverTimer = null;
    if (!serverQueue.length) return;
    // After a failure the server log stays off for 10 minutes.
    if (Date.now() - serverFailedAt < 600000) {
      serverQueue = [];
      return;
    }
    var entries = serverQueue;
    serverQueue = [];
    $.getJSON(settings['dashticz_php_path'] + 'info.php?get=csrf')
      .then(function (csrf) {
        return $.ajax({
          url: 'js/log.php',
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify({ entries: entries }),
          headers: { 'X-Dashticz-CSRF': csrf.token },
        });
      })
      .fail(function () {
        serverFailedAt = Date.now();
      });
  }

  function isLogRequest(url) {
    return /(^|\/)log\.php(\?|$)/.test(String(url || ''));
  }

  // URL without query values, except the Domoticz type.
  function plainUrl(url) {
    var parts = String(url || '').split('?');
    var type = /(^|&)type=([a-z_]+)/.exec(parts[1] || '');
    return parts[0] + (type ? '?type=' + type[2] : '');
  }

  // console.error goes to the log as an error, console.warn as a debug line.
  function hookConsole() {
    ['error', 'warn'].forEach(function (method) {
      var original = window.console && window.console[method];
      if (typeof original !== 'function') return;
      window.console[method] = function () {
        try {
          var text = Array.prototype.map
            .call(arguments, function (arg) {
              if (arg instanceof Error) return arg.message;
              return typeof arg === 'object' ? JSON.stringify(arg) : arg;
            })
            .join(' ');
          if (method === 'error') log(Debug.ERROR, 'console.error: ' + text);
          else log(Debug.INFO, 'console.warn: ' + text);
        } catch (e) {
          // Logging must never break the caller.
        }
        return original.apply(window.console, arguments);
      };
    });
  }

  function initServerLog() {
    hookConsole();
    window.addEventListener('error', function (e) {
      if (!e.message) return; // resource load errors have no message
      log(
        Debug.ERROR,
        'JS error: ' + e.message + ' (' + e.filename + ':' + e.lineno + ')'
      );
    });
    window.addEventListener('unhandledrejection', function (e) {
      var reason = e.reason;
      log(
        Debug.ERROR,
        'Unhandled promise rejection: ' +
          (reason && reason.message ? reason.message : String(reason))
      );
    });
    $(document).ajaxError(function (event, xhr, options) {
      if (isLogRequest(options.url) || xhr.statusText === 'abort') return;
      log(
        Debug.ERROR,
        'Request failed: ' +
          (options.type || 'GET') +
          ' ' +
          plainUrl(options.url) +
          ' (' +
          (xhr.status || 'no response') +
          ' ' +
          (xhr.statusText || '') +
          ')' +
          (xhr.responseJSON && typeof xhr.responseJSON.error === 'string'
            ? ': ' + xhr.responseJSON.error
            : '')
      );
    });
    // A bridge (vendor/dashticz/*) that answers 200 with {"error": "..."}.
    $(document).ajaxSuccess(function (event, xhr, options, data) {
      if (
        data &&
        typeof data === 'object' &&
        typeof data.error === 'string' &&
        data.error &&
        /vendor\/dashticz\//.test(String(options.url)) &&
        !isLogRequest(options.url)
      ) {
        log(
          Debug.ERROR,
          'Bridge error: ' + plainUrl(options.url) + ': ' + data.error
        );
      }
    });
    // Saving settings, layout, devices, configurations: every POST to js/*.php.
    $(document).ajaxSuccess(function (event, xhr, options) {
      if (
        String(options.type).toUpperCase() !== 'POST' ||
        isLogRequest(options.url) ||
        !/(^|\/)js\/[a-z]+\.php/i.test(String(options.url))
      )
        return;
      action('Saved: ' + plainUrl(options.url));
    });
  }

  function saveDebug() {
    var debugData = {
      messages: messages.map(function (res) {
        return res.timestamp.toISOString().slice(11, 23) + ' ' + res.msg + '\n';
      }),
      config: filteredConfig,
      blocks: blocks,
    };
    var debugTxt = JSON.stringify(debugData, null, 2)
      .split('\n')
      .map(function (res) {
        return res + '\n';
      });
    var blobUrl = URL.createObjectURL(
      new Blob(debugTxt, { type: 'text/plain' })
    );
    var download = document.createElement('a');
    download.href = blobUrl;
    download.download =
      'debug.' + moment().format('YYYY-MM-DD-HH-mm-ss') + '.txt';
    document.body.appendChild(download);
    download.click();
    download.remove();
    URL.revokeObjectURL(blobUrl);
  }
})();
