/* global settings _CORS_PATH infoMessage Dashticz*/
// eslint-disable-next-line no-unused-vars
var DT_news = {
    name: "news",
    canHandle: function (block) {
        return block && block.feed
    },
    init: function () {
        return $.ajax({
            url: 'vendor/jquery.newsTicker.min.js',
            dataType: 'script'
        });
    },
    default: {
//        icon: 'fas fa-newspaper',
        containerClass: function () {
            return 'hover'
        },
        containerExtra: function (block) {
            return (block && block.maxheight) ? ' style="max-height:' + block.maxheight + 'px;overflow:hidden;"' : ''
        }
    },
    get: function () {
        return '<ul id="newsTicker"></div>'
    },
    run: function (me) {
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
//                    html += '<li data-toggle="modal" data-target="#rssweb" data-link="' + el.find("link").text() + '" onclick="setSrcRss(this);"><strong>' + el.find("title").text() + '</strong><br />' + el.find("description").text() + '</li>';
                    html += '<li data-toggle="modal" data-toggle="modal" data-target="#rssweb" data-link="' + el.find("link").text() + '" onclick="setSrcRss(this);">';
                    html += '	<div class="news_row">';
                    if (!(me.block && typeof me.block.showimages!=='undefined' && !me.block.showimages)) {
                        html += '		<div class="news_image">';
                        var image=el.find('media\\:content, content').attr('url');
                        if(!image) image=el.find('enclosure').attr('url');
                        if(image)
                            html += '			<img src="' + image + '"/>';
                        html += '		</div>';
                    }
                    html += '		<div>';
                    html += '			<div class="headline">';
                    html += '				<strong class="title">' + el.find("title").text() +'</strong>';
                    html += '				<hr class="hr_thin">';
                    html += '				<div class="description">' + el.find("description").text() + '</div>';
                    html += '				<div class="updated">Updated at ' + moment(el.find('pubDate').text()).format('HH:mm') + '</div>';
                    html += '			</div>';
                    html += '		</div>';
                    html += '	</div>';
                    html += '</li>';
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

                var maxHeight = -1;
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

/* callback for newsfeed item onclick*/
// eslint-disable-next-line no-unused-vars
function setSrcRss(cur) {
    $($(cur).data('target')).find('iframe').attr('src', $(cur).data('link'));
}

Dashticz.register(DT_news);