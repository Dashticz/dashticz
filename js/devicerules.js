/* global $, blocks, Dashticz, settings, _PARAMS, Domoticz */

// Device Rules / Automation for Dashticz.
//
// Rules are intentionally stored outside CONFIG.js. The Device Config editor
// writes a managed data block to custom/custom.js and writes generated visual
// classes to custom/custom.css (or the active custom*.css file). Hand-written
// content in those files is preserved by savedevicerules.php.
//
// Schema v2 groups one trigger with two independent actions:
//   1. CSS styling for the device whose Device Config popup is open.
//   2. Text for another configured Dashticz device block selected from a dropdown.
//
// The normaliser still accepts the previous flat action/target/className and
// action/target/textOn/textOff records, so existing automation keeps working.
(function (window, document) {
  'use strict';

  var WRAP_RETRY_MS = 250;
  var SAVE_URL = 'js/savedevicerules.php';
  var RULE_STORE_NAME = 'DashticzDeviceRulesConfig';
  var wrapped = false;
  var wrapTimer = null;
  var popupObserver = null;
  var editorApiWrapped = false;
  var editorApiTimer = null;
  var pendingPopupSource = '';

  // Runtime state is kept per target. A rule only removes the class/text that
  // it owns; existing addClass/title values from CONFIG.js remain untouched.
  var classStates = {};
  var classBaseValues = {};
  var classManagedNames = {};
  var textStates = {};
  var textBaseValues = {};
  var sourceStateIds = {};
  var runtimeStyleNodes = {};
  var stateOrder = 0;

  var propertySuggestions = [
    'Status',
    'Data',
    'Level',
    'LevelInt',
    'nValue',
    'sValue',
    'BatteryLevel',
    'SignalLevel',
    'Temperature',
    'Humidity',
    'SetPoint',
    'Usage',
    'Counter',
    'LastUpdate',
    'SwitchType',
    'Type',
    'SubType',
  ];

  var operators = [
    ['eq', 'equals'],
    ['ne', 'not equals'],
    ['lt', 'less than'],
    ['lte', 'less than or equal'],
    ['gt', 'greater than'],
    ['gte', 'greater than or equal'],
    ['contains', 'contains'],
    ['notcontains', 'does not contain'],
    ['empty', 'is empty'],
    ['notempty', 'is not empty'],
  ];

  var styleModes = [
    ['existing', 'Existing CSS / class only'],
    ['background', 'Background'],
    ['border', 'Border'],
    ['text', 'Text color'],
    ['background-border', 'Background + border'],
    ['background-text', 'Background + text'],
    ['background-border-text', 'Background + border + text'],
    ['banner', 'Floating banner'],
  ];

  var borderStyles = ['solid', 'dashed', 'dotted', 'double'];

  var nl = {
    automation: 'Automation',
    help: 'Beoordeel één trigger en voer daarna de ingeschakelde acties uit. CSS wordt toegepast op dit device; de tekstactie gebruikt een geselecteerd doeldevice.',
    enabled: 'Aan',
    trigger: 'Trigger',
    actions: 'Acties',
    property: 'Status / eigenschap',
    condition: 'Voorwaarde',
    value: 'Waarde',
    cssAction: 'Add CSS aan huidig device',
    cssActionHelp:
      'De gegenereerde class wordt automatisch toegevoegd aan en verwijderd van het device waarvan dit configuratiemenu geopend is.',
    currentDevice: 'Huidig device',
    textAction: 'Tekst in ander device plaatsen',
    textTarget: 'Doeldevice voor tekstactie',
    targetHelp:
      'De pulldown toont beschikbare geconfigureerde devices met naam, IDX en block-key. Text-devices worden bovenaan getoond.',
    textOn: 'Tekst indien waar',
    textOff: 'Tekst indien onwaar',
    cssClass: 'CSS-class',
    styling: 'Styling',
    existingCss: 'Bestaande CSS / alleen class',
    background: 'Achtergrond',
    border: 'Rand',
    textColor: 'Tekstkleur',
    backgroundColor: 'Achtergrondkleur',
    opacity: 'Dekking',
    borderWidth: 'Randdikte',
    borderStyle: 'Randstijl',
    borderColor: 'Randkleur',
    bannerText: 'Bannertekst',
    bannerTop: 'Afstand vanaf boven (px)',
    fontSize: 'Lettergrootte (px)',
    legacyTarget: 'Bestaand CSS-doel (compatibiliteit)',
    legacyTargetHelp:
      'Deze oudere regel wijst naar een ander block. Laat dit ongewijzigd om het bestaande gedrag te behouden, of kies Dit device.',
    selfTarget: 'Dit device',
    advancedCss: 'Geavanceerde CSS-opties',
    remove: 'Verwijderen',
    addRule: 'Automation toevoegen',
    noRules: 'Nog geen automations ingesteld.',
    advanced: 'Geavanceerd',
    handler: 'Custom JS handler',
    handlerHelp:
      'Optioneel: koppel dit device aan getStatus_<naam>(block, afterupdate) in custom.js.',
    invalidTrigger:
      'Automation: vul Status/eigenschap, Voorwaarde en Waarde van de trigger in.',
    invalidActions: 'Automation: schakel minimaal één actie in.',
    invalidTextRule: 'Automation: selecteer een doeldevice voor de tekstactie.',
    invalidTextValue: 'Automation: vul tekst in voor waar en/of onwaar.',
    invalidBannerText:
      'Automation: vul een bannertekst in en gebruik geen aanhalingstekens of backslashes.',
    invalidClass:
      'Automation: gebruik een geldige CSS-class (letters, cijfers, _ en -).',
    invalidHandler:
      'Automation: Custom JS handler mag alleen letters, cijfers, _ en $ bevatten en mag niet met een cijfer beginnen.',
    cssSaving: 'Automation opslaan in custom.js / custom.css...',
    cssSaveFailed:
      'Automation: custom.js / custom.css kon niet worden bijgewerkt.',
    source: 'Bronblock',
    textDevices: 'Text-devices',
    otherBlocks: 'Overige beschikbare devices',
    unavailableTarget: 'Niet meer beschikbaar',
  };

  var en = {
    automation: 'Automation',
    help: 'Evaluate one trigger and then run the enabled actions. CSS targets this device; the text action uses a selected target device.',
    enabled: 'On',
    trigger: 'Trigger',
    actions: 'Actions',
    property: 'Status / property',
    condition: 'Condition',
    value: 'Value',
    cssAction: 'Add CSS to current device',
    cssActionHelp:
      'The generated class is automatically added to and removed from the device whose configuration popup is open.',
    currentDevice: 'Current device',
    textAction: 'Put text in another device',
    textTarget: 'Text action target device',
    targetHelp:
      'The dropdown lists available configured devices by name, IDX and block key. Text devices are listed first.',
    textOn: 'Text when true',
    textOff: 'Text when false',
    cssClass: 'CSS class',
    styling: 'Styling',
    existingCss: 'Existing CSS / class only',
    background: 'Background',
    border: 'Border',
    textColor: 'Text color',
    backgroundColor: 'Background color',
    opacity: 'Opacity',
    borderWidth: 'Border width',
    borderStyle: 'Border style',
    borderColor: 'Border color',
    bannerText: 'Banner text',
    bannerTop: 'Distance from top (px)',
    fontSize: 'Font size (px)',
    legacyTarget: 'Existing CSS target (compatibility)',
    legacyTargetHelp:
      'This older rule points to another block. Keep it unchanged to preserve the old behavior, or select This device.',
    selfTarget: 'This device',
    advancedCss: 'Advanced CSS options',
    remove: 'Remove',
    addRule: 'Add automation',
    noRules: 'No automations configured yet.',
    advanced: 'Advanced',
    handler: 'Custom JS handler',
    handlerHelp:
      'Optional: link this device to getStatus_<name>(block, afterupdate) in custom.js.',
    invalidTrigger:
      'Automation: fill Status/property, Condition and Value for the trigger.',
    invalidActions: 'Automation: enable at least one action.',
    invalidTextRule: 'Automation: select a target device for the text action.',
    invalidTextValue:
      'Automation: enter text for the true and/or false result.',
    invalidBannerText:
      'Automation: enter banner text without quote or backslash characters.',
    invalidClass:
      'Automation: use a valid CSS class (letters, numbers, _ and -).',
    invalidHandler:
      'Automation: Custom JS handler may contain letters, numbers, _ and $ and may not start with a number.',
    cssSaving: 'Saving automation to custom.js / custom.css...',
    cssSaveFailed: 'Automation: custom.js / custom.css could not be updated.',
    source: 'Source block',
    textDevices: 'Text devices',
    otherBlocks: 'Other available devices',
    unavailableTarget: 'No longer available',
  };

  function text() {
    var lang = '';
    try {
      if (window.config && window.config.language)
        lang = window.config.language;
    } catch (ignore) {
      lang = '';
    }
    return /^nl/i.test(String(lang || '')) ? nl : en;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeJsonParse(value, fallback) {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string' || !value.trim()) return fallback;
    try {
      return JSON.parse(value);
    } catch (err) {
      return fallback;
    }
  }

  function clampNumber(value, minimum, maximum, fallback) {
    var number = Number(value);
    if (!isFinite(number)) return fallback;
    return Math.min(maximum, Math.max(minimum, number));
  }

  function validHexColor(value, fallback) {
    var color = String(value || '')
      .trim()
      .toLowerCase();
    return /^#[0-9a-f]{6}$/.test(color) ? color : fallback;
  }

  function shortHash(value) {
    var string = String(value == null ? '' : value);
    var hash = 2166136261;
    for (var i = 0; i < string.length; i += 1) {
      hash ^= string.charCodeAt(i);
      hash +=
        (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(36);
  }

  function createRuleId() {
    return (
      'rule_' +
      Date.now().toString(36) +
      '_' +
      Math.floor(Math.random() * 0x1000000).toString(36)
    );
  }

  function normaliseRuleId(value, index, rule) {
    var id = String(value || '').trim();
    if (/^[A-Za-z_][A-Za-z0-9_-]{0,79}$/.test(id)) return id;
    return 'legacy_' + index + '_' + shortHash(JSON.stringify(rule || {}));
  }

  function managedClassName(source, ruleId) {
    // Hash an ASCII-normalised form so the browser and PHP writer generate
    // exactly the same fallback class without requiring an async crypto API.
    var safeSource = String(source || '').replace(/[^A-Za-z0-9_-]/g, '_');
    var safeRuleId = String(ruleId || '').replace(/[^A-Za-z0-9_-]/g, '_');
    return 'dt-auto-' + shortHash(safeSource) + '-' + shortHash(safeRuleId);
  }

  function defaultStyle(mode) {
    return {
      mode: mode || 'background-border',
      backgroundColor: '#ff0000',
      backgroundOpacity: 0.35,
      borderWidth: 2,
      borderStyle: 'solid',
      borderColor: '#ff4040',
      textColor: '#ffffff',
      bannerText: '',
      bannerTop: 40,
      fontSize: 20,
    };
  }

  function safeBannerText(value) {
    var result = String(value == null ? '' : value);
    if (result.indexOf('"') !== -1 || result.indexOf('\\') !== -1) return '';
    return result.slice(0, 200);
  }

  function normaliseStyle(style, legacyRule) {
    // Old rules without a style object used hand-written custom.css. Preserve
    // those as class-only instead of generating replacement declarations.
    if (!style || typeof style !== 'object') {
      return defaultStyle(legacyRule ? 'existing' : 'background-border');
    }
    var mode = String(style.mode || 'existing');
    if (
      styleModes.every(function (entry) {
        return entry[0] !== mode;
      })
    ) {
      mode = 'existing';
    }
    var result = defaultStyle(mode);
    result.backgroundColor = validHexColor(
      style.backgroundColor,
      result.backgroundColor
    );
    result.backgroundOpacity = clampNumber(
      style.backgroundOpacity,
      0.05,
      1,
      result.backgroundOpacity
    );
    result.borderWidth = Math.round(
      clampNumber(style.borderWidth, 1, 8, result.borderWidth)
    );
    result.borderStyle =
      borderStyles.indexOf(String(style.borderStyle)) !== -1
        ? String(style.borderStyle)
        : result.borderStyle;
    result.borderColor = validHexColor(style.borderColor, result.borderColor);
    result.textColor = validHexColor(style.textColor, result.textColor);
    result.bannerText = safeBannerText(style.bannerText);
    result.bannerTop = Math.round(
      clampNumber(style.bannerTop, 0, 2000, result.bannerTop)
    );
    result.fontSize = Math.round(
      clampNumber(style.fontSize, 10, 60, result.fontSize)
    );
    return result;
  }

  function defaultRule(source) {
    var id = createRuleId();
    return {
      id: id,
      enabled: true,
      trigger: {
        property: 'Status',
        operator: 'eq',
        value: 'On',
      },
      actions: {
        css: {
          enabled: true,
          target: 'self',
          className: managedClassName(source, id),
          style: defaultStyle('background-border'),
        },
        text: {
          enabled: false,
          target: '',
          textOn: '',
          textOff: '',
        },
      },
    };
  }

  function normaliseRules(value, source) {
    var parsed = safeJsonParse(value, value);
    if (!Array.isArray(parsed)) return [];
    source = String(source || 'device');
    var seenRuleIds = {};

    return parsed
      .filter(function (rule) {
        return rule && typeof rule === 'object';
      })
      .map(function (rule, index) {
        var nested =
          (rule.trigger && typeof rule.trigger === 'object') ||
          (rule.actions && typeof rule.actions === 'object');
        var id = normaliseRuleId(rule.id, index, rule);
        if (seenRuleIds[id]) {
          id = id + '_' + index;
          while (seenRuleIds[id]) id += '_';
        }
        seenRuleIds[id] = true;
        var trigger = nested && rule.trigger ? rule.trigger : rule;
        var actionContainer = nested && rule.actions ? rule.actions : {};
        var cssSource =
          actionContainer.css && typeof actionContainer.css === 'object'
            ? actionContainer.css
            : rule.css && typeof rule.css === 'object'
              ? rule.css
              : {};
        var textSource =
          actionContainer.text && typeof actionContainer.text === 'object'
            ? actionContainer.text
            : rule.text && typeof rule.text === 'object'
              ? rule.text
              : {};

        var legacyAction = rule.action === 'text' ? 'text' : 'class';
        var cssEnabled = nested
          ? cssSource.enabled === true
          : legacyAction === 'class';
        var textEnabled = nested
          ? textSource.enabled === true
          : legacyAction === 'text';

        var cssTarget = String(
          typeof cssSource.target !== 'undefined'
            ? cssSource.target
            : !nested && legacyAction === 'class'
              ? rule.target || 'self'
              : 'self'
        ).trim();
        if (!cssTarget || cssTarget === source) cssTarget = 'self';

        var className = String(
          cssSource.className ||
            cssSource.class ||
            (!nested && legacyAction === 'class'
              ? rule.className || rule.class || ''
              : '')
        ).trim();
        if (cssEnabled && !className) {
          className = managedClassName(source, id);
        }

        var textTarget = String(
          typeof textSource.target !== 'undefined'
            ? textSource.target
            : !nested && legacyAction === 'text'
              ? rule.target || ''
              : ''
        ).trim();

        return {
          id: id,
          enabled: rule.enabled !== false,
          trigger: {
            property: String(trigger.property || 'Status'),
            operator: String(trigger.operator || 'eq'),
            value:
              typeof trigger.value === 'undefined' || trigger.value === null
                ? ''
                : String(trigger.value),
          },
          actions: {
            css: {
              enabled: cssEnabled,
              target: cssTarget,
              className: className,
              style: normaliseStyle(
                cssSource.style || (!nested ? rule.style : null),
                !nested && !rule.style
              ),
              legacyTarget: cssTarget !== 'self',
            },
            text: {
              enabled: textEnabled,
              target: textTarget,
              textOn: String(
                typeof textSource.textOn !== 'undefined'
                  ? textSource.textOn
                  : typeof rule.textOn !== 'undefined'
                    ? rule.textOn
                    : ''
              ),
              textOff: String(
                typeof textSource.textOff !== 'undefined'
                  ? textSource.textOff
                  : typeof rule.textOff !== 'undefined'
                    ? rule.textOff
                    : ''
              ),
            },
          },
        };
      });
  }

  function readPath(object, path) {
    if (!object || !path) return undefined;
    var parts = String(path).split('.');
    var current = object;
    for (var i = 0; i < parts.length; i += 1) {
      if (current == null) return undefined;
      current = current[parts[i]];
    }
    return current;
  }

  function isEmpty(value) {
    return value == null || String(value).trim() === '';
  }

  function numericValue(value) {
    if (typeof value === 'number') return isFinite(value) ? value : NaN;
    var parsed = parseFloat(
      String(value == null ? '' : value).replace(',', '.')
    );
    return isFinite(parsed) ? parsed : NaN;
  }

  function compare(actual, operator, expected) {
    switch (operator) {
      case 'empty':
        return isEmpty(actual);
      case 'notempty':
        return !isEmpty(actual);
      case 'lt':
        return numericValue(actual) < numericValue(expected);
      case 'lte':
        return numericValue(actual) <= numericValue(expected);
      case 'gt':
        return numericValue(actual) > numericValue(expected);
      case 'gte':
        return numericValue(actual) >= numericValue(expected);
      case 'contains':
        return (
          String(actual == null ? '' : actual).indexOf(String(expected)) !== -1
        );
      case 'notcontains':
        return (
          String(actual == null ? '' : actual).indexOf(String(expected)) === -1
        );
      case 'ne':
        return !compare(actual, 'eq', expected);
      case 'eq':
      default:
        if (
          /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(String(expected).trim())
        ) {
          var left = numericValue(actual);
          var right = numericValue(expected);
          if (!isNaN(left) && !isNaN(right)) return left === right;
        }
        return String(actual == null ? '' : actual) === String(expected);
    }
  }

  function splitClasses(value) {
    if (typeof value !== 'string') return [];
    return value
      .split(/\s+/)
      .map(function (item) {
        return item.trim();
      })
      .filter(Boolean);
  }

  function unique(items) {
    var seen = {};
    return items.filter(function (item) {
      if (!item || seen[item]) return false;
      seen[item] = true;
      return true;
    });
  }

  function configuredBlock(target) {
    return window.blocks && window.blocks[target]
      ? window.blocks[target]
      : null;
  }

  function collectRenderedTargets(target) {
    if (typeof $ !== 'function') return null;
    var $result = $();

    $('[data-id]').each(function () {
      if (String($(this).attr('data-id')) !== String(target)) return;
      var $node = $(this);
      if ($node.is('.dt_block,.mh')) $result = $result.add($node);
      $result = $result.add($node.find('.dt_block,.mh'));
    });
    $('.dt-grid-item[data-grid-block]').each(function () {
      if (String($(this).attr('data-grid-block')) !== String(target)) return;
      $result = $result.add($(this).find('.dt_block,.mh'));
    });
    return $result;
  }

  function applyClassStateToDom(target, allClasses, activeClasses) {
    var $targets = collectRenderedTargets(target);
    if (!$targets || !$targets.length) return;
    allClasses.forEach(function (className) {
      $targets.removeClass(className);
    });
    activeClasses.forEach(function (className) {
      $targets.addClass(className);
    });
  }

  function setBlockState(target, state) {
    if (window.Dashticz && typeof window.Dashticz.setBlock === 'function') {
      window.Dashticz.setBlock(target, state);
      return;
    }
    if (window.blocks && window.blocks[target]) {
      Object.keys(state || {}).forEach(function (key) {
        window.blocks[target][key] = state[key];
      });
    }
  }

  function recomputeClassTarget(target) {
    if (!target) return;
    var targetStates = classStates[target] || {};
    var allRuleClasses = Object.keys(classManagedNames[target] || {});
    var activeRuleClasses = [];

    Object.keys(targetStates).forEach(function (id) {
      var state = targetStates[id];
      if (!state || !state.className || !state.active) return;
      splitClasses(state.className).forEach(function (className) {
        activeRuleClasses.push(className);
      });
    });

    var base = splitClasses(classBaseValues[target] || '');
    var combined = unique(base.concat(activeRuleClasses));
    setBlockState(target, { addClass: combined.join(' ') });
    applyClassStateToDom(target, allRuleClasses, activeRuleClasses);

    // Device refreshes may replace the rendered .mh/.dt_block later in the
    // same JavaScript turn. Re-apply the managed classes once the current
    // render stack has completed so the visual state also survives blocks
    // that do not make the usual second getStatus() callback.
    if (typeof window.setTimeout === 'function') {
      window.setTimeout(function () {
        applyClassStateToDom(target, allRuleClasses, activeRuleClasses);
      }, 0);
    }

    if (!Object.keys(targetStates).length) {
      delete classStates[target];
      delete classBaseValues[target];
      delete classManagedNames[target];
    }
  }

  function setRuleClassState(target, id, className, active) {
    if (!target || !id || !className) return;
    if (!classStates[target]) {
      classStates[target] = {};
      var definition = configuredBlock(target);
      classBaseValues[target] =
        definition && typeof definition.addClass === 'string'
          ? definition.addClass
          : '';
      classManagedNames[target] = {};
    }
    splitClasses(className).forEach(function (name) {
      classManagedNames[target][name] = true;
    });
    classStates[target][id] = {
      className: className,
      active: !!active,
    };
    recomputeClassTarget(target);
  }

  function removeRuleClassState(target, id) {
    if (!target || !classStates[target] || !classStates[target][id]) return;
    delete classStates[target][id];
    recomputeClassTarget(target);
  }

  function captureTextBase(target) {
    if (Object.prototype.hasOwnProperty.call(textBaseValues, target)) return;
    var definition = configuredBlock(target);
    textBaseValues[target] = {
      hadOwn: !!(
        definition && Object.prototype.hasOwnProperty.call(definition, 'title')
      ),
      value: definition ? definition.title : undefined,
    };
  }

  function directTitleUpdate(target, value) {
    var $targets = collectRenderedTargets(target);
    if (!$targets || !$targets.length) return;
    $targets.each(function () {
      var $block = $(this);
      var $title = $block.find('.dt_title').first();
      if ($title.length) {
        $title.text(value == null ? '' : String(value));
      } else if (value !== '' && value != null) {
        var $content = $block.find('.dt_content').first();
        if ($content.length) {
          $('<div class="dt_title"></div>')
            .text(String(value))
            .prependTo($content);
        }
      }
    });
  }

  function setTargetTitle(target, value) {
    setBlockState(target, { title: value });
    directTitleUpdate(target, value);
  }

  function restoreTargetTitle(target) {
    var base = textBaseValues[target];
    var definition = configuredBlock(target);
    if (!base) return;

    if (base.hadOwn) {
      setTargetTitle(target, base.value);
    } else {
      if (definition) delete definition.title;
      if (window.Dashticz && typeof window.Dashticz.setBlock === 'function') {
        window.Dashticz.setBlock(target);
      }
      var fallback = friendlyBlockName(target);
      directTitleUpdate(target, fallback === target ? '' : fallback);
    }
    delete textBaseValues[target];
  }

  function recomputeTextTarget(target) {
    if (!target) return;
    var targetStates = textStates[target] || {};
    var states = Object.keys(targetStates)
      .map(function (id) {
        return targetStates[id];
      })
      .sort(function (left, right) {
        return left.order - right.order;
      });

    if (!states.length) {
      delete textStates[target];
      restoreTargetTitle(target);
      return;
    }

    var selected = null;
    states.forEach(function (state) {
      if (state.active) selected = state;
    });
    if (!selected) {
      states.forEach(function (state) {
        if (state.textOff !== '') selected = state;
      });
    }

    var value = selected
      ? selected.active
        ? selected.textOn
        : selected.textOff
      : '';
    setTargetTitle(target, value);
  }

  function setRuleTextState(target, id, textOn, textOff, active) {
    if (!target || !id) return;
    captureTextBase(target);
    if (!textStates[target]) textStates[target] = {};
    var previous = textStates[target][id];
    textStates[target][id] = {
      textOn: String(textOn == null ? '' : textOn),
      textOff: String(textOff == null ? '' : textOff),
      active: !!active,
      order: previous ? previous.order : ++stateOrder,
    };
    recomputeTextTarget(target);
  }

  function removeRuleTextState(target, id) {
    if (!target || !textStates[target] || !textStates[target][id]) return;
    delete textStates[target][id];
    recomputeTextTarget(target);
  }

  function cleanupSourceStates(sourceKey, currentEntries) {
    var previous = sourceStateIds[sourceKey] || [];
    previous.forEach(function (entry) {
      var stillCurrent = currentEntries.some(function (candidate) {
        return (
          candidate.id === entry.id &&
          candidate.target === entry.target &&
          candidate.action === entry.action
        );
      });
      if (stillCurrent) return;
      // The rule id remains stable when a user changes a target. Compare the
      // complete state identity so the old target is cleaned up instead of
      // retaining a stale class or title indefinitely.
      if (entry.action === 'text') removeRuleTextState(entry.target, entry.id);
      else removeRuleClassState(entry.target, entry.id);
    });
    sourceStateIds[sourceKey] = currentEntries;
  }

  function reapplyTargetVisuals(target) {
    if (classStates[target]) recomputeClassTarget(target);
    if (textStates[target]) recomputeTextTarget(target);
  }

  function ruleStore() {
    var store = window[RULE_STORE_NAME];
    return store && typeof store === 'object' ? store : {};
  }

  function stableDeviceReference(idx, subidx) {
    var base = parseInt(idx, 10);
    if (!(base > 0)) return '';
    var sub = parseInt(subidx, 10);
    return 'device_' + base + (sub > 0 ? '_' + sub : '');
  }

  function sourceCandidatesForBlock(block) {
    var candidates = [];
    function add(value) {
      if (value === null || typeof value === 'undefined') return;
      value = String(value).trim();
      if (value && candidates.indexOf(value) === -1) candidates.push(value);
    }
    add(block && block.key);
    add(block && block.id);
    if (block) {
      add(stableDeviceReference(block.idx, block.subidx));
      if (block.idx) {
        add(String(block.idx) + (block.subidx ? '_' + block.subidx : ''));
        add(block.idx);
      }
    }
    return candidates;
  }

  function entryForBlock(block) {
    var store = ruleStore();
    var candidates = sourceCandidatesForBlock(block);
    for (var i = 0; i < candidates.length; i += 1) {
      if (store[candidates[i]] && typeof store[candidates[i]] === 'object') {
        return { source: candidates[i], entry: store[candidates[i]] };
      }
    }
    return { source: candidates[0] || 'device', entry: null };
  }

  function process(block, resolved) {
    if (!block || !block.device) return;
    resolved = resolved || entryForBlock(block);
    var sourceKey = String(
      resolved.source || block.key || block.idx || 'device'
    );
    // `sourceKey` identifies the managed custom.js entry. A legacy entry may
    // still be stored under a numeric IDX, while the rendered block itself has
    // a named key. CSS target `self` must always refer to the actual rendered
    // block, not necessarily the key used to look up the stored automation.
    var selfTarget = String(block.key || sourceKey || block.idx || 'device');
    var rules = normaliseRules(
      resolved.entry && resolved.entry.rules,
      sourceKey
    );

    // Keep a runtime copy of the normalized generated CSS. Besides making a
    // newly saved rule visible immediately, this upgrades managed CSS written
    // by an older Device Rules version without requiring the user to open and
    // save every automation again first.
    updateRuntimeRuleCss(sourceKey, rules);

    var currentEntries = [];

    rules.forEach(function (rule) {
      if (rule.enabled === false || !rule.trigger.property) return;
      var actual = readPath(block.device, rule.trigger.property);
      var active = compare(actual, rule.trigger.operator, rule.trigger.value);

      var cssAction = rule.actions.css;
      if (cssAction.enabled && cssAction.className) {
        var cssTarget =
          cssAction.target === 'self' || !cssAction.target
            ? selfTarget
            : cssAction.target;
        var cssId = sourceKey + '|' + rule.id + '|css';
        currentEntries.push({
          id: cssId,
          target: cssTarget,
          action: 'class',
        });
        setRuleClassState(cssTarget, cssId, cssAction.className, active);
      }

      var textAction = rule.actions.text;
      if (textAction.enabled && textAction.target) {
        var textId = sourceKey + '|' + rule.id + '|text';
        currentEntries.push({
          id: textId,
          target: textAction.target,
          action: 'text',
        });
        setRuleTextState(
          textAction.target,
          textId,
          textAction.textOn,
          textAction.textOff,
          active
        );
      }
    });

    cleanupSourceStates(sourceKey, currentEntries);

    // A Domoticz device refresh continues rendering with the current runtime
    // block object after getStatus has returned. Keep that object in sync with
    // the configured source block, otherwise the later render step could put
    // the pre-automation class list back before the final DOM re-apply.
    var sourceDefinition = configuredBlock(selfTarget);
    if (sourceDefinition) {
      block.addClass = String(sourceDefinition.addClass || '');
    }
  }

  function callLinkedCustomHandler(block, afterupdate, resolved) {
    if (!block) return;
    resolved = resolved || entryForBlock(block);
    var handler = String(
      resolved.entry && resolved.entry.customJsHandler
        ? resolved.entry.customJsHandler
        : ''
    ).trim();
    if (
      !handler ||
      !/^(?:getStatus_)?[A-Za-z_$][A-Za-z0-9_$]*$/.test(handler)
    ) {
      return;
    }

    var functionName = /^getStatus_/.test(handler)
      ? handler
      : 'getStatus_' + handler;
    var defaultName = 'getStatus_' + String(block.key || '');
    if (functionName === defaultName) return;

    var fn = window[functionName];
    if (typeof fn !== 'function') {
      if (!block._dashticzMissingRuleHandlerLogged) {
        try {
          Object.defineProperty(block, '_dashticzMissingRuleHandlerLogged', {
            value: true,
            writable: true,
            configurable: true,
            enumerable: false,
          });
        } catch (ignore) {
          block._dashticzMissingRuleHandlerLogged = true;
        }
        console.warn(
          'Dashticz Device Rules: custom handler ' +
            functionName +
            ' was not found in custom.js.'
        );
      }
      return;
    }

    try {
      fn(block, afterupdate);
    } catch (err) {
      console.error(
        'Dashticz Device Rules: error calling ' + functionName,
        err
      );
    }
  }

  function tryWrapGetCustomFunction() {
    if (wrapped) return true;
    var original = window.getCustomFunction;
    if (typeof original !== 'function') return false;
    if (original._dashticzDeviceRulesWrapped) {
      wrapped = true;
      return true;
    }

    function wrappedGetCustomFunction(functionname, block, afterupdate) {
      var result = original.apply(this, arguments);
      if (functionname === 'getStatus') {
        var resolved = entryForBlock(block);
        callLinkedCustomHandler(block, afterupdate, resolved);
        process(block, resolved);
        sourceCandidatesForBlock(block).forEach(reapplyTargetVisuals);
      }
      return result;
    }

    wrappedGetCustomFunction._dashticzDeviceRulesWrapped = true;
    wrappedGetCustomFunction._dashticzDeviceRulesOriginal = original;
    window.getCustomFunction = wrappedGetCustomFunction;
    wrapped = true;
    if (wrapTimer) {
      window.clearInterval(wrapTimer);
      wrapTimer = null;
    }
    return true;
  }

  function definitionCompositeKey(definition) {
    if (!definition || typeof definition !== 'object') return '';
    var rawIdx = definition.idx;
    if (typeof rawIdx === 'string' && /^\d+_\d+$/.test(rawIdx)) return rawIdx;
    var idx = parseInt(rawIdx, 10);
    if (!(idx > 0)) return '';
    var subidx = parseInt(definition.subidx, 10);
    return String(idx) + (subidx > 0 ? '_' + subidx : '');
  }

  function sourceFromReference(reference) {
    if (typeof reference === 'string' || typeof reference === 'number') {
      var direct = String(reference).trim();
      if (direct) return direct;
    }
    if (reference && typeof reference === 'object') {
      if (reference.key) return String(reference.key);
      if (window.blocks && typeof window.blocks === 'object') {
        var keys = Object.keys(window.blocks);
        for (var i = 0; i < keys.length; i += 1) {
          if (window.blocks[keys[i]] === reference) return keys[i];
        }
      }
      var composite = definitionCompositeKey(reference);
      if (composite) {
        var parts = composite.split('_');
        return stableDeviceReference(parts[0], parts[1] || 0);
      }
    }
    return '';
  }

  function visibleBlockReferences() {
    var refs = [];
    function add(value) {
      value = String(value || '').trim();
      if (!value || refs.indexOf(value) !== -1) return;
      if (window.blocks && window.blocks[value]) refs.push(value);
    }
    $('.dt-grid-item[data-grid-block]:visible').each(function () {
      add($(this).attr('data-grid-block'));
    });
    $('[data-id]:visible').each(function () {
      add($(this).attr('data-id'));
    });
    return refs;
  }

  function sourceFromOrderKey(orderKey) {
    orderKey = String(orderKey || '');
    if (orderKey.indexOf('special:') === 0) return orderKey.slice(8);
    if (orderKey.indexOf('device:') !== 0) return '';
    var composite = orderKey.slice(7);
    var refs = visibleBlockReferences();
    for (var i = 0; i < refs.length; i += 1) {
      if (definitionCompositeKey(window.blocks[refs[i]]) === composite) {
        return refs[i];
      }
    }
    if (window.blocks && typeof window.blocks === 'object') {
      var keys = Object.keys(window.blocks);
      for (var j = 0; j < keys.length; j += 1) {
        if (definitionCompositeKey(window.blocks[keys[j]]) === composite) {
          return keys[j];
        }
      }
    }
    var parts = composite.split('_');
    return stableDeviceReference(parts[0], parts[1] || 0) || composite;
  }

  function rememberPopupSource(source) {
    source = String(source || '').trim();
    if (source) pendingPopupSource = source;
  }

  function captureConfigButtonSource(event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var button = target.closest('.de-config-btn[data-order-key]');
    if (!button) return;
    rememberPopupSource(
      sourceFromOrderKey(button.getAttribute('data-order-key'))
    );
  }

  function tryWrapDeviceEditorApi() {
    if (editorApiWrapped) return true;
    var editor = window.DashticzDeviceEditor;
    if (!editor || typeof editor !== 'object') return false;
    ['openConfig', 'openLayoutConfig'].forEach(function (method) {
      var original = editor[method];
      if (
        typeof original !== 'function' ||
        original._dashticzDeviceRulesWrapped
      ) {
        return;
      }
      var wrappedMethod = function (reference) {
        rememberPopupSource(sourceFromReference(reference));
        return original.apply(this, arguments);
      };
      wrappedMethod._dashticzDeviceRulesWrapped = true;
      wrappedMethod._dashticzDeviceRulesOriginal = original;
      editor[method] = wrappedMethod;
    });
    editorApiWrapped = true;
    if (editorApiTimer) {
      window.clearInterval(editorApiTimer);
      editorApiTimer = null;
    }
    return true;
  }

  function sourceForCompositeKey(composite) {
    composite = String(composite || '').trim();
    if (!composite) return '';
    var refs = visibleBlockReferences();
    for (var i = 0; i < refs.length; i += 1) {
      if (definitionCompositeKey(window.blocks[refs[i]]) === composite) {
        return refs[i];
      }
    }
    if (window.blocks && typeof window.blocks === 'object') {
      var keys = Object.keys(window.blocks);
      for (var j = 0; j < keys.length; j += 1) {
        if (definitionCompositeKey(window.blocks[keys[j]]) === composite) {
          return keys[j];
        }
      }
    }
    var parts = composite.split('_');
    return stableDeviceReference(parts[0], parts[1] || 0) || composite;
  }

  function inferPopupSource(popup) {
    if (!popup) return '';
    var orderKey = String(
      popup.getAttribute('data-order-key') ||
        $(popup).find('[data-order-key]').first().attr('data-order-key') ||
        ''
    ).trim();
    if (orderKey) {
      var fromOrder = sourceFromOrderKey(orderKey);
      if (fromOrder) return fromOrder;
    }

    var idxText = String(
      $(popup).find('.de-config-idx-label').first().text() || ''
    )
      .replace(/[\[\]\s]/g, '')
      .trim();
    if (/^(?:s\d+|\d+(?:_\d+)?)$/.test(idxText)) {
      return sourceForCompositeKey(idxText);
    }
    return '';
  }

  function popupSource(popup) {
    if (!popup) return '';
    if (popup._dashticzDeviceRulesSource) {
      return popup._dashticzDeviceRulesSource;
    }
    var source = String(pendingPopupSource || '').trim();
    if (!source) source = inferPopupSource(popup);
    if (source) {
      popup._dashticzDeviceRulesSource = source;
      pendingPopupSource = source;
    }
    return source;
  }

  function configForSource(source) {
    var store = ruleStore();
    var entry =
      source && store[source] && typeof store[source] === 'object'
        ? store[source]
        : {};
    return {
      schemaVersion: Number(entry.schemaVersion || 1),
      rules: normaliseRules(entry.rules, source),
      customJsHandler: String(entry.customJsHandler || ''),
    };
  }

  function liveDeviceForDefinition(definition) {
    if (!definition || typeof definition !== 'object') return null;
    try {
      if (
        typeof window.Domoticz !== 'undefined' &&
        window.Domoticz &&
        typeof window.Domoticz.getAllDevices === 'function' &&
        definition.idx
      ) {
        return window.Domoticz.getAllDevices(definition.idx) || null;
      }
    } catch (ignore) {
      return null;
    }
    return null;
  }

  function isTextDevice(definition, liveDevice) {
    var values = [
      definition && definition.type,
      definition && definition.Type,
      definition && definition.subtype,
      definition && definition.SubType,
      liveDevice && liveDevice.Type,
      liveDevice && liveDevice.SubType,
      liveDevice && liveDevice.TypeImg,
    ];
    return values.some(function (value) {
      return /(?:^|\s|_)text(?:$|\s|_)/i.test(String(value || ''));
    });
  }

  function friendlyBlockName(key) {
    var definition = configuredBlock(key) || {};
    var liveDevice = liveDeviceForDefinition(definition);
    return String(
      (liveDevice && liveDevice.Name) ||
        definition.title ||
        definition.name ||
        definition.description ||
        key
    );
  }

  function blockOptionData(selected) {
    var rows = [];
    if (window.blocks && typeof window.blocks === 'object') {
      Object.keys(window.blocks).forEach(function (key) {
        var definition = window.blocks[key];
        if (!definition || typeof definition !== 'object') return;
        var liveDevice = liveDeviceForDefinition(definition);
        var idx = definition.idx == null ? '' : String(definition.idx);
        var keyLooksLikeDevice =
          /^(?:device_)?\d+(?:_\d+)?$/.test(String(key)) ||
          /^(?:s|v)\d+$/.test(String(key));
        // The text action deliberately lists devices, not every widget or
        // special block in window.blocks. Named custom devices remain
        // available because they carry an IDX. Numeric/scene/variable keys
        // are included for hand-written legacy configurations without idx.
        if (!idx && !liveDevice && !keyLooksLikeDevice) return;
        if (!idx && keyLooksLikeDevice) {
          idx = String(key)
            .replace(/^device_/, '')
            .replace(/^[sv]/, '');
        }
        var name = String(
          (liveDevice && liveDevice.Name) ||
            definition.title ||
            definition.name ||
            key
        );
        var label = name;
        if (idx) label += ' — IDX ' + idx;
        if (name !== key) label += ' — ' + key;
        rows.push({
          key: key,
          label: label,
          textDevice: isTextDevice(definition, liveDevice),
        });
      });
    }

    if (
      selected &&
      rows.every(function (row) {
        return String(row.key) !== String(selected);
      })
    ) {
      rows.push({
        key: selected,
        label: selected + ' — ' + text().unavailableTarget,
        textDevice: false,
        unavailable: true,
      });
    }

    rows.sort(function (left, right) {
      if (left.textDevice !== right.textDevice) return left.textDevice ? -1 : 1;
      return left.label.localeCompare(right.label, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    });
    return rows;
  }

  function targetOptions(selected, includeSelf) {
    var t = text();
    var rows = blockOptionData(selected);
    var html = '<option value=""></option>';
    if (includeSelf) {
      html +=
        '<option value="self"' +
        (selected === 'self' ? ' selected' : '') +
        '>' +
        escapeHtml(t.selfTarget) +
        '</option>';
    }

    var textRows = rows.filter(function (row) {
      return row.textDevice;
    });
    var otherRows = rows.filter(function (row) {
      return !row.textDevice;
    });

    function appendGroup(label, entries) {
      if (!entries.length) return;
      html += '<optgroup label="' + escapeHtml(label) + '">';
      entries.forEach(function (row) {
        html +=
          '<option value="' +
          escapeHtml(row.key) +
          '"' +
          (String(row.key) === String(selected) ? ' selected' : '') +
          '>' +
          escapeHtml(row.label) +
          '</option>';
      });
      html += '</optgroup>';
    }

    appendGroup(t.textDevices, textRows);
    appendGroup(t.otherBlocks, otherRows);
    return html;
  }

  function operatorOptions(selected) {
    var html = '';
    operators.forEach(function (entry) {
      html +=
        '<option value="' +
        entry[0] +
        '"' +
        (entry[0] === selected ? ' selected' : '') +
        '>' +
        escapeHtml(entry[1]) +
        '</option>';
    });
    return html;
  }

  function translatedStyleLabel(mode, fallback) {
    var t = text();
    var labels = {
      existing: t.existingCss,
      background: t.background,
      border: t.border,
      text: t.textColor,
      'background-border': t.background + ' + ' + t.border.toLowerCase(),
      'background-text': t.background + ' + ' + t.textColor.toLowerCase(),
      'background-border-text':
        t.background +
        ' + ' +
        t.border.toLowerCase() +
        ' + ' +
        t.textColor.toLowerCase(),
      banner: 'Floating banner',
    };
    return labels[mode] || fallback;
  }

  function styleModeOptions(selected) {
    var html = '';
    styleModes.forEach(function (entry) {
      html +=
        '<option value="' +
        entry[0] +
        '"' +
        (entry[0] === selected ? ' selected' : '') +
        '>' +
        escapeHtml(translatedStyleLabel(entry[0], entry[1])) +
        '</option>';
    });
    return html;
  }

  function opacityOptions(selected) {
    var html = '';
    for (var i = 5; i <= 100; i += 5) {
      var value = i / 100;
      html +=
        '<option value="' +
        value.toFixed(2) +
        '"' +
        (Math.abs(value - selected) < 0.001 ? ' selected' : '') +
        '>' +
        i +
        '%</option>';
    }
    return html;
  }

  function borderWidthOptions(selected) {
    var html = '';
    for (var i = 1; i <= 8; i += 1) {
      html +=
        '<option value="' +
        i +
        '"' +
        (i === selected ? ' selected' : '') +
        '>' +
        i +
        ' px</option>';
    }
    return html;
  }

  function borderStyleOptions(selected) {
    var html = '';
    borderStyles.forEach(function (style) {
      html +=
        '<option value="' +
        style +
        '"' +
        (style === selected ? ' selected' : '') +
        '>' +
        style +
        '</option>';
    });
    return html;
  }

  function cssTargetControl(cssAction) {
    var t = text();
    if (!cssAction.legacyTarget) {
      return '<input type="hidden" class="dr-css-target" value="self">';
    }
    return (
      '<div class="mt-2"><label class="form-label small mb-1">' +
      escapeHtml(t.legacyTarget) +
      '</label><select class="form-select form-select-sm dr-css-target">' +
      targetOptions(cssAction.target, true) +
      '</select><div class="form-text">' +
      escapeHtml(t.legacyTargetHelp) +
      '</div></div>'
    );
  }

  function ruleRowHtml(rule, source) {
    var t = text();
    rule = rule || defaultRule(source);
    var cssAction = rule.actions.css;
    var textAction = rule.actions.text;
    var noValue =
      rule.trigger.operator === 'empty' || rule.trigger.operator === 'notempty';
    var sourceLabel = friendlyBlockName(source);
    if (sourceLabel !== source) sourceLabel += ' — ' + source;

    return (
      '<div class="dt-device-rule border rounded p-2 mb-3" data-rule-id="' +
      escapeHtml(rule.id) +
      '">' +
      '<div class="d-flex justify-content-between align-items-center mb-2">' +
      '<label class="d-flex align-items-center gap-2 mb-0">' +
      '<span class="form-check form-switch m-0 p-0">' +
      '<input class="form-check-input dr-enabled m-0" type="checkbox" role="switch" style="width:4em;height:2em;float:none;"' +
      (rule.enabled !== false ? ' checked' : '') +
      '></span><span class="form-check-label fw-semibold">' +
      escapeHtml(t.automation) +
      '</span></label>' +
      '<button type="button" class="btn btn-outline-danger btn-sm dr-remove" title="' +
      escapeHtml(t.remove) +
      '"><i class="fas fa-trash" aria-hidden="true"></i></button>' +
      '</div>' +
      '<div class="small fw-semibold text-uppercase opacity-75 mb-1">' +
      escapeHtml(t.trigger) +
      '</div>' +
      '<div class="row g-2 mb-3">' +
      '<div class="col-12 col-md-4"><label class="form-label small mb-1">' +
      escapeHtml(t.property) +
      '</label><input type="text" class="form-control form-control-sm dr-property" list="dt-device-rule-properties" value="' +
      escapeHtml(rule.trigger.property) +
      '"></div>' +
      '<div class="col-12 col-md-4"><label class="form-label small mb-1">' +
      escapeHtml(t.condition) +
      '</label><select class="form-select form-select-sm dr-operator">' +
      operatorOptions(rule.trigger.operator) +
      '</select></div>' +
      '<div class="col-12 col-md-4"><label class="form-label small mb-1">' +
      escapeHtml(t.value) +
      '</label><input type="text" class="form-control form-control-sm dr-value" value="' +
      escapeHtml(rule.trigger.value) +
      '"' +
      (noValue ? ' disabled' : '') +
      '></div></div>' +
      '<div class="small fw-semibold text-uppercase opacity-75 mb-1">' +
      escapeHtml(t.actions) +
      '</div>' +
      '<div class="border rounded p-2 mb-2 dr-css-action-card">' +
      '<label class="d-flex align-items-center gap-2 mb-1">' +
      '<input type="checkbox" class="form-check-input dr-css-enabled"' +
      (cssAction.enabled ? ' checked' : '') +
      '><span class="fw-semibold">' +
      escapeHtml(t.cssAction) +
      '</span></label>' +
      '<div class="form-text mb-2">' +
      escapeHtml(t.cssActionHelp) +
      '</div>' +
      '<div class="dr-css-body">' +
      '<div class="small text-muted mb-2"><strong>' +
      escapeHtml(t.currentDevice) +
      ':</strong> ' +
      escapeHtml(sourceLabel) +
      '</div>' +
      '<div class="dr-generated-style-controls">' +
      '<div class="row g-2">' +
      '<div class="col-12 col-lg-4 dr-background-controls">' +
      '<div class="small fw-semibold mb-1">' +
      escapeHtml(t.background) +
      '</div><div class="d-flex gap-2 align-items-end">' +
      '<div><label class="form-label small mb-1">' +
      escapeHtml(t.backgroundColor) +
      '</label><input type="color" class="form-control form-control-color dr-background-color" value="' +
      escapeHtml(cssAction.style.backgroundColor) +
      '" title="' +
      escapeHtml(t.backgroundColor) +
      '"></div>' +
      '<div class="flex-grow-1"><label class="form-label small mb-1">' +
      escapeHtml(t.opacity) +
      '</label><select class="form-select form-select-sm dr-background-opacity">' +
      opacityOptions(cssAction.style.backgroundOpacity) +
      '</select></div></div></div>' +
      '<div class="col-12 col-lg-8 dr-border-controls">' +
      '<div class="small fw-semibold mb-1">' +
      escapeHtml(t.border) +
      '</div><div class="d-flex flex-wrap gap-2 align-items-end">' +
      '<div><label class="form-label small mb-1">' +
      escapeHtml(t.borderColor) +
      '</label><input type="color" class="form-control form-control-color dr-border-color" value="' +
      escapeHtml(cssAction.style.borderColor) +
      '" title="' +
      escapeHtml(t.borderColor) +
      '"></div>' +
      '<div><label class="form-label small mb-1">' +
      escapeHtml(t.borderWidth) +
      '</label><select class="form-select form-select-sm dr-border-width">' +
      borderWidthOptions(cssAction.style.borderWidth) +
      '</select></div>' +
      '<div class="flex-grow-1"><label class="form-label small mb-1">' +
      escapeHtml(t.borderStyle) +
      '</label><select class="form-select form-select-sm dr-border-style">' +
      borderStyleOptions(cssAction.style.borderStyle) +
      '</select></div></div></div>' +
      '</div></div>' +
      '<details class="mt-2 dr-css-advanced"><summary class="small">' +
      escapeHtml(t.advancedCss) +
      '</summary><div class="row g-2 mt-1">' +
      '<div class="col-12 col-md-6"><label class="form-label small mb-1">' +
      escapeHtml(t.styling) +
      '</label><select class="form-select form-select-sm dr-style-mode">' +
      styleModeOptions(cssAction.style.mode) +
      '</select></div>' +
      '<div class="col-12 col-md-6"><label class="form-label small mb-1">' +
      escapeHtml(t.cssClass) +
      '</label><input type="text" class="form-control form-control-sm dr-class" value="' +
      escapeHtml(cssAction.className) +
      '"></div>' +
      '<div class="col-12 col-md-4 dr-text-controls"><label class="form-label small mb-1">' +
      escapeHtml(t.textColor) +
      '</label><input type="color" class="form-control form-control-color dr-text-color" value="' +
      escapeHtml(cssAction.style.textColor) +
      '"></div>' +
      '<div class="col-12 dr-banner-controls"><div class="row g-2">' +
      '<div class="col-12"><label class="form-label small mb-1">' +
      escapeHtml(t.bannerText) +
      '</label><input type="text" class="form-control form-control-sm dr-banner-text" value="' +
      escapeHtml(cssAction.style.bannerText) +
      '"></div>' +
      '<div class="col-12 col-md-6"><label class="form-label small mb-1">' +
      escapeHtml(t.bannerTop) +
      '</label><input type="number" min="0" max="2000" class="form-control form-control-sm dr-banner-top" value="' +
      escapeHtml(cssAction.style.bannerTop) +
      '"></div>' +
      '<div class="col-12 col-md-6"><label class="form-label small mb-1">' +
      escapeHtml(t.fontSize) +
      '</label><input type="number" min="10" max="60" class="form-control form-control-sm dr-banner-fontsize" value="' +
      escapeHtml(cssAction.style.fontSize) +
      '"></div></div></div>' +
      '<div class="col-12">' +
      cssTargetControl(cssAction) +
      '</div></div></details>' +
      '</div></div>' +
      '<div class="border rounded p-2 dr-text-action-card">' +
      '<label class="d-flex align-items-center gap-2 mb-1">' +
      '<input type="checkbox" class="form-check-input dr-text-enabled"' +
      (textAction.enabled ? ' checked' : '') +
      '><span class="fw-semibold">' +
      escapeHtml(t.textAction) +
      '</span></label>' +
      '<div class="dr-text-body"><div class="row g-2">' +
      '<div class="col-12"><label class="form-label small mb-1">' +
      escapeHtml(t.textTarget) +
      '</label><select class="form-select form-select-sm dr-text-target">' +
      targetOptions(textAction.target, false) +
      '</select><div class="form-text">' +
      escapeHtml(t.targetHelp) +
      '</div></div>' +
      '<div class="col-12 col-md-6"><label class="form-label small mb-1">' +
      escapeHtml(t.textOn) +
      '</label><input type="text" class="form-control form-control-sm dr-text-on" value="' +
      escapeHtml(textAction.textOn) +
      '"></div>' +
      '<div class="col-12 col-md-6"><label class="form-label small mb-1">' +
      escapeHtml(t.textOff) +
      '</label><input type="text" class="form-control form-control-sm dr-text-off" value="' +
      escapeHtml(textAction.textOff) +
      '"></div></div></div></div>' +
      '</div>'
    );
  }

  function readStyleRow($row) {
    return normaliseStyle(
      {
        mode: String($row.find('.dr-style-mode').val() || 'existing'),
        backgroundColor: String(
          $row.find('.dr-background-color').val() || '#ff0000'
        ),
        backgroundOpacity: Number(
          $row.find('.dr-background-opacity').val() || 0.35
        ),
        borderWidth: Number($row.find('.dr-border-width').val() || 2),
        borderStyle: String($row.find('.dr-border-style').val() || 'solid'),
        borderColor: String($row.find('.dr-border-color').val() || '#ff4040'),
        textColor: String($row.find('.dr-text-color').val() || '#ffffff'),
        bannerText: String($row.find('.dr-banner-text').val() || ''),
        bannerTop: Number($row.find('.dr-banner-top').val() || 40),
        fontSize: Number($row.find('.dr-banner-fontsize').val() || 20),
      },
      false
    );
  }

  function readRuleRows($popup, source) {
    var rules = [];
    $popup.find('.dt-device-rule').each(function () {
      var $row = $(this);
      var id = normaliseRuleId($row.attr('data-rule-id'), rules.length, {});
      var className = String($row.find('.dr-class').val() || '').trim();
      if (!className) className = managedClassName(source, id);
      rules.push({
        id: id,
        enabled: $row.find('.dr-enabled').prop('checked') !== false,
        trigger: {
          property: String($row.find('.dr-property').val() || '').trim(),
          operator: String($row.find('.dr-operator').val() || 'eq'),
          value: String($row.find('.dr-value').val() || ''),
        },
        actions: {
          css: {
            enabled: $row.find('.dr-css-enabled').prop('checked') === true,
            target: String($row.find('.dr-css-target').val() || 'self').trim(),
            className: className,
            style: readStyleRow($row),
          },
          text: {
            enabled: $row.find('.dr-text-enabled').prop('checked') === true,
            target: String($row.find('.dr-text-target').val() || '').trim(),
            textOn: String($row.find('.dr-text-on').val() || ''),
            textOff: String($row.find('.dr-text-off').val() || ''),
          },
        },
      });
    });
    return rules;
  }

  function updateEmptyMessage($popup) {
    var t = text();
    $popup
      .find('.dr-empty')
      .toggleClass('d-none', $popup.find('.dt-device-rule').length > 0)
      .text(t.noRules);
  }

  function updateValueState($row) {
    var operator = String($row.find('.dr-operator').val() || 'eq');
    $row
      .find('.dr-value')
      .prop('disabled', operator === 'empty' || operator === 'notempty');
  }

  function modeUses(mode, part) {
    if (mode === 'existing') return false;
    return String(mode).split('-').indexOf(part) !== -1;
  }

  function updateStyleState($row) {
    var mode = String($row.find('.dr-style-mode').val() || 'existing');
    var generated = mode !== 'existing';
    var isBanner = mode === 'banner';
    $row.find('.dr-generated-style-controls').toggleClass('d-none', !generated);
    $row
      .find('.dr-background-controls')
      .toggleClass('d-none', !(isBanner || modeUses(mode, 'background')));
    $row
      .find('.dr-border-controls')
      .toggleClass('d-none', !(isBanner || modeUses(mode, 'border')));
    $row
      .find('.dr-text-controls')
      .toggleClass('d-none', !(isBanner || modeUses(mode, 'text')));
    $row.find('.dr-banner-controls').toggleClass('d-none', !isBanner);
  }

  function updateActionState($row) {
    var cssEnabled = $row.find('.dr-css-enabled').prop('checked') === true;
    var textEnabled = $row.find('.dr-text-enabled').prop('checked') === true;
    $row.find('.dr-css-body').toggleClass('d-none', !cssEnabled);
    $row.find('.dr-text-body').toggleClass('d-none', !textEnabled);
  }

  function showValidationError($popup, message) {
    $popup.find('.de-config-message').addClass('text-danger').text(message);
  }

  function validatePopup($popup) {
    var t = text();
    var valid = true;
    var message = '';

    $popup.find('.dt-device-rule').each(function () {
      if (!valid) return;
      var $row = $(this);
      if ($row.find('.dr-enabled').prop('checked') === false) return;

      var property = String($row.find('.dr-property').val() || '').trim();
      var operator = String($row.find('.dr-operator').val() || 'eq');
      var value = String($row.find('.dr-value').val() || '').trim();
      var cssEnabled = $row.find('.dr-css-enabled').prop('checked') === true;
      var textEnabled = $row.find('.dr-text-enabled').prop('checked') === true;

      if (
        !property ||
        !operator ||
        (operator !== 'empty' && operator !== 'notempty' && !value)
      ) {
        valid = false;
        message = t.invalidTrigger;
        return;
      }
      if (!cssEnabled && !textEnabled) {
        valid = false;
        message = t.invalidActions;
        return;
      }

      if (cssEnabled) {
        var className = String($row.find('.dr-class').val() || '').trim();
        var styleMode = String($row.find('.dr-style-mode').val() || 'existing');
        var classPattern =
          styleMode === 'existing'
            ? /^(?:[A-Za-z_][A-Za-z0-9_-]*)(?:\s+[A-Za-z_][A-Za-z0-9_-]*)*$/
            : /^[A-Za-z_][A-Za-z0-9_-]*$/;
        if (!classPattern.test(className)) {
          valid = false;
          message = t.invalidClass;
          return;
        }
        if (styleMode === 'banner') {
          var bannerText = String($row.find('.dr-banner-text').val() || '');
          if (
            !bannerText ||
            bannerText.indexOf('"') !== -1 ||
            bannerText.indexOf('\\') !== -1
          ) {
            valid = false;
            message = t.invalidBannerText;
            return;
          }
        }
      }

      if (textEnabled) {
        var target = String($row.find('.dr-text-target').val() || '').trim();
        var textOn = String($row.find('.dr-text-on').val() || '');
        var textOff = String($row.find('.dr-text-off').val() || '');
        if (!target) {
          valid = false;
          message = t.invalidTextRule;
          return;
        }
        if (!textOn && !textOff) {
          valid = false;
          message = t.invalidTextValue;
        }
      }
    });

    var handler = String($popup.find('.dr-handler').val() || '').trim();
    if (
      valid &&
      handler &&
      !/^(?:getStatus_)?[A-Za-z_$][A-Za-z0-9_$]*$/.test(handler)
    ) {
      valid = false;
      message = t.invalidHandler;
    }

    if (!valid) showValidationError($popup, message);
    return valid;
  }

  function hexToRgba(hex, opacity) {
    var value = validHexColor(hex, '#000000').substring(1);
    var red = parseInt(value.substring(0, 2), 16);
    var green = parseInt(value.substring(2, 4), 16);
    var blue = parseInt(value.substring(4, 6), 16);
    var alpha = clampNumber(opacity, 0.05, 1, 1);
    return (
      'rgba(' + red + ', ' + green + ', ' + blue + ', ' + alpha.toFixed(2) + ')'
    );
  }

  // Themes such as modern-dark and liquid-glass style panels with
  // selectors like `.transbg:not(.dial)` plus `!important`. A generated rule
  // using only `.automation-class` therefore loses on specificity even though
  // custom.css is loaded later. Target the actual Dashticz block shapes with a
  // stronger selector, while keeping a generic fallback for custom blocks.
  function generatedBlockSelectors(className, pseudo) {
    var suffix = String(pseudo || '');
    var classSelector = '.' + String(className || '');
    return [
      'html body .dt_block.transbg' + classSelector + suffix,
      'html body .mh.transbg' + classSelector + suffix,
      'html body .dt_block' + classSelector + suffix,
      'html body .mh' + classSelector + suffix,
      'html body .transbg' + classSelector + suffix,
      'html body ' + classSelector + suffix,
    ].join(',\n');
  }

  function generatedBannerCss(className, style) {
    style = normaliseStyle(style, false);
    if (!style.bannerText) return '';
    return (
      generatedBlockSelectors(className) +
      ' {\n  visibility: visible;\n}\n\n' +
      generatedBlockSelectors(className, ':before') +
      ' {\n' +
      '  content: "' +
      style.bannerText.replace(/"/g, '') +
      '";\n' +
      '  background: ' +
      hexToRgba(style.backgroundColor, style.backgroundOpacity) +
      ' !important;\n' +
      '  background-clip: border-box;\n' +
      '  border: ' +
      style.borderWidth +
      'px ' +
      style.borderStyle +
      ' ' +
      style.borderColor +
      ' !important;\n' +
      '  border-radius: 15px !important;\n' +
      '  font-size: ' +
      style.fontSize +
      'px !important;\n' +
      '  font-weight: bold;\n' +
      '  color: ' +
      style.textColor +
      ' !important;\n' +
      '  visibility: visible;\n' +
      '  position: fixed;\n' +
      '  top: ' +
      style.bannerTop +
      'px;\n' +
      '  left: 50%;\n' +
      '  transform: translateX(-50%);\n' +
      '  padding: 10px;\n' +
      '  text-align: center;\n' +
      '  z-index: 9999;\n' +
      '}'
    );
  }

  function generatedDeclarations(style) {
    style = normaliseStyle(style, false);
    if (style.mode === 'existing' || style.mode === 'banner') return [];
    var declarations = [];
    if (modeUses(style.mode, 'background')) {
      declarations.push(
        'background: ' +
          hexToRgba(style.backgroundColor, style.backgroundOpacity) +
          ' !important;'
      );
    }
    if (modeUses(style.mode, 'border')) {
      declarations.push(
        'border: ' +
          style.borderWidth +
          'px ' +
          style.borderStyle +
          ' ' +
          style.borderColor +
          ' !important;'
      );
    }
    if (modeUses(style.mode, 'text')) {
      declarations.push('color: ' + style.textColor + ' !important;');
    }
    return declarations;
  }

  function generatedCssForRules(rules, source) {
    var seen = {};
    var css = [];
    normaliseRules(rules, source).forEach(function (rule) {
      var action = rule.actions.css;
      if (!action.enabled || action.style.mode === 'existing') return;
      if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(action.className)) return;
      if (action.style.mode === 'banner') {
        var bannerCss = generatedBannerCss(action.className, action.style);
        if (bannerCss) seen[action.className] = bannerCss;
        return;
      }
      var declarations = generatedDeclarations(action.style);
      if (!declarations.length) return;
      seen[action.className] =
        generatedBlockSelectors(action.className) +
        ' {\n  ' +
        declarations.join('\n  ') +
        '\n}';
    });
    Object.keys(seen).forEach(function (className) {
      css.push(seen[className]);
    });
    return css.join('\n\n');
  }

  function updateRuntimeRuleCss(source, rules) {
    source = String(source || 'device');
    var css = generatedCssForRules(rules, source);
    var styleNode = runtimeStyleNodes[source];

    if (!css) {
      if (styleNode && styleNode.parentNode) {
        styleNode.parentNode.removeChild(styleNode);
      }
      delete runtimeStyleNodes[source];
      return;
    }

    if (!document || typeof document.createElement !== 'function') return;
    var head = document.head;
    if (!head && typeof document.getElementsByTagName === 'function') {
      head = document.getElementsByTagName('head')[0];
    }
    if (!head) return;

    if (!styleNode) {
      styleNode = document.createElement('style');
      styleNode.setAttribute('data-dashticz-device-rules-runtime', 'true');
      head.appendChild(styleNode);
      runtimeStyleNodes[source] = styleNode;
    }
    if (styleNode.textContent !== css) styleNode.textContent = css;
  }

  function activeCssFilename() {
    var path = String(window.DashticzCustomCssPath || '');
    if (path) {
      var basename = path.split('/').pop();
      if (/^[A-Za-z0-9_-]+\.css$/.test(basename)) return basename;
    }
    try {
      if (typeof _PARAMS !== 'undefined' && _PARAMS && _PARAMS.css) {
        var explicit = String(_PARAMS.css).split('/').pop();
        if (/^[A-Za-z0-9_-]+\.css$/.test(explicit)) return explicit;
      }
      if (typeof _PARAMS !== 'undefined' && _PARAMS && _PARAMS.cfg) {
        var cfg = String(_PARAMS.cfg);
        var suffix = cfg.replace(/^CONFIG/i, '').replace(/\.js$/i, '');
        var derived = 'custom' + suffix + '.css';
        if (/^[A-Za-z0-9_-]+\.css$/.test(derived)) return derived;
      }
    } catch (ignore) {
      // Fall through to the default.
    }
    return 'custom.css';
  }

  function updateRuleStore(source, rules, handler) {
    if (
      !window[RULE_STORE_NAME] ||
      typeof window[RULE_STORE_NAME] !== 'object'
    ) {
      window[RULE_STORE_NAME] = {};
    }
    if (!rules.length && !handler) {
      delete window[RULE_STORE_NAME][source];
      updateRuntimeRuleCss(source, []);
      return;
    }
    window[RULE_STORE_NAME][source] = {
      schemaVersion: 2,
      rules: rules,
      customJsHandler: handler,
    };
    updateRuntimeRuleCss(source, rules);
  }

  function activeCustomFolder() {
    var folder =
      window._CFG && window._CFG.customfolder
        ? String(window._CFG.customfolder)
        : 'custom';
    return folder.replace(/\/$/, '') || 'custom';
  }

  function saveDeviceRules($popup, source) {
    var rules = readRuleRows($popup, source);
    var handler = String($popup.find('.dr-handler').val() || '').trim();
    var phpPath =
      window.settings && window.settings.dashticz_php_path
        ? String(window.settings.dashticz_php_path)
        : 'js/';
    phpPath = phpPath.replace(/\/?$/, '/');
    var cssFile = activeCssFilename();

    return $.getJSON(phpPath + 'info.php?get=csrf').then(function (data) {
      return $.ajax({
        // Keep the writer on its fixed js/ endpoint. dashticz_php_path can
        // point at the shared info.php folder and does not necessarily contain
        // this feature-specific endpoint.
        url: SAVE_URL,
        method: 'POST',
        dataType: 'json',
        headers: { 'X-Dashticz-CSRF': data.token },
        data: {
          source: source,
          schema_version: 2,
          rules: JSON.stringify(rules),
          custom_js_handler: handler,
          css_file: cssFile,
          custom_folder: activeCustomFolder(),
        },
      });
    });
  }

  function refreshActiveCustomCss(cssFile) {
    var path = activeCustomFolder() + '/' + cssFile;
    return $.ajax({
      url: path + '?v=' + Date.now(),
      cache: false,
    }).done(function (data) {
      var selector =
        'style[data-dashticz-custom-css="' + path.replace(/"/g, '\\"') + '"]';
      var $style = $(selector);
      if (!$style.length) {
        $style = $('<style></style>')
          .attr('data-dashticz-custom-css', path)
          .appendTo('head');
      }
      $style.html(data);
      window.DashticzCustomCssPath = path;
      $(document).trigger('dashticz:customcssloaded', [path]);
    });
  }

  function buildDatalist() {
    var html = '<datalist id="dt-device-rule-properties">';
    propertySuggestions.forEach(function (property) {
      html += '<option value="' + escapeHtml(property) + '"></option>';
    });
    html += '</datalist>';
    return html;
  }

  function enhancePopup(popup) {
    if (!popup || popup._dashticzDeviceRulesEnhanced) return;
    var $popup = $(popup);
    var $customSection = $popup.find('.de-custom-fields-section');
    if (!$customSection.length || !$popup.find('#de-config-ok').length) return;

    var source = popupSource(popup);
    if (!source) return;
    popup._dashticzDeviceRulesEnhanced = true;

    var t = text();
    var stored = configForSource(source);
    var rules = stored.rules;
    var handler = stored.customJsHandler;
    var html =
      '<div class="de-device-rules-section">' +
      '<h6 class="de-section-title mt-3"><i class="fas fa-bolt me-2" aria-hidden="true"></i>' +
      escapeHtml(t.automation) +
      '</h6><p class="form-text">' +
      escapeHtml(t.help) +
      '</p><div class="small text-muted mb-2"><strong>' +
      escapeHtml(t.source) +
      ':</strong> <code>' +
      escapeHtml(source) +
      '</code></div>' +
      buildDatalist() +
      '<div class="dr-rules"></div>' +
      '<div class="dr-empty form-text mb-2"></div>' +
      '<button type="button" class="btn btn-outline-secondary btn-sm dr-add mb-3">' +
      '<i class="fas fa-plus me-1" aria-hidden="true"></i>' +
      escapeHtml(t.addRule) +
      '</button>' +
      '<details class="mb-2"><summary class="small">' +
      escapeHtml(t.advanced) +
      '</summary><div class="mt-2"><label class="form-label small mb-1">' +
      escapeHtml(t.handler) +
      '</label><input type="text" class="form-control form-control-sm dr-handler" value="' +
      escapeHtml(handler) +
      '" placeholder="Party_Mode"><div class="form-text">' +
      escapeHtml(t.handlerHelp) +
      '</div></div></details></div>';

    $customSection.before(html);
    var $rules = $popup.find('.dr-rules');
    rules.forEach(function (rule) {
      $rules.append(ruleRowHtml(rule, source));
    });

    $popup.find('.dt-device-rule').each(function () {
      updateValueState($(this));
      updateStyleState($(this));
      updateActionState($(this));
    });
    updateEmptyMessage($popup);

    $popup.on('click.deviceRules', '.dr-add', function () {
      $rules.append(ruleRowHtml(defaultRule(source), source));
      var $newRule = $rules.find('.dt-device-rule').last();
      updateValueState($newRule);
      updateStyleState($newRule);
      updateActionState($newRule);
      updateEmptyMessage($popup);
      $newRule.find('.dr-property').trigger('focus');
    });

    $popup.on('click.deviceRules', '.dr-remove', function () {
      $(this).closest('.dt-device-rule').remove();
      updateEmptyMessage($popup);
    });

    $popup.on(
      'change.deviceRules input.deviceRules',
      '.dr-enabled,.dr-property,.dr-operator,.dr-value,.dr-css-enabled,.dr-css-target,.dr-class,.dr-style-mode,.dr-background-color,.dr-background-opacity,.dr-border-width,.dr-border-style,.dr-border-color,.dr-text-color,.dr-banner-text,.dr-banner-top,.dr-banner-fontsize,.dr-text-enabled,.dr-text-target,.dr-text-on,.dr-text-off,.dr-handler',
      function () {
        var $field = $(this);
        var $rule = $field.closest('.dt-device-rule');
        if ($field.hasClass('dr-operator')) updateValueState($rule);
        if ($field.hasClass('dr-style-mode')) updateStyleState($rule);
        if (
          $field.hasClass('dr-css-enabled') ||
          $field.hasClass('dr-text-enabled')
        ) {
          updateActionState($rule);
        }
      }
    );

    // Device Rules are saved first. Only after custom.js and custom.css are
    // updated successfully is the click re-dispatched to Device Editor, which
    // independently persists normal block presentation settings to CONFIG.js.
    popup.addEventListener(
      'click',
      function (event) {
        if (
          !event.target ||
          !event.target.closest ||
          !event.target.closest('#de-config-ok')
        ) {
          return;
        }
        if (popup._dashticzDeviceRulesSaveBypass) {
          popup._dashticzDeviceRulesSaveBypass = false;
          return;
        }

        var rulesToSave = readRuleRows($popup, source);
        var handlerToSave = String(
          $popup.find('.dr-handler').val() || ''
        ).trim();
        if (
          !rulesToSave.length &&
          !handlerToSave &&
          !rules.length &&
          !handler
        ) {
          return;
        }
        if (!validatePopup($popup)) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        var $ok = $popup.find('#de-config-ok').prop('disabled', true);
        $popup
          .find('.de-config-message')
          .removeClass('text-danger')
          .text(t.cssSaving);

        saveDeviceRules($popup, source)
          .done(function (result) {
            updateRuleStore(source, rulesToSave, handlerToSave);
            var cssFile =
              result && result.css_file ? result.css_file : activeCssFilename();
            refreshActiveCustomCss(cssFile).always(function () {
              popup._dashticzDeviceRulesSaveBypass = true;
              $ok.prop('disabled', false);
              $popup.find('.de-config-message').text('');
              $ok[0].click();
            });
          })
          .fail(function (xhr) {
            var message =
              xhr && xhr.responseJSON && xhr.responseJSON.error
                ? xhr.responseJSON.error
                : t.cssSaveFailed;
            showValidationError($popup, message);
            $ok.prop('disabled', false);
          });
      },
      true
    );

    $popup.one('hidden.bs.modal.deviceRules', function () {
      if (popup._dashticzDeviceRulesSource === pendingPopupSource) {
        pendingPopupSource = '';
      }
    });
  }

  function inspectForPopup() {
    var popup = document.getElementById('de-config-popup');
    if (popup) enhancePopup(popup);
  }

  function retryPopupEnhancement(popup) {
    if (!popup) return;
    enhancePopup(popup);
    window.setTimeout(function () {
      if (document.body && document.body.contains(popup)) enhancePopup(popup);
    }, 0);
    window.setTimeout(function () {
      if (document.body && document.body.contains(popup)) enhancePopup(popup);
    }, 80);
  }

  function installPopupObserver() {
    function start() {
      if (!document.body || popupObserver) return;
      popupObserver = new window.MutationObserver(function () {
        var popup = document.getElementById('de-config-popup');
        if (popup) retryPopupEnhancement(popup);
      });
      popupObserver.observe(document.body, { childList: true, subtree: true });
      inspectForPopup();
      $(document)
        .off('.deviceRulesPopupInit')
        .on(
          'show.bs.modal.deviceRulesPopupInit shown.bs.modal.deviceRulesPopupInit',
          '#de-config-popup',
          function () {
            retryPopupEnhancement(this);
          }
        );
    }
    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });
  }

  function init() {
    document.addEventListener('click', captureConfigButtonSource, true);
    installPopupObserver();
    if (!tryWrapGetCustomFunction()) {
      wrapTimer = window.setInterval(tryWrapGetCustomFunction, WRAP_RETRY_MS);
    }
    if (!tryWrapDeviceEditorApi()) {
      editorApiTimer = window.setInterval(
        tryWrapDeviceEditorApi,
        WRAP_RETRY_MS
      );
    }
  }

  window.DashticzDeviceRules = {
    compare: compare,
    normaliseRules: normaliseRules,
    defaultRule: defaultRule,
    managedClassName: managedClassName,
    process: process,
    enhancePopup: enhancePopup,
    tryWrap: tryWrapGetCustomFunction,
    generatedDeclarations: generatedDeclarations,
    generatedBlockSelectors: generatedBlockSelectors,
    generatedBannerCss: generatedBannerCss,
    generatedCssForRules: generatedCssForRules,
    updateRuntimeRuleCss: updateRuntimeRuleCss,
    sourceFromOrderKey: sourceFromOrderKey,
    configForSource: configForSource,
    inferPopupSource: inferPopupSource,
    blockOptionData: blockOptionData,
    availableDeviceTargets: blockOptionData,
    targetOptions: targetOptions,
  };

  if (document && document.addEventListener) init();
})(window, document);

//# sourceURL=js/devicerules.js
