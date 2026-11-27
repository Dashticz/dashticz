/* global settings _CORS_PATH infoMessage Dashticz moment isDefined templateEngine DT_function*/
//# sourceURL=js/components/news.js
// eslint-disable-next-line no-unused-vars
var DT_news = {
  name: 'news',
  canHandle: function (block) {
    return block && (block.type === 'news' || block.feed);
  },
  init: function () {
    return DT_function.loadScript('vendor/jquery.newsTicker.min.js');
  },
  defaultCfg: {
    containerClass: 'hover',
    feed: settings['default_news_url'],
    refresh: 300,
    width: 4,
    height: 240,
    // Widget Editor's Icon checkbox is checked by default but has nothing to
    // fall back to unless the user also types a custom icon value (see
    // js/widgeteditor.js _buildWidgetPayloadEntry): with no explicit
    // block.icon, getColIcon() (js/dashticz.js) renders nothing. Other
    // widgets like weather already ship a default icon for the same reason.
    icon: 'fas fa-newspaper',
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
    function safeExternalUrl(value) {
      try {
        var parsed = new URL(value, window.location.href);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:'
          ? parsed.href
          : '';
      } catch (error) {
        return '';
      }
    }

    // The description of a feed item as plain text: HTML entities decoded and
    // tags removed, without parsing the text as HTML.
    function plainText(value) {
      var entities = {
        amp: '&',
        lt: '<',
        gt: '>',
        quot: '"',
        apos: "'",
        nbsp: ' ',
      };
      var text = String(value || '').replace(
        /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
        function (match, code) {
          if (code.charAt(0) === '#') {
            var num =
              code.charAt(1).toLowerCase() === 'x'
                ? parseInt(code.slice(2), 16)
                : parseInt(code.slice(1), 10);
            return num > 0 && num <= 0x10ffff
              ? String.fromCodePoint(num)
              : match;
          }
          var named = entities[code.toLowerCase()];
          return named === undefined ? match : named;
        }
      );
      var previous;
      do {
        previous = text;
        text = text.replace(/<[^>]*>/g, '');
      } while (text !== previous);
      return text.replace(/[<>]/g, '').trim();
    }

    $.ajax(_CORS_PATH + me.block.feed, {
      accepts: {
        xml: 'application/rss+xml',
      },
      dataType: 'xml',
      success: function (data) {
        var countItems = 0;
        var items = [];

        // jQuery 4 removed $.fn.sort, so sort a plain array of the items
        $(
          $(data)
            .find('item')
            .toArray()
            .sort(function (l, r) {
              return (
                moment($(r).find('pubDate').text()) -
                moment($(l).find('pubDate').text())
              );
            })
        ).each(function () {
          if (me.maxItems && countItems >= me.maxItems) {
            return;
          }
          if (me.startDate) {
            var pubDate = $(this).find('pubDate').text();
            if (moment(pubDate) < me.startDate) {
              return;
            }
          }
          var newsItem = {
            show: me.showImage,
            image: safeExternalUrl(
              $(this).find('media\\:content, content, enclosure').attr('url')
            ),
            title: $(this).find('title').text(),
            link: safeExternalUrl($(this).find('link').text()),
            desc: plainText($(this).find('description').text()),
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
          $(me.mountPoint + ' .headline').on('click', function () {
            var url = $(this).data('link');
            DT_function.clickHandler(me, { url: url });
          });

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
          '<font color="red">' + language.misc.news_error + '</font>',
          'RSS feed ' + data.statusText + '. Check rss url.',
          10000
        );
      },
    });
  },
};
Dashticz.register(DT_news);
