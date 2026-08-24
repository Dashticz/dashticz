/* global Dashticz moment templateEngine DT_function settings*/

var DT_haymanclock = {
  name: 'haymanclock',
  init: function () {
    DT_function.loadCSS('https://fonts.googleapis.com/css2?family=Montserrat');
    return DT_function.loadCSS('js/components/haymanclock.css');
  },
  canHandle: function (block) {
    return block && block.type && block.type === 'haymanclock';
  },
  defaultCfg: function () {
    function getPart(value, fallback) {
      if (typeof value !== 'string') return fallback;
      var parts = value.trim().split(/\s+/);
      return parts[parts.length - 1] || fallback;
    }
    var locale = String(settings.language || 'en').toLowerCase();
    var fallback =
      locale.indexOf('nl') === 0
        ? { day: 'dag', hours: 'uur', minutes: 'minuten', seconds: 'seconden' }
        : {
            day: 'day',
            hours: 'hours',
            minutes: 'minutes',
            seconds: 'seconds',
          };
    function getRelativeLabel(amount, unit, fallbackValue) {
      try {
        return getPart(moment().add(amount, unit).fromNow(true), fallbackValue);
      } catch (error) {
        return fallbackValue;
      }
    }
    var cfg = {
      containerClass: 'text-center',
      day: getRelativeLabel(1, 'day', fallback.day),
      hours: getRelativeLabel(2, 'hours', fallback.hours),
      minutes: getRelativeLabel(2, 'minutes', fallback.minutes),
      seconds: getRelativeLabel(2, 'seconds', fallback.seconds),
      scale: 1,
      icon: 'far fa-clock',
    };
    if (settings['clock_scale'] !== '' && settings['clock_scale'] != null) {
      var scale = Number(settings['clock_scale']);
      if (isFinite(scale) && scale > 0) cfg.scale = scale;
    }
    return cfg;
  },
  run: function (me) {
    templateEngine.load('clock_hayman').then(function (template) {
      function updateTime() {
        var now = new Date();
        var hours = now.getHours() || 24;
        var locale = String(settings.language || 'en').replace('_', '-');
        var clockElement = me.$mountPoint[0];
        var day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
          now.getDay()
        ];
        try {
          day = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(
            now
          );
        } catch (error) {
          console.warn('Unable to format Hayman clock locale ' + locale, error);
        }
        clockElement.style.setProperty('--timer-day', "'" + day + "'");
        clockElement.style.setProperty('--timer-hours', "'" + hours + "'");
        clockElement.style.setProperty(
          '--timer-minutes',
          "'" + ('0' + now.getMinutes()).slice(-2) + "'"
        );
        clockElement.style.setProperty(
          '--timer-seconds',
          "'" + ('0' + now.getSeconds()).slice(-2) + "'"
        );
      }

      // Set the --timer-* custom properties (read by .clock-timer:before's
      // content in haymanclock.css) before the template's descendants exist,
      // so the day/hours/minutes/seconds digits are already real when
      // fitSize() below measures them, not empty.
      updateTime();

      // Render into .dt_state, not .dt_block: .dt_block also holds .dt_title
      // (built by dashticz.js's renderTitle() from block.title/hide_title),
      // and overwriting .dt_block wipes that title back out right after it's
      // set. clockwidth/fontsize start as harmless placeholders - fitSize()
      // below immediately replaces them with the real, measured values, all
      // within the same synchronous pass so nothing is visibly painted first.
      me.block.clockwidth = 'auto';
      me.block.fontsize = 16;
      $(me.mountPoint + ' .dt_state').html(template(me.block));

      function fitSize() {
        var $block = $(me.mountPoint + ' .dt_block');
        var $title = $(me.mountPoint + ' .dt_title');
        var $state = $(me.mountPoint + ' .dt_state');
        // .dt_block's height includes the title bar (built by dashticz.js's
        // renderTitle()) and .dt_state's own 5px/5px vertical margin (see
        // creative.css), so sizing the clock to the full block height pushed
        // it past the block's own bottom edge and needed an oversized block
        // just to avoid a scrollbar. Same fix as js/components/frame.js.
        var titleHeight =
          $title.length && $title.is(':visible') ? $title.outerHeight(true) : 0;
        var stateMarginV = $state.length
          ? (parseFloat($state.css('margin-top')) || 0) +
            (parseFloat($state.css('margin-bottom')) || 0)
          : 0;
        // In a grid, the outer mount point owns the live row/column
        // dimensions (a hard, CSS-Grid-track-sized box); .dt_block only
        // *looks* fixed (height: 100% !important) but a grid item's
        // automatic minimum size still grows to fit its content unless the
        // item itself clips overflow, which .dt-grid-item doesn't.
        // Measuring .dt_block here would read that already-inflated height
        // back, feeding a runaway grow-remeasure-grow loop with every
        // ResizeObserver tick. Same fix as js/components/dial.js's
        // _dialFitSize().
        var inGrid = me.$mountPoint && me.$mountPoint.hasClass('dt-grid-item');
        var $sizeBox = inGrid ? me.$mountPoint : $block;
        var $content = $(me.mountPoint + ' .dt_content');
        // .dt_block is display:flex (icon column + .dt_content side by side).
        // .dt_content's own CSS is width:100%, which as a flex-basis resolves
        // against .dt_block's full width, not against the room actually left
        // over next to the icon - but flexbox then shrinks it to what's
        // really available, so its measured width (unlike $sizeBox's, which
        // still includes the icon) already excludes the icon column. Same
        // fix as js/components/flipclock.js's availW.
        var availW =
          $content.width() ||
          $sizeBox.outerWidth() ||
          $(me.mountPoint).width() ||
          120;
        var availH =
          ($sizeBox.outerHeight() || $(me.mountPoint).height() || 0) -
          titleHeight -
          stateMarginV;
        if (availW <= 0 || availH <= 0) return;
        var scale = Number(me.block.scale);
        if (!isFinite(scale) || scale <= 0) scale = 1;

        // .clock-container's 4 columns are flex:1 (they always stretch to
        // fill whatever width they're given), so measuring the real element
        // only ever reports back the width we last set it to, not how much
        // room the day/hours/minutes/seconds digits actually need. Measure
        // it shrink-wrapped (display:inline-flex, columns flex:0 0 auto) at
        // a reference font-size to get that real natural box, then scale it
        // to fill the available space on both axes - with GAP_FACTOR extra
        // width reserved, since the ':' separators are absolutely positioned
        // just outside each column and get hidden behind the next column's
        // digits without that slack (the original bug report here).
        var $container = $(me.mountPoint + ' .clock-container');
        if (!$container.length) return;
        // Hayman's natural face is wide and short (4 columns in a single
        // row), so it's almost always width-bound: it fills availW and
        // leaves availH mostly unused, the same way any fixed-aspect
        // content "letterboxes" in a differently-shaped box. A small
        // GAP_FACTOR meant only the digits themselves filled that width
        // edge-to-edge, reading as oversized and leaving the ':' separators
        // barely any room. Reserving much more of that width as real,
        // visible gaps between columns - rather than shrinking the whole
        // result post-fit, which would just trade "oversized digits" for
        // "same wasted margin, smaller content" - makes the face read as
        // smaller *and* better spaced out of the same fit-to-width budget.
        var GAP_FACTOR = 1.6;
        var REF = 100;
        // A previous fitSize() call may have left an inline width on
        // $container (set below); inline styles always beat the
        // .hc-measuring class's `width: auto`, so it must be cleared first
        // or every measurement after the first just re-measures its own
        // last output instead of the container's true natural size.
        $container
          .css({ 'font-size': REF + 'px', width: '' })
          .addClass('hc-measuring');
        var naturalW = $container.outerWidth() || 0;
        var naturalH = $container.outerHeight() || 0;
        $container.removeClass('hc-measuring');
        if (naturalW <= 0 || naturalH <= 0) return;

        var fitScale =
          Math.min(availW / (naturalW * GAP_FACTOR), availH / naturalH) * scale;
        var fontSize = Math.max(8, REF * fitScale);
        var width = Math.max(1, naturalW * GAP_FACTOR * fitScale);

        me.block.fontsize = fontSize;
        me.block.clockwidth = Math.floor(width) + 'px';
        $container.css({
          width: me.block.clockwidth,
          'font-size': fontSize + 'px',
        });

        centerDots($container, fontSize);
      }

      // Each ':' separator (see haymanclock.css) is centered on its
      // column's own right edge by default, which only centers it between
      // the two neighboring glyphs when both columns' text fills an equal
      // share of their (equal-width, see GAP_FACTOR above) column - true
      // for hour/minute/second, which are always 2 digits, but not for the
      // day column, whose 3-4 letter abbreviation ("Sun".."Wed") usually
      // fills much more of its column, leaving it far less of its own
      // padding than a 2-digit neighbor has. That left the day/hour
      // separator sitting closer to the day text than the hour text.
      // ':before' pseudo-elements have no DOM node to measure directly, so
      // each one's actual displayed text is cloned into a real, temporary
      // element with the same font styling instead - same technique
      // js/components/basicclock.js and simpleblock.js's Miniclock fit
      // use - then --hc-dot-right (read by haymanclock.css) is set per
      // column so every separator, not just the day/hour one, is centered
      // on the real glyph-to-glyph gap regardless of font or locale.
      function measureGlyphWidth(text, refStyle) {
        if (!text) return 0;
        var probe = document.createElement('span');
        probe.textContent = text;
        probe.style.position = 'fixed';
        probe.style.top = '-9999px';
        probe.style.left = '-9999px';
        probe.style.whiteSpace = 'nowrap';
        probe.style.fontSize = refStyle.fontSize;
        probe.style.fontFamily = refStyle.fontFamily;
        probe.style.fontWeight = refStyle.fontWeight;
        probe.style.textTransform = refStyle.textTransform;
        document.body.appendChild(probe);
        var width = probe.getBoundingClientRect().width;
        probe.remove();
        return width;
      }

      function centerDots($container, fontSizePx) {
        var cols = $container.find('.clock-col').get();
        if (cols.length < 2 || !fontSizePx) return;
        var metrics = cols.map(function (col) {
          var timerEl = col.querySelector('.clock-timer');
          var before = timerEl && window.getComputedStyle(timerEl, '::before');
          var text = before
            ? String(before.content || '').replace(/^["']|["']$/g, '')
            : '';
          return {
            width: col.getBoundingClientRect().width,
            glyphWidth: before ? measureGlyphWidth(text, before) : 0,
          };
        });
        for (var i = 0; i < metrics.length - 1; i++) {
          var leftPad = (metrics[i].width - metrics[i].glyphWidth) / 2;
          var rightPad = (metrics[i + 1].width - metrics[i + 1].glyphWidth) / 2;
          var offsetEm = (rightPad - leftPad) / 2 / fontSizePx;
          cols[i].style.setProperty('--hc-dot-right', -0.15 - offsetEm + 'em');
        }
      }

      fitSize();

      // Keep the clock's size in sync with live editor drag-resizing (grid
      // row/column span, classic column width) and not just after a
      // save+reload - same ResizeObserver pattern as js/components/dial.js.
      // Observing the *outer* mount point (rather than .clock-container,
      // which fitSize() resizes) avoids the observer reacting to its own
      // writes.
      if (
        typeof ResizeObserver !== 'undefined' &&
        me.$mountPoint &&
        me.$mountPoint.length
      ) {
        me.haymanClockResizeObserver = new ResizeObserver(fitSize);
        me.haymanClockResizeObserver.observe(me.$mountPoint[0]);
      }

      Dashticz.setInterval(
        me,
        function () {
          updateTime();
        },
        1000
      );
    });
  },
  destroy: function (me) {
    if (me.haymanClockResizeObserver) {
      me.haymanClockResizeObserver.disconnect();
      me.haymanClockResizeObserver = null;
    }
  },
};

Dashticz.register(DT_haymanclock);
//# sourceURL=js/components/haymanclock.js
