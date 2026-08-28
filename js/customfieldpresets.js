/* global $, language */
//# sourceURL=js/customfieldpresets.js
(function () {
  'use strict';

  if (typeof $ === 'undefined') return;

  var PRESETS = [
    {
      field: 'hideimageonempty',
      category: 'visual',
      type: 'boolean',
      defaultValue: 'false',
      example: 'true',
      description:
        'Hide the configured image when the device Data/sValue is empty.',
    },
    {
      field: 'iconOn',
      category: 'visual',
      type: 'string',
      defaultValue: 'device default',
      example: 'fas fa-toggle-on',
      description: 'Font Awesome icon to use when the device is On.',
    },
    {
      field: 'iconOff',
      category: 'visual',
      type: 'string',
      defaultValue: 'device default',
      example: 'fas fa-toggle-off',
      description: 'Font Awesome icon to use when the device is Off.',
    },
    {
      field: 'imageOn',
      category: 'visual',
      type: 'string',
      defaultValue: 'image/default',
      example: 'bulb_on.png',
      description: 'Image from the img/ folder to use when the device is On.',
    },
    {
      field: 'imageOff',
      category: 'visual',
      type: 'string',
      defaultValue: 'image/default',
      example: 'bulb_off.png',
      description: 'Image from the img/ folder to use when the device is Off.',
    },
    {
      field: 'addClass',
      category: 'visual',
      type: 'string',
      defaultValue: 'none',
      example: 'myclassname',
      description: 'Add a custom CSS class to the block.',
      widget: true,
    },
    {
      field: 'textOn',
      category: 'data',
      type: 'string',
      defaultValue: 'device value',
      example: 'On',
      description: 'Text shown when the device is On.',
    },
    {
      field: 'textOff',
      category: 'data',
      type: 'string',
      defaultValue: 'device value',
      example: 'Off',
      description: 'Text shown when the device is Off.',
    },
    {
      field: 'unit',
      category: 'data',
      type: 'string',
      defaultValue: 'device unit',
      example: 'kW',
      description: 'Text placed behind the displayed device value.',
    },
    {
      field: 'decimals',
      category: 'data',
      type: 'number',
      defaultValue: 'device default',
      example: '1',
      description: 'Number of decimals used for the displayed value.',
    },
    {
      field: 'scale',
      category: 'data',
      type: 'number',
      defaultValue: '1',
      example: '0.001',
      description: 'Multiplier applied to the device value before display.',
    },
    {
      field: 'values',
      category: 'data',
      type: 'array',
      defaultValue: 'none',
      example: '[{"value":"<Data>"}]',
      description:
        'Define which device/subdevice values are shown. Enter valid JSON.',
    },
    {
      field: 'multi_line',
      category: 'data',
      type: 'boolean',
      defaultValue: 'false',
      example: 'true',
      description: 'Show multiple subvalues on separate lines.',
    },
    {
      field: 'single_line',
      category: 'data',
      type: 'boolean',
      defaultValue: 'false',
      example: 'true',
      description: 'Show multiple subvalues on one line.',
    },
    {
      field: 'showsubtitles',
      category: 'data',
      type: 'number',
      defaultValue: '0',
      example: '1',
      description: 'Show subvalue subtitles. Supported variants are 1 and 2.',
    },
    {
      field: 'showvalues',
      category: 'data',
      type: 'array',
      defaultValue: 'all',
      example: '[1,2]',
      description: 'Array of subvalue numbers to display. Enter valid JSON.',
    },
    {
      field: 'sortOrder',
      category: 'data',
      type: 'number',
      defaultValue: '0',
      example: '1',
      description: 'Selector sorting: 0 none, 1 ascending, -1 descending.',
    },
    {
      field: 'batteryThreshold',
      category: 'data',
      type: 'number',
      defaultValue: 'global setting',
      example: '15',
      description: 'Show the battery warning below this percentage.',
    },
    {
      field: 'flash',
      category: 'behaviour',
      type: 'number',
      defaultValue: '0',
      example: '500',
      description:
        'Flash the block after a value change for this many milliseconds.',
    },
    {
      field: 'hide_stop',
      category: 'behaviour',
      type: 'boolean',
      defaultValue: 'false',
      example: 'true',
      description: 'Hide the Stop button for supported devices such as blinds.',
    },
    {
      field: 'protected',
      category: 'behaviour',
      type: 'boolean',
      defaultValue: 'false',
      example: 'true',
      description: 'Prevent manual switching from Dashticz.',
    },
    {
      field: 'confirmation',
      category: 'behaviour',
      type: 'number',
      defaultValue: '0',
      example: '1',
      description: 'Ask for confirmation before changing a switch device.',
    },
    {
      field: 'password',
      category: 'behaviour',
      type: 'string',
      defaultValue: 'none',
      example: 'secret',
      description: 'Password-protect supported switch actions.',
    },
    {
      field: 'playsound',
      category: 'actions',
      type: 'string',
      defaultValue: 'none',
      example: 'sounds/ping.mp3',
      description: 'Play a sound when the device changes.',
    },
    {
      field: 'playsoundOn',
      category: 'actions',
      type: 'string',
      defaultValue: 'none',
      example: 'sounds/ping.mp3',
      description: 'Play a sound when the device changes to On.',
    },
    {
      field: 'playsoundOff',
      category: 'actions',
      type: 'string',
      defaultValue: 'none',
      example: 'sounds/ping.mp3',
      description: 'Play a sound when the device changes to Off.',
    },
    {
      field: 'speak',
      category: 'actions',
      type: 'string',
      defaultValue: 'none',
      example: 'Device status has changed',
      description: 'Speak text when the device changes.',
    },
    {
      field: 'speakOn',
      category: 'actions',
      type: 'string',
      defaultValue: 'none',
      example: 'Device is on',
      description: 'Speak text when the device changes to On.',
    },
    {
      field: 'speakOff',
      category: 'actions',
      type: 'string',
      defaultValue: 'none',
      example: 'Device is off',
      description: 'Speak text when the device changes to Off.',
    },
    {
      field: 'gotoslide',
      category: 'actions',
      type: 'number',
      defaultValue: 'none',
      example: '2',
      description: 'Go to this screen when the device changes.',
    },
    {
      field: 'gotoslideOn',
      category: 'actions',
      type: 'number',
      defaultValue: 'none',
      example: '2',
      description: 'Go to this screen when the device changes to On.',
    },
    {
      field: 'gotoslideOff',
      category: 'actions',
      type: 'number',
      defaultValue: 'none',
      example: '2',
      description: 'Go to this screen when the device changes to Off.',
    },
    {
      field: 'openpopup',
      category: 'actions',
      type: 'string',
      defaultValue: 'none',
      example: 'popup_name',
      description: 'Open a configured popup when the device changes.',
    },
    {
      field: 'openpopupOn',
      category: 'actions',
      type: 'string',
      defaultValue: 'none',
      example: 'popup_name',
      description: 'Open a configured popup when the device changes to On.',
    },
    {
      field: 'openpopupOff',
      category: 'actions',
      type: 'string',
      defaultValue: 'none',
      example: 'popup_name',
      description: 'Open a configured popup when the device changes to Off.',
    },
    {
      field: 'popup',
      category: 'navigation',
      type: 'string',
      defaultValue: 'automatic',
      example: 'popup_graph',
      description: 'Use a configured popup definition for this block.',
      widget: true,
    },
    {
      field: 'graph',
      category: 'navigation',
      type: 'boolean',
      defaultValue: 'device default',
      example: 'false',
      description: 'Enable or disable the click graph for supported devices.',
    },
    {
      field: 'devices',
      category: 'data',
      type: 'array',
      defaultValue: 'none',
      example: '[691, 692]',
      description:
        'Domoticz device idx values to combine into one Graph block (see docs/blocks/graphs.rst).',
    },
    {
      field: 'graphTypes',
      category: 'data',
      type: 'array',
      defaultValue: 'device default',
      example: "['te', 'hu']",
      description:
        'Limits a Graph block to specific device values, e.g. temperature/humidity.',
    },
    {
      field: 'legend',
      category: 'data',
      type: 'boolean / object',
      defaultValue: 'false',
      example: 'true',
      description:
        'Shows a Graph block legend, optionally renaming each dataset.',
    },
    {
      field: 'groupBy',
      category: 'data',
      type: 'string',
      defaultValue: 'none',
      example: 'day',
      description: "Groups a Graph block's data by hour, day, week or month.",
    },
    {
      field: 'groupByDevice',
      category: 'data',
      type: 'boolean / string',
      defaultValue: 'false',
      example: 'true',
      description:
        "Shows a Graph block's live device statuses as a bar chart instead of a time series.",
    },
    {
      field: 'datasetColors',
      category: 'visual',
      type: 'array',
      defaultValue: 'automatic',
      example: "['red', 'yellow', 'blue']",
      description: "Custom colors for a Graph block's lines/bars.",
    },
    {
      field: 'stacked',
      category: 'visual',
      type: 'boolean',
      defaultValue: 'false',
      example: 'true',
      description: "Stacks a Graph block's bar charts.",
    },
    {
      field: 'zoom',
      category: 'navigation',
      type: 'string',
      defaultValue: 'false',
      example: 'xy',
      description: "Enables zoom controls on a Graph block ('x', 'y' or 'xy').",
    },
    {
      field: 'url',
      category: 'navigation',
      type: 'string',
      defaultValue: 'none',
      example: 'https://example.com',
      description: 'URL opened when a supported block is clicked.',
      widget: true,
    },
    {
      field: 'newwindow',
      category: 'navigation',
      type: 'number',
      defaultValue: '2',
      example: '2',
      description:
        'URL click mode: 0 same window, 1 tab, 2 frame, 3 GET, 4 POST, 5 window.',
      widget: true,
    },
    {
      field: 'backgroundimage',
      category: 'background',
      type: 'string / idx',
      defaultValue: 'none',
      example: 'https://example.com/image.jpg',
      description:
        'Background image URL or Domoticz text-device idx containing the URL.',
      widget: true,
    },
    {
      field: 'backgroundsize',
      category: 'background',
      type: 'string',
      defaultValue: 'cover',
      example: 'contain',
      description: 'Background sizing, for example cover, contain or 80%.',
      widget: true,
    },
    {
      field: 'backgroundopacity',
      category: 'background',
      type: 'number / string',
      defaultValue: '1',
      example: '0.5',
      description: 'Opacity of the configured background image.',
      widget: true,
    },
    {
      field: 'colorpicker',
      category: 'advanced',
      type: 'number',
      defaultValue: '0',
      example: '2',
      description:
        'RGB colorpicker mode: 0 disabled, 1 old style, 2 new style.',
    },
    {
      field: 'colorpickerscale',
      category: 'advanced',
      type: 'number',
      defaultValue: '1',
      example: '1.5',
      description: 'Relative scale of colorpicker mode 2.',
    },
    {
      field: 'mode',
      category: 'advanced',
      type: 'number / string',
      defaultValue: 'device default',
      example: '1',
      description:
        'Device-specific mode; only use when the relevant block documentation requires it.',
    },
    {
      field: 'switchMode',
      category: 'advanced',
      type: 'string',
      defaultValue: 'switch',
      example: 'color',
      description:
        'For supported RGB devices, open the colorpicker instead of toggling On/Off.',
    },
  ];

  var CATEGORY_ORDER = [
    'visual',
    'data',
    'behaviour',
    'actions',
    'navigation',
    'background',
    'advanced',
  ];

  function _translations() {
    var configured =
      typeof language !== 'undefined' &&
      language.settings &&
      language.settings.customfieldpresets
        ? language.settings.customfieldpresets
        : {};
    return $.extend(
      {
        title: 'Available extra fields',
        hint: 'Type to filter. You can still enter a custom field manually.',
        noResults:
          'No matching preset. The typed field can still be used manually.',
        alreadyUsed: 'Already added',
        type: 'Type',
        defaultValue: 'Default',
        example: 'Example',
        categories: {
          visual: 'Image / icon',
          data: 'Data / display',
          behaviour: 'Behaviour',
          actions: 'Actions on change',
          navigation: 'Popup / navigation',
          background: 'Background',
          advanced: 'Advanced',
        },
        presets: {},
      },
      configured
    );
  }

  function presetTranslation(preset) {
    var presets = _translations().presets || {};
    return presets[preset.field] || {};
  }

  function presetDescription(preset) {
    return presetTranslation(preset).description || preset.description;
  }

  function presetExample(preset) {
    return presetTranslation(preset).example || preset.example;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalise(value) {
    return $.trim(String(value || '')).toLowerCase();
  }

  function isSupportedFieldInput(element) {
    var $input = $(element);
    if ($input.prop('readonly') || $input.prop('disabled')) return false;
    // The icon/image pulldown (a <select>, not a free-text field) also
    // carries the de-custom-field-name/we-custom-field-name class - it must
    // only ever offer "Icon"/"Image", never a field-name suggestion menu.
    if ($input.hasClass('de-icon-source') || $input.hasClass('we-icon-source'))
      return false;
    return (
      $input.hasClass('de-custom-field-name') ||
      $input.hasClass('cd-custom-field-name') ||
      $input.hasClass('we-custom-field-name')
    );
  }

  function isWidgetRow($row) {
    return $row.hasClass('we-custom-field-row');
  }

  function contextForInput($input) {
    return isWidgetRow(rowForInput($input)) ? 'widget' : 'device';
  }

  function rowForInput($input) {
    return $input.closest(
      '.de-custom-field-row, .cd-custom-field-row, .we-custom-field-row'
    );
  }

  function settingForInput($input) {
    var $row = rowForInput($input);
    return $row
      .find(
        '.de-custom-field-setting, .cd-custom-field-setting, .we-custom-field-setting'
      )
      .first();
  }

  function usedFields($input) {
    var used = {};
    $(
      '.de-custom-field-name, .cd-custom-field-name, .we-custom-field-name'
    ).each(function () {
      if (this === $input[0]) return;
      var value = normalise($(this).val());
      if (value) used[value] = true;
    });
    return used;
  }

  function presetsForContext(context) {
    if (context !== 'widget') return PRESETS;
    return PRESETS.filter(function (preset) {
      return preset.widget === true;
    });
  }

  function findPreset(field, context) {
    var wanted = normalise(field);
    var found = null;
    presetsForContext(context).some(function (preset) {
      if (normalise(preset.field) === wanted) {
        found = preset;
        return true;
      }
      return false;
    });
    return found;
  }

  function removeMenus(exceptRow) {
    $('.dt-custom-field-preset-menu').each(function () {
      if (
        exceptRow &&
        $(this).closest('.dt-field-preset-host')[0] === exceptRow[0]
      )
        return;
      $(this).remove();
    });
  }

  function renderInfo($input, preset) {
    var $row = rowForInput($input);
    var $info = $row.find('.dt-custom-field-preset-info');
    if (!$info.length) {
      $info = $('<div class="dt-custom-field-preset-info"></div>');
      $row.append($info);
    }
    if (!preset) {
      $info.empty().hide();
      return;
    }

    var t = _translations();
    $info
      .html(
        '<div class="dt-custom-field-preset-meta"><strong>' +
          escapeHtml(preset.field) +
          '</strong><span>' +
          escapeHtml(t.type) +
          ': ' +
          escapeHtml(preset.type) +
          '</span><span>' +
          escapeHtml(t.defaultValue) +
          ': ' +
          escapeHtml(preset.defaultValue) +
          '</span></div>' +
          '<div class="dt-custom-field-preset-description">' +
          escapeHtml(presetDescription(preset)) +
          '</div>' +
          '<div class="dt-custom-field-preset-example"><span>' +
          escapeHtml(t.example) +
          ':</span> <code>' +
          escapeHtml(presetExample(preset)) +
          '</code></div>'
      )
      .show();
  }

  function presetMatches(preset, query) {
    if (!query) return true;
    var haystack = [
      preset.field,
      preset.category,
      preset.type,
      presetDescription(preset),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.indexOf(query) !== -1;
  }

  function menuHtml($input) {
    var t = _translations();
    var query = normalise($input.val());
    var used = usedFields($input);
    var current = normalise($input.val());
    var contextPresets = presetsForContext(contextForInput($input));
    var html =
      '<div class="dt-custom-field-preset-menu" role="listbox">' +
      '<div class="dt-custom-field-preset-menu-header"><strong>' +
      escapeHtml(t.title) +
      '</strong><small>' +
      escapeHtml(t.hint) +
      '</small></div>';
    var count = 0;

    CATEGORY_ORDER.forEach(function (category) {
      var items = contextPresets.filter(function (preset) {
        return preset.category === category && presetMatches(preset, query);
      });
      if (!items.length) return;

      html +=
        '<div class="dt-custom-field-preset-category">' +
        escapeHtml(t.categories[category] || category) +
        '</div>';
      items.forEach(function (preset) {
        var fieldKey = normalise(preset.field);
        var isUsed = used[fieldKey] && fieldKey !== current;
        html +=
          '<button type="button" class="dt-custom-field-preset-option' +
          (isUsed ? ' is-used' : '') +
          '" data-field="' +
          escapeHtml(preset.field) +
          '"' +
          (isUsed ? ' disabled aria-disabled="true"' : '') +
          '>' +
          '<span class="dt-custom-field-preset-option-main"><strong>' +
          escapeHtml(preset.field) +
          '</strong><span class="dt-custom-field-preset-type">' +
          escapeHtml(preset.type) +
          '</span>' +
          (isUsed
            ? '<span class="dt-custom-field-preset-used">' +
              escapeHtml(t.alreadyUsed) +
              '</span>'
            : '') +
          '</span>' +
          '<span class="dt-custom-field-preset-option-description">' +
          escapeHtml(presetDescription(preset)) +
          '</span>' +
          '</button>';
        count += 1;
      });
    });

    if (!count) {
      html +=
        '<div class="dt-custom-field-preset-empty">' +
        escapeHtml(t.noResults) +
        '</div>';
    }
    html += '</div>';
    return html;
  }

  function openMenu($input) {
    if (!$input || !$input.length || !isSupportedFieldInput($input[0])) return;
    var $row = rowForInput($input);
    if (!$row.length) return;

    removeMenus($row);
    $row.addClass('dt-field-preset-host');
    $row.find('.dt-custom-field-preset-menu').remove();
    $row.append(menuHtml($input));
    renderInfo($input, findPreset($input.val(), contextForInput($input)));
  }

  function selectPreset($button) {
    var $row = $button.closest(
      '.de-custom-field-row, .cd-custom-field-row, .we-custom-field-row'
    );
    var $input = $row
      .find(
        '.de-custom-field-name, .cd-custom-field-name, .we-custom-field-name'
      )
      .first();
    var field = String($button.attr('data-field') || '');
    var preset = findPreset(field);
    if (!preset || !$input.length) return;

    var previousField = normalise($input.val());
    var $setting = settingForInput($input);
    $input.val(preset.field).trigger('input').trigger('change');

    // Selecting another preset should not leave a setting belonging to the
    // previous field behind. Re-selecting the same preset preserves a user's
    // already edited setting.
    if (
      $setting.length &&
      (previousField !== normalise(preset.field) ||
        !$.trim(String($setting.val() || '')))
    ) {
      $setting.val(presetExample(preset)).trigger('input').trigger('change');
    }

    renderInfo($input, preset);
    $row.find('.dt-custom-field-preset-menu').remove();
    $setting.length ? $setting.trigger('focus') : $input.trigger('focus');
  }

  function injectStyles() {
    if (document.getElementById('dt-custom-field-preset-style')) return;
    var css =
      '.dt-field-preset-host{position:relative!important;overflow:visible!important;flex-wrap:wrap!important;}' +
      '.dt-custom-field-preset-menu{position:absolute;z-index:1200;left:0;top:calc(100% + 3px);width:620px;max-width:calc(100vw - 48px);max-height:360px;overflow:auto;padding:0;background:var(--bs-body-bg,#fff);color:var(--bs-body-color,#212529);border:1px solid var(--bs-border-color,#dee2e6);border-radius:.45rem;box-shadow:0 .5rem 1rem rgba(0,0,0,.2);pointer-events:none;}' +
      '.dt-custom-field-preset-menu-header{position:sticky;top:0;z-index:2;display:flex;flex-direction:column;gap:2px;padding:9px 12px;background:var(--bs-body-bg,#fff);border-bottom:1px solid var(--bs-border-color,#dee2e6);}' +
      '.dt-custom-field-preset-menu-header small{opacity:.7;font-size:.75rem;}' +
      '.dt-custom-field-preset-category{padding:6px 12px 4px;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;opacity:.7;background:rgba(127,127,127,.08);}' +
      '.dt-custom-field-preset-option{display:flex;width:100%;flex-direction:column;gap:2px;padding:8px 12px;text-align:left;color:inherit;background:var(--bs-body-bg,#fff);border:0;border-bottom:1px solid rgba(127,127,127,.12);pointer-events:auto;}' +
      '.dt-custom-field-preset-option:hover,.dt-custom-field-preset-option:focus{background:rgba(13,110,253,.12);outline:0;}' +
      '.dt-custom-field-preset-option.is-used{opacity:.45;cursor:not-allowed;}' +
      '.dt-custom-field-preset-option-main{display:flex;align-items:center;gap:7px;}' +
      '.dt-custom-field-preset-type,.dt-custom-field-preset-used{padding:1px 6px;border-radius:999px;font-size:.68rem;background:rgba(127,127,127,.18);}' +
      '.dt-custom-field-preset-used{margin-left:auto;}' +
      '.dt-custom-field-preset-option-description{font-size:.77rem;opacity:.78;white-space:normal;}' +
      '.dt-custom-field-preset-empty{padding:12px;font-size:.8rem;opacity:.75;}' +
      '.dt-custom-field-preset-info{display:none;flex:1 0 100%;width:100%;margin-top:5px;padding:7px 9px;border-radius:.35rem;background:rgba(127,127,127,.08);font-size:.75rem;line-height:1.35;}' +
      '.dt-custom-field-preset-meta{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;}' +
      '.dt-custom-field-preset-meta span{opacity:.72;}' +
      '.dt-custom-field-preset-description{margin-top:3px;}' +
      '.dt-custom-field-preset-example{margin-top:3px;opacity:.85;}' +
      '.dt-custom-field-preset-example code{user-select:all;}' +
      '@media(max-width:767.98px){.dt-custom-field-preset-menu{width:calc(100vw - 48px);max-height:300px;}}';
    $('<style id="dt-custom-field-preset-style"></style>')
      .text(css)
      .appendTo('head');
  }

  injectStyles();

  var FIELD_INPUT_SELECTOR =
    '.de-custom-field-name:not([readonly]), .cd-custom-field-name:not([readonly]), .we-custom-field-name:not([readonly])';

  $(document).on(
    'focus.dtCustomFieldPresets click.dtCustomFieldPresets',
    FIELD_INPUT_SELECTOR,
    function () {
      openMenu($(this));
    }
  );

  $(document).on(
    'input.dtCustomFieldPresets',
    FIELD_INPUT_SELECTOR,
    function () {
      var $input = $(this);
      openMenu($input);
      renderInfo($input, findPreset($input.val(), contextForInput($input)));
    }
  );

  $(document).on(
    'click.dtCustomFieldPresets',
    '.dt-custom-field-preset-option:not(.is-used)',
    function (event) {
      event.preventDefault();
      event.stopPropagation();
      selectPreset($(this));
    }
  );

  $(document).on('mousedown.dtCustomFieldPresets', function (event) {
    if (
      $(event.target).closest(
        '.dt-custom-field-preset-menu, .de-custom-field-name, .cd-custom-field-name, .we-custom-field-name'
      ).length
    )
      return;
    removeMenus();
  });

  $(document).on('hidden.bs.modal.dtCustomFieldPresets', function () {
    removeMenus();
  });

  window.DashticzCustomFieldPresets = {
    presets: PRESETS.slice(),
    find: findPreset,
    presetsForContext: presetsForContext,
    description: presetDescription,
    example: presetExample,
  };
})();
