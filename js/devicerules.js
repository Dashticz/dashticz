/* global $, blocks, Dashticz, settings, _PARAMS */

// Device Rules / Automation for Dashticz.
//
// Device Rules are intentionally NOT stored in CONFIG.js.
// The editor writes a small managed data block to custom/custom.js and writes
// generated visual classes to custom/custom.css (or the active custom*.css).
// Existing hand-written content in both files is preserved. Existing
// getStatus_<block.key>() functions continue to run normally.
//
// Only whitelisted rule/style values are sent to savedevicerules.php; the
// browser never sends raw JavaScript or raw CSS to be written by the server.
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
  var classStates = {};
  var sourceStateIds = {};

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
  ];

  var borderStyles = ['solid', 'dashed', 'dotted', 'double'];

  var nl = {
    automation: 'Automation',
    help: 'Voer regels uit wanneer dit Domoticz-device wordt bijgewerkt. De regels worden opgeslagen in custom.js; gegenereerde opmaak wordt opgeslagen in custom.css.',
    enabled: 'Aan',
    property: 'Eigenschap',
    condition: 'Voorwaarde',
    value: 'Waarde',
    target: 'Doelblok',
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
    remove: 'Verwijderen',
    addRule: 'Regel toevoegen',
    noRules: 'Nog geen regels ingesteld.',
    advanced: 'Geavanceerd',
    handler: 'Custom JS handler',
    handlerHelp:
      'Optioneel: koppel dit device aan getStatus_<naam>(block, afterupdate) in custom.js.',
    styleHelp:
      'Bij een gekozen styling wordt deze CSS-class automatisch in custom.css beheerd. Kies Bestaande CSS als je de class zelf in custom.css onderhoudt.',
    invalidRule:
      'Automation: vul voor iedere ingeschakelde regel Eigenschap, Doelblok en CSS-class in.',
    invalidValue: 'Automation: vul een waarde in voor deze voorwaarde.',
    invalidClass:
      'Automation: voor automatisch gegenereerde styling moet CSS-class uit één geldige classnaam bestaan (letters/cijfers/_/-).',
    invalidHandler:
      'Automation: Custom JS handler mag alleen letters, cijfers, _ en $ bevatten en mag niet met een cijfer beginnen.',
    cssSaving: 'Automation opslaan in custom.js / custom.css...',
    cssSaveFailed:
      'Automation: custom.js / custom.css kon niet worden bijgewerkt.',
    source: 'Bronblok',
  };

  var en = {
    automation: 'Automation',
    help: 'Run rules whenever this Domoticz device is updated. Rules are stored in custom.js; generated styling is stored in custom.css.',
    enabled: 'On',
    property: 'Property',
    condition: 'Condition',
    value: 'Value',
    target: 'Target block',
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
    remove: 'Remove',
    addRule: 'Add rule',
    noRules: 'No rules configured yet.',
    advanced: 'Advanced',
    handler: 'Custom JS handler',
    handlerHelp:
      'Optional: link this device to getStatus_<name>(block, afterupdate) in custom.js.',
    styleHelp:
      'When styling is selected this CSS class is managed automatically in custom.css. Choose Existing CSS if you maintain the class yourself.',
    invalidRule:
      'Automation: fill Property, Target block and CSS class for every enabled rule.',
    invalidValue: 'Automation: enter a value for this condition.',
    invalidClass:
      'Automation: generated styling requires one valid CSS class name (letters/numbers/_/-).',
    invalidHandler:
      'Automation: Custom JS handler may contain letters, numbers, _ and $ and may not start with a number.',
    cssSaving: 'Saving automation to custom.js / custom.css...',
    cssSaveFailed: 'Automation: custom.js / custom.css could not be updated.',
    source: 'Source block',
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

  function defaultStyle(mode) {
    return {
      mode: mode || 'background-border-text',
      backgroundColor: '#ff0000',
      backgroundOpacity: 0.35,
      borderWidth: 2,
      borderStyle: 'solid',
      borderColor: '#ff4040',
      textColor: '#ffffff',
    };
  }

  function normaliseStyle(style, legacyRule) {
    // Rules created by v1/v2 had no style object. Preserve them as class-only
    // so an upgrade never overwrites an existing hand-written CSS definition.
    if (!style || typeof style !== 'object') {
      return defaultStyle(legacyRule ? 'existing' : 'background-border-text');
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
    return result;
  }

  function normaliseRules(value) {
    var parsed = safeJsonParse(value, value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(function (rule) {
        return rule && typeof rule === 'object';
      })
      .map(function (rule) {
        return {
          enabled: rule.enabled !== false,
          property: String(rule.property || 'Status'),
          operator: String(rule.operator || 'eq'),
          value:
            typeof rule.value === 'undefined' || rule.value === null
              ? ''
              : String(rule.value),
          action: 'class',
          target: String(rule.target || ''),
          className: String(rule.className || rule.class || ''),
          style: normaliseStyle(rule.style, !rule.style),
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

  function recomputeTarget(target) {
    if (!target || !classStates[target]) return;
    var targetStates = classStates[target];
    var allRuleClasses = [];
    var activeRuleClasses = [];

    Object.keys(targetStates).forEach(function (id) {
      var state = targetStates[id];
      if (!state || !state.className) return;
      splitClasses(state.className).forEach(function (className) {
        allRuleClasses.push(className);
        if (state.active) activeRuleClasses.push(className);
      });
    });

    var configured =
      window.blocks && window.blocks[target]
        ? window.blocks[target].addClass
        : '';
    var base = splitClasses(configured).filter(function (className) {
      return allRuleClasses.indexOf(className) === -1;
    });
    var combined = unique(base.concat(activeRuleClasses)).join(' ');

    if (window.Dashticz && typeof window.Dashticz.setBlock === 'function') {
      window.Dashticz.setBlock(target, { addClass: combined });
    } else if (window.blocks && window.blocks[target]) {
      window.blocks[target].addClass = combined;
    }
  }

  function setRuleClassState(target, id, className, active) {
    if (!target || !id || !className) return;
    if (!classStates[target]) classStates[target] = {};
    var previous = classStates[target][id];
    if (previous && previous.className !== className) {
      previous.active = false;
      recomputeTarget(target);
    }
    classStates[target][id] = { className: className, active: !!active };
    recomputeTarget(target);
  }

  function removeRuleClassState(target, id) {
    if (!target || !classStates[target] || !classStates[target][id]) return;
    classStates[target][id].active = false;
    recomputeTarget(target);
    delete classStates[target][id];
    if (!Object.keys(classStates[target]).length) delete classStates[target];
  }

  function cleanupSourceStates(sourceKey, currentIds) {
    var previous = sourceStateIds[sourceKey] || [];
    previous.forEach(function (entry) {
      if (currentIds.indexOf(entry.id) === -1) {
        removeRuleClassState(entry.target, entry.id);
      }
    });
    sourceStateIds[sourceKey] = currentIds.map(function (id) {
      var parts = id.split('|');
      return { id: id, target: parts[1] || '' };
    });
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
    var rules = normaliseRules(resolved.entry && resolved.entry.rules);
    var sourceKey = String(
      resolved.source || block.key || block.idx || 'device'
    );
    var currentIds = [];

    rules.forEach(function (rule, index) {
      if (rule.enabled === false) return;
      if (!rule.property || !rule.target || !rule.className) return;
      var actual = readPath(block.device, rule.property);
      var active = compare(actual, rule.operator, rule.value);
      var id = sourceKey + '|' + rule.target + '|' + index;
      currentIds.push(id);
      setRuleClassState(rule.target, id, rule.className, active);
    });

    cleanupSourceStates(sourceKey, currentIds);
  }

  function callLinkedCustomHandler(block, afterupdate, resolved) {
    if (!block) return;
    resolved = resolved || entryForBlock(block);
    var handler = String(
      resolved.entry && resolved.entry.customJsHandler
        ? resolved.entry.customJsHandler
        : ''
    ).trim();
    if (!handler || !/^(?:getStatus_)?[A-Za-z_$][A-Za-z0-9_$]*$/.test(handler))
      return;

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
    var ck = orderKey.slice(7);
    var refs = visibleBlockReferences();
    for (var i = 0; i < refs.length; i += 1) {
      if (definitionCompositeKey(window.blocks[refs[i]]) === ck) return refs[i];
    }
    if (window.blocks && typeof window.blocks === 'object') {
      var keys = Object.keys(window.blocks);
      for (var j = 0; j < keys.length; j += 1) {
        if (definitionCompositeKey(window.blocks[keys[j]]) === ck)
          return keys[j];
      }
    }
    var parts = ck.split('_');
    return stableDeviceReference(parts[0], parts[1] || 0) || ck;
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
      )
        return;
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

  function sourceForCompositeKey(ck) {
    ck = String(ck || '').trim();
    if (!ck) return '';

    var refs = visibleBlockReferences();
    for (var i = 0; i < refs.length; i += 1) {
      if (definitionCompositeKey(window.blocks[refs[i]]) === ck) return refs[i];
    }

    if (window.blocks && typeof window.blocks === 'object') {
      var keys = Object.keys(window.blocks);
      for (var j = 0; j < keys.length; j += 1) {
        if (definitionCompositeKey(window.blocks[keys[j]]) === ck)
          return keys[j];
      }
    }

    var parts = ck.split('_');
    return stableDeviceReference(parts[0], parts[1] || 0) || ck;
  }

  // Device Editor is lazy-loaded. On the very first direct Settings click the
  // popup can therefore be created before tryWrapDeviceEditorApi() has had a
  // chance to wrap openConfig()/openLayoutConfig(). Derive the source from the
  // popup's own IDX label as a race-free fallback, so Automation is available
  // on that first opening as well as every later opening.
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
    if (popup._dashticzDeviceRulesSource)
      return popup._dashticzDeviceRulesSource;
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
      rules: normaliseRules(entry.rules),
      customJsHandler: String(entry.customJsHandler || ''),
    };
  }

  function targetOptions(selected) {
    var keys = [];
    if (window.blocks && typeof window.blocks === 'object') {
      keys = Object.keys(window.blocks).filter(function (key) {
        return key && window.blocks[key] != null;
      });
    }
    if (selected && keys.indexOf(selected) === -1) keys.push(selected);
    keys.sort(function (a, b) {
      return String(a).localeCompare(String(b), undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    });
    var html = '<option value=""></option>';
    keys.forEach(function (key) {
      html +=
        '<option value="' +
        escapeHtml(key) +
        '"' +
        (String(key) === String(selected) ? ' selected' : '') +
        '>' +
        escapeHtml(key) +
        '</option>';
    });
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
    for (var i = 10; i <= 100; i += 5) {
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

  function ruleRowHtml(rule) {
    var t = text();
    rule = rule || {
      enabled: true,
      property: 'Status',
      operator: 'eq',
      value: 'On',
      target: '',
      className: '',
      style: defaultStyle('background-border-text'),
    };
    rule.style = normaliseStyle(rule.style, false);
    var noValue = rule.operator === 'empty' || rule.operator === 'notempty';
    return (
      '<div class="dt-device-rule border rounded p-2 mb-2">' +
      '<div class="d-flex justify-content-between align-items-center mb-2">' +
      '<label class="d-flex align-items-center gap-2 mb-0">' +
      '<span class="form-check form-switch m-0 p-0">' +
      '<input class="form-check-input dr-enabled m-0" type="checkbox" role="switch" style="width:4em;height:2em;float:none;"' +
      (rule.enabled !== false ? ' checked' : '') +
      '></span><span class="form-check-label">' +
      escapeHtml(t.enabled) +
      '</span></label>' +
      '<button type="button" class="btn btn-outline-danger btn-sm dr-remove" title="' +
      escapeHtml(t.remove) +
      '"><i class="fas fa-trash" aria-hidden="true"></i></button>' +
      '</div>' +
      '<div class="row g-2">' +
      '<div class="col-12 col-md-4"><label class="form-label small mb-1">' +
      escapeHtml(t.property) +
      '</label><input type="text" class="form-control form-control-sm dr-property" list="dt-device-rule-properties" value="' +
      escapeHtml(rule.property) +
      '"></div>' +
      '<div class="col-12 col-md-4"><label class="form-label small mb-1">' +
      escapeHtml(t.condition) +
      '</label><select class="form-select form-select-sm dr-operator">' +
      operatorOptions(rule.operator) +
      '</select></div>' +
      '<div class="col-12 col-md-4"><label class="form-label small mb-1">' +
      escapeHtml(t.value) +
      '</label><input type="text" class="form-control form-control-sm dr-value" value="' +
      escapeHtml(rule.value) +
      '"' +
      (noValue ? ' disabled' : '') +
      '></div>' +
      '<div class="col-12 col-md-6"><label class="form-label small mb-1">' +
      escapeHtml(t.target) +
      '</label><select class="form-select form-select-sm dr-target">' +
      targetOptions(rule.target) +
      '</select></div>' +
      '<div class="col-12 col-md-6"><label class="form-label small mb-1">' +
      escapeHtml(t.cssClass) +
      '</label><input type="text" class="form-control form-control-sm dr-class" value="' +
      escapeHtml(rule.className) +
      '" placeholder="warning_ketel"></div>' +
      '<div class="col-12"><label class="form-label small mb-1">' +
      escapeHtml(t.styling) +
      '</label><select class="form-select form-select-sm dr-style-mode">' +
      styleModeOptions(rule.style.mode) +
      '</select><div class="form-text">' +
      escapeHtml(t.styleHelp) +
      '</div></div>' +
      '<div class="col-12 dr-style-controls border-top mt-2 pt-2">' +
      '<div class="row g-2">' +
      '<div class="col-12 col-lg-4 dr-background-controls">' +
      '<div class="small fw-semibold mb-1">' +
      escapeHtml(t.background) +
      '</div><div class="d-flex gap-2 align-items-end">' +
      '<div class="flex-grow-1"><label class="form-label small mb-1">' +
      escapeHtml(t.backgroundColor) +
      '</label><input type="color" class="form-control form-control-color dr-background-color" value="' +
      escapeHtml(rule.style.backgroundColor) +
      '" title="' +
      escapeHtml(t.backgroundColor) +
      '"></div>' +
      '<div class="flex-grow-1"><label class="form-label small mb-1">' +
      escapeHtml(t.opacity) +
      '</label><select class="form-select form-select-sm dr-background-opacity">' +
      opacityOptions(rule.style.backgroundOpacity) +
      '</select></div></div></div>' +
      '<div class="col-12 col-lg-5 dr-border-controls">' +
      '<div class="small fw-semibold mb-1">' +
      escapeHtml(t.border) +
      '</div><div class="d-flex gap-2 align-items-end">' +
      '<div><label class="form-label small mb-1">' +
      escapeHtml(t.borderWidth) +
      '</label><select class="form-select form-select-sm dr-border-width">' +
      borderWidthOptions(rule.style.borderWidth) +
      '</select></div>' +
      '<div class="flex-grow-1"><label class="form-label small mb-1">' +
      escapeHtml(t.borderStyle) +
      '</label><select class="form-select form-select-sm dr-border-style">' +
      borderStyleOptions(rule.style.borderStyle) +
      '</select></div>' +
      '<div><label class="form-label small mb-1">' +
      escapeHtml(t.borderColor) +
      '</label><input type="color" class="form-control form-control-color dr-border-color" value="' +
      escapeHtml(rule.style.borderColor) +
      '" title="' +
      escapeHtml(t.borderColor) +
      '"></div></div></div>' +
      '<div class="col-12 col-lg-3 dr-text-controls">' +
      '<div class="small fw-semibold mb-1">' +
      escapeHtml(t.textColor) +
      '</div><label class="form-label small mb-1">' +
      escapeHtml(t.textColor) +
      '</label><input type="color" class="form-control form-control-color dr-text-color" value="' +
      escapeHtml(rule.style.textColor) +
      '" title="' +
      escapeHtml(t.textColor) +
      '"></div>' +
      '</div></div>' +
      '</div></div>'
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
      },
      false
    );
  }

  function readRuleRows($popup) {
    var rules = [];
    $popup.find('.dt-device-rule').each(function () {
      var $row = $(this);
      rules.push({
        enabled: $row.find('.dr-enabled').prop('checked') !== false,
        property: String($row.find('.dr-property').val() || '').trim(),
        operator: String($row.find('.dr-operator').val() || 'eq'),
        value: String($row.find('.dr-value').val() || ''),
        action: 'class',
        target: String($row.find('.dr-target').val() || '').trim(),
        className: String($row.find('.dr-class').val() || '').trim(),
        style: readStyleRow($row),
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
    $row.find('.dr-style-controls').toggleClass('d-none', !generated);
    $row
      .find('.dr-background-controls')
      .toggleClass('d-none', !modeUses(mode, 'background'));
    $row
      .find('.dr-border-controls')
      .toggleClass('d-none', !modeUses(mode, 'border'));
    $row
      .find('.dr-text-controls')
      .toggleClass('d-none', !modeUses(mode, 'text'));
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
      var target = String($row.find('.dr-target').val() || '').trim();
      var className = String($row.find('.dr-class').val() || '').trim();
      var styleMode = String($row.find('.dr-style-mode').val() || 'existing');
      if (!property || !target || !className) {
        valid = false;
        message = t.invalidRule;
        return;
      }
      if (operator !== 'empty' && operator !== 'notempty' && !value) {
        valid = false;
        message = t.invalidValue;
        return;
      }
      if (
        styleMode !== 'existing' &&
        !/^[A-Za-z_][A-Za-z0-9_-]*$/.test(className)
      ) {
        valid = false;
        message = t.invalidClass;
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

    if (!valid) {
      $popup.find('.de-config-message').addClass('text-danger').text(message);
    }
    return valid;
  }

  function hexToRgba(hex, opacity) {
    var value = validHexColor(hex, '#000000').substring(1);
    var r = parseInt(value.substring(0, 2), 16);
    var g = parseInt(value.substring(2, 4), 16);
    var b = parseInt(value.substring(4, 6), 16);
    var alpha = clampNumber(opacity, 0.05, 1, 1);
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha.toFixed(2) + ')';
  }

  function generatedDeclarations(style) {
    style = normaliseStyle(style, false);
    if (style.mode === 'existing') return [];
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

  function generatedCssForRules(rules) {
    var seen = {};
    var css = [];
    rules.forEach(function (rule) {
      if (!rule || !rule.style || rule.style.mode === 'existing') return;
      if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(rule.className)) return;
      var declarations = generatedDeclarations(rule.style);
      if (!declarations.length) return;
      // Last rule with a duplicate class wins, matching the server behaviour.
      seen[rule.className] =
        '.' + rule.className + ' {\n  ' + declarations.join('\n  ') + '\n}';
    });
    Object.keys(seen).forEach(function (className) {
      css.push(seen[className]);
    });
    return css.join('\n\n');
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
      // Fall through to the default below.
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
      return;
    }
    window[RULE_STORE_NAME][source] = {
      rules: rules,
      customJsHandler: handler,
    };
  }

  function activeCustomFolder() {
    var folder =
      window._CFG && window._CFG.customfolder
        ? String(window._CFG.customfolder)
        : 'custom';
    return folder.replace(/\/$/, '') || 'custom';
  }

  function saveDeviceRules($popup) {
    var source = popupSource($popup[0]);
    var rules = readRuleRows($popup);
    var handler = String($popup.find('.dr-handler').val() || '').trim();
    var phpPath =
      window.settings && window.settings.dashticz_php_path
        ? String(window.settings.dashticz_php_path)
        : 'js/';
    var cssFile = activeCssFilename();

    return $.getJSON(phpPath + 'info.php?get=csrf').then(function (data) {
      return $.ajax({
        url: SAVE_URL,
        method: 'POST',
        dataType: 'json',
        headers: { 'X-Dashticz-CSRF': data.token },
        data: {
          source: source,
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
      '</h6>' +
      '<p class="form-text">' +
      escapeHtml(t.help) +
      '</p>' +
      '<div class="small text-muted mb-2"><strong>' +
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
      '</summary>' +
      '<div class="mt-2"><label class="form-label small mb-1">' +
      escapeHtml(t.handler) +
      '</label>' +
      '<input type="text" class="form-control form-control-sm dr-handler" value="' +
      escapeHtml(handler) +
      '" placeholder="Party_Mode">' +
      '<div class="form-text">' +
      escapeHtml(t.handlerHelp) +
      '</div></div></details>' +
      '</div>';

    $customSection.before(html);
    var $rules = $popup.find('.dr-rules');
    rules.forEach(function (rule) {
      $rules.append(ruleRowHtml(rule));
    });

    $popup.find('.dt-device-rule').each(function () {
      updateValueState($(this));
      updateStyleState($(this));
    });
    updateEmptyMessage($popup);

    $popup.on('click.deviceRules', '.dr-add', function () {
      $rules.append(ruleRowHtml());
      var $newRule = $rules.find('.dt-device-rule').last();
      updateValueState($newRule);
      updateStyleState($newRule);
      updateEmptyMessage($popup);
      $newRule.find('.dr-property').trigger('focus');
    });

    $popup.on('click.deviceRules', '.dr-remove', function () {
      $(this).closest('.dt-device-rule').remove();
      updateEmptyMessage($popup);
    });

    $popup.on(
      'change.deviceRules input.deviceRules',
      '.dr-enabled,.dr-property,.dr-operator,.dr-value,.dr-target,.dr-class,.dr-style-mode,.dr-background-color,.dr-background-opacity,.dr-border-width,.dr-border-style,.dr-border-color,.dr-text-color,.dr-handler',
      function () {
        var $field = $(this);
        var $rule = $field.closest('.dt-device-rule');
        if ($field.hasClass('dr-operator')) updateValueState($rule);
        if ($field.hasClass('dr-style-mode')) updateStyleState($rule);
      }
    );

    // Save custom.js/custom.css first. Only after both managed files have been
    // updated successfully do we re-dispatch OK to Device Editor, which may
    // independently persist ordinary block presentation settings to CONFIG.js.
    // Device Rules themselves never enter that CONFIG.js payload.
    //
    // Bound on the popup (an ancestor of #de-config-ok), not on the button
    // itself. Device Editor's own click handler is already attached directly
    // to #de-config-ok by the time this popup is enhanced, and for listeners
    // on the same target element the capture flag does not decide execution
    // order - registration order does. A capture-phase listener on an
    // ancestor genuinely runs first, so this reliably intercepts the click
    // before Device Editor's own handler (which would otherwise persist/close
    // immediately and race with the save below).
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

        var rulesToSave = readRuleRows($popup);
        var handlerToSave = String(
          $popup.find('.dr-handler').val() || ''
        ).trim();

        // Nothing configured now and nothing stored before: there is
        // nothing for this feature to persist or clear, so let Device
        // Editor's own OK handler run immediately instead of round-tripping
        // to savedevicerules.php on every Device Config save - including
        // the vast majority that never touch Automation at all.
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

        saveDeviceRules($popup)
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
            $popup
              .find('.de-config-message')
              .addClass('text-danger')
              .text(message);
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
    // The Device Config popup is built dynamically and Device Editor itself is
    // lazy-loaded. Retry after the current DOM task and once after Bootstrap's
    // show transition, covering both the first-open race and slower devices.
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

      // MutationObserver normally sees the popup insertion, but Bootstrap's
      // modal events are an explicit second route. This also catches a popup
      // that existed before the observer was installed.
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
    process: process,
    enhancePopup: enhancePopup,
    tryWrap: tryWrapGetCustomFunction,
    generatedDeclarations: generatedDeclarations,
    generatedCssForRules: generatedCssForRules,
    sourceFromOrderKey: sourceFromOrderKey,
    configForSource: configForSource,
    inferPopupSource: inferPopupSource,
  };

  init();
})(window, document);

//# sourceURL=js/devicerules.js
