//# sourceURL=js/debug.js
/* global defaultSettings config settings */
/* The Dashticz log: Debug.log, Debug.action and Debug.widget write to
   custom/logs/dashticz.log through js/log.php. Settings -> Log shows it. */

var Debug = (function () {
  // Server log (custom/logs/dashticz.log, written by js/log.php).
  // settings.logLevel: off, error (default), warning, action or debug.
  var LOG_LEVELS = { off: -1, error: 0, warning: 1, action: 2, debug: 3 };
  var serverQueue = [];
  var serverSeen = {};
  var serverTimer = null;
  var serverFailedAt = 0;
  var widgetSeen = {};
  var forceNext = false; // the next server log line skips the duplicate check

  return {
    init: init,
    log: log,
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
      Debug.log(
        'Config settings without default:\n' + keysWithoutDefault.join(', ')
      );
    }
    initServerLog();
    log('init');
  }

  function add(item) {
    toServerLog(item);
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
})();
