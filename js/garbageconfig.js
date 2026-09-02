/* global language */
/* Garbage Widget Config enhancement.
 *
 * Keeps Garbage-specific editor/runtime behaviour isolated from the generic
 * Widget Editor while using the same visual text-style pattern as LMS:
 * - persist the generated Font Awesome icon when Icon is enabled;
 * - expose one per-widget Kliko scale percentage;
 * - keep the widget title left aligned;
 * - move the Kliko image 70 px to the right;
 * - store row 1 and row 2+ text size/color as per-widget block properties;
 * - let explicit widget text settings override theme rules.
 */
(function () {
  'use strict';

  var SCALE_FIELD = 'kliko_scale';
  var ROW_STYLE_FIELDS = {
    row1Size: 'row1_fontsize',
    row1Color: 'row1_color',
    row2Size: 'row2_fontsize',
    row2Color: 'row2_color',
  };
  var POLL_MS = 500;

  function garbageUiText(key, fallback) {
    if (
      typeof language !== 'undefined' &&
      language.garbage &&
      language.garbage.ui &&
      language.garbage.ui[key]
    ) {
      return language.garbage.ui[key];
    }
    return fallback;
  }

  function normaliseField(value) {
    return String(value || '')
      .trim()
      .replace(/[\s-]+/g, '_')
      .toLowerCase();
  }

  function garbagePopup() {
    var popup = document.getElementById('we-config-popup');
    if (!popup || !popup.querySelector('[data-cfg-key="garbage_company"]')) {
      return null;
    }
    return popup;
  }

  function findCustomFieldRow(popup, fieldName) {
    var wanted = normaliseField(fieldName);
    var rows = popup.querySelectorAll('.we-custom-field-row');
    for (var i = 0; i < rows.length; i++) {
      var field = rows[i].querySelector('.we-custom-field-name');
      if (field && normaliseField(field.value) === wanted) return rows[i];
    }
    return null;
  }

  function customFieldValue(popup, fieldName) {
    var row = findCustomFieldRow(popup, fieldName);
    var setting = row && row.querySelector('.we-custom-field-setting');
    return setting ? String(setting.value || '').trim() : '';
  }

  function hideManagedCustomRow(row) {
    if (!row) return;
    row.classList.add('we-system-field-row', 'garbage-managed-custom-field');
    row.style.setProperty('display', 'none', 'important');
  }

  function removeManagedCustomRow(popup, fieldName) {
    var row = findCustomFieldRow(popup, fieldName);
    if (row && row.parentNode) row.parentNode.removeChild(row);
  }

  function createManagedCustomRow(popup, fieldName, value) {
    var fields = popup.querySelector('.we-custom-fields');
    if (!fields) return null;

    var row = document.createElement('div');
    row.className =
      'we-custom-field-row we-system-field-row garbage-managed-custom-field';
    row.style.setProperty('display', 'none', 'important');

    var name = document.createElement('input');
    name.type = 'text';
    name.className = 'we-custom-field-name';
    name.value = fieldName;

    var setting = document.createElement('input');
    setting.type = 'text';
    setting.className = 'we-custom-field-setting';
    setting.value = value;

    row.appendChild(name);
    row.appendChild(setting);
    fields.appendChild(row);
    return row;
  }

  function syncManagedValueField(popup, fieldName, rawValue) {
    var value = String(rawValue || '').trim();
    var row = findCustomFieldRow(popup, fieldName);

    if (!value) {
      if (row && row.parentNode) row.parentNode.removeChild(row);
      return;
    }

    if (!row) row = createManagedCustomRow(popup, fieldName, value);
    if (!row) return;

    hideManagedCustomRow(row);
    var setting = row.querySelector('.we-custom-field-setting');
    if (setting) setting.value = value;
  }

  function syncPositiveNumberField(popup, fieldName, rawValue) {
    var value = String(rawValue || '').trim();
    if (value) {
      var parsed = parseFloat(value);
      value = isFinite(parsed) && parsed > 0 ? String(parsed) : '';
    }
    syncManagedValueField(popup, fieldName, value);
  }

  function legacyConfigValue(popup, key) {
    var input = popup.querySelector('[data-cfg-key="' + key + '"]');
    return input ? String(input.value || '').trim() : '';
  }

  function removeLegacyConfigField(popup, key) {
    var input = popup.querySelector('[data-cfg-key="' + key + '"]');
    if (!input) return;
    var group = input.closest('.mb-3');
    if (group && group.parentNode) {
      group.parentNode.removeChild(group);
      return;
    }
    if (input.parentNode) input.parentNode.removeChild(input);
  }

  function textStyleValue(popup, fieldName, legacyKey, fallback) {
    return (
      customFieldValue(popup, fieldName) ||
      legacyConfigValue(popup, legacyKey) ||
      fallback
    );
  }

  function createTextStyleColumn(options) {
    var column = document.createElement('div');
    column.className = 'col-12 col-md-6';

    var title = document.createElement('div');
    title.className = 'small fw-semibold mb-1';
    title.textContent = options.title;
    column.appendChild(title);

    var row = document.createElement('div');
    row.className = 'd-flex gap-2 align-items-end';

    var sizeWrap = document.createElement('div');
    sizeWrap.className = 'flex-grow-1';
    var sizeLabel = document.createElement('label');
    sizeLabel.className = 'form-label small mb-1';
    sizeLabel.setAttribute('for', options.sizeId);
    sizeLabel.textContent = garbageUiText('font_size', 'Font size');
    var sizeInput = document.createElement('input');
    sizeInput.type = 'number';
    sizeInput.min = '8';
    sizeInput.max = '60';
    sizeInput.step = '1';
    sizeInput.className = 'form-control form-control-sm garbage-row-size-input';
    sizeInput.id = options.sizeId;
    sizeInput.value = options.sizeValue;
    sizeWrap.appendChild(sizeLabel);
    sizeWrap.appendChild(sizeInput);

    var colorWrap = document.createElement('div');
    var colorLabel = document.createElement('label');
    colorLabel.className = 'form-label small mb-1';
    colorLabel.setAttribute('for', options.colorId);
    colorLabel.textContent = garbageUiText('font_color', 'Font color');
    var colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.className =
      'form-control form-control-color garbage-row-color-input';
    colorInput.id = options.colorId;
    colorInput.value = options.colorValue;
    colorInput.title = garbageUiText('font_color', 'Font color');
    colorWrap.appendChild(colorLabel);
    colorWrap.appendChild(colorInput);

    row.appendChild(sizeWrap);
    row.appendChild(colorWrap);
    column.appendChild(row);
    return column;
  }

  function createTextStyleSection(values) {
    var section = document.createElement('div');
    section.className = 'garbage-text-style-section';

    var heading = document.createElement('h6');
    heading.className = 'de-section-title';
    heading.textContent = garbageUiText('text_styling', 'Text styling');
    section.appendChild(heading);

    var row = document.createElement('div');
    row.className = 'row g-2 mb-3';
    row.appendChild(
      createTextStyleColumn({
        title: garbageUiText('first_pickup_row', 'First pickup row'),
        sizeId: 'we-cfg-garbage-row1-size',
        sizeValue: values.row1Size,
        colorId: 'we-cfg-garbage-row1-color',
        colorValue: values.row1Color,
      })
    );
    row.appendChild(
      createTextStyleColumn({
        title: garbageUiText('pickup_rows_other', 'Pickup rows 2+'),
        sizeId: 'we-cfg-garbage-row2-size',
        sizeValue: values.row2Size,
        colorId: 'we-cfg-garbage-row2-color',
        colorValue: values.row2Color,
      })
    );
    section.appendChild(row);
    return section;
  }

  function createScaleField(value) {
    var group = document.createElement('div');
    group.className = 'mb-3';

    var label = document.createElement('label');
    label.className = 'form-label we-field-label';
    label.setAttribute('for', 'we-cfg-kliko-scale');
    label.textContent = garbageUiText('kliko_scale', 'Bin scale (%)');

    var input = document.createElement('input');
    input.type = 'number';
    input.className = 'form-control form-control-sm garbage-kliko-scale-input';
    input.id = 'we-cfg-kliko-scale';
    input.min = '1';
    input.step = '1';
    input.placeholder = '100';
    input.value = value;

    var help = document.createElement('div');
    help.className = 'form-text';
    help.textContent = garbageUiText(
      'kliko_scale_help',
      '100 = normal size, 80 = 80%, 125 = 125%. Leave empty to use the theme size.'
    );

    group.appendChild(label);
    group.appendChild(input);
    group.appendChild(help);
    return group;
  }

  function syncTextStyleInputs(popup) {
    var row1Size = popup.querySelector('#we-cfg-garbage-row1-size');
    var row1Color = popup.querySelector('#we-cfg-garbage-row1-color');
    var row2Size = popup.querySelector('#we-cfg-garbage-row2-size');
    var row2Color = popup.querySelector('#we-cfg-garbage-row2-color');

    if (row1Size) {
      syncPositiveNumberField(popup, ROW_STYLE_FIELDS.row1Size, row1Size.value);
    }
    if (row1Color) {
      syncManagedValueField(popup, ROW_STYLE_FIELDS.row1Color, row1Color.value);
    }
    if (row2Size) {
      syncPositiveNumberField(popup, ROW_STYLE_FIELDS.row2Size, row2Size.value);
    }
    if (row2Color) {
      syncManagedValueField(popup, ROW_STYLE_FIELDS.row2Color, row2Color.value);
    }
  }

  function syncScaleInput(popup) {
    var scale = popup.querySelector('#we-cfg-kliko-scale');
    if (scale) syncPositiveNumberField(popup, SCALE_FIELD, scale.value);
  }

  function enhanceGarbagePopup(popup) {
    if (
      !popup ||
      popup.getAttribute('data-garbage-layout-enhanced') === 'true'
    ) {
      return;
    }

    var textValues = {
      row1Size: textStyleValue(
        popup,
        ROW_STYLE_FIELDS.row1Size,
        'garbage_row1_fontsize',
        '16'
      ),
      row1Color: textStyleValue(
        popup,
        ROW_STYLE_FIELDS.row1Color,
        'garbage_row1_color',
        '#ffffff'
      ),
      row2Size: textStyleValue(
        popup,
        ROW_STYLE_FIELDS.row2Size,
        'garbage_row2_fontsize',
        '14'
      ),
      row2Color: textStyleValue(
        popup,
        ROW_STYLE_FIELDS.row2Color,
        'garbage_row2_color',
        '#cccccc'
      ),
    };

    Object.keys(ROW_STYLE_FIELDS).forEach(function (key) {
      hideManagedCustomRow(findCustomFieldRow(popup, ROW_STYLE_FIELDS[key]));
    });

    [
      'garbage_row1_fontsize',
      'garbage_row1_color',
      'garbage_row2_fontsize',
      'garbage_row2_color',
    ].forEach(function (key) {
      removeLegacyConfigField(popup, key);
    });

    var textSection = createTextStyleSection(textValues);
    var scaleValue = customFieldValue(popup, SCALE_FIELD);
    hideManagedCustomRow(findCustomFieldRow(popup, SCALE_FIELD));

    // Remove the two temporary pixel-size fields from an older revision.
    removeManagedCustomRow(popup, 'kliko_width');
    removeManagedCustomRow(popup, 'kliko_height');

    var scaleWrapper = document.createElement('div');
    scaleWrapper.className = 'garbage-kliko-scale-fields';
    var scaleHeading = document.createElement('h6');
    scaleHeading.className = 'mt-3 mb-2';
    scaleHeading.style.cssText = 'font-size:14px;font-weight:600;color:#495057';
    scaleHeading.textContent = garbageUiText('kliko_image', 'Bin image');
    scaleWrapper.appendChild(scaleHeading);
    scaleWrapper.appendChild(createScaleField(scaleValue));

    var hideIcon = popup.querySelector('#we-cfg-garbage-hideicon');
    var anchor = hideIcon && hideIcon.closest('.mb-3');
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(scaleWrapper, anchor);
      anchor.parentNode.insertBefore(textSection, scaleWrapper);
    } else {
      var body = popup.querySelector('.modal-body');
      if (body) {
        body.appendChild(textSection);
        body.appendChild(scaleWrapper);
      }
    }

    var textInputs = textSection.querySelectorAll('input');
    for (var i = 0; i < textInputs.length; i++) {
      textInputs[i].addEventListener('input', function () {
        syncTextStyleInputs(popup);
      });
      textInputs[i].addEventListener('change', function () {
        syncTextStyleInputs(popup);
      });
    }

    var scaleInput = scaleWrapper.querySelector('.garbage-kliko-scale-input');
    if (scaleInput) {
      scaleInput.addEventListener('input', function () {
        syncScaleInput(popup);
      });
      scaleInput.addEventListener('change', function () {
        syncScaleInput(popup);
      });
    }

    popup.setAttribute('data-garbage-layout-enhanced', 'true');
  }

  function markIconExplicit(popup) {
    var toggle = popup.querySelector('[data-block-option="icon"]');
    var row = popup.querySelector('.we-icon-field-row');
    if (!toggle || !row || !toggle.classList.contains('active')) return;

    var setting = row.querySelector('.we-custom-field-setting');
    if (!setting || !String(setting.value || '').trim()) return;

    row.setAttribute('data-generated-icon', 'false');
  }

  function positiveNumber(value) {
    var parsed = parseFloat(value);
    return isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  function validColor(value) {
    var color = String(value || '').trim();
    return /^#[0-9a-f]{6}$/i.test(color) ? color : null;
  }

  function setOverride(block, className, cssVar, value) {
    if (value === null || value === '') {
      block.classList.remove(className);
      block.style.removeProperty(cssVar);
      return;
    }
    block.classList.add(className);
    block.style.setProperty(cssVar, value);
  }

  function applyRowStyles(block, definition) {
    var row1Size = positiveNumber(definition[ROW_STYLE_FIELDS.row1Size]);
    var row1Color = validColor(definition[ROW_STYLE_FIELDS.row1Color]);
    var row2Size = positiveNumber(definition[ROW_STYLE_FIELDS.row2Size]);
    var row2Color = validColor(definition[ROW_STYLE_FIELDS.row2Color]);

    setOverride(
      block,
      'garbage-row1-size-override',
      '--garbage-row1-font-size',
      row1Size ? row1Size + 'px' : null
    );
    setOverride(
      block,
      'garbage-row1-color-override',
      '--garbage-row1-color',
      row1Color
    );
    setOverride(
      block,
      'garbage-row2-size-override',
      '--garbage-row2-font-size',
      row2Size ? row2Size + 'px' : null
    );
    setOverride(
      block,
      'garbage-row2-color-override',
      '--garbage-row2-color',
      row2Color
    );

    var rows = block.querySelectorAll(
      '.state .trashtoday, .state .trashtomorrow, .state .trashrow'
    );
    for (var i = 0; i < rows.length; i++) {
      rows[i].classList.remove('garbage-row-first', 'garbage-row-other');
      rows[i].classList.add(
        i === 0 ? 'garbage-row-first' : 'garbage-row-other'
      );
    }
  }

  function ensureRuntimeStyleSheet() {
    if (document.getElementById('garbage-row-style-overrides')) return;
    var style = document.createElement('style');
    style.id = 'garbage-row-style-overrides';
    style.textContent =
      '.garbage-widget-enhanced .garbage-row-first{font-weight:700!important;}' +
      '.garbage-widget-enhanced.garbage-row1-size-override .garbage-row-first{font-size:var(--garbage-row1-font-size)!important;}' +
      '.garbage-widget-enhanced.garbage-row1-color-override .garbage-row-first{color:var(--garbage-row1-color)!important;}' +
      '.garbage-widget-enhanced.garbage-row2-size-override .garbage-row-other{font-size:var(--garbage-row2-font-size)!important;}' +
      '.garbage-widget-enhanced.garbage-row2-color-override .garbage-row-other{color:var(--garbage-row2-color)!important;}';
    document.head.appendChild(style);
  }

  function applyRuntimeStyles() {
    ensureRuntimeStyleSheet();
    var images = document.querySelectorAll('img.trashcan');
    for (var i = 0; i < images.length; i++) {
      var image = images[i];
      var block =
        image.closest('.dt_block[data-id]') || image.closest('[data-id]');
      if (!block) continue;

      var key = String(block.getAttribute('data-id') || '');
      var definition =
        key && typeof window.blocks !== 'undefined' && window.blocks[key]
          ? window.blocks[key]
          : {};

      block.classList.add('garbage-widget-enhanced');

      var title = block.querySelector('.dt_title');
      if (title) title.style.setProperty('text-align', 'left', 'important');

      image.style.setProperty('position', 'relative', 'important');
      image.style.setProperty('left', '70px', 'important');

      var scale = positiveNumber(definition[SCALE_FIELD]);
      if (scale) {
        image.style.setProperty(
          'transform',
          'scale(' + scale / 100 + ')',
          'important'
        );
        image.style.setProperty('transform-origin', 'left center', 'important');
      } else {
        image.style.removeProperty('transform');
        image.style.removeProperty('transform-origin');
      }

      applyRowStyles(block, definition);
    }
  }

  document.addEventListener(
    'click',
    function (event) {
      var popup = garbagePopup();
      if (!popup) return;

      enhanceGarbagePopup(popup);

      var target = event.target;
      if (!target || !target.closest) return;

      if (target.closest('#we-cfg-ok-btn')) {
        syncTextStyleInputs(popup);
        syncScaleInput(popup);
        markIconExplicit(popup);
        return;
      }

      if (target.closest('[data-block-option="icon"]')) {
        window.setTimeout(function () {
          var currentPopup = garbagePopup();
          if (currentPopup) markIconExplicit(currentPopup);
        }, 0);
      }
    },
    true
  );

  function refreshGarbageEnhancements() {
    var popup = garbagePopup();
    if (popup) enhanceGarbagePopup(popup);
    applyRuntimeStyles();
  }

  refreshGarbageEnhancements();
  window.setInterval(refreshGarbageEnhancements, POLL_MS);
})();

//# sourceURL=js/garbageconfig.js
