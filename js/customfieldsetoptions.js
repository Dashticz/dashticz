/* global $, config, language, DashticzCustomFieldPresets */
//# sourceURL=js/customfieldsetoptions.js
(function () {
  'use strict';

  if (typeof $ === 'undefined') return;

  var OPTIONS = {
    hideimageonempty: {
      strict: true,
      values: [
        [
          'true',
          'Hide image when Data is empty',
          'Afbeelding verbergen als Data leeg is',
        ],
        ['false', 'Always show image', 'Afbeelding altijd tonen'],
      ],
    },
    multi_line: {
      strict: true,
      values: [
        [
          'true',
          'Show values on separate lines',
          'Waarden op aparte regels tonen',
        ],
        [
          'false',
          'Do not force multiple lines',
          'Geen meerdere regels afdwingen',
        ],
      ],
    },
    single_line: {
      strict: true,
      values: [
        ['true', 'Show values on one line', 'Waarden op één regel tonen'],
        ['false', 'Do not force a single line', 'Geen enkele regel afdwingen'],
      ],
    },
    hide_stop: {
      strict: true,
      values: [
        ['true', 'Hide Stop button', 'Stop-knop verbergen'],
        ['false', 'Show Stop button', 'Stop-knop tonen'],
      ],
    },
    protected: {
      strict: true,
      values: [
        ['true', 'Prevent manual switching', 'Handmatig schakelen blokkeren'],
        ['false', 'Allow manual switching', 'Handmatig schakelen toestaan'],
      ],
    },
    graph: {
      strict: true,
      values: [
        ['true', 'Enable graph', 'Grafiek inschakelen'],
        ['false', 'Disable graph', 'Grafiek uitschakelen'],
      ],
    },
    confirmation: {
      strict: true,
      values: [
        ['0', 'No confirmation', 'Geen bevestiging'],
        ['1', 'Ask before switching', 'Bevestiging vragen voor schakelen'],
      ],
    },
    sortorder: {
      strict: true,
      values: [
        ['-1', 'Descending', 'Aflopend'],
        ['0', 'No sorting', 'Niet sorteren'],
        ['1', 'Ascending', 'Oplopend'],
      ],
    },
    showsubtitles: {
      strict: true,
      values: [
        ['0', 'Hide subtitles', 'Subtitels verbergen'],
        ['1', 'Show subtitle with title', 'Subtitel bij titel tonen'],
        ['2', 'Show subtitle with value', 'Subtitel bij waarde tonen'],
      ],
    },
    newwindow: {
      strict: true,
      values: [
        ['0', 'Open in current window', 'Openen in huidig venster'],
        ['1', 'Open in new browser tab', 'Openen in nieuwe browsertab'],
        ['2', 'Open in popup/frame', 'Openen in popup/frame'],
        ['3', 'HTTP GET without window', 'HTTP GET zonder venster'],
        ['4', 'HTTP POST without window', 'HTTP POST zonder venster'],
        [
          '5',
          'Open in separate browser window',
          'Openen in apart browservenster',
        ],
      ],
    },
    colorpicker: {
      strict: true,
      values: [
        ['0', 'Disabled', 'Uitgeschakeld'],
        ['1', 'Old colorpicker', 'Oude kleurkiezer'],
        ['2', 'New colorpicker', 'Nieuwe kleurkiezer'],
      ],
    },
    switchmode: {
      strict: false,
      values: [
        [
          'color',
          'Open colorpicker instead of On/Off',
          'Kleurkiezer openen in plaats van Aan/Uit',
        ],
      ],
    },
    backgroundsize: {
      strict: false,
      values: [
        ['cover', 'Fill the complete block', 'Volledige block vullen'],
        [
          'contain',
          'Fit complete image inside block',
          'Volledige afbeelding in block passen',
        ],
        ['80%', 'Custom percentage example', 'Voorbeeld aangepast percentage'],
        ['100%', 'Original/full percentage example', 'Voorbeeld 100%'],
      ],
    },
    backgroundopacity: {
      strict: false,
      values: [
        ['1', '100% visible', '100% zichtbaar'],
        ['0.75', '75% visible', '75% zichtbaar'],
        ['0.5', '50% visible', '50% zichtbaar'],
        ['0.25', '25% visible', '25% zichtbaar'],
        ['0', 'Transparent', 'Transparant'],
      ],
    },
    colorpickerscale: {
      strict: false,
      values: [
        ['1', '100%', '100%'],
        ['1.25', '125%', '125%'],
        ['1.5', '150%', '150%'],
        ['2', '200%', '200%'],
      ],
    },
    decimals: {
      strict: false,
      values: [
        ['0', 'No decimals', 'Geen decimalen'],
        ['1', 'One decimal', 'Eén decimaal'],
        ['2', 'Two decimals', 'Twee decimalen'],
        ['3', 'Three decimals', 'Drie decimalen'],
      ],
    },
    batterythreshold: {
      strict: false,
      values: [
        ['10', 'Warn below 10%', 'Waarschuwen onder 10%'],
        ['15', 'Warn below 15%', 'Waarschuwen onder 15%'],
        ['20', 'Warn below 20%', 'Waarschuwen onder 20%'],
        ['30', 'Common/default threshold', 'Veelgebruikte/standaard grens'],
      ],
    },
    flash: {
      strict: false,
      values: [
        ['0', 'No flash', 'Niet knipperen'],
        ['250', '250 ms', '250 ms'],
        ['500', '500 ms', '500 ms'],
        ['1000', '1000 ms', '1000 ms'],
      ],
    },
    scale: {
      strict: false,
      values: [
        ['0.001', 'Divide by 1000', 'Delen door 1000'],
        ['0.01', 'Divide by 100', 'Delen door 100'],
        ['0.1', 'Divide by 10', 'Delen door 10'],
        ['1', 'No scaling', 'Geen schaling'],
        ['10', 'Multiply by 10', 'Vermenigvuldigen met 10'],
        ['100', 'Multiply by 100', 'Vermenigvuldigen met 100'],
        ['1000', 'Multiply by 1000', 'Vermenigvuldigen met 1000'],
      ],
    },
    mode: {
      strict: false,
      values: [
        [
          '1',
          'Example: device-specific mode 1',
          'Voorbeeld: device-specifieke modus 1',
        ],
      ],
    },
    texton: {
      strict: false,
      values: [
        ['On', 'Example On text', 'Voorbeeldtekst Aan'],
        ['Aan', 'Dutch example', 'Nederlands voorbeeld'],
        ['Open', 'Example state text', 'Voorbeeld statustekst'],
      ],
    },
    textoff: {
      strict: false,
      values: [
        ['Off', 'Example Off text', 'Voorbeeldtekst Uit'],
        ['Uit', 'Dutch example', 'Nederlands voorbeeld'],
        ['Closed', 'Example state text', 'Voorbeeld statustekst'],
        ['Dicht', 'Dutch state example', 'Nederlands statusvoorbeeld'],
      ],
    },
    unit: {
      strict: false,
      values: [
        ['°C', 'Temperature', 'Temperatuur'],
        ['%', 'Percentage', 'Percentage'],
        ['W', 'Watt', 'Watt'],
        ['kW', 'Kilowatt', 'Kilowatt'],
        ['V', 'Volt', 'Volt'],
        ['A', 'Ampere', 'Ampère'],
      ],
    },
  };

  var TEXT = {
    en: {
      title: 'Possible values',
      strictHint: 'Choose one of these supported values.',
      freeHint: 'Suggested values. You may also type another valid value.',
      current: 'Current',
    },
    nl: {
      title: 'Mogelijke waarden',
      strictHint: 'Kies één van deze ondersteunde waarden.',
      freeHint:
        'Voorgestelde waarden. Je kunt ook zelf een andere geldige waarde typen.',
      current: 'Huidig',
    },
  };

  function currentLanguage() {
    var configured =
      typeof config !== 'undefined' && config && config.language
        ? String(config.language)
        : '';
    return /^nl(?:_|-|$)/i.test(configured) ? 'nl' : 'en';
  }

  function labels() {
    return TEXT[currentLanguage()] || TEXT.en;
  }

  function normalise(value) {
    return $.trim(String(value || '')).toLowerCase();
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function rowForSetting($setting) {
    return $setting.closest('.de-custom-field-row, .cd-custom-field-row');
  }

  function fieldForSetting($setting) {
    return String(
      rowForSetting($setting)
        .find('.de-custom-field-name, .cd-custom-field-name')
        .first()
        .val() || ''
    );
  }

  function optionsForField(field) {
    return OPTIONS[normalise(field)] || null;
  }

  function presetForField(field) {
    if (
      typeof DashticzCustomFieldPresets !== 'undefined' &&
      DashticzCustomFieldPresets &&
      typeof DashticzCustomFieldPresets.find === 'function'
    ) {
      return DashticzCustomFieldPresets.find(field);
    }
    return null;
  }

  function removeMenus(exceptRow) {
    $('.dt-custom-setting-options-menu').each(function () {
      if (
        exceptRow &&
        $(this).closest('.dt-setting-options-host')[0] === exceptRow[0]
      )
        return;
      $(this).remove();
    });
  }

  function buildMenu($setting) {
    var field = fieldForSetting($setting);
    var optionSet = optionsForField(field);
    var preset = presetForField(field);
    var t = labels();
    var current = String($setting.val() || '');
    var html =
      '<div class="dt-custom-setting-options-menu" role="listbox">' +
      '<div class="dt-custom-setting-options-header"><strong>' +
      escapeHtml(t.title) +
      '</strong><small>' +
      escapeHtml(optionSet && optionSet.strict ? t.strictHint : t.freeHint) +
      '</small></div>';

    if (optionSet && optionSet.values && optionSet.values.length) {
      optionSet.values.forEach(function (entry) {
        var value = entry[0];
        var description =
          currentLanguage() === 'nl' ? entry[2] || entry[1] : entry[1];
        var selected = String(value) === current;
        html +=
          '<button type="button" class="dt-custom-setting-option' +
          (selected ? ' is-current' : '') +
          '" data-value="' +
          escapeHtml(value) +
          '">' +
          '<span class="dt-custom-setting-option-main"><code>' +
          escapeHtml(value) +
          '</code>' +
          (selected
            ? '<span class="dt-custom-setting-current">' +
              escapeHtml(t.current) +
              '</span>'
            : '') +
          '</span>' +
          '<span class="dt-custom-setting-option-description">' +
          escapeHtml(description || '') +
          '</span>' +
          '</button>';
      });
    } else if (preset) {
      var example =
        currentLanguage() === 'nl' && preset.nlExample
          ? preset.nlExample
          : preset.example;
      if (example !== undefined && example !== null && String(example) !== '') {
        html +=
          '<button type="button" class="dt-custom-setting-option" data-value="' +
          escapeHtml(example) +
          '"><span class="dt-custom-setting-option-main"><code>' +
          escapeHtml(example) +
          '</code></span><span class="dt-custom-setting-option-description">' +
          escapeHtml(
            currentLanguage() === 'nl' ? 'Voorbeeldwaarde' : 'Example value'
          ) +
          '</span></button>';
      }
    }

    html += '</div>';
    return html;
  }

  function openMenu($setting) {
    if (!$setting || !$setting.length || $setting.prop('readonly')) return;
    var $row = rowForSetting($setting);
    if (!$row.length) return;

    var field = fieldForSetting($setting);
    if (!field || normalise(field) === 'title') return;

    var optionSet = optionsForField(field);
    var preset = presetForField(field);

    // Unknown/custom fields intentionally remain free-form. Do not show a
    // generic overlay for them: apart from adding no useful choices, such an
    // overlay can cover neighbouring controls (including Save in short
    // modals). Known presets and fields with real suggestions still get the
    // contextual menu below.
    if (!optionSet && !preset) {
      removeMenus();
      $row.find('.dt-custom-setting-options-menu').remove();
      return;
    }

    removeMenus($row);
    $row.addClass('dt-setting-options-host');
    $row.find('.dt-custom-setting-options-menu').remove();
    $row.append(buildMenu($setting));
  }

  function selectValue($button) {
    var $row = $button.closest('.de-custom-field-row, .cd-custom-field-row');
    var $setting = $row
      .find('.de-custom-field-setting, .cd-custom-field-setting')
      .first();
    if (!$setting.length) return;

    $setting
      .val(String($button.attr('data-value') || ''))
      .trigger('input')
      .trigger('change');
    $row.find('.dt-custom-setting-options-menu').remove();
    $setting.trigger('focus');
  }

  function injectStyles() {
    if (document.getElementById('dt-custom-setting-options-style')) return;
    var css =
      '.dt-setting-options-host{position:relative!important;overflow:visible!important;}' +
      '.dt-custom-setting-options-menu{position:absolute;z-index:1210;right:0;top:calc(100% + 3px);width:420px;max-width:calc(100vw - 48px);max-height:320px;overflow:auto;padding:0;background:var(--bs-body-bg,#fff);color:var(--bs-body-color,#212529);border:1px solid var(--bs-border-color,#dee2e6);border-radius:.45rem;box-shadow:0 .5rem 1rem rgba(0,0,0,.2);pointer-events:none;}' +
      '.dt-custom-setting-options-header{position:sticky;top:0;z-index:2;display:flex;flex-direction:column;gap:2px;padding:9px 12px;background:var(--bs-body-bg,#fff);border-bottom:1px solid var(--bs-border-color,#dee2e6);pointer-events:none;}' +
      '.dt-custom-setting-options-header small{opacity:.72;font-size:.75rem;}' +
      '.dt-custom-setting-option{display:flex;width:100%;flex-direction:column;gap:2px;padding:8px 12px;text-align:left;color:inherit;background:var(--bs-body-bg,#fff);border:0;border-bottom:1px solid rgba(127,127,127,.12);pointer-events:auto;}' +
      '.dt-custom-setting-option:hover,.dt-custom-setting-option:focus{background:rgba(13,110,253,.12);outline:0;}' +
      '.dt-custom-setting-option.is-current{background:rgba(25,135,84,.10);}' +
      '.dt-custom-setting-option-main{display:flex;align-items:center;gap:8px;}' +
      '.dt-custom-setting-current{margin-left:auto;padding:1px 6px;border-radius:999px;font-size:.68rem;background:rgba(25,135,84,.18);}' +
      '.dt-custom-setting-option-description{font-size:.77rem;opacity:.78;white-space:normal;}' +
      '@media(max-width:767.98px){.dt-custom-setting-options-menu{left:0;right:auto;width:calc(100vw - 48px);max-height:280px;}}';
    $('<style id="dt-custom-setting-options-style"></style>')
      .text(css)
      .appendTo('head');
  }

  injectStyles();

  $(document).on(
    'focus.dtCustomSettingOptions click.dtCustomSettingOptions',
    '.de-custom-field-setting, .cd-custom-field-setting',
    function () {
      openMenu($(this));
    }
  );

  $(document).on(
    'click.dtCustomSettingOptions',
    '.dt-custom-setting-option',
    function (event) {
      event.preventDefault();
      event.stopPropagation();
      selectValue($(this));
    }
  );

  $(document).on('mousedown.dtCustomSettingOptions', function (event) {
    if (
      $(event.target).closest(
        '.dt-custom-setting-options-menu, .de-custom-field-setting, .cd-custom-field-setting'
      ).length
    )
      return;
    removeMenus();
  });

  $(document).on('hidden.bs.modal.dtCustomSettingOptions', function () {
    removeMenus();
  });

  window.DashticzCustomFieldSettingOptions = {
    options: OPTIONS,
    find: optionsForField,
  };
})();
