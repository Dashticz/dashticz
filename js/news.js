function setSrcRss(cur) {
    $($(cur).data('target')).find('iframe').attr('src', $(cur).data('link'));
}

$.ajax({url: 'vendor/jquery.newsTicker.min.js', async: false, dataType: 'script'});

function getNews(columndiv, blockdef, newsfeed) {
    if (typeof(newsfeed) !== 'undefined' && newsfeed!=='') {
        // Some RSS feed doesn't load trough crossorigin.me or vice versa
        //$.ajax('https://crossorigin.me/'+newsfeed, {
        $.ajax(_CORS_PATH + newsfeed, {
            accepts: {
                xml: 'application/rss+xml'
            },
            dataType: 'xml',
            success: function (data) {

                var width = 12;
                if (typeof(blocks[blockdef]) !== 'undefined' && typeof(blocks[blockdef]['width']) !== 'undefined') width = blocks[blockdef]['width'];

                var maxheight = 0;
                if (typeof(blocks[blockdef]) !== 'undefined' && typeof(blocks[blockdef]['maxheight']) !== 'undefined') maxheight = blocks[blockdef]['maxheight'];

                var maxcss = '';
                if (maxheight > 0) maxcss = ' style="max-height:' + maxheight + 'px;overflow:hidden;"';

                var html = '<div class="col-xs-' + width + ' hover transbg" ' + maxcss + '><div class="col-xs-2 col-icon"><em class="fas fa-newspaper"></em></div><div class="col-xs-10">';
                html += '<div id="rss-styled_' + blockdef + '"><ul id="newsTicker">';

                $(data).find('item').each(function () { // or "item" or whatever suits your feed
                    var el = $(this);
                    html += '<li data-toggle="modal" data-toggle="modal" data-target="#rssweb" data-link="' + el.find("link").text() + '" onclick="setSrcRss(this);"><strong>' + el.find("title").text() + '</strong><br />' + el.find("description").text() + '</li>';

                });

                html += '</div></div></div>';
                $(columndiv).replaceWith('<div class="' + blockdef + '">' + html + '</div>');

                if ($('#rssweb').length === 0) {
                    var htmlRss = '<div class="modal fade" id="rssweb" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">';
                    htmlRss += '<div class="modal-dialog">';
                    htmlRss += '<div class="modal-content">';
                    htmlRss += '<div class="modal-header">';
                    htmlRss += '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>';
                    htmlRss += '</div>';
                    htmlRss += '<div class="modal-body">';
                    htmlRss += '<iframe sandbox="" data-popup="" width="100%" height="570" frameborder="0" allowtransparency="true"></iframe> ';
                    htmlRss += '</div>';
                    htmlRss += '</div>';
                    htmlRss += '</div>';
                    htmlRss += '</div>';
                    $('body').append(htmlRss);
                }
//                return;
                newsWrapper = $('#rss-styled_' + blockdef).easyTicker({
                    direction: 'up',
                    easing: 'lineair',
                    speed: 'slow',
                    interval: parseFloat(settings['news_scroll_after'] * 1000),
                    visible: 1,
                    mousePause: 0
                }).data('easyTicker');
/*
                var maxHeight = -1;
                if (typeof(blocks[blockdef]) !== 'undefined' && typeof(blocks[blockdef]['maxheight']) !== 'undefined') maxHeight = blocks[blockdef]['maxheight'];

                $('#rss-styled_' + blockdef + ' li').each(function () {
                    maxHeight = maxHeight > $(this).height() ? maxHeight : $(this).height();
                });

                if(maxHeight > 0) {
                  $('#rss-styled_' + blockdef).parents('.transbg').height(maxHeight);
                }*/
            },error: function(data){
		infoMessage('<font color="red">News Error!</font>','RSS feed ' + data.statusText +'. Check rss url.', 10000);
		}
        });

        setTimeout(function () {
          getNews(columndiv, blockdef, newsfeed);
        }, (60000 * 5));
    }
}
