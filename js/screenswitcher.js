/* global settings toSlide buildStandby disableStandby standbyActive myswiper isCustomConfigMode */
/* global screens standby_screen config screenswitcherTranslations */
// eslint-disable-next-line no-unused-vars
var DashticzScreenSwitcher = (function () {
  'use strict';

  var initialized = false;
  var addingScreen = false;
  /** @type {number|'standby'} */
  var activeScreen = 1;
  /** Manual S-edit mode: mouse/keyboard must not exit standby. */
  var standbyEditMode = false;

  function _strings() {
    return typeof screenswitcherTranslations !== 'undefined'
      ? screenswitcherTranslations
      : {};
  }

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

  function usePngScreenIcons() {
    return (
      typeof settings !== 'undefined' &&
      Number(settings['topbar_use_png_icons']) === 1
    );
  }

  function getDefaultScreenIconPath(screenNum) {
    if (!usePngScreenIcons()) return null;
    var defaultIcons = {
      standby: 'Standby',
      1: 'One',
      2: 'Two',
      3: 'Three',
      4: 'Four',
    };
    var iconName = defaultIcons[screenNum];
    return iconName ? 'img/icons/' + iconName + '.png' : null;
  }

  /**
   * Resolve the icon HTML for a given screen button.
   * Supports Font Awesome class strings (e.g. 'fas fa-home') and
   * image paths stored in img/icons/ (e.g. 'img/icons/home.svg').
   * Returns null when no icon is configured so the caller falls back to the
   * default text label (screen number or 'S').
   *
   * Configuration in CONFIG.js:
   *   screens[1]['icon'] = 'fas fa-home';          // Font Awesome
   *   screens[2]['icon'] = 'img/icons/film.svg';   // Local image in img/icons/
   *   standby_screen['icon'] = 'fas fa-moon';      // Standby button
   *   config['standby_icon'] = 'fas fa-moon';      // Alternative for standby
   *
   * @param {number|'standby'} screenNum
   * @returns {string|null}
   */
  function getScreenIconHtml(screenNum) {
    var icon = null;

    if (screenNum === 'standby') {
      // Check standby_screen['icon'] first, then config['standby_icon']
      if (typeof standby_screen !== 'undefined' && standby_screen && standby_screen.icon) {
        icon = standby_screen.icon;
      } else if (typeof config !== 'undefined' && config && config['standby_icon']) {
        icon = config['standby_icon'];
      }
    } else {
      // Check screens[n]['icon'] from CONFIG.js
      if (typeof screens !== 'undefined' && screens && screens[screenNum] && screens[screenNum]['icon']) {
        icon = screens[screenNum]['icon'];
      }
    }

    if (!icon) {
      icon = getDefaultScreenIconPath(screenNum);
    }

    if (!icon) return null;

    // Font Awesome icon: class string such as 'fas fa-home', 'fab fa-github', 'fa-home'
    if (/^fa[srlbd]?\s+fa-/.test(icon) || /^fa[srlbd]?-/.test(icon)) {
      return '<i class="' + icon + '" aria-hidden="true"></i>';
    }

    // Image path (e.g. 'img/icons/home.svg' or 'img/icons/home.png')
    return '<img src="' + icon + '" class="dt-screen-icon-img dt-screen-main-icon-img" alt="" aria-hidden="true">';
  }

  function buildButtonsHtml() {
    // screenNums is a local array; the global `screens` object (from CONFIG.js)
    // is accessed separately for per-screen icon configuration.
    var screenNums = getScreenNumbers();
    var active = getActiveScreenNumber();
    var customMode =
      typeof isCustomConfigMode === 'function' && isCustomConfigMode();
    // Use translated button labels when available; fall back to English.
    var st =
      typeof screenswitcherTranslations !== 'undefined'
        ? screenswitcherTranslations
        : {};
    var html =
      '<div class="dt-screen-switcher" role="group" aria-label="' +
      (st.screens_aria || 'Screens') +
      '">';

    // Standby button — show custom icon if configured, otherwise 'S'
    var standbyLabel = st.standby || 'Standby';
    var standbyContent = getScreenIconHtml('standby') || 'S';
    html +=
      '<button type="button" class="dt-screen-btn' +
      (active === 'standby' ? ' active' : '') +
      '" data-screen="standby" title="' + standbyLabel + '">' +
      standbyContent +
      '</button>';

    // Per-screen buttons — show custom icon if configured, otherwise the number
    screenNums.forEach(function (n) {
      var screenLabel = (st.screen || 'Screen') + ' ' + n;
      var screenContent = getScreenIconHtml(n) || String(n);
      html +=
        '<button type="button" class="dt-screen-btn' +
        (String(active) === String(n) ? ' active' : '') +
        '" data-screen="' +
        n +
        '" title="' +
        screenLabel +
        '">' +
        screenContent +
        '</button>';
    });

    if (!customMode) {
      var usePng =
        typeof settings !== 'undefined' &&
        Number(settings['topbar_use_png_icons']) === 1;
      var addLabel = st.add_screen || 'Add screen';
      var addContent = usePng
        ? '<img src="img/icons/Add_layer.png" class="dt-screen-icon-img" aria-hidden="true" alt="">'
        : '+';
      html +=
        '<button type="button" class="dt-screen-btn dt-screen-add" data-screen="add" ' +
        'title="' + addLabel + '" aria-label="' + addLabel + '">' + addContent + '</button>';
      var canDelete =
        screenNums.length > 1 && typeof active === 'number' && active > 1;
      var delLabel = st.delete_screen || 'Delete screen';
      var delContent = usePng
        ? '<img src="img/icons/Minus.png" class="dt-screen-icon-img" aria-hidden="true" alt="">'
        : '&minus;';
      html +=
        '<button type="button" class="dt-screen-btn dt-screen-delete" data-screen="delete" ' +
        'title="' + delLabel + '" aria-label="' + delLabel + '"' +
        (canDelete ? '' : ' disabled aria-disabled="true"') +
        '>' + delContent + '</button>';
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
    // Screen navigation does not rebuild the switcher, so keep the delete
    // button state synchronized with the newly active screen.
    var canDelete =
      getScreenNumbers().length > 1 &&
      typeof active === 'number' &&
      active > 1;
    $('.dt-screen-delete')
      .prop('disabled', !canDelete)
      .attr('aria-disabled', canDelete ? 'false' : 'true');
  }

  function mountEditorIcons($bar) {
    if (!$bar || !$bar.length) return;
    if (typeof isCustomConfigMode === 'function' && isCustomConfigMode()) {
      return;
    }
    if ($bar.children('.dt-standby-editor-icons').length) return;
    // Use translated tooltip labels from the active language file.
    // widgetEditorTranslations is a global set by settings.js from /lang/<locale>.json.
    var t =
      typeof widgetEditorTranslations !== 'undefined' ? widgetEditorTranslations : {};
    var usePng =
      typeof settings !== 'undefined' &&
      Number(settings['topbar_use_png_icons']) === 1;
    function _icon(faClass, imgSrc) {
      return usePng
        ? '<img src="' + imgSrc + '" class="dt-topbar-icon-img" aria-hidden="true" alt="">'
        : '<i class="' + faClass + '" aria-hidden="true"></i>';
    }
    var html =
      '<span class="dt-standby-editor-icons">' +
      '<span class="settings deviceeditoricon" role="button" title="' +
        (t.add_devices || 'Add devices') + '">' +
      _icon('fas fa-plus', 'img/icons/Plus.png') + '</span>' +
      '<span class="settings widgeteditoricon" role="button" title="' +
        (t.add_widgets || 'Add widgets') + '">' +
      _icon('fas fa-puzzle-piece', 'img/icons/Puzzle.png') + '</span>' +
      '<span class="settings layouteditoricon" role="button" title="' +
        (t.move_tiles || 'Move and scale tiles') + '">' +
      _icon('fas fa-arrows-alt', 'img/icons/Arrows.png') + '</span>' +
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
      alert(_strings().php_required || 'PHP is unavailable, so a screen cannot be added.');
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
          url: configEditorUrl('js/savescreens.php'),
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
            : _strings().add_failed;
        alert((_strings().error_prefix || 'Error:') + ' ' + msg);
      });
  }

  function deleteScreen() {
    if (addingScreen) return;
    var screenNumber = getActiveScreenNumber();
    if (
      getScreenNumbers().length <= 1 ||
      typeof screenNumber !== 'number' ||
      screenNumber < 2
    ) {
      return;
    }
    var deleteMessage =
      (_strings().delete_confirm ||
        'Delete screen {number}?').replace('{number}', screenNumber);
    if (!window.confirm(deleteMessage)) return;

    addingScreen = true;
    $('.dt-screen-delete, .dt-screen-add').prop('disabled', true);
    $.getJSON(settings['dashticz_php_path'] + 'info.php?get=csrf')
      .then(function (data) {
        return $.ajax({
          url: configEditorUrl('js/savescreens.php'),
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify({ action: 'delete', screen: screenNumber }),
          dataType: 'json',
          headers: { 'X-Dashticz-CSRF': data.token },
        });
      })
      .done(function () {
        window.location.reload();
      })
      .fail(function (xhr) {
        addingScreen = false;
        $('.dt-screen-delete, .dt-screen-add').prop('disabled', false);
        var msg =
          xhr.responseJSON && xhr.responseJSON.error
            ? xhr.responseJSON.error
            : _strings().delete_failed;
        alert((_strings().error_prefix || 'Error:') + ' ' + msg);
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
          if (screen === 'delete') {
            deleteScreen();
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
