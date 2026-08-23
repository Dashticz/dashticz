var DashticzTopbar = (function () {
  'use strict';

  var autoHideTimer = null;
  var initialized = false;
  var barSelectors = ['.colbar', '.topbar', '#topbar', '.navbar', '.header'];

  function getBars() {
    for (var i = 0; i < barSelectors.length; i++) {
      var $bars = $(barSelectors[i]);
      if ($bars.length) return $bars;
    }
    return $();
  }

  function init() {
    if (initialized) return;

    var timeout = parseFloat(settings['topbar_timeout']);
    if (!timeout || timeout <= 0) return;

    initialized = true;
    var autoHideMs = timeout * 1000;

    function resetTimer() {
      clearTimeout(autoHideTimer);
      autoHideTimer = setTimeout(function () {
        autoHideTimer = null;
        getBars().slideUp(400);
      }, autoHideMs);
    }

    function showBars() {
      getBars().slideDown(400, function () {
        // slideDown restores display:block; flex keeps the topbar alignment.
        $(this).css('display', 'flex');
      });
      resetTimer();
    }

    resetTimer();

    $(document).on('mousemove.topbarAutoHide', function (event) {
      var $bars = getBars();
      if (!$bars.length || event.clientY >= 20) return;

      if ($bars.is(':visible')) {
        resetTimer();
      } else {
        showBars();
      }
    });
  }

  return { init: init };
})();

//# sourceURL=js/topbar.js
