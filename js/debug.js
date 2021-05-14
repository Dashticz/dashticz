//# sourceURL=js/debug.js
/* global TemplateEngine*/

var Debug = (function () {
  var templateEngine = TemplateEngine();
  var messages = [];
  var visible = false;
  var requestCount = 0;
  var lastRequest = '';

  var $el;
  var $elbody;

  //  window.console = dtConsole;

  return {
    init: init,
    log: log,
    INFO: 0,
    REQUEST: 1,
    ERROR: 2,
    CONFIG: 3,
  };

  function init() {
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
        visible = true;
        createDebug();
      });
      $el.on('hide.bs.modal', function () {
        visible = false;
      });
    });
  }

  function createDebug() {
    var html = messages.reduce(function (acc, msg) {
      return acc + (msg.type === Debug.REQUEST ? '' : renderDebugRow(msg));
    }, '');
    $elbody.html(html);
    updateStatus();
  }

  function renderDebugRow(msg) {
    return (
      '<div>' +
      msg.timestamp.toISOString().slice(11, 23) +
      ': ' +
      msg.msg +
      '</div>'
    );
  }

  function add(item) {
    messages.push(item);
    if (item.type === Debug.REQUEST) {
      lastRequest = item;
      requestCount += 1;
      updateStatus();
      return;
    }

    if (visible) {
      $elbody.append(renderDebugRow(item));
      updateStatus();
    }
    if (messages.length > 1000) {
      messages.splice(0, 1);
      if (visible) $elbody.find(':first-child').remove();
    }
  }

  function updateStatus() {
    $el.find('.debug-status').html(requestCount + ': ' + lastRequest.msg);
  }

  function log() {
    var msg;
    var start = 0;
    var type = 0;
    if (arguments.length > 1 && typeof arguments[0] === 'number') {
      type = arguments[0];
      start = 1;
    }
    for (var i = start; i < arguments.length; i++) {
      var arg = arguments[i];
      var str = typeof arg === 'object' ? JSON.stringify(arg) : arg;
      msg = (msg ? msg + ' ' : '') + str;
    }
    var item = {
      timestamp: new Date(),
      msg: msg,
      type: type,
    };
    add(item);
  }
})();
