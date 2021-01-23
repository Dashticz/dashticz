/* global settings _CORS_PATH infoMessage Dashticz moment isDefined templateEngine DT_function*/
//# sourceURL=js/components/news.js
// eslint-disable-next-line no-unused-vars
var DT_news = {
  name: 'news',
  canHandle: function (block) {
    return block && block.feed;
  },
  init: function () {
    return $.ajax({
      url: 'vendor/jquery.newsTicker.min.js',
      dataType: 'script',
    });
  },
  defaultCfg: {
    containerClass: 'hover',
    feed: settings['default_news_url'],
    refresh: 300,
  },
  run: function (me) {
    me.height =
      me.block.maxheight && Number(me.block.maxheight)
        ? me.block.maxheight
        : false;
    me.showImage = isDefined(me.block.showimages) ? me.block.showimages : true;
    me.filter = me.block && me.block.filter ? me.block.filter : false;
    me.filterCount = me.filter ? parseInt(me.filter) : false;
    me.filterUnit = me.filter ? me.filter.split(' ').splice(-1)[0] : false;
    me.maxItems = me.filter && me.filterUnit === 'items' ? me.filterCount : 0;
    me.startDate =
      me.filter && me.filterUnit !== 'items'
        ? moment().subtract(me.filterCount, me.filterUnit)
        : 0;
    me.interval = parseFloat(settings['news_scroll_after'] * 1000);
  },
  refresh: function (me) {
    $.ajax(_CORS_PATH + me.block.feed, {
      accepts: {
        xml: 'application/rss+xml',
      },
      dataType: 'xml',
      success: function (data) {
        var countItems = 0;
        var items = [];

        $(data)
          .find('item')
          .sort(function (l, r) {
            return (
              moment($(r).find('pubDate').html()) -
              moment($(l).find('pubDate').html())
            );
          })
          .each(function () {
            if (me.maxItems && countItems >= me.maxItems) {
              return;
            }
            if (me.startDate) {
              var pubDate = $(this).find('pubDate').html();
              if (moment(pubDate) < me.startDate) {
                return;
              }
            }
            var newsItem = {
              show: me.showImage,
              image: $(this)
                .find('media\\:content, content, enclosure')
                .attr('url'),
              title: $(this).find('title').text(),
              link: $(this).find('link').text(),
              desc: $(this).find('description').text(),
              pubd: moment($(this).find('pubDate').text()).format('llll'),
            };
            items.push(newsItem);
            countItems++;
          });

        templateEngine.load('news_row').then(function (template) {
          $(me.mountPoint + ' .dt_state').html(template({ news: items }));
          $(me.mountPoint + ' .col-icon').addClass('next');
          $(me.mountPoint + ' #container').easyTicker({
            direction: 'up',
            easing: 'lineair',
            speed: 'slow',
            interval: me.interval,
            visible: 1,
            mousePause: true,
            controls: { up: '.next' },
          });

          if ($('#rssweb').length === 0) {
            templateEngine.load('news_modal').then(function (template) {
              $(document.body).append(template);
            });
          }
          $(me.mountPoint + ' .headline').on("click", function() {
            var url = $(this).data('link');
            DT_function.clickHandler(me, {url: url})
          })

          if (me.height) {
            /*set to fixed height*/
            $(me.mountPoint + ' .dt_state').height(me.height);
            return;
          }

          /*Adjust height to max height of the news items*/
          var maxHeight = -1;
          $(me.mountPoint + ' li').each(function () {
            maxHeight =
              maxHeight > $(this).outerHeight()
                ? maxHeight
                : $(this).outerHeight();
          });
          if (maxHeight > 0) {
            $(me.mountPoint + ' li').height(maxHeight);
          }

          //The images may still be loading. Adjust the block height on image load event
          var images = $(me.mountPoint + ' .news_image img');
          if (images.length) {
            images.each(function () {
              this.addEventListener('load', function () {
                var mh = $(this).height();
                if (mh > maxHeight) {
                  maxHeight = mh;
                  $(me.mountPoint + ' .dt_state').height(maxHeight);
                }
              });
            });
          }
        });
      },
      error: function (data) {
        infoMessage(
          '<font color="red">News Error!</font>',
          'RSS feed ' + data.statusText + '. Check rss url.',
          10000
        );
      },
    });
  },
};
Dashticz.register(DT_news);
