/* global settings _CORS_PATH infoMessage Dashticz moment*/
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
        }
    },
    get: function () {
        return '<div id="container"><ul id="newsTicker"></div></div>'
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
                var asAutoHeight = me.block && me.block.maxheight === 'auto';
                var asFixedHeight = me.block && me.block.maxheight && Number(me.block.maxheight);
                var html = '';
                var maxItems = 0;
                var startMoment = 0;
                var countItems = 0;
                if (me.block && me.block.filter) {
                    var filterCount = parseInt(me.block.filter);
                    var filterUnit = me.block.filter
                      .split(" ")
                      .splice(-1)[0];
                    if (filterUnit === 'items') {
                        maxItems = filterCount;
                    }
                    else {
                        startMoment = moment().subtract(filterCount, filterUnit)
                    }
                  }
        
                $(data).find('item')
                .sort(function(left, right) {
                    var leftdate=$(left).find('pubDate')[0].innerHTML;
                    var rightdate= $(right).find('pubDate')[0].innerHTML;
                    var diff = moment(rightdate)-moment(leftdate);
                    return diff;
                }).each(function () { 
                    if (maxItems && (countItems>=maxItems)) {
                        return
                    }
                    if (startMoment) {
                        var pubDate = $(this).find('pubDate')[0].innerHTML;
                        if (moment(pubDate) < startMoment) {
                            return;
                        }
                    }
                    countItems++;
                    var el = $(this);
                    html += '<li data-toggle="modal" data-toggle="modal" data-target="#rssweb" data-link="' + el.find("link").text() + '" onclick="setSrcRss(this);">';
                    html += '	<div class="news_row">';
                    if (!(me.block && typeof me.block.showimages !== 'undefined' && !me.block.showimages)) {
                        html += '		<div class="news_image">';
                        var image = el.find('media\\:content, content').attr('url');
                        if (!image) image = el.find('enclosure').attr('url');
                        if (image)
                            html += '			<img src="' + image + '"/>';
                        html += '		</div>';
                    }
                    html += '		<div>';
                    html += '			<div class="headline">';
                    html += '				<strong class="title">' + el.find("title").text() + '</strong>';
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
                    htmlRss += '<iframe data-popup="" width="100%" height="570" frameborder="0" allowtransparency="true"></iframe> ';
                    htmlRss += '</div>';
                    htmlRss += '</div>';
                    htmlRss += '</div>';
                    htmlRss += '</div>';
                    $('body').append(htmlRss);
                }
                $(me.mountPoint + ' #container').easyTicker({
                    direction: 'up',
                    easing: 'lineair',
                    speed: 'slow',
                    interval: parseFloat(settings['news_scroll_after'] * 1000),
                    visible: 1,
                    mousePause: 0
                });

                if (asAutoHeight) return; /*auto adjust news block height*/
                if (asFixedHeight) { /*set to fixed height*/
                    $(me.mountPoint + ' .dt_state').height(asFixedHeight);
                    return;
                }
                /*Adjust height to max height of the news items*/
                var maxHeight = -1;
                $(me.mountPoint + ' li').each(function () {
                    maxHeight = maxHeight > $(this).outerHeight() ? maxHeight : $(this).outerHeight();
                });
                if (maxHeight > 0) {
                    $(me.mountPoint + ' .dt_state').height(maxHeight);
                }

                //The images may still be loading. Adjust the block height on image load event
                var images = $(me.mountPoint + ' .news_image img');
                if (images.length) {
                    images.each(function () {
                        this.addEventListener("load", function () {
                            var mh = $(this).height();
                            if (mh > maxHeight) {
                                maxHeight = mh;
                                $(me.mountPoint + ' .dt_state').height(maxHeight);
                            }
                        });
                    });
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