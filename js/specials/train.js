/* global _CORS_PATH, language */
// eslint-disable-next-line no-unused-vars
function DT_train(block) {
    return {
        name: 'train',
        icon: 'fas fa-train',
        containerClass: 'hover trainrow', // and trafficrow
        containerExtra: 'data-toggle="modal" data-target="#trainweb" onclick="setSrc(this);"',
        getState: getStateTrain,
        run: runTrain
    }
}

function getStateTrain() {
    return '<strong></strong>'
}


function runTrain(me) {
    var rssurl = _CORS_PATH + 'https://www.rijdendetreinen.nl/rss/';

    $.ajax(rssurl, {
        accepts: {
            xml: 'application/rss+xml'
        },
        dataType: 'xml',
        success: function (data) {
            var count = 0;
            $(data).find('title').each(function () { // or "item" or whatever suits your feed
                var el = $(this);
                if (el.find('title').text().substr(0, 8) !== 'Opgelost') {
                    count++;
                }
            });

            $(me.mountPoint + ' strong').html(count + ' ' + language.misc.notifications_ns);

            if ($('#trainweb').length == 0) {
                var html = '<div class="modal fade" id="trainweb" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">';
                html += '<div class="modal-dialog">';
                html += '<div class="modal-content">';
                html += '<div class="modal-header">';
                html += '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>';
                html += '</div>';
                html += '<div class="modal-body">';
                html += '<iframe data-popup="https://www.rijdendetreinen.nl/" width="100%" height="570" frameborder="0" allowtransparency="true"></iframe> ';
                html += '</div>';
                html += '</div>';
                html += '</div>';
                html += '</div>';
                $('body').append(html);
            }
        }
    });
    setTimeout(function () {
        runTrain(me);
    }, (60000 * 5));
}