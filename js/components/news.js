/* global settings _CORS_PATH infoMessage Dashticz*/
// eslint-disable-next-line no-unused-vars
var DT_news = {
    name: "news",
    canHandle: (block) => block && block.feed,
    init(){
        return $.ajax({
            url: 'vendor/jquery.newsTicker.min.js',
            dataType: 'script'
        });
    },
    default: {
        icon: 'fas fa-newspaper',
        containerClass: () => 'hover',
        containerExtra: (block) => (block && block.maxheight) ? ' style="max-height:' + block.maxheight + 'px;overflow:hidden;"' : ''
    },
    get: () => '<ul id="newsTicker"></div>',
    run(me) {
        var newsfeed = settings['default_news_url'];
        if (me.block && me.block.feed) newsfeed = me.block.feed;

        // Some RSS feed doesn't load trough crossorigin.me or vice versa
        //$.ajax('https://crossorigin.me/'+newsfeed, {
        $.ajax(_CORS_PATH + newsfeed, {
            accepts: {
                xml: 'application/rss+xml'
            },
            dataType: 'xml',
            success: function (data) {
                var html = '';
                $(data).find('item').each(function () { // or "item" or whatever suits your feed
                    var el = $(this);
                    html += '<li data-toggle="modal" data-target="#rssweb" data-link="' + el.find("link").text() + '" onclick="setSrcRss(this);"><strong>' + el.find("title").text() + '</strong><br />' + el.find("description").text() + '</li>';
                });

                var el = $(me.mountPoint + ' #newsTicker');
                el.html(html);

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

                $(me.mountPoint + ' .dt_state').easyTicker({
                    direction: 'up',
                    easing: 'lineair',
                    speed: 'slow',
                    interval: parseFloat(settings['news_scroll_after'] * 1000),
                    visible: 1,
                    mousePause: 0

                });

                let maxHeight = -1;
                if (me.block && me.block.maxheight) maxHeight = me.block.maxheight;
                $(me.mountPoint + ' li').each(function () {
                    maxHeight = maxHeight > $(this).height() ? maxHeight : $(this).height();
                });

                if (maxHeight > 0) {
                    $(me.mountPoint + ' .news').height(maxHeight);
                }
            },
            error: function (data) {
                infoMessage('<font color="red">News Error!</font>', 'RSS feed ' + data.statusText + '. Check rss url.', 10000);
            }
        });

        setTimeout(function () {
            DT_news.run(me);
        }, (60000 * 5));
    }


}

Dashticz.register(DT_news);