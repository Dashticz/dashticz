/* Garbage Widget Config enhancement.
 *
 * Keeps the existing Garbage component intact while adding editor/runtime
 * behaviour that is specific to this widget:
 * - persist the generated Font Awesome icon when Icon is enabled;
 * - expose one per-widget Kliko scale percentage;
 * - keep the widget title left aligned;
 * - render the first garbage collection row in bold;
 * - move the Kliko image 70 px to the right.
 */
(function () {
  'use strict';

  var SCALE_FIELD = 'kliko_scale';
  var POLL_MS = 500;

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

  function syncManagedCustomField(popup, fieldName, rawValue) {
    var value = String(rawValue || '').trim();
    if (value) {
      var parsed = parseFloat(value);
      value = isFinite(parsed) && parsed > 0 ? String(parsed) : '';
    }

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

  function createScaleField(value) {
    var group = document.createElement('div');
    group.className = 'mb-3';

    var label = document.createElement('label');
    label.className = 'form-label we-field-label';
    label.setAttribute('for', 'we-cfg-kliko-scale');
    label.textContent = 'Kliko scale (%)';

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
    help.textContent =
      '100 = normal size, 80 = 80%, 125 = 125%. Leave empty to use the theme size.';

    group.appendChild(label);
    group.appendChild(input);
    group.appendChild(help);
    return group;
  }

  function syncScaleInput(popup) {
    var scale = popup.querySelector('#we-cfg-kliko-scale');
    if (scale) syncManagedCustomField(popup, SCALE_FIELD, scale.value);
  }

  function enhanceGarbagePopup(popup) {
    if (
      !popup ||
      popup.getAttribute('data-garbage-layout-enhanced') === 'true'
    ) {
      return;
    }

    var scaleValue = customFieldValue(popup, SCALE_FIELD);
    hideManagedCustomRow(findCustomFieldRow(popup, SCALE_FIELD));

    // Remove the two temporary pixel-size fields from the previous revision.
    removeManagedCustomRow(popup, 'kliko_width');
    removeManagedCustomRow(popup, 'kliko_height');

    var wrapper = document.createElement('div');
    wrapper.className = 'garbage-kliko-scale-fields';

    var heading = document.createElement('h6');
    heading.className = 'mt-3 mb-2';
    heading.style.cssText = 'font-size:14px;font-weight:600;color:#495057';
    heading.textContent = 'Kliko image';
    wrapper.appendChild(heading);
    wrapper.appendChild(createScaleField(scaleValue));

    var hideIcon = popup.querySelector('#we-cfg-garbage-hideicon');
    var anchor = hideIcon && hideIcon.closest('.mb-3');
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(wrapper, anchor);
    } else {
      var body = popup.querySelector('.modal-body');
      if (body) body.appendChild(wrapper);
    }

    var input = wrapper.querySelector('.garbage-kliko-scale-input');
    if (input) {
      input.addEventListener('input', function () {
        syncScaleInput(popup);
      });
      input.addEventListener('change', function () {
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

  function applyRuntimeStyles() {
    var images = document.querySelectorAll('img.trashcan');
    for (var i = 0; i < images.length; i++) {
      var image = images[i];
      var block =
        image.closest('.dt_block[data-id]') || image.closest('[data-id]');
      if (!block) continue;

      var key = String(block.getAttribute('data-id') || '');
      var definition =
        key && typeof window.blocks !== 'undefined' ? window.blocks[key] : null;

      block.classList.add('garbage-widget-enhanced');

      var title = block.querySelector('.dt_title');
      if (title) title.style.setProperty('text-align', 'left', 'important');

      image.style.setProperty('position', 'relative', 'important');
      image.style.setProperty('left', '70px', 'important');

      var scale = positiveNumber(definition && definition[SCALE_FIELD]);
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

      var rows = block.querySelectorAll('.trashrow');
      for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        rows[rowIndex].style.removeProperty('font-weight');
      }
      if (rows.length) {
        rows[0].style.setProperty('font-weight', '700', 'important');
      }
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
