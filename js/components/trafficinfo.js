/* global  Dashticz language _CORS_PATH*/
var DT_trafficinfo = {
  name: 'trafficinfo',
  canHandle: function (block) {
    return block && (block.trafficJams || block.roadWorks || block.radars);
  },
  defaultCfg: function (block) {
    if (block && block.refresh && parseFloat(block.refresh) < 60)
      block.refresh = 60;
    var showempty = (block && block.showemptyroads) ? false : 'No traffic announcements';
    return {
      icon: 'fas fa-car',
      containerClass: 'trafficinforow',
      refresh: 300,
      url: 'https://www.anwb.nl/verkeer',
      newwindow: 1,
      clickHandler: true,
      provider: 'anwb',
      results: 50,
      showempty: showempty,
      showemptyroads: false,
      trafficJams: true,
      roadWorks: true,
      radars: true
    };
  },
  defaultContent: language.misc.loading,
  refresh: function (me) {
    var dataURL =
      _CORS_PATH +
      'https://api.anwb.nl/v2/incidents?apikey=QYUEE3fEcFD7SGMJ6E7QBCMzdQGqRkAi';

    $.getJSON(dataURL, function (data) {
      dataTrafficInfo(me, data);
    });

    function dataTrafficInfo(me, data) {

      var trafficobject = me.block;
      var dataPart = {};
      var i = 0;
      var key;
      var noData = true;
      var roadArray = [];
      if (typeof trafficobject.road != 'undefined') {
        if (trafficobject.road.indexOf(',')) {
          roadArray = trafficobject.road.split(/, |,/);
        } else {
          roadArray.push(trafficobject.road);
        }
        roadArray.sort();
        if (trafficobject.showemptyroads) {
          var showempty = typeof trafficobject.showemptyroads === 'string' ? trafficobject.showemptyroads : 'Geen verkeersinformatie';
          for (var x = 0; x < roadArray.length; x++) {
            key = roadArray[x];
            var html = '<div><b class="title">' + key + '</b><br>' +
              showempty +
              '<br></div>';
            dataPart[key] = [html];
          }
        }
      }
      for (var d in data) {
        if (d == 'roads') {
          for (var t in data[d]) {
            var roadId = data[d][t]['road'];
            key = roadId;
            if (
              typeof trafficobject.road == 'undefined' ||
              (roadArray.indexOf(roadId) > -1)
            ) {
              var segments = data[d][t]['segments'];
              var header = '';
              i = 0;
              for (var segment in segments) {
                for (var seg in segments[segment]) {
                  if (
                    (trafficobject.trafficJams && seg == 'jams') ||
                    (trafficobject.roadWorks && seg == 'roadworks') ||
                    (trafficobject.radars && seg == 'radars')
                  ) {
                    for (var s in segments[segment][seg]) {
                      if (
                        (typeof trafficobject.segStart == 'undefined' ||
                          (typeof trafficobject.segStart != 'undefined' &&
                            segments[segment]['start'] ==
                            trafficobject.segStart)) &&
                        (typeof trafficobject.segEnd == 'undefined' ||
                          (typeof trafficobject.segEnd != 'undefined' &&
                            segments[segment]['end'] == trafficobject.segEnd))
                      ) {
                        if (typeof dataPart[key] == 'undefined') {
                          dataPart[key] = [];
                        }
                        //if (typeof (trafficobject.title) == 'undefined' || (typeof (trafficobject.title) != 'undefined' && typeof (trafficobject.road) == 'undefined')){
                        if (key != header) {
                          dataPart[key][i] =
                            '<div><b class="title">' + roadId + '</b><br>';
                          header = key;
                        } else {
                          dataPart[key][i] = '<div>';
                        }
                        //}
                        if (segments[segment][seg][s]['from'] != null) {
                          dataPart[key][i] +=
                            '<b>' +
                            segments[segment][seg][s]['from'] +
                            '</b>';
                        }
                        if (
                          segments[segment][seg][s]['to'] != null &&
                          segments[segment][seg][s]['to'] !=
                          segments[segment][seg][s]['from']
                        ) {
                          dataPart[key][i] +=
                            '<b> - ' +
                            segments[segment][seg][s]['to'] +
                            '</b>';
                        }
                        if (
                          segments[segment][seg][s]['from'] != null ||
                          segments[segment][seg][s]['to'] != null
                        ) {
                          dataPart[key][i] += '<br>';
                        }
                        if (segments[segment][seg][s]['delay'] != null) {
                          var delay = segments[segment][seg][s]['delay'] / 60;
                          dataPart[key][i] +=
                            '+ ' + Math.round(delay) + 'min';
                        }
                        if (segments[segment][seg][s]['distance'] != null) {
                          var distance =
                            segments[segment][seg][s]['distance'] / 1000;
                          dataPart[key][i] +=
                            ' - ' + distance.toFixed(1) + 'km';
                        }
                        if (
                          segments[segment][seg][s]['delay'] != null ||
                          segments[segment][seg][s]['distance'] != null
                        ) {
                          dataPart[key][i] += '<br>';
                        }

                        if (
                          seg == 'jams' &&
                          segments[segment][seg][s]['reason'] == null
                        ) {
                          if (
                            segments[segment][seg][s]['events'][0]['text'] !=
                            null
                          ) {
                            dataPart[key][i] +=
                              segments[segment][seg][s]['events'][0]['text'] +
                              '<br>';
                          }
                        } else if (seg == 'radars') {
                          dataPart[key][i] +=
                            segments[segment][seg][s]['events'][0]['text'] +
                            '. ' +
                            segments[segment][seg][s]['reason'] +
                            '<br>';
                        } else if (
                          segments[segment][seg][s]['reason'] != null
                        ) {
                          dataPart[key][i] +=
                            segments[segment][seg][s]['reason'] + '<br>';
                        }
                        dataPart[key][i] += '</div>';
                        if (dataPart[key][i] !== '<div></div>') {
                          i++;
                          noData = false;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }

      }
      $(me.mountPoint + ' .dt_state').html('');
      var c = 1;
      Object.keys(dataPart).forEach(function (d) {
        //Object.keys(dataPart).sort().forEach(function(d) {
        for (var p in dataPart[d]) {
          if (c <= trafficobject.results)
            $(me.mountPoint + ' .dt_state').append(dataPart[d][p]);
          c++;
        }
      });

      if (noData && me.block.showempty) {
        var emptyblock = typeof me.block.showempty === 'string' ? me.block.showempty : 'No traffic announcements';
        $(me.mountPoint + ' .dt_state').append('<div class="empty">' + emptyblock + '</div>');
      }

      Dashticz.setEmpty(me, noData);

      if (
        typeof trafficobject.show_lastupdate !== 'undefined' &&
        trafficobject.show_lastupdate == true
      ) {
        var dt = new Date();
        $(me.mountPoint + ' .dt_state').append(
          '<em>' +
          language.misc.last_update +
          ': ' +
          addZero(dt.getHours()) +
          ':' +
          addZero(dt.getMinutes()) +
          ':' +
          addZero(dt.getSeconds()) +
          '</em>'
        );
      }
    }

    function addZero(input) {
      if (input < 10) {
        return '0' + input;
      } else {
        return input;
      }
    }
  },
};

Dashticz.register(DT_trafficinfo);

//# sourceURL=js/components/trafficinfo.js
