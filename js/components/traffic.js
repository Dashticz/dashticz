/* global _CORS_PATH Dashticz*/
// eslint-disable-next-line no-unused-vars
var DT_traffic = {
    name: "traffic",
    default: {
        icon: 'fas fa-car',
        containerClass: function () {
            return 'hover trafficrow'
        },
        containerExtra: function () {
            return 'data-toggle="modal" data-target="#trafficweb" onclick="setSrc(this);"'
        }
    },
    run: function (me) {

        var rssurl = _CORS_PATH + 'http://www.vid.nl/VI/_rss';

        $.ajax(rssurl, {
                accepts: {
                    xml: 'application/rss+xml'
                },
                dataType: 'xml'
            })
            .then(function (data) {
                $(data).find('item').each(function () { // or "item" or whatever suits your feed
                    var el = $(this);
                    var text = el.find("title").text();
                    text = text.split(') [');
                    text = text[0] + ')';
                    $(me.mountPoint + ' .dt_state').html(text);

                    if ($('#trafficweb').length == 0) {
                        var html = '<div class="modal fade" id="trafficweb" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">';
                        html += '<div class="modal-dialog">';
                        html += '<div class="modal-content">';
                        html += '<div class="modal-header">';
                        html += '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>';
                        html += '</div>';
                        html += '<div class="modal-body">';
                        html += '<iframe data-popup="http://www.vid.nl/VI/overzicht" width="100%" height="570" frameborder="0" allowtransparency="true"></iframe> ';
                        html += '</div>';
                        html += '</div>';
                        html += '</div>';
                        html += '</div>';
                        $('body').append(html);
                    }
                });

            });

        setTimeout(function () {
            DT_traffic.run(me);
        }, (60000 * 5));
    }
}

Dashticz.register(DT_traffic);