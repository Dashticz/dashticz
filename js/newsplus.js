function setSrcRss(cur) {
    $($(cur).data('target')).find('iframe').attr('src', $(cur).data('link'));
}

$.ajax({url: 'vendor/jquery.newsTicker.min.js', async: false, dataType: 'script'});

// Compatible RSS Feeds (containing images, i.e. media:content tag)
// 1. http://www.independent.co.uk/rss (with or without _CORS_PATH)
// 2. https://www.dailymail.co.uk/home/index.rss (with or without _CORS_PATH)
// 3. https://www.mirror.co.uk/?service=rss (using _CORS_PATH)
// 4. https://metro.co.uk/feed/ (using _CORS_PATH)
// 5. https://www.standard.co.uk/rss (using _CORS_PATH)
// 6. https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml (using _CORS_PATH)
// 7. http://www.politico.eu/feed/ (using _CORS_PATH)

function getNewsPlus(columndiv, blockdef, newsfeed) {
    if (typeof(newsfeed) !== 'undefined' && newsfeed!=='') {
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

                var html = '<div class="col-xs-' + width + ' hover  transbg" ' + maxcss + ' >';
                html += '<div id="rss-styled_' + blockdef + '" ><ul id="newsTicker">';

                $(data).find('item').each(function () { 
                    var el = $(this);
                    html += '<li data-toggle="modal" data-toggle="modal" data-target="#rssweb" data-link="' + el.find("link").text() + '" onclick="setSrcRss(this);">';
					html += '	<div class="row">';
					html += '		<div class="col-xs-2 text-center">';
					html += '			<img src="' + el.find('media\\:content, content').attr('url') + '" width="90%"/>';
					html += '		</div>';
					html += '		<div class="col-xs-10">';
					html += '			<div class="ml-2">';
					html += '				<strong class="mb-2">' + el.find("title").text() +'</strong>';
					html += '				<hr class="my-1 hr_thin">';
					html += '				<div class="mb-2" style="font-size: 13px;">' + el.find("description").text() + '</div>';
					html += '				<div class="" style="font-size:10px;opacity:0.4;">Updated at ' + moment(el.find('pubDate').text()).format('HH:mm') + '</div>';
					html += '			</div>';
					html += '		</div>';
					html += '	</div>';
					html += '</li>';

                });

                html += '</div></div>';
                $(columndiv).replaceWith('<div class="' + blockdef + '">' + html + '</div>');

                if ($('#rssweb').length === 0) {
                    var htmlRss = '<div class="modal fade" id="rssweb" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">';
                    htmlRss += '	<div class="modal-dialog">';
                    htmlRss += '		<div class="modal-content">';
                    htmlRss += '			<div class="modal-header">';
                    htmlRss += '				<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>';
                    htmlRss += '			</div>';
                    htmlRss += '			<div class="modal-body">';
                    htmlRss += '				<iframe sandbox="" data-popup="" width="100%" height="570" frameborder="0" allowtransparency="true"></iframe> ';
                    htmlRss += '			</div>';
                    htmlRss += '		</div>';
                    htmlRss += '	</div>';
                    htmlRss += '</div>';
                    $('body').append(htmlRss);
                }

                newsWrapper = $('#rss-styled_' + blockdef).easyTicker({
                    direction: 'up',
                    easing: 'lineair',
                    speed: 'slow',
                    interval: parseFloat(settings['news_scroll_after'] * 1000),
                    visible: 1,
                    mousePause: 0
                }).data('easyTicker');

                var maxHeight = -1;
                if (typeof(blocks[blockdef]) !== 'undefined' && typeof(blocks[blockdef]['maxheight']) !== 'undefined') maxHeight = blocks[blockdef]['maxheight'];

                $('#rss-styled_' + blockdef + ' li').each(function () {
                    maxHeight = maxHeight > $(this).height() ? maxHeight : $(this).height();
                });

                if(maxHeight > 0) {
                  $('#rss-styled_' + blockdef).parents('.transbg').height(maxHeight);
                }
            },error: function(data){
		infoMessage('<font color="red">News Error!</font>','RSS feed ' + data.statusText +'. Check rss url.', 10000);
		}
        });

        setTimeout(function () {
          getNewsPlus(columndiv, blockdef, newsfeed);
        }, (60000 * 5));
    }
}
