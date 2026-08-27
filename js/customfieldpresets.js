/* global $, config, language */
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
      en: 'Hide the configured image when the device Data/sValue is empty.',
      nl: 'Verberg de ingestelde afbeelding wanneer Data/sValue van het device leeg is.',
    },
    {
      field: 'iconOn',
      category: 'visual',
      type: 'string',
      defaultValue: 'device default',
      example: 'fas fa-toggle-on',
      en: 'Font Awesome icon to use when the device is On.',
      nl: 'Font Awesome-icoon dat wordt gebruikt wanneer het device Aan is.',
    },
    {
      field: 'iconOff',
      category: 'visual',
      type: 'string',
      defaultValue: 'device default',
      example: 'fas fa-toggle-off',
      en: 'Font Awesome icon to use when the device is Off.',
      nl: 'Font Awesome-icoon dat wordt gebruikt wanneer het device Uit is.',
    },
    {
      field: 'imageOn',
      category: 'visual',
      type: 'string',
      defaultValue: 'image/default',
      example: 'bulb_on.png',
      en: 'Image from the img/ folder to use when the device is On.',
      nl: 'Afbeelding uit de map img/ die wordt gebruikt wanneer het device Aan is.',
    },
    {
      field: 'imageOff',
      category: 'visual',
      type: 'string',
      defaultValue: 'image/default',
      example: 'bulb_off.png',
      en: 'Image from the img/ folder to use when the device is Off.',
      nl: 'Afbeelding uit de map img/ die wordt gebruikt wanneer het device Uit is.',
    },
    {
      field: 'addClass',
      category: 'visual',
      type: 'string',
      defaultValue: 'none',
      example: 'myclassname',
      en: 'Add a custom CSS class to the block.',
      nl: 'Voeg een eigen CSS-class toe aan het block.',
    },
    {
      field: 'textOn',
      category: 'data',
      type: 'string',
      defaultValue: 'device value',
      example: 'On',
      nlExample: 'Aan',
      en: 'Text shown when the device is On.',
      nl: 'Tekst die wordt getoond wanneer het device Aan is.',
    },
    {
      field: 'textOff',
      category: 'data',
      type: 'string',
      defaultValue: 'device value',
      example: 'Off',
      nlExample: 'Uit',
      en: 'Text shown when the device is Off.',
      nl: 'Tekst die wordt getoond wanneer het device Uit is.',
    },
    {
      field: 'unit',
      category: 'data',
      type: 'string',
      defaultValue: 'device unit',
      example: 'kW',
      en: 'Text placed behind the displayed device value.',
      nl: 'Tekst die achter de weergegeven devicewaarde wordt geplaatst.',
    },
    {
      field: 'decimals',
      category: 'data',
      type: 'number',
      defaultValue: 'device default',
      example: '1',
      en: 'Number of decimals used for the displayed value.',
      nl: 'Aantal decimalen voor de weergegeven waarde.',
    },
    {
      field: 'scale',
      category: 'data',
      type: 'number',
      defaultValue: '1',
      example: '0.001',
      en: 'Multiplier applied to the device value before display.',
      nl: 'Vermenigvuldigingsfactor die vóór weergave op de devicewaarde wordt toegepast.',
    },
    {
      field: 'values',
      category: 'data',
      type: 'array',
      defaultValue: 'none',
      example: '[{"value":"<Data>"}]',
      en: 'Define which device/subdevice values are shown. Enter valid JSON.',
      nl: 'Bepaal welke device/subdevicewaarden worden getoond. Gebruik geldige JSON.',
    },
    {
      field: 'multi_line',
      category: 'data',
      type: 'boolean',
      defaultValue: 'false',
      example: 'true',
      en: 'Show multiple subvalues on separate lines.',
      nl: 'Toon meerdere subwaarden op afzonderlijke regels.',
    },
    {
      field: 'single_line',
      category: 'data',
      type: 'boolean',
      defaultValue: 'false',
      example: 'true',
      en: 'Show multiple subvalues on one line.',
      nl: 'Toon meerdere subwaarden op één regel.',
    },
    {
      field: 'showsubtitles',
      category: 'data',
      type: 'number',
      defaultValue: '0',
      example: '1',
      en: 'Show subvalue subtitles. Supported variants are 1 and 2.',
      nl: 'Toon subtitels van subwaarden. Ondersteunde varianten zijn 1 en 2.',
    },
    {
      field: 'showvalues',
      category: 'data',
      type: 'array',
      defaultValue: 'all',
      example: '[1,2]',
      en: 'Array of subvalue numbers to display. Enter valid JSON.',
      nl: 'Array met nummers van subwaarden die getoond worden. Gebruik geldige JSON.',
    },
    {
      field: 'sortOrder',
      category: 'data',
      type: 'number',
      defaultValue: '0',
      example: '1',
      en: 'Selector sorting: 0 none, 1 ascending, -1 descending.',
      nl: 'Sortering van selectors: 0 geen, 1 oplopend, -1 aflopend.',
    },
    {
      field: 'batteryThreshold',
      category: 'data',
      type: 'number',
      defaultValue: 'global setting',
      example: '15',
      en: 'Show the battery warning below this percentage.',
      nl: 'Toon de batterijwaarschuwing onder dit percentage.',
    },
    {
      field: 'flash',
      category: 'behaviour',
      type: 'number',
      defaultValue: '0',
      example: '500',
      en: 'Flash the block after a value change for this many milliseconds.',
      nl: 'Laat het block na een waardewijziging dit aantal milliseconden knipperen.',
    },
    {
      field: 'hide_stop',
      category: 'behaviour',
      type: 'boolean',
      defaultValue: 'false',
      example: 'true',
      en: 'Hide the Stop button for supported devices such as blinds.',
      nl: 'Verberg de Stop-knop voor ondersteunde devices, zoals zonwering.',
    },
    {
      field: 'protected',
      category: 'behaviour',
      type: 'boolean',
      defaultValue: 'false',
      example: 'true',
      en: 'Prevent manual switching from Dashticz.',
      nl: 'Voorkom handmatig schakelen vanuit Dashticz.',
    },
    {
      field: 'confirmation',
      category: 'behaviour',
      type: 'number',
      defaultValue: '0',
      example: '1',
      en: 'Ask for confirmation before changing a switch device.',
      nl: 'Vraag om bevestiging voordat een schakeldevice wordt gewijzigd.',
    },
    {
      field: 'password',
      category: 'behaviour',
      type: 'string',
      defaultValue: 'none',
      example: 'secret',
      en: 'Password-protect supported switch actions.',
      nl: 'Beveilig ondersteunde schakelacties met een wachtwoord.',
    },
    {
      field: 'playsound',
      category: 'actions',
      type: 'string',
      defaultValue: 'none',
      example: 'sounds/ping.mp3',
      en: 'Play a sound when the device changes.',
      nl: 'Speel een geluid af wanneer het device verandert.',
    },
    {
      field: 'playsoundOn',
      category: 'actions',
      type: 'string',
      defaultValue: 'none',
      example: 'sounds/ping.mp3',
      en: 'Play a sound when the device changes to On.',
      nl: 'Speel een geluid af wanneer het device naar Aan verandert.',
    },
    {
      field: 'playsoundOff',
      category: 'actions',
      type: 'string',
      defaultValue: 'none',
      example: 'sounds/ping.mp3',
      en: 'Play a sound when the device changes to Off.',
      nl: 'Speel een geluid af wanneer het device naar Uit verandert.',
    },
    {
      field: 'speak',
      category: 'actions',
      type: 'string',
      defaultValue: 'none',
      example: 'Device status has changed',
      nlExample: 'Device status is gewijzigd',
      en: 'Speak text when the device changes.',
      nl: 'Spreek tekst uit wanneer het device verandert.',
    },
    {
      field: 'speakOn',
      category: 'actions',
      type: 'string',
      defaultValue: 'none',
      example: 'Device is on',
      nlExample: 'Device is aan',
      en: 'Speak text when the device changes to On.',
      nl: 'Spreek tekst uit wanneer het device naar Aan verandert.',
    },
    {
      field: 'speakOff',
      category: 'actions',
      type: 'string',
      defaultValue: 'none',
      example: 'Device is off',
      nlExample: 'Device is uit',
      en: 'Speak text when the device changes to Off.',
      nl: 'Spreek tekst uit wanneer het device naar Uit verandert.',
    },
    {
      field: 'gotoslide',
      category: 'actions',
      type: 'number',
      defaultValue: 'none',
      example: '2',
      en: 'Go to this screen when the device changes.',
      nl: 'Ga naar dit scherm wanneer het device verandert.',
    },
    {
      field: 'gotoslideOn',
      category: 'actions',
      type: 'number',
      defaultValue: 'none',
      example: '2',
      en: 'Go to this screen when the device changes to On.',
      nl: 'Ga naar dit scherm wanneer het device naar Aan verandert.',
    },
    {
      field: 'gotoslideOff',
      category: 'actions',
      type: 'number',
      defaultValue: 'none',
      example: '2',
      en: 'Go to this screen when the device changes to Off.',
      nl: 'Ga naar dit scherm wanneer het device naar Uit verandert.',
    },
    {
      field: 'openpopup',
      category: 'actions',
      type: 'string',
      defaultValue: 'none',
      example: 'popup_name',
      en: 'Open a configured popup when the device changes.',
      nl: 'Open een ingestelde popup wanneer het device verandert.',
    },
    {
      field: 'openpopupOn',
      category: 'actions',
      type: 'string',
      defaultValue: 'none',
      example: 'popup_name',
      en: 'Open a configured popup when the device changes to On.',
      nl: 'Open een ingestelde popup wanneer het device naar Aan verandert.',
    },
    {
      field: 'openpopupOff',
      category: 'actions',
      type: 'string',
      defaultValue: 'none',
      example: 'popup_name',
      en: 'Open a configured popup when the device changes to Off.',
      nl: 'Open een ingestelde popup wanneer het device naar Uit verandert.',
    },
    {
      field: 'popup',
      category: 'navigation',
      type: 'string',
      defaultValue: 'automatic',
      example: 'popup_graph',
      en: 'Use a configured popup definition for this block.',
      nl: 'Gebruik een ingestelde popupdefinitie voor dit block.',
    },
    {
      field: 'graph',
      category: 'navigation',
      type: 'boolean',
      defaultValue: 'device default',
      example: 'false',
      en: 'Enable or disable the click graph for supported devices.',
      nl: 'Schakel de klikgrafiek voor ondersteunde devices in of uit.',
    },
    {
      field: 'url',
      category: 'navigation',
      type: 'string',
      defaultValue: 'none',
      example: 'https://example.com',
      en: 'URL opened when a supported block is clicked.',
      nl: 'URL die wordt geopend wanneer op een ondersteund block wordt geklikt.',
    },
    {
      field: 'newwindow',
      category: 'navigation',
      type: 'number',
      defaultValue: '2',
      example: '2',
      en: 'URL click mode: 0 same window, 1 tab, 2 frame, 3 GET, 4 POST, 5 window.',
      nl: 'URL-klikmodus: 0 zelfde venster, 1 tab, 2 frame, 3 GET, 4 POST, 5 venster.',
    },
    {
      field: 'backgroundimage',
      category: 'background',
      type: 'string / idx',
      defaultValue: 'none',
      example: 'https://example.com/image.jpg',
      en: 'Background image URL or Domoticz text-device idx containing the URL.',
      nl: 'URL van de achtergrondafbeelding of IDX van een Domoticz text-device met de URL.',
    },
    {
      field: 'backgroundsize',
      category: 'background',
      type: 'string',
      defaultValue: 'cover',
      example: 'contain',
      en: 'Background sizing, for example cover, contain or 80%.',
      nl: 'Formaat van de achtergrond, bijvoorbeeld cover, contain of 80%.',
    },
    {
      field: 'backgroundopacity',
      category: 'background',
      type: 'number / string',
      defaultValue: '1',
      example: '0.5',
      en: 'Opacity of the configured background image.',
      nl: 'Dekking van de ingestelde achtergrondafbeelding.',
    },
    {
      field: 'colorpicker',
      category: 'advanced',
      type: 'number',
      defaultValue: '0',
      example: '2',
      en: 'RGB colorpicker mode: 0 disabled, 1 old style, 2 new style.',
      nl: 'RGB-kleurkiezer: 0 uit, 1 oude stijl, 2 nieuwe stijl.',
    },
    {
      field: 'colorpickerscale',
      category: 'advanced',
      type: 'number',
      defaultValue: '1',
      example: '1.5',
      en: 'Relative scale of colorpicker mode 2.',
      nl: 'Relatieve schaal van kleurkiezer type 2.',
    },
    {
      field: 'mode',
      category: 'advanced',
      type: 'number / string',
      defaultValue: 'device default',
      example: '1',
      en: 'Device-specific mode; only use when the relevant block documentation requires it.',
      nl: 'Device-specifieke modus; alleen gebruiken wanneer de betreffende blockdocumentatie dit vereist.',
    },
    {
      field: 'switchMode',
      category: 'advanced',
      type: 'string',
      defaultValue: 'switch',
      example: 'color',
      en: 'For supported RGB devices, open the colorpicker instead of toggling On/Off.',
      nl: 'Open bij ondersteunde RGB-devices de kleurkiezer in plaats van Aan/Uit te schakelen.',
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

  var TEXT = {
    en: {
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
    },
    nl: {
      title: 'Beschikbare extra velden',
      hint: 'Typ om te filteren. Je kunt ook nog steeds zelf een veld invoeren.',
      noResults:
        'Geen passende preset. Het getypte veld kan nog steeds handmatig worden gebruikt.',
      alreadyUsed: 'Al toegevoegd',
      type: 'Type',
      defaultValue: 'Standaard',
      example: 'Voorbeeld',
      categories: {
        visual: 'Afbeelding / icoon',
        data: 'Data / weergave',
        behaviour: 'Gedrag',
        actions: 'Acties bij wijziging',
        navigation: 'Popup / navigatie',
        background: 'Achtergrond',
        advanced: 'Geavanceerd',
      },
    },
  };

  function currentLanguage() {
    var configured =
      typeof config !== 'undefined' && config && config.language
        ? String(config.language)
        : '';
    if (/^nl(?:_|-|$)/i.test(configured)) return 'nl';

    if (
      typeof language !== 'undefined' &&
      language &&
      language.settings &&
      language.settings.deviceeditor &&
      /^(Veld|Instelling|Apparaat|Weergave)/i.test(
        String(language.settings.deviceeditor.field || '') +
          String(language.settings.deviceeditor.setting || '') +
          String(language.settings.deviceeditor.device_config || '')
      )
    )
      return 'nl';

    return 'en';
  }

  function labels() {
    return TEXT[currentLanguage()] || TEXT.en;
  }

  function presetDescription(preset) {
    return currentLanguage() === 'nl' ? preset.nl : preset.en;
  }

  function presetExample(preset) {
    if (currentLanguage() === 'nl' && preset.nlExample) return preset.nlExample;
    return preset.example;
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
    return (
      $input.hasClass('de-custom-field-name') ||
      $input.hasClass('cd-custom-field-name')
    );
  }

  function rowForInput($input) {
    return $input.closest('.de-custom-field-row, .cd-custom-field-row');
  }

  function settingForInput($input) {
    var $row = rowForInput($input);
    return $row
      .find('.de-custom-field-setting, .cd-custom-field-setting')
      .first();
  }

  function usedFields($input) {
    var used = {};
    $('.de-custom-field-name, .cd-custom-field-name').each(function () {
      if (this === $input[0]) return;
      var value = normalise($(this).val());
      if (value) used[value] = true;
    });
    return used;
  }

  function findPreset(field) {
    var wanted = normalise(field);
    var found = null;
    PRESETS.some(function (preset) {
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

    var t = labels();
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
    var t = labels();
    var query = normalise($input.val());
    var used = usedFields($input);
    var current = normalise($input.val());
    var html =
      '<div class="dt-custom-field-preset-menu" role="listbox">' +
      '<div class="dt-custom-field-preset-menu-header"><strong>' +
      escapeHtml(t.title) +
      '</strong><small>' +
      escapeHtml(t.hint) +
      '</small></div>';
    var count = 0;

    CATEGORY_ORDER.forEach(function (category) {
      var items = PRESETS.filter(function (preset) {
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
    renderInfo($input, findPreset($input.val()));
  }

  function selectPreset($button) {
    var $row = $button.closest('.de-custom-field-row, .cd-custom-field-row');
    var $input = $row
      .find('.de-custom-field-name, .cd-custom-field-name')
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

  $(document).on(
    'focus.dtCustomFieldPresets click.dtCustomFieldPresets',
    '.de-custom-field-name:not([readonly]), .cd-custom-field-name:not([readonly])',
    function () {
      openMenu($(this));
    }
  );

  $(document).on(
    'input.dtCustomFieldPresets',
    '.de-custom-field-name:not([readonly]), .cd-custom-field-name:not([readonly])',
    function () {
      var $input = $(this);
      openMenu($input);
      renderInfo($input, findPreset($input.val()));
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
        '.dt-custom-field-preset-menu, .de-custom-field-name, .cd-custom-field-name'
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
  };
})();
