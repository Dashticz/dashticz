/* global _CORS_PATH Dashticz templateEngine*/
// eslint-disable-next-line no-unused-vars
var DT_traffic = {
  name: 'traffic',
  defaultCfg: {
    icon: 'fas fa-car',
    containerClass: 'hover trafficrow',
    containerExtra:
      'data-toggle="modal" data-target="#trafficweb" onclick="setSrc(this);"',
    refresh: 300,
    link: 'https://www.nu.nl/verkeer',
    linkUseCors: false,
  },
  refresh: function (me) {
    var rssurl = _CORS_PATH + 'https://api.rwsverkeersinfo.nl/api/traffic/';

    $.getJSON(rssurl).then(function (data) {
      return templateEngine.load('traffic').then(function (template) {
        console.log(data);
        $(me.mountPoint + ' .dt_state').html(template(data));
      });
    });
    if ($('#trafficweb').length == 0) {
      var html =
        '<div class="modal fade" id="trafficweb" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">';
      html += '<div class="modal-dialog">';
      html += '<div class="modal-content">';
      html += '<div class="modal-header">';
      html +=
        '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>';
      html += '</div>';
      html += '<div class="modal-body">';
      html +=
        '<iframe data-popup="' +
        (me.block.linkUseCors ? _CORS_PATH : '') +
        me.block.link +
        '" frameborder="0" allowtransparency="true"></iframe> ';
      html += '</div>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
      $('body').append(html);
    }
  },
};

Dashticz.register(DT_traffic);

//# sourceURL=js/components/traffic.js
