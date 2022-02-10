/* global _CORS_PATH, language, Dashticz */
var DT_train = {
  name: 'train',
  defaultCfg: {
    icon: 'fas fa-train',
    containerClass: 'hover trainrow',
    containerExtra:
      'data-toggle="modal" data-target="#trainweb" onclick="setSrc(this);"',
    refresh: 300,
  },
  refresh: function (me) {
    var rssurl = _CORS_PATH + 'https://www.rijdendetreinen.nl/rss/';

    $.ajax(rssurl, {
      accepts: {
        xml: 'application/rss+xml',
      },
      dataType: 'xml',
    }).then(function (data) {
      var count = 0;
      $(data)
        .find('title')
        .each(function () {
          // or "item" or whatever suits your feed
          var el = $(this);
          if (el.find('title').text().substr(0, 8) !== 'Opgelost') {
            count++;
          }
        });

      Dashticz.setEmpty(me, !count)  
      
      $(me.mountPoint + ' .dt_state').html(
        count + ' ' + language.misc.notifications_ns
      );

      if ($('#trainweb').length == 0) {
        var html =
          '<div class="modal fade" id="trainweb" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">';
        html += '<div class="modal-dialog">';
        html += '<div class="modal-content">';
        html += '<div class="modal-header">';
        html +=
          '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>';
        html += '</div>';
        html += '<div class="modal-body">';
        html +=
          '<iframe data-popup="https://www.rijdendetreinen.nl/" width="100%" height="570" frameborder="0" allowtransparency="true"></iframe> ';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        $('body').append(html);
      }
    });
  },
};

Dashticz.register(DT_train);
