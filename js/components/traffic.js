/* global _CORS_PATH Dashticz templateEngine moment settings*/
// eslint-disable-next-line no-unused-vars
var DT_traffic = {
  name: 'traffic',
  defaultCfg: {
    icon: 'fas fa-car',
    containerClass: 'hover trafficrow',
    //    containerExtra:
    //      'data-toggle="modal" data-target="#trafficweb"',
    refresh: 300,
    url: 'https://rwsverkeersinfo.nl/',
    newwindow: 1,
    show_lastupdate: true,
    clickHandler: true,
  },
  refresh: function (me) {
    var rssurl = _CORS_PATH + 'https://api.rwsverkeersinfo.nl/api/traffic/';

    $.getJSON(rssurl).then(function (data) {
      return templateEngine.load('traffic').then(function (template) {
        data.show_lastupdate = me.block.show_lastupdate;
        data.lastupdate = moment().format(settings['timeformat']);
        data.totalLengthOfJams = Math.ceil(data.totalLengthOfJams / 1000);
        $(me.mountPoint + ' .dt_state').html(template(data));
      });
    });
  },
};

Dashticz.register(DT_traffic);

//# sourceURL=js/components/traffic.js
