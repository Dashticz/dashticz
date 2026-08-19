/* global DT_function MoonPhase Dashticz blocks settings*/

// eslint-disable-next-line no-unused-vars
var DT_button = {
  name: 'button',
  canHandle: function (block) {
    return block && (block.btnimage || block.slide || block.log);
  },
  defaultCfg: function (button) {
    var cfg = {
      containerClass:
        (button && button.slide ? 'slide slide' + button.slide : ''),
      forcerefreshiframe: 0,
    };
    if (button.btnimage) {
      cfg.refresh = 60;
    }
    if(typeof button.title==='undefined' && typeof button.icon==='undefined' && typeof button.image==='undefined' && typeof button.btnimage==='undefined')
      button.title = button.key || button.type || 'Button';
    return cfg;
  },
  defaultContent: function (me) {
    var button = me.block;
    var html = '';
    if (button.btnimage) {
      var img = button.btnimage;
      if (img === 'moon') {
        img = DT_button.getMoonInfo(button);
      }
      if (typeof button.forceheight !== 'undefined') {
        html +=
          '<img src="' +
          img +
          '" style="max-width:100%;" width=100% height="' +
          button.forceheight +
          '" />';
      } else {
        html += '<img src="' + img + '" style="width:100%;" />';
      }
    }
    return html;
  },
  refresh: function (me) {
    DT_button.reloadImage(me);
  },
  reloadImage: function (me) {
    var src;
    if (typeof me.block.btnimage !== 'undefined') {
      if (me.block.btnimage === 'moon')
        src = DT_button.getMoonInfo(me.block.btnimage);
      else
        src = DT_function.checkForceRefresh(
          me.block.btnimage,
          me.block.forcerefresh
        );
      $(me.mountPoint + ' .dt_content img').attr('src', src);
    }
  },
  getMoonInfo: function () {
    var mymoon = new MoonPhase(new Date());
    var myphase = parseInt(mymoon.phase() * 100 + 50) % 100;
    return 'img/moon/moon.' + ('0' + myphase).slice(-2) + '.png';
  },
};

Dashticz.register(DT_button);

/* Wizard enhancements for #170 and #171.
 *
 * #170: expose a No background checkbox in the common Device/Widget Config
 * popup. The option is stored as the normal typed block property
 * `no_background: true`, via the editor's existing custom-fields pipeline.
 * This keeps manual CONFIG.js blocks fully compatible and avoids theme-specific
 * background values.
 *
 * #171: extend the existing Slide button quick-add popup to create regular
 * URL and popup buttons as well. The editor still saves the same slide-button
 * shape it already knows; action-specific properties are merged into
 * custom_fields immediately before saveblocks.php receives the request.
 * DT_function.clickHandler already prioritises `newwindow` over `slide`, so
 * URL and popup buttons reuse the existing runtime implementation.
 */
