/* global Dashticz _CORS_PATH settings*/

var DT_nzbget = {
  name: 'nzbget',
  defaultContent: '<div id="downloads"></div>',
  defaultCfg: {
    containerClass: 'containsnzbget',
    icon: 'fas fa-cloud',
    title: 'NZBget',
    width: 12,
    refresh: 300,
  },
  refresh: function (me) {
    if (!settings['host_nzbget'] || settings['host_nzbget'] === '') {
      $(me.mountPoint + ' .dt_state').html('host_nzbget not defined.');
      return;
    }
    //        $(me.mountPoint +' .dt_state').addClass('containsnzbget')
    //        var _data = {"method": "listgroups", "nocache": new Date().getTime(), "params": [100] };
    var _data = { method: 'listgroups' };
    NZBGET.rpcUrl = settings['host_nzbget'] + '/jsonrpc';
    NZBGET.call(_data, returnNZBGET);
  },
};

Dashticz.register(DT_nzbget);

function returnNZBGET(data) {
  if (data.length === 0) {
    var dummy = {
      NZBName: 'No active downloads, or no connection',
      DownloadedSizeMB: 0,
      FileSizeMB: 0,
      FirstID: 123,
    };
    data.push(dummy);
  }
  for (var d in data) {
    var itemId = String(data[d]['FirstID']).replace(/[^a-zA-Z0-9_-]/g, '');
    var safeName = $('<div>').text(data[d]['NZBName']).html();
    var html = '<div class="mh transbg nzbget' + itemId + '">';
    html += '<div class="col-xs-12">';
    html +=
      '<strong class="title">' +
      safeName +
      '</strong><br />' +
      data[d]['DownloadedSizeMB'] +
      'MB / ' +
      data[d]['FileSizeMB'] +
      'MB';
    html += '</div>';
    html += '</div>';
    if (
      $('.containsnzbget .dt_state .nzbget' + itemId).length > 0
    ) {
      $('.containsnzbget .dt_state .nzbget' + itemId).replaceWith(
        html
      );
    } else {
      $('.containsnzbget .dt_state').append(html);
    }
  }
}

function resumepauseNZBget(id, func) {
  var _data = {
    method: 'editqueue',
    nocache: new Date().getTime(),
    params: [func, 0, '', [id]],
  };
  NZBGET.rpcUrl = _CORS_PATH + settings['host_nzbget'] + '/jsonrpc';
  NZBGET.call(_data, '');
  $(
    '#nzbget-' + id + ' .details.pause,#nzbget-' + id + ' .details.play'
  ).toggle();
}

var NZBGET = new (function ($) {
  'use strict';

  this.rpcUrl;
  this.call = function (request, completedCallback) {
    $.getJSON(this.rpcUrl + '/' + request.method)
      .fail(function () {
        console.error('NZBGet request failed');
      })
      .then(function (result) {
        if (
          result &&
          result.error == null &&
          typeof completedCallback === 'function'
        ) {
          completedCallback(result.result);
        }
      });
  };
})(jQuery);
