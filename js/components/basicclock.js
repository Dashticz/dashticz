/* global Dashticz DT_function settings moment*/

var DT_basicclock = {
  name: 'basicclock',
  init: function () {
    return DT_function.loadCSS('./js/components/basicclock.css');
  },
  canHandle: function (block) {
    return block && block.type && block.type === 'basicclock';
  },
  defaultCfg: function () {
    var cfg = {
      scale: 1,
      width: 12,
      containerClass: 'text-center',
      icon: 'far fa-clock',
    };
    if (settings['clock_scale'] !== '' && settings['clock_scale'] != null) {
      var scale = Number(settings['clock_scale']);
      if (isFinite(scale) && scale > 0) cfg.scale = scale;
    }
    return cfg;
  },
  run: function (me) {
    // .clock/.weekday/.date are block-level <div>s, so measuring their own
    // box always reports the container's full width back, not the text's
    // actual rendered width - fitting the block therefore needs a hidden
    // probe (a detached clone, sized to its content) rather than measuring
    // the real elements directly. Appended inside $state itself (already
    // clipped by .basicclock's own overflow:hidden on a grid screen)
    // instead of document.body: an absolutely positioned probe appended to
    // body can still enlarge the document's scrollable area, and doing that
    // on every single fitSize() call - including the one ResizeObserver
    // fires straight back for its own reaction - fed a runaway
    // grow-remeasure-grow loop between the clock and its own grid row.
    function measureLines($state, fontSizePx) {
      // Snapshot the real lines *before* the probe is appended - $state
      // .children() below is a live DOM query, so run after appending it
      // would also pick up the (still-empty) probe itself as a "line" to
      // clone into itself, and self-reference like that is exactly the
      // kind of thing that corrupts every measurement after the first.
      var $lines = $state.children();
      var $probe = $('<div class="basicclock"></div>')
        .css({
          position: 'absolute',
          visibility: 'hidden',
          left: 0,
          top: 0,
          fontSize: fontSizePx + 'px',
        })
        .appendTo($state);
      var maxWidth = 0;
      var totalHeight = 0;
      $lines.each(function () {
        var $line = $(this)
          .clone()
          .css({ whiteSpace: 'nowrap', display: 'inline-block' })
          .appendTo($probe);
        maxWidth = Math.max(maxWidth, $line.outerWidth() || 0);
        totalHeight += $line.outerHeight(true) || 0;
      });
      $probe.remove();
      return { width: maxWidth, height: totalHeight };
    }

    function fitSize() {
      var $block = $(me.mountPoint + ' .dt_block');
      var $title = $(me.mountPoint + ' .dt_title');
      var $state = $(me.mountPoint + ' .dt_state');
      // .dt_block's height includes the title bar (built by dashticz.js's
      // renderTitle()) and .dt_state's own 5px/5px vertical margin (see
      // creative.css), so sizing the clock to the full block height pushed it
      // past the block's own bottom edge and needed an oversized block just
      // to avoid a scrollbar. Same fix as js/components/frame.js.
      var titleHeight = $title.length && $title.is(':visible') ? $title.outerHeight(true) : 0;
      // In a grid, the outer mount point owns the live row/column dimensions
      // (a hard, CSS-Grid-track-sized box); .dt_block only *looks* fixed
      // (height: 100% !important) but a grid item's automatic minimum size
      // still grows to fit its content unless the item itself clips
      // overflow, which .dt-grid-item doesn't. Measuring .dt_block here
      // would read that already-inflated height back, feeding a runaway
      // grow-remeasure-grow loop with every ResizeObserver tick. Same fix as
      // js/components/dial.js's _dialFitSize().
      var inGrid = me.$mountPoint && me.$mountPoint.hasClass('dt-grid-item');
      var $sizeBox = inGrid ? me.$mountPoint : $block;

      // Measure from the state element's *actual rendered position* to the
      // bottom/right edge of the owning box. Subtracting an assumed title
      // height and margins is not reliable across themes: title line-height,
      // padding and block spacing differ, and after Save those values can
      // settle one layout pass later than the component's first run().
      // Using real DOM rectangles makes the available area match what the
      // browser is actually painting.
      var sizeEl = $sizeBox && $sizeBox[0];
      var stateEl = $state && $state[0];
      var sizeRect = sizeEl && sizeEl.getBoundingClientRect ? sizeEl.getBoundingClientRect() : null;
      var stateRect = stateEl && stateEl.getBoundingClientRect ? stateEl.getBoundingClientRect() : null;
      var availW = stateRect && stateRect.width > 0
        ? stateRect.width
        : ($sizeBox.outerWidth() || $(me.mountPoint).width() || 120);
      var availH = sizeRect && stateRect
        ? sizeRect.bottom - stateRect.top
        : (($sizeBox.outerHeight() || $(me.mountPoint).height() || 0) - titleHeight);

      // Keep a few physical pixels free at the bottom as well as a small
      // proportional margin. This protects against sub-pixel rounding and
      // font descenders without noticeably shrinking larger clocks.
      availH = Math.max(0, availH - 3);
      if (availW <= 0 || availH <= 0 || !$state.children().length) return;
      var scale = Number(me.block.scale);
      if (!isFinite(scale) || scale <= 0) scale = 1;

      // Measure the actual rendered text at a fixed reference font-size,
      // then scale so the 3 stacked lines fill the available box on both
      // axes - a plain min(availW, availH) base treats the clock as if it
      // has to fit inside a square, leaving large unused margins whenever
      // the block itself isn't roughly square.
      var REF = 100;
      var measured = measureLines($state, REF);
      if (measured.width <= 0 || measured.height <= 0) return;
      // Leave a small vertical safety margin. Some themes/font stacks
      // round line boxes differently at the final pixel size; fitting to an
      // exact 100% of the measured height can therefore clip the descenders
      // or the bottom of the date by one or two pixels after Save. Keep the
      // width calculation exact, but reserve 5% vertically so the result is
      // stable across themes and browser rounding.
      var verticalFit = (availH * 0.96) / measured.height;
      var horizontalFit = (availW * 0.98) / measured.width;
      var fitScale = Math.min(horizontalFit, verticalFit);

      // Important: only scale the clock state. Scaling .dt_block also scales
      // .dt_title because the title inherits font-size from the block. The
      // available height above was calculated after subtracting the title's
      // current height, so making the title grow afterwards invalidates that
      // calculation. In editor mode another grid resize event masks this by
      // running fitSize() again; after Save the outer grid item no longer
      // changes size, so ResizeObserver has nothing to report and the clock
      // remains too large. Keeping the title independent makes editor and
      // normal render use the exact same stable geometry.
      $block.css('font-size', '');
      $state.css('font-size', REF * fitScale * scale + 'px');
    }

    // Render into .dt_state, not .dt_content: .dt_content also holds .dt_title
    // (built by dashticz.js's renderTitle() from block.title/hide_title), and
    // overwriting .dt_content wipes that title back out right after it's set.
    // Filled with the real time/date/weekday immediately (matching main.js's
    // setClockDateWeekday(), which keeps ticking it every second afterwards)
    // instead of empty divs, so fitSize() has real text to measure right away.
    $(me.mountPoint + ' .dt_state').html(
      '<div class="clock">' +
        moment()
          .locale(settings['language'])
          .format(settings['hide_seconds'] ? settings['shorttime'] : settings['longtime']) +
        '</div>' +
        '<div class="weekday">' +
        moment().locale(settings['language']).format(settings['weekday']) +
        '&nbsp;</div>' +
        '<div class="date">' +
        moment().locale(settings['language']).format(settings['longdate']) +
        '</div>'
    );
    fitSize();

    // Run once more after layout has fully settled. In normal dashboard mode
    // the title/theme geometry may be finalized after run(); editor dragging
    // naturally causes another ResizeObserver event, which is why the editor
    // looked correct while the saved dashboard did not. Two animation frames
    // guarantee a post-layout fit without requiring the outer grid item to
    // change size.
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(function () {
        requestAnimationFrame(fitSize);
      });
    }

    // Keep the clock's size in sync with live editor drag-resizing (grid
    // row/column span, classic column width) and not just after a
    // save+reload - same ResizeObserver pattern as js/components/dial.js.
    // Observing the *outer* mount point (rather than the inner .dt_block
    // that fitSize() resizes) avoids the observer reacting to its own
    // writes.
    if (typeof ResizeObserver !== 'undefined' && me.$mountPoint && me.$mountPoint.length) {
      me.basicClockResizeObserver = new ResizeObserver(fitSize);
      me.basicClockResizeObserver.observe(me.$mountPoint[0]);
    }
  },
  destroy: function (me) {
    if (me.basicClockResizeObserver) {
      me.basicClockResizeObserver.disconnect();
      me.basicClockResizeObserver = null;
    }
  },
};

Dashticz.register(DT_basicclock);
//# sourceURL=js/components/basicclock.js