(function initWizardButtonEnhancements() {
  'use strict';

  var pendingButtons = {};
  var observer = null;
  var styleId = 'dt-wizard-170-171-style';

  function esc(value) {
    return $('<div>').text(value == null ? '' : String(value)).html();
  }

  function ensureStyle() {
    if (document.getElementById(styleId)) return;
    var style = document.createElement('style');
    style.id = styleId;
    style.textContent =
      /* The Liquid Glass themes' .transbg (every block carries it) applies a
       * backdrop-filter blur+saturate on top of its background - clearing
       * just the background still leaves that filter sampling/intensifying
       * whatever sits behind the block, showing as a soft glow instead of
       * true transparency, so it needs resetting here too. */
      '.dt-no-background, .dt_block.dt-no-background, .mh.dt-no-background {' +
      'background: transparent !important;' +
      'background-color: transparent !important;' +
      'background-image: none !important;' +
      'box-shadow: none !important;' +
      '-webkit-backdrop-filter: none !important;' +
      'backdrop-filter: none !important;' +
      '}' +
      '.dt-button-action-fields.d-none{display:none!important;}';
    document.head.appendChild(style);
  }

  function configuredBlockForElement(element) {
    var key = element && element.getAttribute && element.getAttribute('data-id');
    if (!key || typeof blocks === 'undefined' || !blocks) return null;
    return blocks[key] || null;
  }

  function applyNoBackground(root) {
    if (!root || !root.querySelectorAll) return;
    var elements = [];
    if (root.matches && root.matches('[data-id]')) elements.push(root);
    Array.prototype.push.apply(elements, root.querySelectorAll('[data-id]'));
    elements.forEach(function (element) {
      var definition = configuredBlockForElement(element);
      element.classList.toggle('dt-no-background', !!(definition && definition.no_background === true));
    });
  }

  function findCustomFieldRow($popup, fieldName) {
    var found = $();
    $popup.find('.de-custom-field-row, .we-custom-field-row').each(function () {
      var $row = $(this);
      var $name = $row.find('.de-custom-field-name, .we-custom-field-name').first();
      if (String($name.val() || '').toLowerCase() === fieldName.toLowerCase()) {
        found = $row;
        return false;
      }
    });
    return found;
  }

  function injectNoBackgroundIntoConfig(popup) {
    var $popup = $(popup);
    if ($popup.data('dt-no-background-ready')) return;
    var $fields = $popup.find('.de-custom-fields, .we-custom-fields').first();
    if (!$fields.length) return;

    $popup.data('dt-no-background-ready', true);
    var $existing = findCustomFieldRow($popup, 'no_background');
    var initial = false;
    if ($existing.length) {
      var raw = String($existing.find('.de-custom-field-setting, .we-custom-field-setting').first().val() || '').toLowerCase();
      initial = raw === 'true' || raw === '1';
      $existing.addClass('d-none dt-no-background-field');
    }

    /* Placed as an extra item inside the same options row that already
     * holds Icon/Data/Title (.de-config-options for devices,
     * .we-block-options-row for widgets) so it automatically inherits
     * their exact switch size, colors and spacing instead of rendering as
     * a smaller, separately positioned control (#170 follow-up). */
    var isWidget = $fields.hasClass('we-custom-fields');
    var $optionsRow = $popup.find(isWidget ? '.we-block-options-row' : '.de-config-options').first();
    var html =
      '<label class="form-check form-switch' +
      (isWidget ? ' form-check-inline mb-2' : '') +
      ' dt-no-background-option">' +
      '<input class="form-check-input' + (isWidget ? ' we-block-option' : '') +
      '" type="checkbox" data-dt-no-background' +
      (initial ? ' checked' : '') + '>' +
      '<span class="form-check-label">No background</span></label>';
    if ($optionsRow.length) {
      $optionsRow.append(html);
    } else {
      var $sectionTitle = $popup.find('.de-section-title, .we-section-title').first();
      if ($sectionTitle.length) $sectionTitle.after(html);
      else $popup.find('.modal-body').prepend(html);
    }

    popup.addEventListener('click', function (event) {
      var saveButton = event.target.closest && event.target.closest('#de-config-ok, #we-config-ok, .btn-save');
      if (!saveButton) return;
      var enabled = $popup.find('[data-dt-no-background]').is(':checked');
      var $row = findCustomFieldRow($popup, 'no_background');
      if (enabled) {
        if (!$row.length) {
          var rowClass = isWidget ? 'we-custom-field-row' : 'de-custom-field-row';
          var nameClass = isWidget ? 'we-custom-field-name' : 'de-custom-field-name';
          var settingClass = isWidget ? 'we-custom-field-setting' : 'de-custom-field-setting';
          $row = $('<div class="' + rowClass + ' d-none dt-no-background-field">' +
            '<input class="' + nameClass + '" value="no_background">' +
            '<input class="' + settingClass + '" value="true">' +
            '</div>');
          $fields.append($row);
        } else {
          $row.find('.de-custom-field-setting, .we-custom-field-setting').first().val('true');
        }
      } else if ($row.length) {
        $row.remove();
      }
    }, true);
  }

  function actionFieldsHtml() {
    return '' +
      '<div class="mb-3 dt-button-action-wrap">' +
        '<label class="form-label" for="dt-button-action">Action</label>' +
        '<select class="form-select" id="dt-button-action">' +
          '<option value="slide">Change screen</option>' +
          '<option value="url">Open URL</option>' +
          '<option value="popup">Open popup block</option>' +
        '</select>' +
      '</div>' +
      '<div class="dt-button-action-fields dt-button-url-fields d-none">' +
        '<div class="mb-3"><label class="form-label" for="dt-button-url">URL</label>' +
          '<input type="text" class="form-control" id="dt-button-url" placeholder="https://example.com"></div>' +
        '<div class="mb-3"><label class="form-label" for="dt-button-window">Open</label>' +
          '<select class="form-select" id="dt-button-window">' +
            '<option value="0">Same window</option>' +
            '<option value="1">New tab</option>' +
            '<option value="2" selected>Popup / iframe</option>' +
            '<option value="5">New window</option>' +
          '</select></div>' +
        '<div class="row g-2 mb-3 dt-button-frame-size">' +
          '<div class="col"><label class="form-label" for="dt-button-framewidth">Frame width</label>' +
            '<input type="text" class="form-control" id="dt-button-framewidth" placeholder="80%"></div>' +
          '<div class="col"><label class="form-label" for="dt-button-frameheight">Frame height</label>' +
            '<input type="text" class="form-control" id="dt-button-frameheight" placeholder="80%"></div>' +
        '</div>' +
      '</div>' +
      '<div class="dt-button-action-fields dt-button-popup-fields d-none">' +
        '<div class="mb-3"><label class="form-label" for="dt-button-popup">Popup block</label>' +
          '<input type="text" class="form-control" id="dt-button-popup" placeholder="Block key"></div>' +
      '</div>' +
      '<div class="row g-2">' +
        '<div class="col"><label class="form-label" for="dt-button-auto-close">Auto close (seconds)</label>' +
          '<input type="number" min="0" step="1" class="form-control" id="dt-button-auto-close"></div>' +
        '<div class="col"><label class="form-label" for="dt-button-password">Password</label>' +
          '<input type="text" class="form-control" id="dt-button-password" autocomplete="off"></div>' +
      '</div>' +
      '<label class="form-check form-switch mt-3 mb-2">' +
        '<input class="form-check-input" type="checkbox" id="dt-button-no-background">' +
        '<span class="form-check-label">No background</span></label>';
  }

  function injectButtonEditor(popup) {
    var $popup = $(popup);
    if ($popup.data('dt-button-editor-ready')) return;
    $popup.data('dt-button-editor-ready', true);

    $popup.find('.modal-title').html('<i class="fas fa-link me-2" aria-hidden="true"></i>Button');
    var $screen = $('#sb-button-screen').closest('.mb-3');
    $screen.addClass('dt-button-slide-fields');
    $screen.before(actionFieldsHtml());

    function refreshAction() {
      var action = $('#dt-button-action').val() || 'slide';
      $popup.find('.dt-button-slide-fields').toggleClass('d-none', action !== 'slide');
      $popup.find('.dt-button-url-fields').toggleClass('d-none', action !== 'url');
      $popup.find('.dt-button-popup-fields').toggleClass('d-none', action !== 'popup');
      $popup.find('.dt-button-frame-size').toggleClass(
        'd-none', action !== 'url' || $('#dt-button-window').val() !== '2'
      );
    }
    $popup.on('change', '#dt-button-action, #dt-button-window', refreshAction);
    refreshAction();

    popup.addEventListener('click', function (event) {
      var save = event.target.closest && event.target.closest('#sb-save-btn');
      if (!save) return;
      var action = String($('#dt-button-action').val() || 'slide');
      var reference = $.trim(String($('#sb-button-name').val() || ''));
      var custom = {};
      var message = $popup.find('.cd-custom-message').removeClass('text-danger').text('');

      if (action === 'url') {
        var url = $.trim(String($('#dt-button-url').val() || ''));
        if (!url) {
          event.preventDefault();
          event.stopImmediatePropagation();
          message.addClass('text-danger').text('Enter a URL.');
          $('#dt-button-url').trigger('focus');
          return;
        }
        custom.url = url;
        custom.newwindow = parseInt($('#dt-button-window').val(), 10);
        if (custom.newwindow === 2) {
          var fw = $.trim(String($('#dt-button-framewidth').val() || ''));
          var fh = $.trim(String($('#dt-button-frameheight').val() || ''));
          if (fw) custom.framewidth = fw;
          if (fh) custom.frameheight = fh;
        }
        $('#sb-button-screen').val('1');
      } else if (action === 'popup') {
        var popupKey = $.trim(String($('#dt-button-popup').val() || ''));
        if (!popupKey) {
          event.preventDefault();
          event.stopImmediatePropagation();
          message.addClass('text-danger').text('Enter the block key to open.');
          $('#dt-button-popup').trigger('focus');
          return;
        }
        custom.popup = popupKey;
        // clickHandler checks newwindow before slide; value 2 deliberately
        // routes this through blockLoadFrame(), which handles `popup` blocks.
        custom.newwindow = 2;
        $('#sb-button-screen').val('1');
      }

      var autoClose = parseFloat($('#dt-button-auto-close').val());
      if (isFinite(autoClose) && autoClose > 0) custom.auto_close = autoClose;
      var password = String($('#dt-button-password').val() || '');
      if (password) custom.password = password;
      if ($('#dt-button-no-background').is(':checked')) custom.no_background = true;

      pendingButtons[reference] = { action: action, custom: custom };
    }, true);
  }

  function enhancePopups(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var configPopups = [];
    if (scope.matches && scope.matches('#de-config-popup, .we-config-popup')) configPopups.push(scope);
    Array.prototype.push.apply(configPopups, scope.querySelectorAll('#de-config-popup, .we-config-popup'));
    configPopups.forEach(injectNoBackgroundIntoConfig);

    var buttonPopups = [];
    if (scope.matches && scope.matches('#slidebuttonpopup')) buttonPopups.push(scope);
    Array.prototype.push.apply(buttonPopups, scope.querySelectorAll('#slidebuttonpopup'));
    buttonPopups.forEach(injectButtonEditor);
  }

  function installAjaxPrefilter() {
    if (!$.ajaxPrefilter || $.dtWizard170171PrefilterInstalled) return;
    $.dtWizard170171PrefilterInstalled = true;
    $.ajaxPrefilter(function (options) {
      var url = String(options.url || '');
      if (url.indexOf('js/saveblocks.php') === -1 || typeof options.data !== 'string') return;
      var payload;
      try {
        payload = JSON.parse(options.data);
      } catch (error) {
        return;
      }
      if (!payload || !Array.isArray(payload.devices)) return;
      var changed = false;
      payload.devices.forEach(function (entry) {
        if (!entry || entry.kind !== 'slidebutton' || !pendingButtons[entry.key]) return;
        var pending = pendingButtons[entry.key];
        entry.custom_fields = $.extend({}, entry.custom_fields || {}, pending.custom || {});
        changed = true;
        delete pendingButtons[entry.key];
      });
      if (changed) options.data = JSON.stringify(payload);
    });
  }

  function start() {
    ensureStyle();
    installAjaxPrefilter();
    applyNoBackground(document);
    enhancePopups(document);

    if (typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          Array.prototype.forEach.call(mutation.addedNodes || [], function (node) {
            if (!node || node.nodeType !== 1) return;
            applyNoBackground(node);
            enhancePopups(node);
          });
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

//# sourceURL=js/components/button.js
