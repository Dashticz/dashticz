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

  var $el;
  var $elbody;

  //  window.console = dtConsole;

  return {
    init: init,
    log: log,
    tst: tst,
    saveDebug: saveDebug,
    INFO: 0,
    REQUEST: 1,
    ERROR: 2,
    CONFIG: 3,
  };

  function init() {
    var configKeys = Object.keys(config); 
    var keysWithoutDefault = configKeys.filter(function(key) {
      return !defaultSettings.hasOwnProperty(key)
    });
    if(keysWithoutDefault.length) {
//      Debug.log('Config settings without default:\n'+JSON.stringify(keysWithoutDefault,null, 2));
        Debug.log('Config settings without default:\n'+keysWithoutDefault.join(', '));
    } 
    //Find config keys unequal to default setting
    filteredConfig=configKeys.reduce(function(cfg, key) {
      var val = config[key];
      if(val!=defaultSettings[key]) cfg[key] = val;
        return cfg;
    },{});
    

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
        if(!settings.heartbeat) {
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
      $el.find('#debug-save').on("click", saveDebug);
      if (settings.heartbeat) startHeartbeat();
    });
  }

  function logUsage() {
    Debug.log(
      (settings.heartbeat? 'heartbeat ' + Number((time() - startTime) / settings.heartbeat)  + ', ': '')+ 
      'usedJSHeapSize: '+(performance.memory.usedJSHeapSize/1000).toFixed() + 'kB, ' +
      'DOM element count: '+$('*').length
    );
  }

  function startHeartbeat() {
    setInterval(function heartbeat() {
      logUsage();
      var memory = performance.memory;
      var newDate = new Date();
      addSample(memorySamples, { t: newDate, y: memory.totalJSHeapSize / 1000 });
      addSample(memoryUsedSamples, { t: newDate, y: memory.usedJSHeapSize / 1000 });
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
      var sampleRate = (data[data.length - 1].t.getTime() - data[0].t.getTime()) / len * 2;
      var startTime = data[0].t.getTime();
      var i = 0;
      while (i < data.length) {
        var keep = i - 1 == data.length;
        if (data[i].t.getTime() >= startTime) keep = true
        if (!keep) {
          var m1 = i >= 1 ? data[i - 1].y : data[i].y;
          var m2 = i >= 2 ? data[i - 2].y : m1;
          var p1 = (i <= data.length - 2) ? data[i + 1].y : data[i].y;
          var p2 = (i <= data.length - 3) ? data[i + 2].y : p1;
          var myMax = Math.max(m2, m1, p1, p2);
          var myMin = Math.min(m2, m1, p1, p2);
          if (data[i].y > myMax) keep = true;
          if (data[i].y < myMin) keep = true;
        }
        if (keep) {
          startTime = data[i].t.getTime() + sampleRate;
          i++;
        }
        else {
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
            backgroundColor: 'rgba(255,0,0,0.3)'
          },
          {
            label: 'UsedHeapSize',
            lineTension: 0,
            data: memoryUsedSamples,
            backgroundColor: 'rgba(0,255,0,0.3)'
          }

        ]
      },
      options: {
        maintainAspectRatio: false,
        scales: {
          xAxes: [{
            type: 'time',
            ticks: {
              maxTicksLimit: 11
            }
          }]
        }
      }
    }
    memoryGraph = new Chart(chartctx, graphProperties);

  }

  function renderBlockTab() {
    var div = $el.find('#debug-blocks');
    div.html('<pre>' + JSON.stringify(blocks, null, 2) + '</pre>');
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
      //      $elbody[0].scrollIntoView({behavior: "smooth"});
    }
    if (messages.length > 1000) {
      messages.splice(0, 1);
      if (visible) $elbody.find(':first-child').remove();
    }
  }

  function updateStatus() {
    $el.find('.debug-status').html(requestCount + ': ' + lastRequest.msg);
  }

  // eslint-disable-next-line no-unused-vars
  function tst() {
    console.log('test');
  }

  function log() {
    var msg;
    var start = 0;
    var type = 0;
    var err = new Error('test');
    try {
      msg = err.stack ? (err.stack.split('\n')[2].slice(7) + ':'):'';
    }
    catch(e) {
     msg='';   
    }
    if (arguments.length > 1 && typeof arguments[0] === 'number') {
      type = arguments[0];
      start = 1;
    }
    for (var i = start; i < arguments.length; i++) {
      var arg = arguments[i];
      var str = typeof arg === 'object' ? JSON.stringify(arg) : arg;
      msg = msg + str;
    }
    var item = {
      timestamp: new Date(),
      msg: msg,
      type: type,
    };
    add(item);
  }

  function saveDebug() {
    // (A) CREATE BLOB OBJECT
    var debugData = {
      messages: messages.map(function (res) { return res.timestamp.toISOString().slice(11, 23) + ' ' + res.msg + '\n' }),
      config: filteredConfig,
      blocks: blocks,
    }
    var debugTxt = JSON.stringify(debugData,null, 2).split('\n').map(function(res) {
      return res+'\n'
    });
    var myBlob = new Blob(debugTxt);
//    var myBlob = new Blob(messages.map(function (res) { return res.timestamp.toISOString().slice(11, 23) + ' ' + res.msg + '\n' }), { type: "text/plain", filename: 'test.txt' });
    // (B) FORM DATA
    var data = new FormData();
    data.append("upfile", myBlob, "debug." + moment().format('YYYY-MM-DD-HH-mm-ss') + ".txt");

    // (C) AJAX UPLOAD TO SERVER
    fetch(settings['dashticz_php_path'] + "upload.php", {
      method: "POST",
      body: data
    })
      .then(function (res) {
        return res.text();
      })
      .then(function(txt) {
        Debug.log(txt)
      });
  }

})();
