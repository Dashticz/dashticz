/* global Dashticz _CORS_PATH moment settings ksort createModalDialog*/
var allchannels = [];

var DT_tvguide = {
  name: 'tvguide',
  canHandle: function (block) {
    return block && block.channels;
  },
  defaultCfg: {
    icon: 'fas fa-tv',
    refresh: 300,
    maxitems: 10,
    containerClass: 'hover',
  },
  refresh: function (me) {
    var tvObj = me.block;
    var tvobject = $(me.mountPoint + ' .dt_state');
    loadChannels(me)
      .fail(function () {
        console.log('TVGuide error');
      })
      .then(function () {
        var cache = new Date().getTime();

        var curUrl =
          _CORS_PATH +
          'http://json.tvgids.nl/v4/programs/?day=0&channels=' +
          tvObj.channels.join(',') +
          '&time=' +
          cache;
        moment.locale(settings['calendarlanguage']);
        return $.getJSON(curUrl);
      })
      .then(function (data) {
        var tvitems = [];
        var maxitems = tvObj.maxitems;
        for (var channel in data.data) {
          for (var e in data.data[channel].prog) {
            var event = data.data[channel].prog[e];
            var enddateStamp = event.e;
            if (parseFloat(enddateStamp) > moment().format('X')) {
              var newevent = {};
              newevent.starttime = moment(event.s, 'X').format('HH:mm');
              newevent.endtime = moment(event.e, 'X').format('HH:mm');
              newevent.channel = allchannels[channel];
              newevent.title = event.title;
              newevent.db_id = event.db_id;
              newevent.descr = event.descr;
              newevent.img = event.img;
              if (typeof tvitems[enddateStamp] === 'undefined')
                tvitems[enddateStamp] = [];
              tvitems[enddateStamp].push(newevent);
            }
          }
        }
        tvobject.html('');
        var counter = 1;
        tvitems = ksort(tvitems);
        for (var check in tvitems) {
          var items = tvitems[check];
          for (var c in items) {
            var item = items[c];
            if (check > moment().format('X') && counter <= maxitems) {
              //Sometimes there might be no endtime (?). In that case the next line will give an error
              var widget =
                '<div>' +
                item['starttime'] +
                ' - ' +
                item['endtime'] +
                ' - <em>' +
                item['channel'] +
                '</em> - <b>' +
                item['title'] +
                '</b></div>';
              $(widget)
                .appendTo(tvobject)
                .click(item.db_id, function (evt) {
                  var tmp = {
                    url: tvObj.url || 'https://tvgids.nl/programma/' + evt.data,
                  };
                  $('body').append(
                    createModalDialog('openpopup', 'tvguideModal', tmp)
                  );
                  $('#tvguideModal').on('hidden.bs.modal', function () {
                    $(this).data('bs.modal', null);
                    $(this).remove();
                  });

                  $('#tvguideModal').modal('show');
                });
              counter++;
            }
          }
        }
      });

    function loadChannels() {
      if (typeof allchannels[1] !== 'undefined') return $.when();
      var curUrl = _CORS_PATH + 'http://json.tvgids.nl/v4/channels';
      return $.getJSON(curUrl)
        .done(function (channels) {
          for (var num in channels.data) {
            allchannels[channels.data[num]['ch_id']] =
              channels.data[num]['ch_name'];
          }
          return allchannels;
        })
        .fail(function () {
          console.log(
            'error getting channel info from tvgids. Retrying later.'
          );
        });
    }
  },
};
Dashticz.register(DT_tvguide);
