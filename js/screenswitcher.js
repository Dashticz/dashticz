/* global settings toSlide buildStandby disableStandby standbyActive myswiper isCustomConfigMode */
// eslint-disable-next-line no-unused-vars
var DashticzScreenSwitcher = (function () {
  'use strict';

  var initialized = false;
  var addingScreen = false;
  /** @type {number|'standby'} */
  var activeScreen = 1;
  /** Manual S-edit mode: mouse/keyboard must not exit standby. */
  var standbyEditMode = false;

  function getScreenNumbers() {
    var nums = [];
    $('.dt-container .screen[data-screenindex]').each(function () {
      var n = parseInt($(this).attr('data-screenindex'), 10);
      if (n > 0 && nums.indexOf(n) < 0) nums.push(n);
    });
    nums.sort(function (a, b) {
      return a - b;
    });
    return nums.length ? nums : [1];
  }

  function syncActiveFromDom() {
    if (typeof standbyActive !== 'undefined' && standbyActive) {
      activeScreen = 'standby';
      return activeScreen;
    }
    var $active = $(
      '.dt-container .screen.swiper-slide-active[data-screenindex]'
    );
    if (!$active.length) {
      $active = $('.dt-container .screen[data-screenindex]:visible').first();
    }
    var n = parseInt($active.attr('data-screenindex'), 10);
    if (n > 0) activeScreen = n;
    return activeScreen;
  }

  function getActiveScreenNumber() {
    if (typeof standbyActive !== 'undefined' && standbyActive) {
      activeScreen = 'standby';
      return 'standby';
    }
    if (activeScreen === 'standby') {
      syncActiveFromDom();
    }
    return activeScreen;
  }

  function isStandbyEditMode() {
    return !!standbyEditMode;
  }

  function setStandbyEditMode(enabled) {
    standbyEditMode = !!enabled;
  }

  function slideIndexForScreen(screenNumber) {
    var idx = -1;
    $('.dt-container .screen[data-screenindex]').each(function (i) {
      if (String($(this).attr('data-screenindex')) === String(screenNumber)) {
        idx = i;
        return false;
      }
    });
    return idx;
  }

  function enterStandbyManual() {
    standbyEditMode = true;
    activeScreen = 'standby';
    if (typeof standbyActive !== 'undefined' && standbyActive) {
      mountIntoStandby();
      updateActive();
      return;
    }
    $('body').addClass('standby');
    $('body').addClass('standby-edit');
    $('.dt-container').hide();
    if (typeof buildStandby === 'function') {
      buildStandby();
    }
    if (typeof standbyActive !== 'undefined') {
      standbyActive = true;
    }
    mountIntoStandby();
    updateActive();
  }

  function goToScreen(screenNumber) {
    if (screenNumber === 'standby' || screenNumber === 'S') {
      enterStandbyManual();
      return;
    }

    var num = parseInt(screenNumber, 10);
    if (!(num > 0)) return;

    activeScreen = num;
    standbyEditMode = false;

    if (typeof standbyActive !== 'undefined' && standbyActive) {
      if (typeof disableStandby === 'function') {
        disableStandby();
      }
    }

    var idx = slideIndexForScreen(num);
    if (idx < 0) {
      updateActive();
      return;
    }

    if (typeof myswiper !== 'undefined' && myswiper) {
      if (typeof toSlide === 'function') {
        toSlide(idx);
      } else {
        myswiper.slideTo(idx, 0, true);
      }
    } else {
      $('.dt-container .screen').hide();
      $('.dt-container .screen[data-screenindex="' + num + '"]').show();
    }
    updateActive();
  }

  function buildButtonsHtml() {
    var screens = getScreenNumbers();
    var active = getActiveScreenNumber();
    var customMode =
      typeof isCustomConfigMode === 'function' && isCustomConfigMode();
    var html =
      '<div class="dt-screen-switcher" role="group" aria-label="Screens">';

    html +=
      '<button type="button" class="dt-screen-btn' +
      (active === 'standby' ? ' active' : '') +
      '" data-screen="standby" title="Standby">S</button>';

    screens.forEach(function (n) {
      html +=
        '<button type="button" class="dt-screen-btn' +
        (String(active) === String(n) ? ' active' : '') +
        '" data-screen="' +
        n +
        '" title="Screen ' +
        n +
        '">' +
        n +
        '</button>';
    });

    if (!customMode) {
      html +=
        '<button type="button" class="dt-screen-btn dt-screen-add" data-screen="add" ' +
        'title="Screen toevoegen" aria-label="Screen toevoegen">+</button>';
    }

    html += '</div>';
    return html;
  }

  function renderInto($host) {
    if (!$host || !$host.length) return;
    $host.find('.dt-screen-switcher').remove();
    $host.append(buildButtonsHtml());
  }

  function refreshAll() {
    $('.dt-screen-switcher-host, .dt-screen-switcher-bar').each(function () {
      renderInto($(this));
    });
    updateActive();
  }

  function updateActive() {
    var active = getActiveScreenNumber();
    $('.dt-screen-btn').removeClass('active');
    $('.dt-screen-btn[data-screen="' + active + '"]').addClass('active');
  }

  function mountEditorIcons($bar) {
    if (!$bar || !$bar.length) return;
    if (typeof isCustomConfigMode === 'function' && isCustomConfigMode()) {
      return;
    }
    if ($bar.children('.dt-standby-editor-icons').length) return;
    var html =
      '<span class="dt-standby-editor-icons">' +
      '<span class="settings deviceeditoricon" role="button" title="Devices toevoegen">' +
      '<i class="fas fa-plus" aria-hidden="true"></i></span>' +
      '<span class="settings widgeteditoricon" role="button" title="Widgets toevoegen">' +
      '<i class="fas fa-puzzle-piece" aria-hidden="true"></i></span>' +
      '<span class="settings layouteditoricon" role="button" title="Tegels verplaatsen en schalen">' +
      '<i class="fas fa-arrows-alt" aria-hidden="true"></i></span>' +
      '</span>';
    $bar.append(html);
  }

  function isEditorChromeNeeded() {
    if ($('body').hasClass('dle-active')) return true;
    if ($('#deviceeditorpopup').length && $('#deviceeditorpopup').is(':visible')) {
      return true;
    }
    if ($('#widgeteditorpopup').length && $('#widgeteditorpopup').is(':visible')) {
      return true;
    }
    if ($('.modal.show').filter('#deviceeditorpopup, #widgeteditorpopup').length) {
      return true;
    }
    return false;
  }

  function setStandbyBarVisible(visible) {
    var $bar = $('.screenstandby .dt-screen-switcher-bar');
    if (!$bar.length) return;
    if (visible || isEditorChromeNeeded()) {
      $bar.addClass('is-visible');
    } else {
      $bar.removeClass('is-visible');
    }
  }

  function bindStandbyBarHover() {
    $(document)
      .off('.standbyChrome')
      .on('mousemove.standbyChrome pointermove.standbyChrome', function (event) {
        if (typeof standbyActive === 'undefined' || !standbyActive) return;
        if (!$('body').hasClass('standby-edit')) return;
        if (!$('.screenstandby:visible').length) return;
        if (isEditorChromeNeeded()) {
          setStandbyBarVisible(true);
          return;
        }
        // Reveal near the top edge; hide once the pointer leaves that zone.
        if (event.clientY < 56) {
          setStandbyBarVisible(true);
        } else if (event.clientY > 96) {
          setStandbyBarVisible(false);
        }
      })
      .on(
        'shown.bs.modal.standbyChrome hidden.bs.modal.standbyChrome',
        '#deviceeditorpopup, #widgeteditorpopup',
        function () {
          setStandbyBarVisible(isEditorChromeNeeded());
        }
      )
      .on('click.standbyChrome', '.layouteditoricon', function () {
        setTimeout(function () {
          setStandbyBarVisible(isEditorChromeNeeded());
        }, 50);
      });

    if (!window.__dtStandbyChromeObserver) {
      window.__dtStandbyChromeObserver = new MutationObserver(function () {
        if (typeof standbyActive !== 'undefined' && standbyActive) {
          setStandbyBarVisible(isEditorChromeNeeded());
        }
      });
      window.__dtStandbyChromeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }
  }

  function mountIntoStandby() {
    var $standby = $('.screenstandby .row').first();
    if (!$standby.length) return;
    // One bar: S/1/2/+ next to the editor icons.
    if (!$standby.children('.dt-screen-switcher-bar').length) {
      $standby.prepend(
        '<div class="dt-screen-switcher-bar col-xs-12"></div>'
      );
    }
    // Drop any leftover separate icon strip from earlier builds.
    $standby.children('.dt-standby-editor-icons').remove();
    var $bar = $standby.children('.dt-screen-switcher-bar');
    renderInto($bar);
    mountEditorIcons($bar);
    // Hidden until the pointer is near the top (or an editor is open).
    $bar.removeClass('is-visible');
    bindStandbyBarHover();
    setStandbyBarVisible(isEditorChromeNeeded());
  }

  function addScreen() {
    if (addingScreen) return;
    if (typeof _PHP_INSTALLED !== 'undefined' && !_PHP_INSTALLED) {
      alert('PHP not available — adding a screen is disabled.');
      return;
    }

    var next = 1;
    getScreenNumbers().forEach(function (n) {
      if (n >= next) next = n + 1;
    });

    addingScreen = true;
    $('.dt-screen-add').prop('disabled', true);

    $.getJSON(settings['dashticz_php_path'] + 'info.php?get=csrf')
      .then(function (data) {
        return $.ajax({
          url: 'js/savescreens.php',
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify({ action: 'add', screen: next }),
          dataType: 'json',
          headers: { 'X-Dashticz-CSRF': data.token },
        });
      })
      .done(function () {
        window.location.reload();
      })
      .fail(function (xhr) {
        addingScreen = false;
        $('.dt-screen-add').prop('disabled', false);
        var msg =
          xhr.responseJSON && xhr.responseJSON.error
            ? xhr.responseJSON.error
            : 'Could not add screen.';
        alert('Error: ' + msg);
      });
  }

  function onSwiperChange() {
    if (typeof standbyActive !== 'undefined' && standbyActive) return;
    syncActiveFromDom();
    updateActive();
  }

  function init() {
    if (!initialized) {
      initialized = true;
      syncActiveFromDom();

      $(document)
        .off('click.screenswitcher')
        .on('click.screenswitcher', '.dt-screen-btn', function (event) {
          event.preventDefault();
          event.stopPropagation();
          var screen = String($(this).data('screen') || '');
          if (screen === 'add') {
            addScreen();
            return;
          }
          goToScreen(screen);
        });
    }

    $('.dt-screen-switcher-host').each(function () {
      renderInto($(this));
    });

    if (typeof myswiper !== 'undefined' && myswiper) {
      myswiper.off('slideChange.screenswitcher');
      myswiper.off('transitionEnd.screenswitcher');
      myswiper.on('slideChange.screenswitcher', onSwiperChange);
      myswiper.on('transitionEnd.screenswitcher', onSwiperChange);
    } else {
      setTimeout(function () {
        if (typeof myswiper !== 'undefined' && myswiper) {
          myswiper.off('slideChange.screenswitcher');
          myswiper.off('transitionEnd.screenswitcher');
          myswiper.on('slideChange.screenswitcher', onSwiperChange);
          myswiper.on('transitionEnd.screenswitcher', onSwiperChange);
        }
      }, 500);
    }

    updateActive();
  }

  return {
    init: init,
    refresh: refreshAll,
    updateActive: updateActive,
    goToScreen: goToScreen,
    getActiveScreenNumber: getActiveScreenNumber,
    getScreenNumbers: getScreenNumbers,
    mountIntoStandby: mountIntoStandby,
    buildButtonsHtml: buildButtonsHtml,
    isStandbyEditMode: isStandbyEditMode,
    setStandbyEditMode: setStandbyEditMode,
  };
})();

//# sourceURL=js/screenswitcher.js
