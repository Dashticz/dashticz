/* LMS-specific Device Config enhancement.
 *
 * Adds a Player controls switch to an LMS Device Config popup and restores
 * the normal Dashticz icon column for LMS blocks. It also ensures that the
 * Device Editor persists an enabled generated Font Awesome icon as an
 * explicit user choice.
 *
 * This module deliberately avoids MutationObserver and does not touch the
 * main Dashticz loader.
 */
(function () {
  'use strict';

  var FIELD = 'player_controls';
  var SWITCH_ID = 'de-config-lms-player-controls';
  var POLL_MS = 500;
  var FA_FAMILIES = [
    'fas',
    'far',
    'fab',
    'fal',
    'fad',
    'fat',
    'fak',
    'fa-solid',
    'fa-regular',
    'fa-brands',
    'fa-light',
    'fa-thin',
    'fa-duotone',
  ];

  function findFieldRow(popup) {
    var rows = popup.querySelectorAll('.de-custom-field-row');
    for (var i = 0; i < rows.length; i++) {
      var input = rows[i].querySelector('.de-custom-field-name');
      var field = input ? String(input.value || '') : '';
      if (field.trim().toLowerCase() === FIELD) {
        return rows[i];
      }
    }
    return null;
  }

  function storedEnabled(popup) {
    var row = findFieldRow(popup);
    if (!row) {
      return true;
    }

    var setting = row.querySelector('.de-custom-field-setting');
    var value = setting ? String(setting.value || '') : 'true';
    value = value.trim().toLowerCase();
    return value !== 'false' && value !== '0';
  }

  function createStorageRow() {
    var row = document.createElement('div');
    row.className = [
      'de-custom-field-row',
      'input-group',
      'input-group-sm',
      'mb-2',
      'd-none',
      'de-lms-player-controls-storage',
    ].join(' ');

    var field = document.createElement('input');
    field.type = 'text';
    field.className = 'form-control de-custom-field-name';
    field.value = FIELD;
    row.appendChild(field);

    var setting = document.createElement('input');
    setting.type = 'text';
    setting.className = 'form-control de-custom-field-setting';
    setting.value = 'true';
    row.appendChild(setting);

    return row;
  }

  function ensureStorageRow(popup, enabled) {
    var row = findFieldRow(popup);
    if (!row) {
      var fields = popup.querySelector('.de-custom-fields');
      if (!fields) {
        return null;
      }
      row = createStorageRow();
      fields.appendChild(row);
    }

    row.classList.add('d-none');
    row.classList.add('de-lms-player-controls-storage');

    var field = row.querySelector('.de-custom-field-name');
    var setting = row.querySelector('.de-custom-field-setting');
    if (field) {
      field.value = FIELD;
    }
    if (setting) {
      setting.value = enabled ? 'true' : 'false';
    }
    return row;
  }

  function markIconExplicit(iconToggle, iconRow, setting) {
    if (!iconToggle.classList.contains('active')) {
      return;
    }
    if (!String(setting.value || '').trim()) {
      return;
    }
    iconRow.setAttribute('data-generated-icon', 'false');
  }

  function fixLmsIconPersistence(popup) {
    var selector = '.de-config-option[data-option="icon"]';
    var iconToggle = popup.querySelector(selector);
    var iconRow = popup.querySelector('.de-icon-field-row');
    if (!iconToggle || !iconRow) {
      return;
    }

    var source = iconRow.querySelector('.de-icon-source');
    var setting = iconRow.querySelector('.de-custom-field-setting');
    if (!setting) {
      return;
    }

    function markExplicitIfActive() {
      markIconExplicit(iconToggle, iconRow, setting);
    }

    markExplicitIfActive();

    var wired = iconRow.getAttribute('data-lms-icon-persistence-wired');
    if (wired === 'true') {
      return;
    }
    iconRow.setAttribute('data-lms-icon-persistence-wired', 'true');

    setting.addEventListener('input', markExplicitIfActive);
    setting.addEventListener('change', markExplicitIfActive);
    if (source) {
      source.addEventListener('change', markExplicitIfActive);
    }
    iconToggle.addEventListener('click', function () {
      window.setTimeout(markExplicitIfActive, 0);
    });
  }

  function createPlayerControlsOption(enabled) {
    var option = document.createElement('label');
    option.className = 'form-check form-switch mb-3 lms-player-controls-option';

    var toggle = document.createElement('input');
    toggle.className = 'form-check-input de-lms-switch';
    toggle.type = 'checkbox';
    toggle.id = SWITCH_ID;
    toggle.checked = enabled;
    option.appendChild(toggle);

    var text = document.createElement('span');
    text.className = 'form-check-label';
    text.textContent = 'Player controls';
    option.appendChild(text);

    return option;
  }

  function addPlayerControlsOption(popup, hideWhenOff) {
    if (popup.querySelector('#' + SWITCH_ID)) {
      return;
    }

    var enabled = storedEnabled(popup);
    ensureStorageRow(popup, enabled);

    var option = createPlayerControlsOption(enabled);
    var host = hideWhenOff.closest('label.form-switch');
    if (host && host.parentNode) {
      host.parentNode.insertBefore(option, host.nextSibling);
    } else {
      hideWhenOff.parentNode.appendChild(option);
    }

    var toggle = option.querySelector('#' + SWITCH_ID);
    toggle.addEventListener('change', function () {
      ensureStorageRow(popup, toggle.checked);
    });
  }

  function enhanceLmsPopup() {
    var popup = document.getElementById('de-config-popup');
    if (!popup) {
      return;
    }

    var hideWhenOff = popup.querySelector('#de-config-lms-hide-when-off');
    if (!hideWhenOff) {
      return;
    }

    fixLmsIconPersistence(popup);
    addPlayerControlsOption(popup, hideWhenOff);
  }

  function normaliseFontAwesomeIcon(value) {
    var icon = String(value || '').trim();
    if (!icon) {
      return '';
    }

    var classes = icon.split(/\s+/);
    var hasFaGlyph = false;
    var hasFamily = false;
    for (var i = 0; i < classes.length; i++) {
      if (/^fa-/.test(classes[i])) {
        hasFaGlyph = true;
      }
      if (FA_FAMILIES.indexOf(classes[i]) !== -1) {
        hasFamily = true;
      }
    }

    if (hasFaGlyph && !hasFamily) {
      return 'fas ' + icon;
    }
    return icon;
  }

  function findDirectChildByClass(block, className) {
    var children = block.children || [];
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (child.classList && child.classList.contains(className)) {
        return child;
      }
    }
    return null;
  }

  function ownIconColumn(block) {
    return findDirectChildByClass(block, 'lms-configured-icon');
  }

  function genericIconColumn(block) {
    return findDirectChildByClass(block, 'col-icon');
  }

  function removeIconColumn(column) {
    if (column && column.parentNode) {
      column.parentNode.removeChild(column);
    }
  }

  function ensureIconColumn(block) {
    var column = ownIconColumn(block);
    if (column) {
      return column;
    }

    column = document.createElement('div');
    column.className = 'col-icon lms-configured-icon';
    var content = findDirectChildByClass(block, 'dt_content');
    block.insertBefore(column, content || block.firstChild);
    return column;
  }

  function clearChildren(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function renderConfiguredIcon(column, icon, image) {
    clearChildren(column);

    if (icon) {
      var em = document.createElement('em');
      em.className = icon + ' icon';
      em.setAttribute('aria-hidden', 'true');
      column.appendChild(em);
      return;
    }

    var img = document.createElement('img');
    img.className = 'icon';
    img.src = 'img/' + image;
    img.alt = '';
    column.appendChild(img);
  }

  function syncConfiguredIcon(block, definition) {
    var icon = normaliseFontAwesomeIcon(definition.icon);
    var image = String(definition.image || '').trim();
    var signature = icon ? 'icon:' + icon : '';
    if (!signature && image) {
      signature = 'image:' + image;
    }

    var column = ownIconColumn(block);
    if (!signature) {
      removeIconColumn(column);
      return;
    }

    var generic = genericIconColumn(block);
    if (generic && generic !== column) {
      return;
    }

    column = ensureIconColumn(block);
    if (column.getAttribute('data-lms-icon') === signature) {
      return;
    }

    column.setAttribute('data-lms-icon', signature);
    renderConfiguredIcon(column, icon, image);
  }

  function applyRuntimeSettings() {
    var definitions = window.blocks;
    if (!definitions) {
      return;
    }

    var lmsBlocks = document.querySelectorAll('.lms-block[data-id]');
    for (var i = 0; i < lmsBlocks.length; i++) {
      var block = lmsBlocks[i];
      var key = String(block.getAttribute('data-id') || '');
      var definition = key ? definitions[key] : null;
      if (!definition) {
        continue;
      }

      var hidden = definition.player_controls === false;
      block.classList.toggle('lms-player-controls-hidden', hidden);
      syncConfiguredIcon(block, definition);
    }
  }

  function tick() {
    enhanceLmsPopup();
    applyRuntimeSettings();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tick);
  } else {
    tick();
  }
  window.setInterval(tick, POLL_MS);
})();

//# sourceURL=js/lmsconfig.js
