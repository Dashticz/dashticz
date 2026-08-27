/* global $, DashticzCustomFieldPresets */
//# sourceURL=js/customfieldpresetbehavior.js
(function () {
  'use strict';

  if (typeof $ === 'undefined') return;

  function normalise(value) {
    return $.trim(String(value || '')).toLowerCase();
  }

  function matchingPresets(query) {
    if (
      typeof DashticzCustomFieldPresets === 'undefined' ||
      !DashticzCustomFieldPresets ||
      !Array.isArray(DashticzCustomFieldPresets.presets)
    ) {
      return [];
    }

    var wanted = normalise(query);
    if (!wanted) return DashticzCustomFieldPresets.presets.slice();

    return DashticzCustomFieldPresets.presets.filter(function (preset) {
      var haystack = [
        preset.field,
        preset.category,
        preset.type,
        preset.en,
        preset.nl,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.indexOf(wanted) !== -1;
    });
  }

  function rowForInput($input) {
    return $input.closest('.de-custom-field-row, .cd-custom-field-row');
  }

  function closePresetMenu($row) {
    if ($row && $row.length) {
      $row.find('.dt-custom-field-preset-menu').remove();
    } else {
      $('.dt-custom-field-preset-menu').remove();
    }
  }

  // customfieldpresets.js intentionally permits arbitrary property names.
  // When the typed value no longer matches a known preset, keep that manual
  // value but remove the suggestion overlay. Otherwise it can cover controls
  // below the row (notably Save in the compact Custom Device dialog).
  $(document).on(
    'input.dtCustomFieldPresetBehavior',
    '.de-custom-field-name:not([readonly]), .cd-custom-field-name:not([readonly])',
    function () {
      var $input = $(this);
      var query = normalise($input.val());
      if (query && matchingPresets(query).length === 0) {
        closePresetMenu(rowForInput($input));
      }
    }
  );

  // Moving from Field to Setting means the field-preset interaction is over.
  // Close it immediately instead of leaving a floating menu behind.
  $(document).on(
    'focus.dtCustomFieldPresetBehavior click.dtCustomFieldPresetBehavior',
    '.de-custom-field-setting, .cd-custom-field-setting',
    function () {
      closePresetMenu();
    }
  );

  // Only actual preset choices should receive pointer input. Header/category
  // text stays visible but can never block buttons behind an overhanging menu.
  if (!document.getElementById('dt-custom-field-preset-behavior-style')) {
    $('<style id="dt-custom-field-preset-behavior-style"></style>')
      .text(
        '.dt-custom-field-preset-menu{pointer-events:none!important;}' +
          '.dt-custom-field-preset-option:not(:disabled){pointer-events:auto!important;}'
      )
      .appendTo('head');
  }
})();
