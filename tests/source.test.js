const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

// These tests verify source tokens and ordering, not a particular formatter's
// line wrapping. Make their regular expressions insensitive to whitespace so
// a clean Prettier pass cannot invalidate otherwise unchanged behavior. Text
// inside character classes remains untouched because whitespace is semantic
// there (for example, [^\n]).
function formattingInsensitivePattern(pattern) {
  let source = pattern.source;
  let result = '';
  let inCharacterClass = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '[' && !inCharacterClass) {
      inCharacterClass = true;
      result += character;
      continue;
    }
    if (character === ']' && inCharacterClass) {
      inCharacterClass = false;
      result += character;
      continue;
    }
    if (
      character === ',' &&
      !inCharacterClass &&
      /^(?:(?:\\s[+*?]?)|(?:\\[nrt])|\s)*(?:\\\}|\\\])/.test(
        source.slice(index + 1)
      )
    ) {
      // Prettier's ES5 mode adds trailing commas to multiline objects/arrays.
      continue;
    }
    if (character === ',' && !inCharacterClass) {
      const before = source.slice(0, index);
      const after = source.slice(index + 1);
      if (/\{\d*$/.test(before) && /^\d*\}/.test(after)) {
        result += character;
        continue;
      }
      result += index === source.length - 1 ? ',?' : ',\\s*';
      continue;
    }
    if (character === '\\' && !inCharacterClass) {
      const escaped = source[index + 1];
      if (escaped === 's') {
        result += '\\s*';
        index += 1;
        if (/[+*?]/.test(source[index + 1] || '')) index += 1;
        continue;
      }
      if (escaped === '.') {
        // Fluent calls may wrap immediately before the next property access.
        result += '\\s*\\.';
        index += 1;
        continue;
      }
      if (escaped === '(' || escaped === '[' || escaped === '{') {
        result += character + escaped + '\\s*';
        index += 1;
        continue;
      }
      if (escaped === ')' || escaped === ']' || escaped === '}') {
        result += '\\s*' + character + escaped;
        index += 1;
        continue;
      }
      result += character + (escaped || '');
      index += 1;
      continue;
    }
    if (!inCharacterClass && /\s/.test(character)) {
      result += '\\s*';
      while (/\s/.test(source[index + 1] || '')) index += 1;
      continue;
    }
    result += character;
  }
  return new RegExp(result, pattern.flags);
}

const exactMatch = assert.match.bind(assert);
const exactDoesNotMatch = assert.doesNotMatch.bind(assert);
function sourceWithoutFormatting(value) {
  return typeof value === 'string'
    ? value.replace(/,(\s*[}\]])/g, '$1')
    : value;
}
assert.match = function (actual, expected, message) {
  return exactMatch(
    sourceWithoutFormatting(actual),
    formattingInsensitivePattern(expected),
    message
  );
};
assert.doesNotMatch = function (actual, expected, message) {
  return exactDoesNotMatch(
    sourceWithoutFormatting(actual),
    formattingInsensitivePattern(expected),
    message
  );
};

function filesBelow(directory, extension) {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...filesBelow(fullPath, extension));
    else if (entry.isFile() && fullPath.endsWith(extension))
      result.push(fullPath);
  }
  return result;
}

function parseLocation(search) {
  const source = fs.readFileSync(path.join(root, 'js/functions.js'), 'utf8');
  const start = source.indexOf('function getLocationParameters()');
  const end = source.indexOf('\nfunction toLower', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const context = {
    window: { location: { search } },
    result: null,
  };
  vm.runInNewContext(
    source.substring(start, end) + '\nresult = getLocationParameters();',
    context
  );
  return Object.assign({}, context.result);
}

function compareVersions(left, right) {
  const source = fs.readFileSync(path.join(root, 'js/version.js'), 'utf8');
  const start = source.indexOf('function compareVersions(left, right)');
  const end = source.indexOf(
    '\n// eslint-disable-next-line no-unused-vars\nfunction initVersion()',
    start
  );
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const context = { left, right, result: null };
  vm.runInNewContext(
    source.substring(start, end) + '\nresult = compareVersions(left, right);',
    context
  );
  return context.result;
}

test('all application JavaScript files pass a syntax check', () => {
  const files = [
    ...filesBelow(path.join(root, 'js'), '.js'),
    ...filesBelow(path.join(root, 'src'), '.js'),
  ];
  for (const file of files) {
    const result = spawnSync(process.execPath, ['--check', file], {
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr || file);
  }
});

test('screen switcher subscribes to Swiper events using Swiper event names', () => {
  const source = fs.readFileSync(
    path.join(root, 'js/screenswitcher.js'),
    'utf8'
  );

  assert.match(source, /myswiper\.on\('slideChange', onSwiperChange\)/);
  assert.match(source, /myswiper\.on\('transitionEnd', onSwiperChange\)/);
  assert.doesNotMatch(
    source,
    /myswiper\.on\('(?:slideChange|transitionEnd)\.screenswitcher'/
  );
});

test('first-run setup uses its own wizard and removes the legacy browser fallback', () => {
  const source = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
  const settings = fs.readFileSync(path.join(root, 'js/settings.js'), 'utf8');

  assert.match(source, /localStorage\.removeItem\('dashticz_setup_config'\)/);
  assert.match(source, /source\.trim\(\) === '#EMPTY#'/);
  assert.match(source, /dataFilter: function \(source\)/);
  assert.match(source, /firstRunSetupRequired = true/);
  assert.match(source, /return checkSetupWriteAccess\(\)/);
  assert.match(source, /url: 'js\/checkconfigaccess\.php'/);
  assert.match(source, /Configuration permissions/);
  assert.match(source, /Check again/);
  assert.match(source, /showSetupWizard\(\)/);
  assert.match(source, /id="dt-setup-wizard"/);
  assert.match(source, /url: configEditorUrl\('js\/savesettings\.php'\)/);
  assert.match(source, /id: 'topbar_timeout',[\s\S]*?def: '5'/);
  assert.doesNotMatch(source, /section: 'Scherm &amp; Navigatie'/);
  assert.doesNotMatch(source, /section: 'Weergave &amp; Overig'/);
  assert.doesNotMatch(settings, /firstRunSetupRequired/);
  assert.match(settings, /id="settingspopup"/);
  assert.doesNotMatch(
    settings,
    /getOrCreateInstance\(\s*document\.getElementById\('settingspopup'\)/
  );
  assert.doesNotMatch(settings, /localStorage\.setItem\('dashticz_'/);
  assert.doesNotMatch(source, /localStorage\.setItem\('dashticz_setup_config'/);
  assert.doesNotMatch(source, /storeSetupConfig/);
});

test('first-run setup hands off to the Custom/Wizard mode picker after reload', () => {
  const main = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
  const simpleBlock = fs.readFileSync(
    path.join(root, 'js/components/simpleblock.js'),
    'utf8'
  );

  const saveHandler = main.slice(
    main.indexOf("$('#dt-setup-save').on('click'")
  );
  assert.match(
    saveHandler,
    /sessionStorage\.setItem\('dashticz_show_mode_picker', '1'\)/
  );
  const doneIndex = saveHandler.indexOf('.done(function ()');
  const reloadIndex = saveHandler.indexOf('window.location.reload();');
  const setItemIndex = saveHandler.indexOf(
    "sessionStorage.setItem('dashticz_show_mode_picker', '1')"
  );
  assert.ok(doneIndex < setItemIndex && setItemIndex < reloadIndex);

  assert.match(simpleBlock, /function _openPendingConfigModePicker\(\)/);
  assert.match(
    simpleBlock,
    /sessionStorage\.getItem\('dashticz_show_mode_picker'\)/
  );
  assert.match(simpleBlock, /_openPendingConfigModePicker\(\);\s*\n\s*break;/);
  assert.match(
    simpleBlock,
    /if \(mode === currentMode\) \{\s*\n\s*_closeConfigModePicker\(\);/
  );
});

test('update scripts create a valid empty CONFIG.js instead of an unparsable stub', () => {
  for (const file of ['update.sh', 'updatebeta.sh']) {
    const script = fs.readFileSync(path.join(root, file), 'utf8');

    // Only one config-check block; the old copy-pasted duplicate is gone.
    assert.equal(
      (script.match(/# --- Configuration check and update ---/g) || []).length,
      1,
      `${file} has a single config-check block`
    );
    assert.match(script, /printf '%s\\n' '#EMPTY#' > "\$CONFIG_FILE"/);
    assert.doesNotMatch(script, /touch "\$CONFIG_FILE"/);
    // The default-lines injection must stay scoped to the "file already
    // exists" branch, never applied to a freshly created file.
    assert.match(
      script,
      /printf '%s\\n' '#EMPTY#' > "\$CONFIG_FILE"[\s\S]*?else\s*\n\s*CONFIG_LINE_1='config\["topbar_timeout"\] = 5;'/
    );
  }
});

test('installer accepts an optional target directory', () => {
  const installer = fs.readFileSync(path.join(root, 'install.sh'), 'utf8');
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const installDocs = fs.readFileSync(
    path.join(root, 'docs/gettingstarted/automaticinstall.rst'),
    'utf8'
  );

  assert.match(installer, /INSTALL_DIR="\$\{DASHTICZ_INSTALL_DIR:-dashticz\}"/);
  assert.match(installer, /-d\|--directory/);
  assert.match(installer, /--directory=\*/);
  assert.match(installer, /Only one installation directory can be specified/);
  assert.match(installer, /git clone[\s\S]*"\$INSTALL_DIR"/);
  assert.match(readme, /-- --directory \/var\/www\/html\/my-dashboard/);
  assert.match(installDocs, /-- --directory \/var\/www\/html\/my-dashboard/);
  assert.match(readme, /-- -d \/var\/www\/html\/my-dashboard/);
  assert.match(readme, /-- --directory=\/var\/www\/html\/my-dashboard/);
  assert.match(readme, /DASHTICZ_INSTALL_DIR=\/var\/www\/html\/my-dashboard/);
  assert.match(readme, /-- --help/);
  assert.match(installDocs, /-- -d \/var\/www\/html\/my-dashboard/);
  assert.match(
    installDocs,
    /DASHTICZ_INSTALL_DIR=\/var\/www\/html\/my-dashboard/
  );
  assert.match(readme, /file mode `0644`/);
  assert.match(installDocs, /file mode ``0644``/);
});

test('all project JSON files parse', () => {
  const ignored = new Set(['node_modules', '.git']);
  function collect(directory) {
    const result = [];
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && ignored.has(entry.name)) continue;
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) result.push(...collect(fullPath));
      else if (entry.isFile() && fullPath.endsWith('.json'))
        result.push(fullPath);
    }
    return result;
  }

  for (const file of collect(root)) {
    const source = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
    assert.doesNotThrow(() => JSON.parse(source), file);
  }
});

test('the saved Settings language overrides a stale browser language', () => {
  const main = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
  const settings = fs.readFileSync(path.join(root, 'js/settings.js'), 'utf8');
  const configLanguage = main.indexOf('setLang = config.language');
  const browserLanguage = main.indexOf(
    'setLang = localStorage.dashticz_language'
  );

  assert.notEqual(configLanguage, -1);
  assert.notEqual(browserLanguage, -1);
  assert.ok(configLanguage < browserLanguage);
  assert.match(
    settings,
    /localStorage\.dashticz_language = JSON\.parse\(selectedLanguage\)/
  );
});

test('settings and widget UI use JSON translations with an English base', () => {
  const main = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
  const settingsSource = fs.readFileSync(
    path.join(root, 'js/settings.js'),
    'utf8'
  );
  const widgetEditor = fs.readFileSync(
    path.join(root, 'js/widgeteditor.js'),
    'utf8'
  );
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );
  const layoutEditor = fs.readFileSync(
    path.join(root, 'js/layouteditor.js'),
    'utf8'
  );
  const simpleBlock = fs.readFileSync(
    path.join(root, 'js/components/simpleblock.js'),
    'utf8'
  );
  const english = JSON.parse(
    fs.readFileSync(path.join(root, 'lang/en_US.json'), 'utf8')
  );
  const french = JSON.parse(
    fs.readFileSync(path.join(root, 'lang/fr_FR.json'), 'utf8')
  );

  assert.match(main, /url: 'lang\/en_US\.json/);
  assert.match(main, /\$\.extend\(true, \{\}, english, selected\)/);
  assert.match(main, /language = english/);
  assert.ok(english.settings.layouteditor);
  assert.ok(english.settings.output);
  assert.ok(english.settings.widgeteditor.xmltvguide_title);
  assert.ok(english.settings.screen.topbar_use_png_icons_help);
  assert.ok(french.settings.layouteditor.conversion_confirm);
  assert.ok(french.settings.screen.topbar_use_png_icons_help);

  const widgetKeys = Array.from(
    widgetEditor.matchAll(/_t\(\s*['"]([^'"]+)['"]/g),
    (match) => match[1]
  );
  for (const key of new Set(widgetKeys)) {
    assert.ok(
      english.settings.widgeteditor[key],
      `missing English widget-editor translation: ${key}`
    );
  }

  for (const source of [
    settingsSource,
    widgetEditor,
    deviceEditor,
    layoutEditor,
    simpleBlock,
  ]) {
    assert.doesNotMatch(
      source,
      /Wizard gebruikt|Tegel verwijderd|Geen tegels|Devices toevoegen|Widgets toevoegen|Tegels verplaatsen|Custom iconen topbalk|Aan: Custom iconen/
    );
  }
  assert.match(layoutEditor, /language\.settings\.layouteditor/);
  assert.match(deviceEditor, /language\.settings\.deviceeditor/);
  assert.match(
    simpleBlock,
    /function _showConfigModeWarning\(mode, onContinue\)/
  );
  assert.match(simpleBlock, /labels\.confirm_wizard/);
  assert.match(simpleBlock, /labels\.confirm_custom/);
});

test('built-in widget titles use the active language', () => {
  const dashticz = fs.readFileSync(path.join(root, 'js/dashticz.js'), 'utf8');

  assert.match(dashticz, /function getWidgetTitle\(block, special\)/);
  assert.match(dashticz, /garbage: 'garbage_title'/);
  assert.match(dashticz, /weather: 'weather_title'/);
  assert.match(dashticz, /cfg\.title = widgetTitle/);
  assert.doesNotMatch(dashticz, /block\.title === 'Afval'/);
});

test('favicon assets stay minimal and all references resolve', () => {
  const faviconDirectory = path.join(root, 'img/favicon');
  assert.deepEqual(fs.readdirSync(faviconDirectory).sort(), [
    'app-icon-192x192.png',
    'favicon.ico',
  ]);

  for (const relativeFile of ['index.html', 'tools/log.html']) {
    const source = fs.readFileSync(path.join(root, relativeFile), 'utf8');
    const references = Array.from(
      source.matchAll(
        /(?:href|src|content)="(img\/favicon\/[^"?]+)(?:\?[^\"]*)?"/g
      ),
      (match) => match[1]
    );
    assert.ok(references.length >= 2, relativeFile);
    for (const reference of references) {
      assert.ok(fs.existsSync(path.join(root, reference)), reference);
    }
  }
});

test('location parameters preserve equals signs and decode plus signs', () => {
  assert.deepEqual(parseLocation('?token=a%3Db%3Dc&name=Jane+Doe'), {
    token: 'a=b=c',
    name: 'Jane Doe',
  });
});

test('location parameters ignore malformed and prototype keys', () => {
  assert.deepEqual(
    parseLocation('?bad=%E0%A4%A&__proto__=polluted&constructor=nope&ok=yes'),
    { ok: 'yes' }
  );
});

test('update check only treats a newer remote version as an update', () => {
  assert.equal(compareVersions('3.19', '3.20.0'), -1);
  assert.equal(compareVersions('3.20', '3.20.0'), 0);
  assert.equal(compareVersions('3.20.0', '3.19.2.0'), 1);
  assert.equal(compareVersions('3.20.1', '3.20.0'), 1);
});

test('info panel retains versions and follows the checkout remote', () => {
  const domoticz = fs.readFileSync(
    path.join(root, 'js/domoticz-api.js'),
    'utf8'
  );
  const settings = fs.readFileSync(path.join(root, 'js/settings.js'), 'utf8');
  const version = fs.readFileSync(path.join(root, 'js/version.js'), 'utf8');
  const info = fs.readFileSync(
    path.join(root, 'vendor/dashticz/info.php'),
    'utf8'
  );

  assert.match(domoticz, /versionText: ''/);
  assert.match(domoticz, /dzVentsVersion: ''/);
  assert.match(domoticz, /pythonVersion: ''/);
  assert.match(settings, /info\.php\?get=systeminfo/);
  assert.match(settings, /formatSystemInfo/);
  assert.match(settings, /domoticzInfo\.versionText/);
  assert.match(settings, /about\.os_version/);
  assert.match(version, /info\.php\?get=gitinfo/);
  assert.match(version, /source\.owner/);
  assert.match(version, /source\.repository/);
  assert.match(info, /case 'systeminfo'/);
  assert.match(info, /case 'gitinfo'/);
  assert.match(info, /PHP_OS_FAMILY/);
  assert.match(info, /\/etc\/os-release/);
  assert.doesNotMatch(info, /shell_exec|exec\(|passthru|system\(/);
});

test('package and runtime versions remain synchronized', () => {
  const packageVersion = JSON.parse(
    fs.readFileSync(path.join(root, 'package.json'), 'utf8')
  ).version;
  const runtimeVersion = JSON.parse(
    fs.readFileSync(path.join(root, 'version.txt'), 'utf8')
  ).version;
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const descriptionVersion = index.match(
    /content="Dashticz ([^"]+) - a customizable dashboard for Domoticz"/
  );
  // The loading screen's version line is a static placeholder shown before
  // js/version.js's initVersion() fetches version.txt and overwrites it -
  // it must start in sync so a stale number never flashes on first paint.
  const loaderVersion = index.match(
    /<div class="loaderVersion">Version ([^<]+)<\/div>/
  );
  assert.equal(runtimeVersion, packageVersion);
  assert.ok(descriptionVersion);
  assert.equal(descriptionVersion[1], packageVersion);
  assert.ok(loaderVersion);
  assert.equal(loaderVersion[1], packageVersion);
});

test('JavaScript and stylesheet bundles use the same cache version', () => {
  const loader = fs.readFileSync(path.join(root, 'js/loader.js'), 'utf8');
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const loaderVersion = loader.match(/_DASHTICZ_VERSION = (\d+)/);
  const stylesheetVersion = index.match(/bundle\.css\?v=(\d+)/);
  assert.ok(loaderVersion);
  assert.ok(stylesheetVersion);
  assert.equal(stylesheetVersion[1], loaderVersion[1]);
});

test('security-sensitive regressions stay fixed', () => {
  const domoticz = fs.readFileSync(
    path.join(root, 'js/domoticz-api.js'),
    'utf8'
  );
  const loader = fs.readFileSync(path.join(root, 'js/loader.js'), 'utf8');
  const camera = fs.readFileSync(
    path.join(root, 'js/components/camera.js'),
    'utf8'
  );

  assert.match(domoticz, /initialUpdate\.state\(\) !== 'resolved'/);
  assert.match(domoticz, /delete callbackList\[currentRequestId\]/);
  assert.match(loader, /}, \$\.Deferred\(\)\.resolve\(\)\)/);
  assert.match(camera, /trayopentimer = setTimeout/);
  assert.doesNotMatch(camera, /trayopentimer = setInterval/);
});

test('one failing block cannot stop the remaining screen blocks', () => {
  const source = fs.readFileSync(path.join(root, 'js/blocks.js'), 'utf8');
  const lifecycle = fs.readFileSync(path.join(root, 'js/dashticz.js'), 'utf8');
  assert.match(source, /catch \(error\) \{\s*renderUnavailableBlock\(/);
  assert.match(source, /function renderUnavailableBlock\(/);
  assert.match(source, /Unable to mount block/);
  assert.match(lifecycle, /Device update failed for block/);
});

test('configured topbar timeout loads and initializes the auto-hide behavior', () => {
  const main = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
  const topbar = fs.readFileSync(path.join(root, 'js/topbar.js'), 'utf8');
  const settings = fs.readFileSync(path.join(root, 'js/settings.js'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');

  assert.match(
    main,
    /buildScreens\(\);\s*DT_function\.loadDTScript\('js\/topbar\.js'\)\.then/
  );
  assert.match(main, /DashticzTopbar\.init\(\)/);
  assert.match(
    main,
    /Number\(settings\['hide_topbar'\]\) !== 1 \|\|\s*Number\(settings\['topbar_timeout'\]\) > 0/
  );
  assert.match(topbar, /settings\['topbar_timeout'\]/);
  assert.match(topbar, /getBars\(\)\.slideUp\(400\)/);
  assert.match(topbar, /getBars\(\)\.slideDown\(400,/);
  assert.match(topbar, /\.css\('display', 'flex'\)/);
  assert.doesNotMatch(styles, /\.colbar\s*\{[^}]*display:\s*flex !important;/s);
  assert.doesNotMatch(main, /id: 'editmode'/);
  assert.equal(fs.existsSync(path.join(root, 'js/editmode.js')), false);
  assert.match(settings, /settingList\['screen'\]\['topbar_timeout'\]/);
  assert.match(settings, /topbar_timeout:/);
});

test('visual layout editor handles generated devices and widgets on a 10px height grid', () => {
  const simpleBlock = fs.readFileSync(
    path.join(root, 'js/components/simpleblock.js'),
    'utf8'
  );
  const editor = fs.readFileSync(path.join(root, 'js/layouteditor.js'), 'utf8');
  const domoticzBlock = fs.readFileSync(
    path.join(root, 'js/components/domoticzblock.js'),
    'utf8'
  );
  const stylesheet = fs.readFileSync(
    path.join(root, 'css/creative.css'),
    'utf8'
  );
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );
  const modernDark = fs.readFileSync(
    path.join(root, 'themes/modern-dark/modern-dark.css'),
    'utf8'
  );

  assert.match(simpleBlock, /layouteditoricon/);
  assert.match(simpleBlock, /fas fa-plus/);
  assert.match(simpleBlock, /js\/layouteditor\.js/);
  assert.match(editor, /var HEIGHT_STEP = 10/);
  assert.match(editor, /\(de\|we\|le\)_s\\d\+_col/);
  assert.match(editor, /\(de\|we\|le\)_col/);
  assert.match(editor, /col_\\d\+/);
  assert.match(editor, /screen: screenNumber/);
  assert.match(editor, /function _activeScreenPayload/);
  assert.match(editor, /col-xs-/);
  assert.match(editor, /(?:widgetEntry|deviceEntry)\.height = item\.height/);
  assert.match(editor, /dle-cancel/);
  assert.match(editor, /function _moveDraggedItem/);
  assert.match(editor, /function _removeItem/);
  assert.match(editor, /dle-remove-button/);
  // Removing a tile is destructive enough (and the "-" button small enough
  // to mis-click) to ask for confirmation first, matching the existing
  // window.confirm() pattern used for screen deletion (screenswitcher.js)
  // and the Wizard grid conversion (convertCurrentScreenToGrid() above).
  assert.match(
    editor,
    /window\.confirm\(_t\('remove_confirm'\)\)\)\s*_removeItem\(item\)/
  );
  assert.match(editor, /dle-config-button/);
  assert.match(editor, /function _openItemConfig/);
  assert.match(
    editor,
    /DashticzDeviceEditor\.openLayoutConfig\(item\.reference\)/
  );
  assert.match(
    editor,
    /DashticzWidgetEditor\.openLayoutConfig\(item\.widgetId\)/
  );
  assert.match(deviceEditor, /function openConfig\(reference\)/);
  assert.match(deviceEditor, /function openLayoutConfig\(reference\)/);
  assert.match(
    domoticzBlock,
    /document\.body\.classList\.contains\('dle-active'\)\) return;/
  );
  assert.match(stylesheet, /> \.dle-block \{[\s\S]*height: 100% !important;/);
  const blocksSource = fs.readFileSync(path.join(root, 'js/blocks.js'), 'utf8');
  assert.match(blocksSource, /children\('\.dle-overlay'\)\.detach\(\)/);
  assert.match(blocksSource, /var oldLayoutEditorBlocks = \$div\.toArray\(\)/);
  assert.match(
    blocksSource,
    /DashticzLayoutEditor\.replaceBlockReference\(oldBlock, newBlock\)/
  );
  assert.match(editor, /function replaceBlockReference\(oldBlock, newBlock\)/);
  assert.match(editor, /original\.block = newBlock/);
  assert.match(editor, /replaceBlockReference: replaceBlockReference/);
  assert.match(
    editor,
    /\$editingScreen[\s\S]*find\('\.dle-overlay'\)[\s\S]*remove\(\)/
  );
  assert.match(editor, /js\/savewidgets\.php/);
  assert.match(editor, /js\/savelayout\.php/);
  assert.match(editor, /js\/savegridlayout\.php/);
  assert.match(editor, /function _collectGridItems/);
  assert.match(editor, /function convertCurrentScreenToGrid/);
  assert.match(editor, /function _buildColumnGridConversion/);
  assert.match(editor, /function _emptyGridConversion/);
  assert.match(editor, /var allowEmpty = targetMode === 'wizard'/);
  assert.match(
    editor,
    /if \(allowEmpty\) return _emptyGridConversion\(screenNumber\)/
  );
  assert.match(editor, /convertCurrentScreenToGrid\(false, 'wizard'\)/);
  assert.match(editor, /if \(gridCollectionError\) \{/);
  assert.doesNotMatch(editor, /gridCollectionError \|\| !items\.length/);
  assert.match(editor, /function _firstFreeGridPosition/);
  assert.match(editor, /function _moveGridItem/);
  assert.match(editor, /function _resizeGridItem/);
  assert.match(editor, /function _saveScreenPayload/);
  assert.match(editor, /--dt-grid-x/);
  assert.match(editor, /--dt-grid-h/);
  assert.match(simpleBlock, /_showConfigModeWarning\(mode, function \(\)/);
  assert.match(simpleBlock, /convertCurrentScreenToGrid\(\s*true,\s*'wizard'/);
  assert.match(editor, /widgetResult\.blockKeys/);
  assert.match(editor, /widget_alarmmeldingen: 'alarmmeldingen'/);
  assert.match(editor, /widgets\.push\(_widgetPayload\(item\)\)/);
  assert.match(
    editor,
    /definition\.rss \|\| 'https:\/\/www\.alarmeringen\.nl\/feeds\/all\.rss'/
  );
  assert.match(
    editor,
    /if \(definition\.filter\) entry\.filter = definition\.filter/
  );
  assert.match(editor, /_startDrag\(event, item, \$canvas\[0\]\)/);
  assert.match(
    editor,
    /\$\(item\.visibleBlocks\)[\s\S]*children\('\.dle-overlay'\)/
  );
  assert.match(editor, /appendChild\(item\.wrapper\)/);
  assert.match(editor, /--dle-column-span/);
  assert.match(editor, /X-Dashticz-CSRF/);
  assert.match(stylesheet, /grid-template-columns: repeat\(12/);
  assert.match(stylesheet, /\.dle-item-wrapper \{\s*display: contents/);
  assert.match(stylesheet, /\.dle-item-wrapper > \.dle-block/);
  assert.match(stylesheet, /\.dle-remove-button/);
  assert.match(stylesheet, /\.dle-config-button/);
  assert.match(stylesheet, /background: #dc3545/);
  assert.match(stylesheet, /\.dle-size-label \{[\s\S]*bottom: 4px/);
  assert.match(
    deviceEditor,
    /var ck\s+= String\(\$\(this\)\.attr\('data-ck'\)\)/
  );
  assert.match(deviceEditor, /function _activeScreenPayload/);
  assert.match(deviceEditor, /function _activeScreenDom/);
  assert.match(deviceEditor, /function _stableDeviceReference/);
  assert.match(deviceEditor, /key:\s+_stableDeviceReference\(ck\)/);
  assert.doesNotMatch(
    deviceEditor,
    /entry\.key = gridRefs\[_deviceOrderKey\(ck\)\]/
  );
  assert.match(deviceEditor, /\$activeScreen\.find\('\[data-colindex\]'\)/);
  assert.match(deviceEditor, /screen: _activeScreenPayload\(\)/);
  assert.match(deviceEditor, /function _widgetFromReference/);
  assert.match(
    deviceEditor,
    /widget_alarmmeldingen:\s+\{ id: 'alarmmeldingen',\s+title: translatedTitles\.alarmmeldingen \}/
  );
  assert.match(deviceEditor, /_widgetPayload\(orderKey\)/);
  assert.match(deviceEditor, /widget_prefix/);
  assert.match(deviceEditor, /var managedOrder/);
  assert.match(deviceEditor, /js\/savewidgets\.php/);
  assert.match(deviceEditor, /js\/savelayout\.php/);
  assert.match(deviceEditor, /js\/savegridlayout\.php/);
  assert.match(deviceEditor, /blocksOnly: gridMode/);
  assert.match(deviceEditor, /function _getAllManagedGridItems/);
  assert.match(deviceEditor, /data-order-key/);
  assert.match(deviceEditor, /de-width-input[\s\S]*value="3"/);
  assert.match(deviceEditor, /if \(!width\) width = 3/);
  assert.match(modernDark, /--height-block-default: 120px/);
  assert.match(
    modernDark,
    /\.mh \{[\s\S]*height: var\(--height-block-default\) !important/
  );
  assert.match(domoticzBlock, /applyConfiguredHeight/);
  assert.match(domoticzBlock, /setProperty\('height'.*'important'\)/s);
  assert.match(
    blocksSource,
    /Object\.defineProperty\(block, '_dashticzAutoTitle'/
  );
  assert.match(blocksSource, /value: typeof block\.title === 'undefined'/);
  assert.match(
    blocksSource,
    /Object\.defineProperty\(block, 'title',[\s\S]*value: device\.Name[\s\S]*enumerable: false/
  );
});

test('Layout Editor stays active across screen switches, editing each screen independently', () => {
  const editor = fs.readFileSync(path.join(root, 'js/layouteditor.js'), 'utf8');

  // Switching screens while the editor is open must not leave the editor
  // bound only to the screen it was opened on: a session is captured per
  // screen and swapped back in when that screen is revisited.
  assert.match(editor, /function _captureSession/);
  assert.match(editor, /function _restoreSession/);
  assert.match(editor, /function _switchActiveScreen/);
  assert.match(editor, /function _initializeScreenSession/);
  assert.match(editor, /var sessions = \{\}/);
  assert.match(editor, /var currentSessionKey = null/);

  // Screen navigation must be observed both through Swiper (slideChange /
  // transitionEnd, used by numbered screens) and through the topbar's S/1/
  // 2/... buttons directly (used to enter/leave standby, which never fires
  // a Swiper event).
  assert.match(editor, /function _bindScreenNavigation/);
  assert.match(editor, /function _onScreenNavigated/);
  assert.match(editor, /myswiper\.on\('slideChange', _onScreenNavigated\)/);
  assert.match(editor, /myswiper\.on\('transitionEnd', _onScreenNavigated\)/);
  assert.match(editor, /\.on\('click\.layouteditorscreen', '\.dt-screen-btn'/);

  // A screen that would need a full Wizard grid-conversion round trip must
  // never be pulled into an already-open multi-screen edit: that round
  // trip reloads the page, which would silently discard any edits already
  // pending on other screens in the same editing round.
  assert.match(
    editor,
    /_initializeScreenSession[\s\S]*never falls back to the Wizard grid-conversion flow/
  );

  // Save and Cancel must both walk every session that was actually
  // prepared during this editing round, not just the one currently on
  // screen.
  assert.match(editor, /function _buildSavePayloads/);
  assert.match(
    editor,
    /_buildSavePayloads[\s\S]*Object\.keys\(sessions\)\.map/
  );
  assert.match(editor, /function _revertScreenDom/);
  assert.match(
    editor,
    /_cancel[\s\S]*Object\.keys\(sessions\)\.forEach\(function \(key\) \{\s*_restoreSession\(sessions\[key\]\);\s*_revertScreenDom\(\);/
  );

  // A live Domoticz refresh can replace a device's DOM element on any
  // screen, not just the one currently active in the editor; the stored
  // item reference must be updated wherever it lives.
  assert.match(
    editor,
    /replaceBlockReference[\s\S]*Object\.keys\(sessions\)\.forEach/
  );

  // Re-running the overlay/toolbar bindings must stay idempotent: a new
  // screen session calls _attachHandlers() again, and without unbinding
  // the toolbar's previous handlers first, Save/Cancel would fire once per
  // screen visited instead of once per click.
  assert.match(
    editor,
    /\$toolbar\s*\.off\('\.layouteditor'\)\s*\.on\('click\.layouteditor', '\.dle-cancel'/
  );
});

test('Add items menu grafts new devices/widgets/separators into an open Layout Editor instead of closing it', () => {
  const editor = fs.readFileSync(path.join(root, 'js/layouteditor.js'), 'utf8');
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );
  const widgetEditor = fs.readFileSync(
    path.join(root, 'js/widgeteditor.js'),
    'utf8'
  );

  // The Layout Editor exposes a way to check whether it is open and to add
  // brand-new tiles into its current session without a server round trip.
  assert.match(editor, /isActive: function \(\) \{\s*return active;\s*\}/);
  assert.match(editor, /addPendingItems: addPendingItems/);
  assert.match(editor, /function addPendingItems\(entries\)/);
  assert.match(editor, /function _addPendingItem\(entry\)/);
  assert.match(editor, /Dashticz\.mountNewContainer\(\$canvas\[0\]\)/);
  assert.match(editor, /isPending: true/);

  // A pending item has no persisted config yet, so its gear-icon config
  // button must not be offered - only after the Layout Editor's own Save
  // has actually persisted it.
  assert.match(editor, /var isConfigurable =\s*!item\.isPending/);

  // Cancel must remove a never-saved pending item outright rather than try
  // to revert it to a prior state it never had.
  assert.match(
    editor,
    /if \(item\.isPending\) \{[\s\S]*removeChild\(item\.wrapper\)/
  );

  // Both editors capture a baseline of what was already on the screen when
  // their popup opened, and only graft when the Layout Editor is active -
  // otherwise their normal persist-and-reload Save is untouched.
  [deviceEditor, widgetEditor].forEach((source) => {
    assert.match(source, /var layoutEditorBaseline = null/);
    assert.match(source, /function _graftIntoLayoutEditor\(\)/);
    assert.match(source, /DashticzLayoutEditor\.isActive\(\)/);
    assert.match(source, /DashticzLayoutEditor\.addPendingItems\(entries\)/);
    assert.match(
      source,
      /if \(layoutEditorBaseline && _graftIntoLayoutEditor\(\)\) return;/
    );
  });

  // Grafting is scoped to what the Layout Editor's item model can actually
  // represent and re-save later (device/widget/separator); anything else
  // (custom/multi-device/group/HTML block/slide button), or a Save that
  // also touched pre-existing entries, must fall back to the normal save.
  assert.match(
    deviceEditor,
    /managedSpecials\[orderKey\]\.specialType === 'title'/
  );
  assert.match(deviceEditor, /if \(!existingUntouched\) return false;/);
});

test('a pending item grafted into a grid screen declares its block instead of failing "not declared" (#161)', () => {
  const editor = fs.readFileSync(path.join(root, 'js/layouteditor.js'), 'utf8');
  const saveGridLayout = fs.readFileSync(
    path.join(root, 'js/savegridlayout.php'),
    'utf8'
  );

  // savegridlayout.php only accepts a ref that is either already declared,
  // or accompanied by a `create` descriptor - ref alone (what a plain
  // reposition/resize save always sent, before pending items existed) is
  // rejected for anything undeclared.
  assert.match(
    saveGridLayout,
    /Grid block is not declared and cannot be created\./
  );
  assert.match(saveGridLayout, /isset\(\$entry\['create'\]\)/);

  // A pending grid item's save must carry a `create` descriptor built from
  // the item itself, not just {ref, grid} - matching what the Wizard's own
  // grid conversion already sends via _gridCreateDefinition.
  assert.match(editor, /function _gridCreateForPendingItem\(item\)/);
  assert.match(
    editor,
    /items: _orderedItems\(\)\.map\(function \(item\) \{\s*var entry = \{ ref: item\.reference, grid: \$\.extend\(\{\}, item\.grid\) \};\s*if \(item\.isPending\) \{\s*var create = _gridCreateForPendingItem\(item\);\s*if \(create\) entry\.create = create;/
  );

  // `kind: 'inline'` is used uniformly (not the narrower `kind: 'device'`,
  // which PHP-casts idx with (int) and would zero out a Domoticz
  // group/scene idx like "s1") for every pending kind the Layout Editor
  // can graft.
  assert.match(
    editor,
    /_gridCreateForPendingItem[\s\S]*kind: 'inline',\s*name: item\.name \|\| item\.kind,\s*propsJson: JSON\.stringify\(props\)/
  );

  // A widget dispatched by its literal block key (log/sunrise/streamplayer
  // - see Dashticz.mount in js/dashticz.js) must be declared under exactly
  // that key, not a synthesized 'widget_<id>' one, or it silently fails to
  // render after the reload following Save.
  assert.match(editor, /log: \{ key: 'log', type: 'log' \}/);
  assert.match(editor, /sunrise: \{ key: 'sunrise', type: 'sunrise' \}/);
  assert.match(
    editor,
    /radio: \{ key: 'streamplayer', type: 'streamplayer' \}/
  );
  assert.match(editor, /_widgetKeyAndType\(entry\.widgetId\)\.key/);
});

test('screen editor add menu exposes device, widget, custom-device and separator workflows', () => {
  const simpleBlock = fs.readFileSync(
    path.join(root, 'js/components/simpleblock.js'),
    'utf8'
  );
  const screenSwitcher = fs.readFileSync(
    path.join(root, 'js/screenswitcher.js'),
    'utf8'
  );
  const editor = fs.readFileSync(path.join(root, 'js/deviceeditor.js'), 'utf8');
  const writer = fs.readFileSync(
    path.join(root, 'js/configwriter.php'),
    'utf8'
  );
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');

  assert.match(simpleBlock, /screeneditoraddicon d-none/);
  assert.match(simpleBlock, /fas fa-wand-magic-sparkles/);
  assert.match(simpleBlock, /action: 'device'/);
  assert.match(simpleBlock, /label: t\.add_device/);
  assert.doesNotMatch(simpleBlock, /fas fa-magic/);
  assert.match(simpleBlock, /action: 'widgets'/);
  assert.match(simpleBlock, /action: 'custom'/);
  assert.match(simpleBlock, /action: 'separator'/);
  assert.match(simpleBlock, /DashticzWidgetEditor\.open\(\)/);
  assert.match(simpleBlock, /DashticzDeviceEditor\.openCustom\(\)/);
  assert.match(simpleBlock, /DashticzDeviceEditor\.addSeparator\(\)/);
  assert.match(simpleBlock, /var selectedAction = ''/);
  assert.match(
    simpleBlock,
    /\$popup\.find\('\.dt-screeneditor-add-tile'\)\.prop\('disabled', true\)/
  );
  assert.match(simpleBlock, /hasClass\('dle-active'\)/);
  assert.match(screenSwitcher, /screeneditoraddicon d-none/);
  assert.match(screenSwitcher, /fas fa-wand-magic-sparkles/);
  assert.match(styles, /\.dt-screeneditor-add-grid/);
  assert.match(styles, /min-width: 100px/);
  assert.match(styles, /min-height: 100px/);
  // Layout controls must stay below Bootstrap modals so they cannot cover or
  // intercept clicks on Widget Editor buttons such as Save.
  assert.match(styles, /\.dle-toolbar\s*\{[\s\S]*z-index:\s*1040;/);
  assert.match(styles, /\.dle-drag-ghost\s*\{[\s\S]*z-index:\s*1045;/);
  assert.doesNotMatch(styles, /\.dle-toolbar\s*\{[\s\S]*z-index:\s*20000;/);

  assert.match(editor, /function openCustom\(\)/);
  assert.match(editor, /function addSeparator\(\)/);
  assert.match(editor, /specialType: 'title'[\s\S]*width: 12/);
  assert.match(editor, /function _showCustomDevicePopup\(\)/);
  assert.match(editor, /id=\"cd-device-name\"/);
  assert.match(editor, /id=\"cd-device-idx\"/);
  assert.match(editor, /field: 'title'/);
  assert.match(editor, /field: 'icon'/);
  assert.match(editor, /field: 'values'/);
  assert.match(editor, /cd-custom-field-add/);
  assert.match(
    editor,
    /\$rows\.last\(\)\.find\('\.cd-custom-field-add'\)\.removeClass\('d-none'\)/
  );
  assert.match(editor, /specialType: 'custom'/);
  assert.match(editor, /kind: special\.specialType/);
  const normalAddStart = editor.indexOf('function _addRowHtml(deviceList)');
  const specialAddStart = editor.indexOf('function _specialAddRowHtml(kind)');
  const normalAddSource = editor.slice(normalAddStart, specialAddStart);
  assert.doesNotMatch(normalAddSource, /__dummy__/);
  assert.doesNotMatch(normalAddSource, /__title__/);
  assert.match(writer, /function configwriter_special_block_props/);
  assert.match(writer, /'type' => 'blocktitle'/);

  for (const locale of ['en_US', 'nl_NL', 'fr_FR']) {
    const translations = JSON.parse(
      fs.readFileSync(path.join(root, 'lang', `${locale}.json`), 'utf8')
    );
    assert.ok(
      translations.settings.deviceeditor.custom_devices,
      `${locale} custom devices translation`
    );
    assert.ok(
      translations.settings.deviceeditor.custom_device_name,
      `${locale} custom device name translation`
    );
    assert.ok(
      translations.settings.deviceeditor.custom_device_options,
      `${locale} custom device options translation`
    );
    assert.ok(
      translations.settings.deviceeditor.separator,
      `${locale} separator translation`
    );
    assert.ok(
      translations.settings.widgeteditor.add_menu_title,
      `${locale} add-menu translation`
    );
    assert.ok(
      translations.settings.widgeteditor.add_device,
      `${locale} add-device translation`
    );
    assert.ok(
      translations.settings.widgeteditor.devices,
      `${locale} devices tile translation`
    );
    assert.ok(
      translations.settings.config_mode.warning_title,
      `${locale} mode-warning title translation`
    );
    assert.ok(
      translations.settings.config_mode.confirm_wizard,
      `${locale} Wizard warning translation`
    );
    assert.ok(
      translations.settings.config_mode.confirm_custom,
      `${locale} Custom warning translation`
    );
    assert.ok(
      translations.settings.config_mode.cancel,
      `${locale} warning cancel translation`
    );
    assert.ok(
      translations.settings.config_mode.continue,
      `${locale} warning continue translation`
    );
    assert.ok(
      translations.settings.config_mode.picker_title,
      `${locale} mode-picker title translation`
    );
    assert.ok(
      translations.settings.config_mode.custom_mode,
      `${locale} Custom mode tile title translation`
    );
    assert.ok(
      translations.settings.config_mode.wizard_mode,
      `${locale} Wizard mode tile title translation`
    );
    assert.ok(
      translations.settings.config_mode.custom_mode_desc,
      `${locale} Custom mode tile description translation`
    );
    assert.ok(
      translations.settings.config_mode.wizard_mode_desc,
      `${locale} Wizard mode tile description translation`
    );
    assert.ok(
      translations.settings.theme.custom_css_active,
      `${locale} custom-css status translation`
    );
    assert.ok(
      translations.settings.layouteditor.configure_device,
      `${locale} configure-device translation`
    );
    assert.ok(
      translations.settings.layouteditor.configure_widget,
      `${locale} configure-widget translation`
    );
    assert.ok(
      translations.settings.widgeteditor.custom_devices,
      `${locale} custom-device tile translation`
    );
    assert.ok(
      translations.settings.widgeteditor.separator,
      `${locale} separator tile translation`
    );
    for (const key of [
      'calendar_source',
      'calendar_default_name',
      'calendar_name',
      'calendar_color',
      'calendar_add',
      'calendar_remove',
      'calendar_name_required',
      'calendar_duplicate_name',
      'calendar_needs_source',
      'invalid_calendar_url',
    ]) {
      assert.ok(
        translations.settings.widgeteditor[key],
        `${locale} ${key} translation`
      );
    }
  }
});

test('Device Editor configuration cog stays centered inside its button', () => {
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');

  assert.match(
    deviceEditor,
    /class="btn btn-outline-secondary btn-sm de-config-btn"/
  );
  assert.match(
    deviceEditor,
    /<i class="fas fa-cog" aria-hidden="true"><\/i><\/button>/
  );
  assert.match(
    styles,
    /\.de-config-btn \{[\s\S]*?display: inline-flex;[\s\S]*?align-items: center;[\s\S]*?justify-content: center;[\s\S]*?width: 34px;[\s\S]*?height: 34px;[\s\S]*?padding: 0;/
  );
  assert.match(
    styles,
    /\.de-config-btn \.fas \{[\s\S]*?margin: 0 !important;[\s\S]*?font-size: 18px !important;[\s\S]*?line-height: 1;/
  );
});

test('device and widget config editors share full widget config and preserve hidden device fields', () => {
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );
  const widgetEditor = fs.readFileSync(
    path.join(root, 'js/widgeteditor.js'),
    'utf8'
  );
  const saveWidgets = fs.readFileSync(
    path.join(root, 'js/savewidgets.php'),
    'utf8'
  );
  const saveBlocks = fs.readFileSync(
    path.join(root, 'js/saveblocks.php'),
    'utf8'
  );
  const configWriter = fs.readFileSync(
    path.join(root, 'js/configwriter.php'),
    'utf8'
  );
  const layoutEditor = fs.readFileSync(
    path.join(root, 'js/layouteditor.js'),
    'utf8'
  );
  const main = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
  const settings = fs.readFileSync(path.join(root, 'js/settings.js'), 'utf8');
  const blocksSource = fs.readFileSync(path.join(root, 'js/blocks.js'), 'utf8');
  const blockTitle = fs.readFileSync(
    path.join(root, 'js/components/blocktitle.js'),
    'utf8'
  );
  const simpleBlock = fs.readFileSync(
    path.join(root, 'js/components/simpleblock.js'),
    'utf8'
  );
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');

  // Alignment editor support is removed completely. Legacy property names remain
  // reserved only so they cannot be reintroduced through custom fields.
  const dashticz = fs.readFileSync(path.join(root, 'js/dashticz.js'), 'utf8');
  assert.doesNotMatch(deviceEditor, /name="de-config-alignment"/);
  assert.doesNotMatch(deviceEditor, /de-alignment-label/);
  assert.doesNotMatch(deviceEditor, /js\/savecustomcss\.php/);
  assert.doesNotMatch(styles, /dt-text-align-/);
  assert.doesNotMatch(dashticz, /dt-text-align-/);
  assert.doesNotMatch(configWriter, /configwriter_normalise_text_alignment/);
  assert.doesNotMatch(configWriter, /\$props\['text_alignment'\]/);

  // Device Config's Icon/Data/Updated/Title/Background are independent
  // toggle buttons (#195) - Dial/Bar/Slider (previously Icon/Dial/Bar/Slider,
  // #182) is its own separate mutually-exclusive visual-mode button group,
  // no longer including Icon. Selecting Dial or Bar there hides the
  // now-ineffective Title control while keeping its value in the DOM, so
  // switching back to Icon restores it without losing configuration. A
  // separator/title bar still has only Icon and Title because it has no
  // data value or last-update timestamp of its own, and no Dial/Bar mode
  // at all.
  assert.match(deviceEditor, /\? \['icon', 'show_title'\]/);
  assert.match(
    deviceEditor,
    /: \['icon', 'hide_data', 'last_update', 'show_title'\]/
  );
  assert.match(deviceEditor, /configOptions\.forEach/);
  assert.match(deviceEditor, /hasDial && option === 'show_title'/);
  assert.match(deviceEditor, /de-hide-for-dial/);
  assert.match(deviceEditor, /function refreshDialOptions\(\)/);
  assert.match(deviceEditor, /de-visual-mode-button/);
  assert.match(
    deviceEditor,
    /\$popup\.on\('click', '\.de-visual-mode-button', function \(\) \{/
  );
  assert.match(
    deviceEditor,
    /if \(option === 'hide_data'\) \{\s*\n\s*checked = options\.hide_data !== true/
  );
  assert.match(
    deviceEditor,
    /isSpecial \? special\.showTitle !== false : deviceTitleVisible\[ck\] !== false/
  );
  assert.match(
    deviceEditor,
    /updated\[option\] = option === 'hide_data' \? !checked : checked/
  );
  assert.match(
    deviceEditor,
    /var pendingShowTitle = updated\.show_title !== false/
  );
  assert.match(deviceEditor, /special\.showTitle = pendingShowTitle/);
  assert.match(deviceEditor, /deviceTitleVisible\[ck\] = pendingShowTitle/);
  // Catalog Widget Config only exposes Icon and Title. Existing hide_data and
  // last_update values remain hydrated, preserved and accepted by the writer;
  // Device Config retains its separate Data/Updated controls above.
  const widgetOptionsStart = widgetEditor.indexOf(
    'function _widgetBlockOptionsHtml'
  );
  const widgetOptionsEnd = widgetEditor.indexOf(
    'function _buildConfigModalHtml',
    widgetOptionsStart
  );
  const widgetOptionsBody = widgetEditor.substring(
    widgetOptionsStart,
    widgetOptionsEnd
  );
  assert.match(
    widgetOptionsBody,
    /\['icon', _t\('icon', 'Icon'\), 'fas fa-image', options\.icon\]/
  );
  assert.match(
    widgetOptionsBody,
    /'show_title',\s*\n\s*_t\('show_title', 'Title'\),\s*\n\s*'fas fa-heading',\s*\n\s*options\.show_title,/
  );
  assert.doesNotMatch(widgetOptionsBody, /data-block-option="hide_data"/);
  assert.doesNotMatch(widgetOptionsBody, /data-block-option="last_update"/);
  assert.match(
    widgetEditor,
    /hide_data: existingBlockOptions\.hide_data === true/
  );
  assert.match(
    widgetEditor,
    /last_update: existingBlockOptions\.last_update === true/
  );
  assert.match(
    widgetEditor,
    /options\.hide_data = definition\.hide_data === true/
  );
  assert.match(
    widgetEditor,
    /options\.last_update = definition\.last_update === true/
  );
  assert.match(
    widgetEditor,
    /entry\.hide_data = blockOptions\.hide_data === true/
  );
  assert.match(
    widgetEditor,
    /entry\.last_update = blockOptions\.last_update === true/
  );
  assert.match(saveWidgets, /'icon', 'hide_data', 'last_update', 'hide_title'/);
  assert.match(saveWidgets, /if \(!empty\(\$widget\['hide_data'\]\)\)/);
  assert.match(saveWidgets, /if \(!empty\(\$widget\['last_update'\]\)\)/);
  // Icon/Data/Updated/Title/Background render as a plain flex-wrap row of
  // icon buttons now (#195), not a switch grid - .de-config-options and its
  // -three/-four/-five column-count modifiers are gone from both the source
  // and the stylesheet, replaced by .de-config-options-icons (device) and
  // .we-block-options-row (widget/quick-add), which wrap on their own via
  // flex-wrap instead of needing a column-count-driven grid.
  assert.doesNotMatch(deviceEditor, /de-config-options-three/);
  assert.doesNotMatch(styles, /\.de-config-options-three/);
  assert.doesNotMatch(styles, /\.de-config-options\s*\{/);
  assert.match(
    styles,
    /\.de-config-options-icons \.btn,\s*\n\s*\.we-block-options-row \.btn \{/
  );
  assert.match(
    deviceEditor,
    /icon: true, iconValue: null, hide_data: false, last_update: false/
  );
  assert.doesNotMatch(styles, /\.we-block-option\.form-check-input/);

  // Dial/Bar visual mode: writes type:'dial' into CONFIG.js (the only way to
  // render a device as a dial block; a hand-typed 'type' custom field stays
  // rejected as reserved) - Bar reuses the same type:'dial' plus
  // subtype:'bar' custom field, since saveblocks.php only accepts type:'dial'
  // (#182) - and both round-trip back into the visual-mode selector when
  // re-opening Device Config.
  assert.match(deviceEditor, /dial: definition\.type === 'dial' && !barMode/);
  assert.match(deviceEditor, /dial: configured\.type === 'dial' && !barMode/);
  assert.match(
    deviceEditor,
    /\} else if \(specialOptions\.dial === true\) \{\s*\n\s*specialEntry\.type = 'dial';\s*\n\s*\}/
  );
  assert.match(
    deviceEditor,
    /if \(options\.bar === true \|\| options\.dial === true\) \{\s*\n[\s\S]*?entry\.type = 'dial';\s*\n\s*\} else if \(p\.subidx\) \{\s*\n\s*entry\.subidx = p\.subidx;\s*\n\s*\}/
  );
  assert.match(
    deviceEditor,
    /\(!definition\.type \|\| definition\.type === 'dial' \|\| definition\.type === 'bar' \|\|\s*\n\s*definition\.type === reference\) &&\s*\n\s*parseInt\(definition\.idx, 10\) > 0/
  );
  assert.match(saveBlocks, /function _dashticz_editor_block_type\(\$entry\)/);
  assert.match(saveBlocks, /'type' => _dashticz_editor_block_type\(\$entry\)/);
  assert.match(
    configWriter,
    /if \(!empty\(\$device\['type'\]\)\) \{\s*\n\s*\$props\['type'\] = \(string\)\$device\['type'\];/
  );

  // Title is a system Field/Setting row and c is hidden while being preserved in the payload.
  assert.match(deviceEditor, /field: 'title'[\s\S]*system: true/);
  assert.match(
    deviceEditor,
    /Object\.prototype\.hasOwnProperty\.call\(definition, 'c'\)/
  );
  assert.doesNotMatch(blocksSource, /block\.c = c/);
  assert.match(blocksSource, /block\._dashticzColumn = c/);
  assert.match(simpleBlock, /me\.block\._dashticzColumn === 'bar'/);
  assert.match(deviceEditor, /preserved\.c = definition\.c/);
  assert.match(
    deviceEditor,
    /field === 'title' \|\| field === 'icon' \|\| field === 'c'/
  );
  assert.match(deviceEditor, /custom_fields = customFields/);
  assert.match(widgetEditor, /preservedFields\.c = definition\.c/);
  assert.match(
    widgetEditor,
    /entry\.custom_fields\[field\] = _encodeCustomSettingValue/
  );
  assert.match(widgetEditor, /field: 'title'[\s\S]*system: true/);

  // A custom icon is only applied through the top-level icon property while Icon is enabled.
  assert.match(deviceEditor, /updated\.icon !== true/);
  assert.match(deviceEditor, /t\.icon_requires_checkbox/);
  assert.match(deviceEditor, /options\.iconValue/);
  assert.match(deviceEditor, /entry\.icon = options\.iconValue/);
  assert.match(deviceEditor, /specialEntry\.icon = specialOptions\.iconValue/);
  // Every icon-capable Device/Widget Config gets one editable icon row. When
  // the icon is a runtime default, merely opening/saving the popup must not
  // freeze a state-dependent icon (such as a switch's on/off lightbulb) into
  // CONFIG.js; it becomes explicit only after the user changes the value.
  assert.match(deviceEditor, /function _effectiveDeviceConfigIcon\(/);
  assert.match(deviceEditor, /field: 'icon',[\s\S]*generated: true/);
  assert.match(
    deviceEditor,
    /data-generated-icon="true" data-initial-setting=/
  );
  assert.match(
    deviceEditor,
    /generatedIcon && rawSetting === initialIcon && !options\.iconValue/
  );
  assert.match(widgetEditor, /function _effectiveWidgetConfigIcon\(/);
  assert.match(
    widgetEditor,
    /if \(!iconRow\) \{[\s\S]*generated: !options\.iconValue/
  );
  assert.match(
    widgetEditor,
    /generatedIcon &&[\s\S]*!existingBlockOptions\.iconValue/
  );
  assert.match(
    widgetEditor,
    /\$cfgModal\.find\('\.we-icon-field-row'\)\.toggle\(enabled\)/
  );
  assert.match(
    deviceEditor,
    /removesIcon[\s\S]*\.de-config-option\[data-option="icon"\][\s\S]*\.removeClass\('active'\)/
  );
  assert.match(
    widgetEditor,
    /removesIcon[\s\S]*\[data-block-option="icon"\][\s\S]*\.removeClass\('active'\)/
  );
  assert.match(
    deviceEditor,
    /class="form-select de-custom-field-name de-icon-source"/
  );
  assert.match(
    widgetEditor,
    /class="form-select we-custom-field-name we-icon-source"/
  );
  assert.match(
    deviceEditor,
    /lowerField === 'icon' \|\| lowerField === 'image'/
  );
  assert.match(
    widgetEditor,
    /lowerField === 'icon' \|\| lowerField === 'image'/
  );
  assert.match(deviceEditor, /useImage \? 'custom\/icon\.png' : t\.setting/);
  assert.match(
    widgetEditor,
    /useImage \? 'custom\/icon\.png' : _t\('setting', 'Setting'\)/
  );
  assert.match(deviceEditor, /field: 'image',[\s\S]*value: rawSetting/);
  assert.match(widgetEditor, /field: 'image',[\s\S]*value: rawSetting/);
  assert.match(deviceEditor, /js\/listcustomicons\.php/);
  assert.match(widgetEditor, /js\/listcustomicons\.php/);
  assert.match(deviceEditor, /\$\.getJSON\('js\/listcustomicons\.php'\)/);
  assert.match(widgetEditor, /\$\.getJSON\('js\/listcustomicons\.php'\)/);
  assert.doesNotMatch(deviceEditor, /dashticz_php_path[^\n]*listcustomicons/);
  assert.doesNotMatch(widgetEditor, /dashticz_php_path[^\n]*listcustomicons/);
  assert.match(deviceEditor, /class="dt-custom-image-grid"/);
  assert.match(widgetEditor, /class="dt-custom-image-grid"/);
  assert.match(
    styles,
    /\.dt-custom-image-grid \{[\s\S]*grid-template-columns: repeat\(6/
  );
  assert.match(styles, /\.dt-custom-image-thumb \{[\s\S]*object-fit: contain/);
  assert.match(deviceEditor, /var SEPARATOR_DEFAULT_ICON = 'fas fa-divide';/);
  // A separator's default icon only fills in when neither an explicit icon
  // nor a custom image is configured - getColIcon() (js/dashticz.js) draws
  // an icon and an image side by side rather than one replacing the other,
  // so falling back to the default icon while an image is set would show both.
  assert.match(
    deviceEditor,
    /else if \(titleOptions\.iconValue\) \{\s*\n\s*specialEntry\.icon = titleOptions\.iconValue;\s*\n\s*\} else if \(!specialCustomFields\.image\) \{/
  );
  assert.match(deviceEditor, /specialEntry\.icon = SEPARATOR_DEFAULT_ICON;/);
  assert.match(
    deviceEditor,
    /var hasConfiguredImage =[\s\S]*typeof definition\.image === 'string'/
  );
  assert.match(deviceEditor, /iconValue: hasConfiguredImage\s*\n\s*\? null/);
  // Legacy separators may already have both an explicit icon and image. The
  // runtime must make Image authoritative immediately, without waiting for a
  // round-trip through Device Config to clean CONFIG.js.
  assert.match(
    dashticz,
    /special\.name === 'blocktitle' && cfg\.image[\s\S]*cfg\.icon = '';/
  );
  assert.match(
    deviceEditor,
    /kind === 'title' && typeof definition\.icon === 'undefined'[\s\S]*\? SEPARATOR_DEFAULT_ICON/
  );
  // #169: a hand-written/legacy blocktitle entry with no `icon` property at
  // all must render with no icon, exactly like Wizard's explicit icon: ''
  // (disabled) state - only an explicit non-empty icon value renders one.
  // blocktitle.js's defaultCfg must not inject its own runtime default icon;
  // getBlockConfig() (js/dashticz.js) only copies block.icon onto cfg when
  // the CONFIG.js entry actually defines the property.
  assert.doesNotMatch(blockTitle, /icon:\s*'fas fa-divide'/);
  assert.match(
    blockTitle,
    /defaultCfg:\s*\{\s*\n\s*containerClass: 'titlegroups',/
  );
  assert.match(
    configWriter,
    /if \(array_key_exists\('icon', \$block\) && \$block\['icon'\] !== null\) \{\s*\n\s*\$props\['icon'\] = \(string\)\$block\['icon'\];/
  );

  // Widget gears opened from Device Editor use the complete Widget Editor modal/save model.
  assert.match(deviceEditor, /DashticzWidgetEditor\.openConfig\(widget\.id/);
  assert.match(widgetEditor, /function openConfig\(widgetId, options\)/);
  assert.match(widgetEditor, /function _buildWidgetPayloadEntry\(item\)/);
  assert.match(widgetEditor, /function _collectConfigSettings\(\)/);
  assert.match(widgetEditor, /onApply/);
  assert.match(widgetEditor, /openConfig: openConfig/);
  assert.match(widgetEditor, /openLayoutConfig: openLayoutConfig/);
  assert.match(widgetEditor, /_t\('widget_config', 'Widget Config'\)/);
  assert.match(widgetEditor, /_widgetConfigDisplayName\(item\)/);
  assert.match(
    deviceEditor,
    /_esc\(t\.device_config\) \+ ' — ' \+ _esc\(displayName\)/
  );
  // Device Config popup title shows the device's IDX in brackets for identification.
  assert.match(
    deviceEditor,
    /var idxLabel = '';\s*\n\s*if \(!isSpecial && ck\) \{/
  );
  assert.match(
    deviceEditor,
    /\} else if \(isSpecial && \(isCustom \|\| isGroupBlock\) && special\.idx\) \{\s*\n\s*idxLabel = String\(special\.idx\);/
  );
  assert.match(
    deviceEditor,
    /\(idxLabel \? ' <span class="de-config-idx-label">\[' \+ _esc\(idxLabel\) \+ '\]<\/span>' : ''\)/
  );
  assert.match(styles, /\.de-config-idx-label \{/);

  // Existing typed Field/Setting support remains in both editors and server validation stays active.
  assert.match(widgetEditor, /we-custom-field-name/);
  assert.match(widgetEditor, /we-custom-field-setting/);
  assert.match(widgetEditor, /function _parseCustomSetting/);
  assert.match(widgetEditor, /entry\.custom_fields/);
  // Stale editor-managed properties must never be posted as custom widget fields.
  assert.match(widgetEditor, /_isProtectedCustomWidgetProperty\(property\)/);
  assert.match(
    widgetEditor,
    /!rawSetting \|\| _isProtectedCustomWidgetProperty\(lowerField\)/
  );
  assert.match(deviceEditor, /de-custom-field-name/);
  assert.match(deviceEditor, /de-custom-field-setting/);
  assert.match(deviceEditor, /function _parseCustomSetting/);
  assert.match(saveBlocks, /Invalid or reserved custom device field/);
  assert.match(saveBlocks, /_validate_custom_device_value/);
  assert.match(configWriter, /\$device\['custom_fields'\]/);

  // Empty objects and arrays remain distinct across the JSON/PHP save boundary.
  assert.match(deviceEditor, /__dashticz_empty_object__/);
  assert.match(widgetEditor, /__dashticz_empty_object__/);
  assert.match(configWriter, /function configwriter_restore_editor_value/);
  assert.match(configWriter, /return new stdClass\(\)/);
  assert.match(configWriter, /is_array\(\$value\) \|\| is_object\(\$value\)/);

  // Existing and newly added separators use the same configuration control.
  assert.match(layoutEditor, /kind: 'separator'/);
  assert.match(layoutEditor, /item\.kind === 'separator'/);
  assert.match(
    layoutEditor,
    /DashticzDeviceEditor\.openLayoutConfig\(item\.reference\)/
  );

  // Any successfully loaded custom stylesheet is identified in the Theme panel.
  assert.match(main, /data-dashticz-custom-css/);
  assert.match(settings, /function bindThemeCustomCssNotice\(\)/);
  assert.match(settings, /themeLabels\.custom_css_active/);
  assert.match(
    styles,
    /\.settings-custom-css-notice[\s\S]*border: 2px solid #198754/
  );

  // Screen Editor controls share one explicit button size. The configuration
  // gear is deliberately larger than the drag/remove symbols and its opaque
  // button background prevents a block's own icon from showing through.
  assert.match(
    styles,
    /\.dle-drag-icon,[\s\S]*\.dle-config-button[\s\S]*width: 32px;[\s\S]*height: 32px;/
  );
  assert.match(
    styles,
    /\.dle-remove-button[\s\S]*width: 32px;[\s\S]*height: 32px;/
  );
  assert.match(
    styles,
    /\.dle-config-button \{[\s\S]*color: #fff;[\s\S]*background: rgb\(13, 24, 40\);/
  );
  assert.match(
    styles,
    /\.dle-config-button \.fas \{[\s\S]*font-size: 26px !important;/
  );
  assert.match(
    styles,
    /\.dle-remove-button \.fas[\s\S]*font-size: 16px !important/
  );
});

test('savewidgets accepts only exact security panel lock modes', () => {
  const source = fs.readFileSync(path.join(root, 'js/savewidgets.php'), 'utf8');
  const branchStart = source.indexOf(
    "} elseif ($type === 'security_panel_lock') {"
  );
  const branchEnd = source.indexOf('} else {', branchStart);

  assert.notEqual(branchStart, -1, 'security_panel_lock branch not found');
  assert.notEqual(branchEnd, -1, 'security_panel_lock branch end not found');

  const branch = source.slice(branchStart, branchEnd);
  const whitelist = branch.match(/in_array\(\$value, \[([^\]]+)\], true\)/);
  assert.ok(
    whitelist,
    'security_panel_lock must validate the original value strictly'
  );
  assert.doesNotMatch(branch, /is_numeric|\(int\)\$value[\s\S]*in_array/);
  assert.match(
    branch,
    /if \(in_array\(\$value, \[[^\]]+\], true\)\) \{\s*\$configSettings\[\$key\] = \(int\)\$value;/
  );

  const allowedValues = whitelist[1].split(',').map((literal) => {
    const value = literal.trim();
    return /^'.*'$/.test(value) ? value.slice(1, -1) : Number(value);
  });
  const accepts = (value) =>
    allowedValues.some(
      (allowed) => typeof allowed === typeof value && allowed === value
    );

  for (const value of [0, 1, 2, '0', '1', '2']) {
    assert.equal(
      accepts(value),
      true,
      `expected ${String(value)} to be accepted`
    );
  }
  for (const value of [
    -1,
    3,
    1.5,
    2.9,
    -0.5,
    '1.5',
    '2.9',
    '-0.5',
    '3',
    'foo',
    '',
    null,
    true,
    false,
  ]) {
    assert.equal(
      accepts(value),
      false,
      `expected ${String(value)} to be rejected`
    );
  }
});

test('widget editor exposes the supported catalog and keeps legacy options out of settings UI', () => {
  const simpleBlock = fs.readFileSync(
    path.join(root, 'js/components/simpleblock.js'),
    'utf8'
  );
  const widgetEditor = fs.readFileSync(
    path.join(root, 'js/widgeteditor.js'),
    'utf8'
  );
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );
  const layouteditor = fs.readFileSync(
    path.join(root, 'js/layouteditor.js'),
    'utf8'
  );
  const savewidgets = fs.readFileSync(
    path.join(root, 'js/savewidgets.php'),
    'utf8'
  );
  const blocks = fs.readFileSync(path.join(root, 'js/blocks.js'), 'utf8');
  const stationClock = fs.readFileSync(
    path.join(root, 'js/components/stationclock.js'),
    'utf8'
  );
  const flipClock = fs.readFileSync(
    path.join(root, 'js/components/flipclock.js'),
    'utf8'
  );
  const securityPanel = fs.readFileSync(
    path.join(root, 'js/components/secpanel.js'),
    'utf8'
  );
  const dashticz = fs.readFileSync(path.join(root, 'js/dashticz.js'), 'utf8');
  const settings = fs.readFileSync(path.join(root, 'js/settings.js'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');
  const weather = fs.readFileSync(
    path.join(root, 'js/components/weather.js'),
    'utf8'
  );
  const legacyOwmWeather = fs.readFileSync(
    path.join(root, 'js/weather_owm.js'),
    'utf8'
  );
  const garbage = fs.readFileSync(
    path.join(root, 'js/components/garbage.js'),
    'utf8'
  );
  const calendar = fs.readFileSync(
    path.join(root, 'js/components/calendar.js'),
    'utf8'
  );
  const sonarr = fs.readFileSync(path.join(root, 'js/sonarr.js'), 'utf8');
  const fullscreen = fs.readFileSync(
    path.join(root, 'js/fullscreen.js'),
    'utf8'
  );
  const english = JSON.parse(
    fs.readFileSync(path.join(root, 'lang/en_US.json'), 'utf8')
  );
  const dutch = JSON.parse(
    fs.readFileSync(path.join(root, 'lang/nl_NL.json'), 'utf8')
  );

  assert.match(simpleBlock, /screeneditoraddicon/);
  assert.match(simpleBlock, /fas fa-wand-magic-sparkles/);
  assert.match(simpleBlock, /action: 'widgets'/);
  assert.match(
    simpleBlock,
    /DT_function\.loadDTScript\('js\/widgeteditor\.js'\)/
  );
  assert.match(simpleBlock, /configmodeicon/);
  assert.match(simpleBlock, /config-mode-btn/);
  assert.match(simpleBlock, /config-mode-tile/);
  assert.match(simpleBlock, /mode: 'custom'/);
  assert.match(simpleBlock, /mode: 'wizard'/);
  assert.match(simpleBlock, /data-mode="' \+ tile\.mode \+ '"/);
  assert.match(settings, /widgetSettingTiles/);
  assert.match(settings, /isCustomConfigMode/);
  assert.match(settings, /setConfigMode/);
  assert.match(settings, /config_mode: 'wizard'/);
  assert.match(
    settings,
    /background_image: '\/img\/custom\/BG_Dashticz_bw\.png'/
  );
  for (const id of [
    'weather',
    'garbage',
    'spotify',
    'sonarr',
    'clock',
    'calendar',
    'secpanel',
    'publictransport',
    'trafficinfo',
    'alarmmeldingen',
    'camera',
    'map',
    'longfonds',
    'moon',
    'news',
  ]) {
    assert.match(widgetEditor, new RegExp(`id: '${id}'`));
  }
  for (const id of [
    'weather',
    'garbage',
    'spotify',
    'sonarr',
    'clock',
    'calendar',
    'secpanel',
    'trafficinfo',
    'map',
    'longfonds',
    'news',
  ]) {
    assert.match(settings, new RegExp(`id: '${id}'`));
  }
  for (const id of ['publictransport', 'alarmmeldingen', 'camera', 'moon']) {
    assert.doesNotMatch(settings, new RegExp(`id: '${id}'`));
  }
  const securitySettings = settings.slice(
    settings.indexOf("id: 'secpanel'"),
    settings.indexOf("id: 'trafficinfo'")
  );
  assert.match(securitySettings, /security_panel_lock:/);
  assert.match(securitySettings, /type: 'select'/);
  assert.match(securitySettings, /noEmptyOption: true/);
  assert.match(securitySettings, /security_panel_lock_disabled/);
  assert.match(securitySettings, /security_panel_lock_away/);
  assert.match(securitySettings, /security_panel_lock_home_away/);
  assert.doesNotMatch(securitySettings, /security_button_icons:/);
  const clockSettings = settings.slice(
    settings.indexOf("id: 'clock'"),
    settings.indexOf("id: 'calendar'")
  );
  assert.match(clockSettings, /boss_stationclock:/);
  assert.match(clockSettings, /hide_seconds:/);
  assert.match(clockSettings, /hide_seconds_stationclock:/);
  const mapSettings = settings.slice(
    settings.indexOf("id: 'map'"),
    settings.indexOf("id: 'longfonds'")
  );
  assert.match(mapSettings, /gm_api:/);
  assert.match(mapSettings, /gm_zoomlevel:/);
  assert.match(mapSettings, /gm_latitude:/);
  assert.match(mapSettings, /gm_longitude:/);
  assert.match(blocks, /settings\['security_button_icons'\]/);
  assert.match(blocks, /settings\['gm_zoomlevel'\]/);
  assert.match(blocks, /settings\['gm_latitude'\]/);
  assert.match(blocks, /settings\['gm_longitude'\]/);
  assert.match(main, /if \(settings\['security_panel_lock'\]\)/);
  assert.match(
    securityPanel,
    /secstatus == 1 && settings\['security_panel_lock'\] == 2/
  );
  assert.match(stationClock, /settings\['boss_stationclock'\]/);
  assert.match(stationClock, /settings\['hide_seconds_stationclock'\]/);
  assert.match(flipClock, /settings\['hide_seconds'\]/);
  assert.match(savewidgets, /'security_button_icons'\s*=>\s*'bool'/);
  assert.match(
    savewidgets,
    /'security_panel_lock'\s*=>\s*'security_panel_lock'/
  );
  assert.match(
    savewidgets,
    /in_array\(\$value, \[0, 1, 2, '0', '1', '2'\], true\)/
  );
  assert.match(savewidgets, /'idx_moonpicture'\s*=>\s*'string'/);
  assert.match(savewidgets, /'gm_zoomlevel'\s*=>\s*'number'/);
  assert.match(savewidgets, /'boss_stationclock'\s*=>\s*'string'/);
  assert.match(savewidgets, /'owm_days'\s*=>\s*'bool'/);
  assert.match(savewidgets, /'translate_windspeed'\s*=>\s*'bool'/);
  assert.match(savewidgets, /'garbage_width'\s*=>\s*'number'/);
  assert.match(legacyOwmWeather, /settings\['owm_days'\]/);
  assert.match(weather, /\/\/\s*days: choose\(settings\['owm_days'\], true\)/);
  assert.match(garbage, /width: settings\['garbage_width'\] \|\| 12/);
  const calendarSettings = settings.slice(
    settings.indexOf("id: 'calendar'"),
    settings.indexOf("id: 'sonarr'")
  );
  assert.match(calendarSettings, /calendarurl_link/);
  assert.match(calendarSettings, /calendarurl_link_help/);
  assert.match(calendar, /settings\['calendarurl'\]/);
  assert.match(calendar, /calurl\.length > 0/);
  assert.equal(
    english.settings.localize.calendarurl_link,
    'Full calendar link'
  );
  assert.match(english.settings.localize.calendarurl_link_help, /ICS source/);
  assert.equal(
    dutch.settings.localize.calendarurl_link,
    'Link naar volledige kalender'
  );
  assert.doesNotMatch(
    settings,
    /settingList\['screen'\]\['security_button_icons'\]/
  );
  assert.doesNotMatch(settings, /settingList\['localize'\]\['gm_api'\]/);
  assert.doesNotMatch(
    settings,
    /settingList\['other'\]\['longfonds_zipcode'\]/
  );
  assert.doesNotMatch(
    settings,
    /settingList\.general = \{[^}]*default_news_url:/
  );
  assert.match(settings, /anwb_apikey:/);
  assert.match(settings, /id: 'news'[\s\S]*default_news_url:/);
  assert.match(widgetEditor, /OpenWeather/);
  assert.match(widgetEditor, /Weather Underground/);
  assert.match(widgetEditor, /_widgetEditorLanguage/);
  assert.match(widgetEditor, /_t\('station_clock', 'Station clock'\)/);
  assert.match(widgetEditor, /Flipclock/);
  assert.match(widgetEditor, /Hayman clock/);
  assert.match(widgetEditor, /Miniclock/);
  assert.match(widgetEditor, /id="we-cfg-calendar-list"/);
  assert.match(widgetEditor, /id="we-calendar-add"/);
  assert.match(widgetEditor, /class="we-calendar-row/);
  assert.match(widgetEditor, /we-cfg-clock-type/);
  assert.doesNotMatch(widgetEditor, /_cfgField\('hide_seconds',/);
  assert.doesNotMatch(widgetEditor, /_cfgField\('boss_stationclock',/);
  assert.doesNotMatch(widgetEditor, /_cfgField\('hide_seconds_stationclock',/);
  assert.doesNotMatch(
    widgetEditor,
    /clock:\s*\['boss_stationclock', 'hide_seconds', 'hide_seconds_stationclock'\]/
  );
  for (const field of [
    'owm_days',
    'translate_windspeed',
    'garbage_width',
    'security_button_icons',
    'security_panel_lock',
    'gm_zoomlevel',
    'gm_latitude',
    'gm_longitude',
    'idx_moonpicture',
  ]) {
    assert.doesNotMatch(widgetEditor, new RegExp(`_cfgField\\('${field}',`));
  }
  assert.match(widgetEditor, /_cfgField\('gm_api',/);
  assert.match(widgetEditor, /_cfgField\(\s*'showSeconds',/);
  assert.match(widgetEditor, /_cfgField\('boss',/);
  assert.match(widgetEditor, /_cfgField\('secondhand',/);
  assert.doesNotMatch(widgetEditor, /boss_stationclock: _s\(/);
  assert.doesNotMatch(widgetEditor, /hide_seconds: _n\(/);
  assert.doesNotMatch(widgetEditor, /hide_seconds_stationclock: _n\(/);
  // Hidden legacy/global values remain hydrated and re-submitted unchanged so
  // editing another option cannot erase a hand-written CONFIG.js value.
  assert.match(widgetEditor, /owm_days: _n\('owm_days'\)/);
  assert.match(
    widgetEditor,
    /translate_windspeed: _n\('translate_windspeed', 1\)/
  );
  assert.match(widgetEditor, /garbage_width: _s\('garbage_width'\)/);
  assert.match(
    widgetEditor,
    /security_button_icons: _n\('security_button_icons'\)/
  );
  assert.doesNotMatch(widgetEditor, /security_panel_lock: _n\(/);
  assert.match(widgetEditor, /gm_zoomlevel: _s\('gm_zoomlevel'\)/);
  assert.match(widgetEditor, /idx_moonpicture: _s\('idx_moonpicture'\)/);
  assert.match(
    widgetEditor,
    /weather:\s*\[[\s\S]*?'owm_days'[\s\S]*?'translate_windspeed'/
  );
  assert.match(widgetEditor, /garbage:\s*\[[\s\S]*?'garbage_width'/);
  assert.match(widgetEditor, /secpanel: \['security_button_icons'\]/);
  assert.match(
    widgetEditor,
    /map: \['gm_api', 'gm_zoomlevel', 'gm_latitude', 'gm_longitude'\]/
  );
  assert.match(widgetEditor, /moon: \['idx_moonpicture'\]/);
  assert.match(widgetEditor, /id="we-camera-add"/);
  assert.match(widgetEditor, /class="we-camera-row/);
  assert.match(widgetEditor, /weather:\s*\{[\s\S]*provider:/);
  assert.match(widgetEditor, /clock:\s*\{[\s\S]*clockType:\s*'basicclock'/);
  assert.match(
    widgetEditor,
    /calendar:\s*\{[\s\S]*sources:\s*\[_defaultCalendarSource\(0\)\]/
  );
  assert.match(widgetEditor, /function _normaliseCalendarSources/);
  assert.match(widgetEditor, /function _calendarSourcesObject/);
  assert.match(
    widgetEditor,
    /publictransport:\s*\{[\s\S]*provider:\s*'treinen'[\s\S]*station:\s*'UT'/
  );
  assert.match(
    widgetEditor,
    /alarmmeldingen:\s*\{[\s\S]*rss:\s*'https:\/\/www\.alarmeringen\.nl\/feeds\/all\.rss'[\s\S]*filter:\s*''/
  );
  assert.match(
    widgetEditor,
    /camera:\s*\{[\s\S]*cameras:\s*_defaultCameraConfigs\(\)/
  );
  assert.match(widgetEditor, /entry\.cameras = cameras/);
  assert.doesNotMatch(widgetEditor, /var weatherProvider =/);
  assert.doesNotMatch(widgetEditor, /var calendarUrl =/);
  assert.doesNotMatch(widgetEditor, /var publicTransportStation =/);
  assert.doesNotMatch(widgetEditor, /var alarmRss =/);
  assert.equal(english.settings.widgeteditor.weather_title, 'Weather');
  assert.equal(english.settings.widgeteditor.camera_title, 'Cameras');
  assert.equal(english.settings.widgeteditor.calendar_add, 'Add calendar');
  assert.equal(dutch.settings.widgeteditor.weather_title, 'Weer');
  assert.equal(dutch.settings.widgeteditor.camera_title, "Camera's");
  assert.equal(dutch.settings.widgeteditor.calendar_add, 'Kalender toevoegen');
  for (const [id, width, height] of [
    ['weather', 3, 120],
    ['garbage', 3, 120],
    ['spotify', 3, 120],
    ['sonarr', 3, 120],
    ['calendar', 3, 120],
    ['publictransport', 3, 160],
    ['trafficinfo', 3, 160],
    ['alarmmeldingen', 3, 160],
    ['camera', 3, 200],
    ['map', 3, 400],
    ['longfonds', 3, 400],
    ['news', 3, 200],
  ]) {
    assert.match(
      widgetEditor,
      new RegExp(
        `id: '${id}'[\\s\\S]*?width: ${width},[\\s\\S]*?height: ${height},`
      )
    );
  }
  assert.match(
    widgetEditor,
    /if \(item\.id === 'garbage'\) \{[\s\S]*entry\.displayTitle = _widgetTitle\(item\);/
  );
  assert.match(
    deviceEditor,
    /if \(widget\.id === 'garbage'\) \{[\s\S]*entry\.displayTitle = widget\.title;/
  );
  assert.match(
    layouteditor,
    /if \(item\.widgetId === 'garbage'\) \{[\s\S]*?entry\.displayTitle[\s\S]*?garbage_title/s
  );
  assert.match(
    savewidgets,
    /'garbage' => \['key' => 'widget_garbage', 'width' => 5, 'height' => 160\],/
  );
  assert.match(
    savewidgets,
    /\$id === 'garbage' && isset\(\$entry\['displayTitle'\]\)/
  );
  assert.match(
    savewidgets,
    /\$props\['title'\] = isset\(\$widget\['displayTitle'\]\) \? \$widget\['displayTitle'\] : 'Afval';/
  );
  assert.match(widgetEditor, /garbage_maxitems: _s\('garbage_maxitems', '4'\)/);
  assert.match(widgetEditor, /garbage_maxdays: _s\('garbage_maxdays', '32'\)/);
  assert.match(
    widgetEditor,
    /calendar_maxitems: _s\('calendar_maxitems', '15'\)/
  );
  // New iframe widgets default to no scaling/aspect ratio so they simply
  // fill the tile's own width/height; existing saved blocks with explicit
  // values keep working via the hydration path below.
  assert.match(widgetEditor, /scaletofit: '',/);
  assert.match(widgetEditor, /aspectratio: '',/);
  assert.match(widgetEditor, /delete entry\.iframeHeight/);
  assert.match(savewidgets, /unset\(\$props\['height'\]\)/);
  assert.equal(english.settings.garbage.garbage_maxdays, 'Maximum days ahead');
  assert.equal(
    dutch.settings.localize.calendar_maxitems,
    'Zichtbare kalenderregels'
  );
  assert.match(garbage, /maxitems: settings\['garbage_maxitems'\] \|\| 4/);
  assert.match(garbage, /maxdays: settings\['garbage_maxdays'\] \|\| 32/);
  assert.match(calendar, /isDefined\(settings\['calendar_maxitems'\]\)/);
  assert.match(calendar, /if \(isObject\(cal\[key\]\.icalurl\)\)/);
  assert.doesNotMatch(calendar, /if \(cal\[key\]\.icalurls > 1\)/);
  assert.match(dashticz, /function getWidgetTitle\(block, special\)/);
  assert.match(dashticz, /garbage: 'garbage_title'/);
  assert.match(dashticz, /cfg\.title = widgetTitle/);
  assert.match(widgetEditor, /js\/savewidgets\.php/);
  assert.match(widgetEditor, /js\/savelayout\.php/);
  assert.match(widgetEditor, /js\/savegridlayout\.php/);
  assert.match(widgetEditor, /blocksOnly: gridMode/);
  assert.match(
    widgetEditor,
    /key:\s*widgetBlockRefs\[item\.id\]\s*\|\|\s*item\.blockKey/
  );
  assert.match(widgetEditor, /function _readGridConfiguredWidgets/);
  assert.match(widgetEditor, /var layoutOrder = \[\]/);
  assert.match(
    widgetEditor,
    /if \(!selectedWidgets\[item\.widgetId\]\) return/
  );
  assert.match(widgetEditor, /layoutItems\.push\(widgetEntry\)/);
  assert.match(widgetEditor, /layoutItems\.push\(deviceEntry\)/);
  assert.match(widgetEditor, /X-Dashticz-CSRF/);
  assert.match(styles, /\.we-widget-grid/);
  assert.match(styles, /\.we-widget-card\.we-selected/);
  assert.match(weather, /block\.widget_provider === 'openweather'/);
  assert.match(simpleBlock, /wunderground/);
  assert.match(simpleBlock, /t\.title \|\| 'Widgets'/);
  assert.match(fullscreen, /language\.settings\.widgeteditor\.fullscreen/);
  assert.match(garbage, /block\.type === 'garbage'/);
  assert.match(sonarr, /function loadSonarr\(me\)/);

  for (const key of [
    'auto_positioning',
    'use_favorites',
    'use_hidden',
    'room_plan',
    'colorpicker',
    'colorpickerscale',
  ]) {
    assert.match(settings, new RegExp(`${key}:`));
  }
  assert.doesNotMatch(main, /id: 'use_favorites'/);
});

test('xmltv widget uses its own proxy and preserves optional block settings', () => {
  const xmltv = fs.readFileSync(
    path.join(root, 'js/components/xmltvguide.js'),
    'utf8'
  );
  const tvguide = fs.readFileSync(
    path.join(root, 'js/components/tvguide.js'),
    'utf8'
  );
  const widgetEditor = fs.readFileSync(
    path.join(root, 'js/widgeteditor.js'),
    'utf8'
  );
  const layouteditor = fs.readFileSync(
    path.join(root, 'js/layouteditor.js'),
    'utf8'
  );
  const savewidgets = fs.readFileSync(
    path.join(root, 'js/savewidgets.php'),
    'utf8'
  );
  const savegridlayout = fs.readFileSync(
    path.join(root, 'js/savegridlayout.php'),
    'utf8'
  );

  assert.match(tvguide, /typeof block\.xmltvurl === 'undefined'/);
  assert.match(xmltv, /xmltv\.php\?url=/);
  assert.match(xmltv, /function _fetchXmltvText/);
  assert.match(
    widgetEditor,
    /xmltvguide:\s*\{[\s\S]*xmltvurl:\s*_s\('xmltv_url'\)[\s\S]*layout:\s*_s\('xmltv_layout', '0'\)[\s\S]*separator:\s*_s\('xmltv_separator', '-'\)[\s\S]*refresh:\s*_s\('xmltv_refresh', '3600'\)/
  );
  assert.match(widgetEditor, /data-cfg-key="xmltv_layout"/);
  assert.match(widgetEditor, /data-cfg-key="xmltv_separator"/);
  assert.match(widgetEditor, /data-cfg-key="xmltv_refresh"/);
  assert.match(
    widgetEditor,
    /configSettings\.xmltv_url = widgetConfigs\.xmltvguide\.xmltvurl \|\| '';/
  );
  assert.match(
    widgetEditor,
    /configSettings\.xmltv_layout = widgetConfigs\.xmltvguide\.layout \|\| '0';/
  );
  assert.match(
    widgetEditor,
    /configSettings\.xmltv_refresh = widgetConfigs\.xmltvguide\.refresh \|\| '3600';/
  );
  assert.match(
    widgetEditor,
    /entry\.layout = parseInt\(xcfg\.layout, 10\) === 1 \? 1 : 0;/
  );
  assert.match(widgetEditor, /entry\.separator = xcfg\.separator \|\| '-';/);
  assert.match(
    widgetEditor,
    /entry\.refresh = parseInt\(xcfg\.refresh, 10\) \|\| 3600;/
  );
  // _hydrateGridWidget must read back layout, separator and refresh so reopening
  // the settings popup shows the previously saved values in grid mode.
  assert.match(
    widgetEditor,
    /item\.id === 'xmltvguide'[\s\S]*widgetConfigs\.xmltvguide\.layout[\s\S]*widgetConfigs\.xmltvguide\.separator[\s\S]*widgetConfigs\.xmltvguide\.refresh/s
  );
  assert.match(
    layouteditor,
    /item\.widgetId === 'xmltvguide'[\s\S]*settings\['xmltv_url'\][\s\S]*settings\['xmltv_layout'\][\s\S]*settings\['xmltv_refresh'\]/s
  );
  assert.match(savewidgets, /'xmltv_url'\s*=>\s*'string'/);
  assert.match(
    savewidgets,
    /\$id === 'xmltvguide'[\s\S]*\$widget\['layout'\][\s\S]*\$widget\['separator'\][\s\S]*\$widget\['refresh'\]/s
  );
  assert.match(
    savewidgets,
    /case 'xmltvguide':[\s\S]*\$props\['type'\] = 'xmltvguide';[\s\S]*\$props\['title'\] = 'TV Guide';/s
  );
  // savegridlayout must prefer $allBlockLines over $existingGridBlocks so that a
  // URL change saved by savewidgets.php (blocksOnly) is not silently discarded
  // when savegridlayout.php runs immediately afterwards.
  assert.match(
    savegridlayout,
    /isset\(\$allBlockLines\[[\s\S]*?\$propsLiteral = \$allBlockLines\[[\s\S]*?isset\(\$existingGridBlocks\[/s
  );
});

test('XMLTV grid tiles fit complete rows without an internal scrollbar', () => {
  const component = fs.readFileSync(
    path.join(root, 'js/components/xmltvguide.js'),
    'utf8'
  );
  const css = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');

  assert.match(
    component,
    /new ResizeObserver\(function \(\) \{[\s\S]*_fitXmltvRows\(me\)/
  );
  assert.match(component, /function _fitXmltvRows\(me\)/);
  assert.match(
    component,
    /getBoundingClientRect\(\)\.bottom > availableBottom/
  );
  assert.match(
    css,
    /> \.xmltvguide \{[\s\S]*height: 100% !important;[\s\S]*overflow: hidden !important;/
  );
  assert.match(
    css,
    /\.xmltvguide \.dt_state \{[\s\S]*overflow: hidden !important;/
  );
});

test('Hayman clock does not depend on Moment locale internals for rendering', () => {
  const source = fs.readFileSync(
    path.join(root, 'js/components/haymanclock.js'),
    'utf8'
  );
  assert.match(source, /typeof value !== 'string'/);
  assert.match(source, /var now = new Date\(\)/);
  assert.match(source, /new Intl\.DateTimeFormat/);
  assert.match(source, /\.fromNow\(true\)/);
  // updateTime() is now also called once, early, before the template
  // renders - so fitSize()'s measurement sees real day/hours/minutes/
  // seconds digits instead of empty ones - in addition to the interval
  // that keeps it ticking every second.
  assert.match(
    source,
    /updateTime\(\);\s*\n\s*\n\s*\/\/ Render into \.dt_state/
  );
  assert.match(
    source,
    /Dashticz\.setInterval\(me, function \(\) \{\s*\n\s*updateTime\(\);/
  );
  assert.doesNotMatch(source, /moment\(\)\.format\(/);
  assert.doesNotMatch(source, /_relativeTime/);
});

test('clock components use public date APIs and a valid seconds setting', () => {
  const dateTime = fs.readFileSync(path.join(root, 'src/date-time.js'), 'utf8');
  const basicClock = fs.readFileSync(
    path.join(root, 'js/components/basicclock.js'),
    'utf8'
  );
  const stationClock = fs.readFileSync(
    path.join(root, 'js/components/stationclock.js'),
    'utf8'
  );
  const flipClock = fs.readFileSync(
    path.join(root, 'js/components/flipclock.js'),
    'utf8'
  );
  assert.doesNotMatch(dateTime, /dayjs\.Ls/);
  // The clock face always fills the available block space; only the Scale
  // setting adjusts it further, so no component keeps an independent
  // px "Size" field or a hard cap unrelated to the block's own size.
  assert.doesNotMatch(basicClock, /me\.block\.size/);
  assert.doesNotMatch(basicClock, /maxFontSize/);
  // basicclock.js v4 (#175): only .dt_state is scaled, not .dt_block - the
  // title inherits font-size from .dt_block, and the available-height
  // calculation above already subtracted the title's *current* height, so
  // growing the title afterwards would invalidate that calculation. .dt_block
  // itself is reset instead of ever being sized directly.
  assert.match(basicClock, /\$block\.css\('font-size', ''\);/);
  assert.match(
    basicClock,
    /\$state\.css\('font-size', REF \* fitScale \* scale \+ 'px'\);/
  );
  assert.match(stationClock, /function clockFitSize/);
  assert.doesNotMatch(stationClock, /me\.block\.size/);
  assert.doesNotMatch(stationClock, /me\.block\.maxSize/);
  assert.match(stationClock, /var width = clockFitSize\(me, 120\)/);
  assert.doesNotMatch(flipClock, /me\.block\.size/);
  assert.doesNotMatch(flipClock, /minEmSize/);
  assert.doesNotMatch(flipClock, /maxEmSize/);
  // The digit row is far wider than tall, so a naive min(availW, availH) -
  // appropriate for the roughly square station/dial faces - badly
  // under-fills availW. The natural size per --flipclock-em is computed
  // analytically from flipclock.css's own fixed multipliers instead.
  assert.match(flipClock, /naturalWidthPerEm/);
  assert.match(flipClock, /naturalHeightPerEm/);
  assert.match(
    flipClock,
    /Math\.min\(availW \/ naturalWidthPerEm, availH \/ naturalHeightPerEm\)/
  );
  assert.match(flipClock, /FlipClock\(\$state, 0,/);
  assert.match(flipClock, /showSeconds: !settings\['hide_seconds'\]/);
  assert.doesNotMatch(flipClock, /showSecoonds/);
});

test('FlipClock width fix, Hayman dot alignment and Miniclock live-resize scaling', () => {
  const flipClock = fs.readFileSync(
    path.join(root, 'js/components/flipclock.js'),
    'utf8'
  );
  const haymanCss = fs.readFileSync(
    path.join(root, 'js/components/haymanclock.css'),
    'utf8'
  );
  const simpleblock = fs.readFileSync(
    path.join(root, 'js/components/simpleblock.js'),
    'utf8'
  );
  const haymanClock = fs.readFileSync(
    path.join(root, 'js/components/haymanclock.js'),
    'utf8'
  );

  // .dt_block is display:flex (fixed-width icon column + .dt_content), so
  // the outer box's own width also counts the icon and .dt_block's own
  // padding/border. .dt_content's width already excludes all of that and
  // must be preferred, or the flip cards overflow past the block's edge.
  assert.match(flipClock, /var availW =\s*\n?\s*\$content\.width\(\) \|\|/);
  assert.doesNotMatch(flipClock, /console\.log\('FLIP_ANALYTIC'/);

  // .clock-col{flex:1} has no min-width:0, so the 3-letter day-label column
  // intentionally claims more than an even quarter of the row (its
  // automatic minimum size) so its text doesn't overflow - a %-based dot
  // offset therefore landed at a different pixel position next to that
  // column than next to a 2-digit column. Dots are sized/positioned in em
  // (the shared .clock-container font-size), consistent regardless of each
  // column's own width.
  assert.match(haymanCss, /\.clock-col:not\(:last-child\):before,/);
  // Doubled from 0.15em so the separator reads at a size proportionate to
  // the fit-to-block digits next to it, instead of looking tiny compared
  // to them.
  assert.match(haymanCss, /width: 0\.3em;/);
  assert.match(haymanCss, /height: 0\.3em;/);
  assert.match(haymanCss, /right: var\(--hc-dot-right, -0\.15em\);/);
  assert.doesNotMatch(haymanCss, /right:\s*-3%/);

  // The dots must sit lower than the column's own vertical center, since
  // .clock-label below the digit pulls that center down away from the
  // digit itself.
  assert.match(haymanCss, /top: 46%;/);
  assert.match(haymanCss, /top: 61%;/);
  assert.doesNotMatch(haymanCss, /top:\s*37%/);
  assert.doesNotMatch(haymanCss, /top:\s*52%/);

  // The 3-4 letter day label ("Sun".."Wed") usually fills far more of its
  // (equal-width, see GAP_FACTOR) column than a 2-digit hour/minute/second
  // value fills of its own, so centering every dot on its plain column
  // boundary (the CSS fallback above) left the day/hour separator sitting
  // closer to the day text than the hour text. haymanclock.js measures
  // each column's actual rendered glyph (cloned into a real, temporary
  // element, since ::before pseudo-elements have no DOM node of their own
  // to measure) and sets --hc-dot-right per column so every separator -
  // not just day/hour - centers on the real glyph-to-glyph gap, in
  // whatever font/locale is actually rendering it.
  assert.match(haymanClock, /function measureGlyphWidth\(text, refStyle\)/);
  assert.match(haymanClock, /function centerDots\(\$container, fontSizePx\)/);
  assert.match(
    haymanClock,
    /cols\[i\]\.style\.setProperty\('--hc-dot-right', -0\.15 - offsetEm \+ 'em'\);/
  );
  assert.match(haymanClock, /centerDots\(\$container, fontSize\);/);

  // Hayman's natural face is wide and short, so it's almost always
  // width-bound; a too-small GAP_FACTOR let the digits fill that width
  // edge-to-edge, reading as oversized with barely any room for the ':'
  // separators. A bigger GAP_FACTOR reserves more of that same
  // fit-to-width budget as real, visible gaps between columns instead of
  // shrinking (and thus wasting) the whole result post-fit.
  assert.match(haymanClock, /var GAP_FACTOR = 1\.6;/);
  assert.doesNotMatch(haymanClock, /HAYMAN_SIZE_FACTOR/);

  // .dt_block is display:flex (icon column + .dt_content side by side);
  // .dt_content's measured width already excludes the icon column, unlike
  // $sizeBox's (grid item/.dt_block), which still includes it.
  assert.match(
    haymanClock,
    /var availW = \$content\.width\(\) \|\| \$sizeBox\.outerWidth\(\)/
  );

  // .dt_block's flex row centers icon+.dt_content as one group, shifting
  // the clock face right of the block's true center by about half the
  // icon's width; .clock-container also wasn't centered within
  // .dt_content at all (a block-level child left-aligned by default). The
  // icon is taken out of the flex flow (so .dt_content spans the block's
  // full width) and .clock-container is explicitly centered within it, so
  // the face is centered on the block regardless of either.
  assert.match(
    haymanCss,
    /\.haymanclock \{[\s\S]*?position: relative;[\s\S]*?\}/
  );
  assert.match(
    haymanCss,
    /\.haymanclock \.col-icon \{\s*\n\s*position: absolute;/
  );
  assert.match(
    haymanCss,
    /\.haymanclock \.clock-container \{[\s\S]*?margin-left: auto;\s*\n\s*margin-right: auto;/
  );

  // The custom themes' standby-only Hayman styling pinned the digits'
  // rendered size with `font-size: 80px !important`, which cannot be
  // overridden by haymanclock.js's fitSize() (jQuery .css() never beats an
  // !important rule) - the standby clock stayed one fixed size no matter
  // how its grid block was resized. Removing the fixed size lets
  // .clock-timer:before inherit .clock-container's JS-driven font-size
  // (via the base haymanclock.css's `font-size: 420%`) instead.
  ['modern-dark', 'liquid-glass-blue', 'liquid-glass-grey'].forEach(
    function (themeName) {
      var themeCss = fs.readFileSync(
        path.join(root, 'themes/' + themeName + '/' + themeName + '.css'),
        'utf8'
      );
      assert.match(
        themeCss,
        /\.standby \.clock-container \.clock-timer:before\s*\{[^}]*margin: 0 !important;/
      );
      assert.doesNotMatch(
        themeCss,
        /\.standby \.clock-container[\s\S]*?font-size: 80px !important/
      );
    }
  );

  // Miniclock has no Size/Scale controls; its .weekday/.date/.clock spans
  // must still scale with the block's own resize, the same way the four
  // dedicated clock widgets do.
  assert.match(simpleblock, /function _fitMiniclockSize\(me\)/);
  assert.match(simpleblock, /function _initMiniclockFitSize\(me\)/);
  assert.match(
    simpleblock,
    /style\.setProperty\('font-size',[sS]{0,80}?REF \* fitScale \+ 'px',[sS]{0,40}?'important'\)/
  );
  assert.match(simpleblock, /me\.miniclockResizeObserver = new ResizeObserver/);
  assert.match(
    simpleblock,
    /if \(me\.miniclockResizeObserver\) \{\s*\n\s*me\.miniclockResizeObserver\.disconnect\(\);/
  );

  // The topbar's miniclock (".dt-topbar-item") is a fixed 40px strip in the
  // fixed-height .colbar, not a resizable grid/column block, and isn't
  // wrapped by .dt-grid-item - so the live fit-to-block sizing above must
  // not touch it, or its own elastic flex box feeds a runaway
  // grow-remeasure-grow font-size loop that breaks the whole topbar.
  assert.match(
    simpleblock,
    /function _initMiniclockFitSize\(me\) \{\s*\n\s*var \$mount = me\.\$mountPoint;\s*\n[\s\S]*?if \(\$mount\.hasClass\('dt-topbar-item'\)\) return;/
  );
});

test('clock widgets no longer expose a px Size field, only Scale', () => {
  const widgetEditor = fs.readFileSync(
    path.join(root, 'js/widgeteditor.js'),
    'utf8'
  );
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );
  const settingsSource = fs.readFileSync(
    path.join(root, 'js/settings.js'),
    'utf8'
  );
  const savewidgets = fs.readFileSync(
    path.join(root, 'js/savewidgets.php'),
    'utf8'
  );
  const haymanClock = fs.readFileSync(
    path.join(root, 'js/components/haymanclock.js'),
    'utf8'
  );
  const english = JSON.parse(
    fs.readFileSync(path.join(root, 'lang/en_US.json'), 'utf8')
  );

  assert.doesNotMatch(widgetEditor, /'size_px'/);
  assert.doesNotMatch(widgetEditor, /ccfg\.size/);
  assert.doesNotMatch(widgetEditor, /entry\.size = /);
  assert.doesNotMatch(deviceEditor, /'size'/);
  assert.match(
    deviceEditor,
    /_copyDefinedWidgetProperties\(entry, definition, \[\s*\n\s*'scale',/
  );
  assert.doesNotMatch(settingsSource, /clock_size/);
  assert.doesNotMatch(savewidgets, /'clock_size'/);
  assert.doesNotMatch(savewidgets, /\$widget\['size'\]/);
  assert.doesNotMatch(savewidgets, /\$props\['size'\]/);
  assert.equal(typeof english.settings.widgets.clock_size, 'undefined');
  assert.equal(typeof english.settings.widgeteditor.size_px, 'undefined');

  // Hayman's container width now derives from the same fit-to-block `width`
  // used for its font size, instead of being capped at `scale * 100%` (which
  // made Scale > 1 a no-op and Size have no effect on the visible width).
  assert.match(
    haymanClock,
    /me\.block\.clockwidth = Math\.floor\(width\) \+ 'px';/
  );
  assert.doesNotMatch(haymanClock, /scale \* 100/);

  // The Clock type dropdown shows a preview image of the selected type.
  assert.match(widgetEditor, /id="we-cfg-clock-preview"/);
  assert.match(widgetEditor, /function _clockPreviewSrc/);
  assert.match(widgetEditor, /'img\/clock-' \+ type/);
});

test('clock components render into .dt_state so block.title/hide_title survive', () => {
  // .dt_content (built by dashticz.js's renderTitle()) holds both .dt_title
  // and .dt_state. A clock component that overwrites .dt_content or the
  // outer .dt_block wipes .dt_title out again right after it was rendered,
  // silently breaking the Widget Config editor's Title checkbox for clocks.
  const basicClock = fs.readFileSync(
    path.join(root, 'js/components/basicclock.js'),
    'utf8'
  );
  const stationClock = fs.readFileSync(
    path.join(root, 'js/components/stationclock.js'),
    'utf8'
  );
  const flipClock = fs.readFileSync(
    path.join(root, 'js/components/flipclock.js'),
    'utf8'
  );
  const haymanClock = fs.readFileSync(
    path.join(root, 'js/components/haymanclock.js'),
    'utf8'
  );
  assert.match(basicClock, /\$\(me\.mountPoint \+ ' \.dt_state'\)\.html\(/);
  assert.doesNotMatch(
    basicClock,
    /\$\(me\.mountPoint \+ ' \.dt_content'\)\.html\(/
  );
  assert.match(stationClock, /\$\(me\.mountPoint \+ ' \.dt_state'\)\.html\(/);
  assert.doesNotMatch(
    stationClock,
    /\$\(me\.mountPoint \+ ' \.dt_content'\)\.html\(/
  );
  assert.match(flipClock, /FlipClock\(\$state, 0,/);
  assert.match(
    haymanClock,
    /\$\(me\.mountPoint \+ ' \.dt_state'\)\.html\(template\(me\.block\)\)/
  );
  assert.doesNotMatch(
    haymanClock,
    /\$\(me\.mountPoint \+ ' \.dt_block'\)\.html\(template/
  );
});

test('remaining expert settings stay configurable while obsolete edit mode is removed', () => {
  const settings = fs.readFileSync(path.join(root, 'js/settings.js'), 'utf8');
  assert.match(settings, /boss_stationclock:/);
  assert.match(settings, /blink_color: '255, 255, 255, 1'/);
  assert.doesNotMatch(settings, /\bedit_mode\b/);
  assert.match(settings, /speak_lang: 'en_US'/);
  assert.match(settings, /widgetSettingTiles/);
  assert.match(settings, /config_mode: 'wizard'/);
});

test('config_mode auto-detects as custom when absent from CONFIG.js', () => {
  const settingsSource = fs.readFileSync(
    path.join(root, 'js/settings.js'),
    'utf8'
  );

  // Verify the auto-detect logic is present in the source.
  assert.match(settingsSource, /_configModeAutoDetected/);
  assert.match(
    settingsSource,
    /typeof config\['config_mode'\] === 'undefined'/
  );
  assert.match(settingsSource, /_persistAutoDetectedConfigMode/);

  // Extract and evaluate just the settings-merge block in isolation.
  // We need: defaultSettings definition, $.extend, and the auto-detect code.
  const startDefault = settingsSource.indexOf('var defaultSettings = {');
  const endExtend = settingsSource.indexOf(
    'if (_configModeAutoDetected) {',
    settingsSource.indexOf('$.extend(settings, defaultSettings, config)')
  );
  const endBlock = settingsSource.indexOf('\n}', endExtend) + 2;
  assert.notEqual(startDefault, -1, 'defaultSettings block not found');
  assert.notEqual(endExtend, -1, 'auto-detect block not found');

  const snippet = settingsSource.substring(startDefault, endBlock);

  function runWithConfig(configObj) {
    const ctx = {
      $: { extend: Object.assign },
      config: configObj,
      settings: {},
      _configModeAutoDetected: undefined,
    };
    vm.runInNewContext(snippet, ctx);
    return {
      settings: ctx.settings,
      autoDetected: ctx._configModeAutoDetected,
    };
  }

  // No config_mode in CONFIG.js → auto-detect custom.
  const noMode = runWithConfig({});
  assert.equal(noMode.settings['config_mode'], 'custom');
  assert.equal(noMode.autoDetected, true);

  // config_mode explicitly set to wizard → keep wizard.
  const wizardMode = runWithConfig({ config_mode: 'wizard' });
  assert.equal(wizardMode.settings['config_mode'], 'wizard');
  assert.equal(wizardMode.autoDetected, false);

  // config_mode explicitly set to custom → keep custom.
  const customMode = runWithConfig({ config_mode: 'custom' });
  assert.equal(customMode.settings['config_mode'], 'custom');
  assert.equal(customMode.autoDetected, false);
});

test('wizard cleanup also removes standby screen definitions from CONFIG.js', () => {
  const source = fs.readFileSync(
    path.join(root, 'js/configwriter.php'),
    'utf8'
  );

  assert.match(source, /\/\/ \[standby-editor-start\]/);
  assert.match(source, /\/\/ \[standby-editor-end\]/);
  assert.match(
    source,
    /configwriter_strip_legacy_columns_standby\(\\?\$config\)/
  );
  assert.match(source, /(?:blocks\|columns\|screens\|columns_standby)/);
});

test('UI dependencies use the maintained compatibility versions', () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(root, 'package.json'), 'utf8')
  );
  assert.match(packageJson.dependencies.bootstrap, /^\^5\.3\./);
  assert.match(packageJson.dependencies['chart.js'], /^\^4\./);
  assert.ok(packageJson.dependencies.dayjs);
  assert.equal(packageJson.dependencies.moment, undefined);
  assert.equal(packageJson.dependencies['handlebars.moment'], undefined);
});

test('legacy UI configuration is covered by migration adapters', () => {
  const bootstrap = fs.readFileSync(
    path.join(root, 'src/bootstrap-compat.js'),
    'utf8'
  );
  const bootstrapStyles = fs.readFileSync(
    path.join(root, 'src/_bootstrap3-compat.scss'),
    'utf8'
  );
  const chart = fs.readFileSync(path.join(root, 'src/chart-compat.js'), 'utf8');
  const dateTime = fs.readFileSync(path.join(root, 'src/date-time.js'), 'utf8');

  assert.match(bootstrap, /data-bs-toggle/);
  assert.match(bootstrap, /data-bs-backdrop/);
  assert.match(bootstrap, /installJQueryPlugin/);
  assert.match(bootstrap, /config === undefined/);
  assert.match(bootstrap, /MutationObserver/);
  assert.match(bootstrap, /prepareButtonGroup/);
  assert.match(bootstrap, /data-bootstrap3-button-group/);
  assert.match(bootstrap, /input\.name = .*buttonGroupId/);
  assert.match(bootstrapStyles, /\.col-xs-12 \{ width: 100%; \}/);
  assert.match(bootstrapStyles, /\.col-sm-3 \{ width: 25%; \}/);
  assert.match(bootstrapStyles, /\.col-sm-9 \{ width: 75%; \}/);
  assert.match(bootstrapStyles, /data-toggle=['"]buttons['"]/);
  assert.match(bootstrapStyles, /\.fade\.in/);
  assert.match(chart, /xAxes/);
  assert.match(chart, /migrateTooltipCallbacks/);
  assert.match(dateTime, /badMutable/);
  assert.match(dateTime, /customParseFormat/);
});

test('selector buttons isolate radio groups and dispatch their own value', () => {
  const source = fs.readFileSync(path.join(root, 'js/blocks.js'), 'utf8');

  assert.match(source, /var checked = st \? ' checked' : ''/);
  assert.match(source, /change\.selectorButtons/);
  assert.match(source, /var value = \$\(this\)\.val\(\)/);
  assert.doesNotMatch(source, /on\('click', '\.btn-group'/);
  assert.doesNotMatch(source, /\$\(ev\.target\)\.children\('input'\)\.val\(\)/);
});

test('hide_data is respected consistently by themes, switches and the device editor', () => {
  const blockSource = fs.readFileSync(path.join(root, 'js/blocks.js'), 'utf8');
  const switchSource = fs.readFileSync(
    path.join(root, 'js/switches.js'),
    'utf8'
  );
  const editorSource = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );

  assert.match(blockSource, /if \(!block\['hide_data'\]\) \{/);
  assert.doesNotMatch(blockSource, /settings\['theme'\] === 'modern-dark'/);
  assert.doesNotMatch(switchSource, /blocks\['hide_data'\]/);
  assert.match(
    switchSource,
    /block\.hide_data === true \? '' : '<div class="slider-scale"/
  );
  assert.match(editorSource, /hide_data: configured\.hide_data === true/);
  assert.match(editorSource, /entry\.hide_data = options\.hide_data === true/);
});

test('vertical slider percentage labels use the larger 12px size', () => {
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');

  assert.match(styles, /\.slider-tick span \{[\s\S]*?font-size: 12px;/);
});

test('remote content and network failures use safe bounded rendering paths', () => {
  const alarms = fs.readFileSync(
    path.join(root, 'js/components/alarmmeldingen.js'),
    'utf8'
  );
  const calendar = fs.readFileSync(
    path.join(root, 'js/components/calendar.js'),
    'utf8'
  );
  const domoticz = fs.readFileSync(
    path.join(root, 'js/domoticz-api.js'),
    'utf8'
  );
  const main = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');

  assert.match(alarms, /function safeExternalUrl/);
  assert.match(alarms, /rel: 'noopener noreferrer'/);
  assert.match(alarms, /\.text\(description\)/);
  assert.doesNotMatch(alarms, /onclick="window\.open/);
  assert.match(calendar, /function appendSafeCalendarInfo/);
  assert.match(calendar, /new DOMParser\(\)/);
  assert.match(calendar, /encodeURIComponent\(/);
  assert.doesNotMatch(calendar, /\.html\(\$\.parseHTML\(info\)\)/);
  assert.match(domoticz, /timeout: cfg\.domoticz_timeout/);
  assert.match(main, /var failedFilename = loadingFilename/);
  assert.match(
    main,
    /screen\['background_' \+ newClass\]\s*\|\|[\s\S]*settings\['background_image'\]/
  );
  assert.doesNotMatch(
    main,
    /screen\['background_' \+ newClass\][\s\S]{0,100}screen\.background/
  );
});

test('calendar editor behavior is documented without a version bump', () => {
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');

  assert.match(readme, /Calendar Widget Config shows every source/);
  assert.match(readme, /Personal: \{ ics:/);
  assert.match(readme, /holidayurl/);
  assert.match(readme, /property `c`/);
  assert.match(readme, /framed active-stylesheet notice/);
});

test('modern dark theme is portable and documented', () => {
  const theme = fs.readFileSync(
    path.join(root, 'themes/modern-dark/modern-dark.css'),
    'utf8'
  );
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const blocks = fs.readFileSync(path.join(root, 'js/blocks.js'), 'utf8');

  assert.match(theme, /--main-bg/);
  assert.match(theme, /--main-border-width: 1px/);
  assert.match(theme, /--block-gap: 0px/);
  assert.match(theme, /--border-color-inactive: rgba\(42, 94, 151, 0\.5\)/);
  assert.match(theme, /--border-color-active: rgba\(112, 160, 218, 0\.5\)/);
  assert.match(theme, /--border-color-block: rgba\(112, 160, 218, 0\.3\)/);
  assert.match(
    theme,
    /--border-color-selector: var\(--border-color-inactive\)/
  );
  assert.match(
    theme,
    /border: var\(--block-gap\) solid transparent !important/
  );
  assert.match(
    theme,
    /inset 0 0 0 var\(--main-border-width\) var\(--border-color-block\)/
  );
  assert.match(theme, /--radius-border: 16px/);
  assert.match(
    theme,
    /\.transbg \.btn[\s\S]*border: 1px solid var\(--border-color-inactive\) !important/
  );
  assert.match(theme, /\.transbg \.btn\.active/);
  assert.match(theme, /border-color: var\(--border-color-active\) !important/);
  assert.match(theme, /\.transbg select/);
  assert.match(
    theme,
    /\.transbg select[\s\S]*border: 1px solid var\(--border-color-selector\) !important/
  );
  assert.match(theme, /\.transbg \.col-data > select/);
  assert.match(theme, /\.transbg \.col-data > select[\s\S]*min-height: 44px/);
  assert.match(
    theme,
    /\.transbg select:focus,[\s\S]*border-color: var\(--border-color-selector\) !important/
  );
  assert.doesNotMatch(theme, /linear-gradient/);
  assert.match(theme, /\.mh \.btn\.active/);
  assert.match(
    theme,
    /\.transbg\.titlegroups,[\s\S]*height: var\(--height-block-default\) !important[\s\S]*min-height: var\(--height-block-default\) !important/
  );
  assert.match(
    theme,
    /\.titlegroups \.dt_content,[\s\S]*justify-content: flex-start !important/
  );
  assert.match(
    theme,
    /\.titlegroups \.dt_title,[\s\S]*text-align: left !important/
  );
  assert.match(theme, /\.trash \.state \{[\s\S]*text-align: right !important/);
  assert.match(
    theme,
    /\.trash \.state table \{[\s\S]*margin-left: auto !important/
  );
  assert.match(
    theme,
    /\.trash \.trashtype,[\s\S]*\.trash \.trashdate \{[\s\S]*text-align: right !important/
  );
  assert.match(
    theme,
    /\.titlegroups \.dt_state,[\s\S]*display: none !important/
  );
  assert.match(theme, /\.transbg\.titlegroups/);
  assert.match(
    theme,
    /\.titlegroups[\s\S]*background: var\(--main-bg\) !important/
  );
  assert.match(
    theme,
    /\.titlegroups[\s\S]*border: var\(--block-gap\) solid transparent !important/
  );
  assert.match(
    theme,
    /\.titlegroups[\s\S]*border-radius: var\(--radius-border\) !important/
  );
  assert.match(
    theme,
    /\.colbar \.miniclock[\s\S]*background: transparent !important/
  );
  assert.doesNotMatch(theme, /^\.miniclock\s*\{[^}]*background:/m);
  assert.match(theme, /\.titlegroups[\s\S]*var\(--panel-shadow\) !important/);
  assert.match(theme, /\.titlegroups \.col-icon img\.icon/);
  assert.match(theme, /@media \(max-width: 767\.98px\)/);
  assert.match(theme, /\.standby \.transbg[\s\S]*background: #000 !important/);
  assert.match(theme, /\.standby \.transbg[\s\S]*border: 0 !important/);
  assert.match(
    theme,
    /\.standby \.transbg[\s\S]*backdrop-filter: none !important/
  );
  assert.doesNotMatch(theme, /https?:\/\//i);
  assert.doesNotMatch(theme, /url\s*\(/i);
  assert.match(readme, /config\['theme'\] = 'modern-dark'/);
});

test('settings modal uses compact Bootstrap 5 controls and aligned help icons', () => {
  const settings = fs.readFileSync(path.join(root, 'js/settings.js'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
  const simpleblock = fs.readFileSync(
    path.join(root, 'js/components/simpleblock.js'),
    'utf8'
  );
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');

  assert.match(settings, /class="settings-row"/);
  assert.match(settings, /form-check form-switch settings-switch/);
  assert.match(settings, /class="settings-tile"/);
  assert.match(settings, /settings-category-tiles/);
  assert.match(settings, /settingList\['standby'\]/);
  assert.match(settings, /settings-update-run/);
  assert.match(settings, /js\/update\.php/);
  assert.match(settings, /standby_background/);
  assert.doesNotMatch(settings, /standby_blocks/);
  assert.match(settings, /class="settings-brand"/);
  assert.match(settings, /class="btn btn-secondary settings-back d-none"/);
  assert.match(settings, /\.settings-widget-panel:not\(\.d-none\)/);
  assert.match(settings, /showSettingsHome\(\)/);
  assert.doesNotMatch(settings, /settings-category-back/);
  assert.doesNotMatch(settings, /settings-widget-back/);
  assert.match(main, /url: 'js\/settings\.js\?v=' \+ _DASHTICZ_VERSION/);
  assert.match(settings, /img\/favicon\/app-icon-192x192\.png/);
  assert.match(settings, /window\.bootstrap\.Tooltip/);
  assert.match(settings, /data-bs-trigger="click"/);
  assert.match(settings, /data-bs-custom-class="settings-tooltip"/);
  assert.doesNotMatch(settings, /material-switch/);
  assert.doesNotMatch(settings, /data-bs-toggle="pill"/);

  assert.match(simpleblock, /data-bs-target="#settingspopup"/);
  assert.doesNotMatch(simpleblock, /\sdata-target="#settingspopup"/);

  assert.match(styles, /\.settings-row\s*\{/);
  assert.match(styles, /grid-template-columns:/);
  assert.match(styles, /\.settings-tile(?:,\s*\.settings-widget-tile)?\s*\{/);
  assert.match(styles, /\.settings-switch \.form-check-input/);
  assert.match(styles, /width: 38px;/);
  assert.match(styles, /height: 20px;/);
  assert.match(styles, /width: 40ch;/);
  assert.match(styles, /font-size: 15px;/);
  assert.match(styles, /background: #eef1f4;/);
  assert.match(styles, /color: #0b6fc2;/);
  assert.match(styles, /\.settings-tooltip[\s\S]*z-index: 10050;/);
  assert.match(styles, /\.settings-help \.fas/);
  assert.doesNotMatch(styles, /\.settings-category-back/);
  assert.doesNotMatch(styles, /\.settings-widget-back/);
  assert.doesNotMatch(styles, /\.material-switch/);
});

test('settings theme selector loads valid installed themes', () => {
  const settings = fs.readFileSync(path.join(root, 'js/settings.js'), 'utf8');

  assert.match(settings, /settingList\['theme'\].*theme.*type.*'select'/s);
  assert.match(settings, /bindThemePicker\(\)/);
  assert.match(settings, /js\/listthemes\.php/);
  assert.match(settings, /settings\['theme'\] \|\| 'default'/);
  assert.match(settings, /\$select\.val\(currentTheme\)/);
});

test('standby background image is not overwritten by standby CSS', () => {
  const main = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
  const settings = fs.readFileSync(path.join(root, 'js/settings.js'), 'utf8');
  const customBackgroundIgnore = fs.readFileSync(
    path.join(root, 'img/custom/.gitignore'),
    'utf8'
  );
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');
  const modernDark = fs.readFileSync(
    path.join(root, 'themes/modern-dark/modern-dark.css'),
    'utf8'
  );

  assert.match(
    main,
    /settings\['standby_background'\]\s*\|\|\s*settings\['background_image'\]/
  );
  assert.match(
    main,
    /screenstandby[\s\S]*resolveBackgroundImagePath\(standbyBackground\)/
  );
  assert.match(styles, /\.standby \.swiper-slide:not\(\.screenstandby\)/);
  assert.match(
    styles,
    /\.standby \.screenstandby\s*\{[^}]*background-size: cover;[^}]*\}/
  );
  assert.match(
    styles,
    /\.standby \.screenstandby\s*\{[^}]*position: fixed;[^}]*inset: 0;[^}]*max-width: 100vw;[^}]*max-height: 100dvh;[^}]*overflow: hidden;[^}]*background-size: cover;[^}]*\}/
  );
  assert.doesNotMatch(main, /screenstandby[^]*style="height:/);
  assert.doesNotMatch(
    styles,
    /\.standby \.swiper-slide\s*\{[\s\S]*?background-image: none !important;/
  );
  assert.match(
    modernDark,
    /\.standby \.screenstandby\s*\{[^}]*background-color: #000 !important;[^}]*\}/
  );
  assert.doesNotMatch(
    modernDark,
    /\.standby \.screenstandby\s*\{[^}]*background: #000 !important;/
  );
  assert.match(settings, /return 'CUSTOM_' \+ name\.replace\(\/\^custom\\\//);
  assert.match(customBackgroundIgnore, /^\*$/m);
  assert.match(customBackgroundIgnore, /^!\.gitignore$/m);
});

test('standby icon colors stay scoped to the standby screen', () => {
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');

  assert.match(
    styles,
    /\.standby \.screenstandby \.fas[\s\S]*color: var\(--text-light\) !important;/
  );
  assert.doesNotMatch(styles, /\.standby \.fas(?:,|\s*\{)/);
  assert.match(styles, /\.we-widget-icon\s*\{[^}]*color: #0d6efd;/);
  assert.match(styles, /\.we-config-btn\s*\{[^}]*color: var\(--text-muted\);/);
});

test('topbar screen switcher supports standby and extra screens', () => {
  const main = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
  const switcher = fs.readFileSync(
    path.join(root, 'js/screenswitcher.js'),
    'utf8'
  );
  const simpleBlock = fs.readFileSync(
    path.join(root, 'js/components/simpleblock.js'),
    'utf8'
  );
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');
  const savescreens = fs.readFileSync(
    path.join(root, 'js/savescreens.php'),
    'utf8'
  );
  const writer = fs.readFileSync(
    path.join(root, 'js/configwriter.php'),
    'utf8'
  );

  assert.match(main, /js\/screenswitcher\.js/);
  assert.match(main, /DashticzScreenSwitcher\.init\(\)/);
  assert.match(main, /DashticzScreenSwitcher\.mountIntoStandby\(\)/);
  assert.match(main, /var standby_screen = \{\}/);
  assert.match(main, /function hasStandbyContent/);
  assert.match(main, /DashticzGridLayout\.renderGridScreen\(\s*standby_screen/);
  assert.match(main, /screenswitcher/);
  assert.match(main, /isStandbyEditMode/);
  assert.match(simpleBlock, /dt-screen-switcher-host/);
  assert.match(simpleBlock, /screenswitcher/);
  assert.match(switcher, /data-screen="standby"/);
  assert.match(switcher, /function getDefaultScreenIconPath/);
  assert.match(switcher, /topbar_use_png_icons/);
  assert.match(switcher, /standby: 'Standby'/);
  assert.match(switcher, /1: 'One'/);
  assert.match(switcher, /2: 'Two'/);
  assert.match(switcher, /3: 'Three'/);
  assert.match(switcher, /4: 'Four'/);
  // Standby button falls back to 'S' when no custom or built-in PNG icon is configured
  assert.match(switcher, /getScreenIconHtml\('standby'\) \|\| 'S'/);
  assert.match(switcher, /dt-screen-add/);
  assert.match(switcher, /dt-screen-delete/);
  assert.match(switcher, /screenNums\.length > 1/);
  assert.match(switcher, /disabled aria-disabled="true"/);
  assert.match(
    switcher,
    /\.dt-screen-delete'[\s\S]*\.prop\('disabled', !canDelete\)/
  );
  assert.ok(
    switcher.indexOf('dt-screen-add') < switcher.indexOf('dt-screen-delete'),
    'the minus button must render directly after the plus button'
  );
  assert.match(switcher, /js\/savescreens\.php/);
  assert.match(switcher, /enterStandbyManual/);
  assert.match(switcher, /standbyEditMode/);
  assert.match(styles, /\.dt-screen-btn\s*\{/);
  assert.match(styles, /width: 30px/);
  assert.match(styles, /\.dt-screen-btn \.dt-screen-main-icon-img/);
  assert.match(styles, /border-radius: 4px/);
  assert.match(styles, /\.dt-screen-btn\.active/);
  assert.match(styles, /dt-screen-switcher-host/);
  assert.match(savescreens, /dashticz_require_csrf\(\)/);
  assert.match(savescreens, /action.*add/);
  assert.match(writer, /function configwriter_replace_screens_section/);
  assert.match(writer, /function configwriter_emit_new_screen/);
  assert.match(writer, /function configwriter_editor_markers/);
  assert.match(writer, /function configwriter_column_prefix/);
  assert.match(writer, /function configwriter_build_standby_layout_section/);
  assert.match(writer, /do not coerce to 1/);
  assert.match(
    styles,
    /body\.standby-edit \.dt-screen-switcher-bar\.is-visible/
  );
  assert.match(switcher, /mountEditorIcons\(\$bar\)/);
  assert.match(switcher, /setStandbyBarVisible/);
  assert.match(switcher, /bindStandbyBarHover/);
  assert.match(switcher, /clientY\s*<\s*56/);
});

test('topbar and layout editor keep controls usable', () => {
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');
  const editor = fs.readFileSync(path.join(root, 'js/layouteditor.js'), 'utf8');
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );
  const main = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
  const blocks = fs.readFileSync(path.join(root, 'js/blocks.js'), 'utf8');
  const simpleblock = fs.readFileSync(
    path.join(root, 'js/components/simpleblock.js'),
    'utf8'
  );

  assert.match(
    styles,
    /\.colbar\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*nowrap;/s
  );
  assert.match(styles, /\.colbar \.logo\s*\{[^}]*flex:\s*0 1 auto;/s);
  assert.match(
    styles,
    /\.colbar\.transbg\s*\{[^}]*padding-top:\s*8px;[^}]*padding-bottom:\s*6px;[^}]*border:\s*3px solid transparent;/s
  );
  assert.match(
    styles,
    /\.colbar \.miniclock\s*\{[^}]*flex:\s*1 1 auto;[^}]*height:\s*40px !important;/s
  );
  assert.match(
    styles,
    /\.colbar \.miniclock\s*\{[^}]*background:\s*transparent !important;[^}]*box-shadow:\s*none !important;/s
  );
  assert.match(
    simpleblock,
    /data-id="miniclock" class="miniclock mh dt_block transbg col-xs-/
  );
  assert.match(
    styles,
    /\.colbar \.dt-screen-switcher-host\s*\{[^}]*order:\s*99;[^}]*margin-left:\s*auto;/s
  );
  assert.match(
    styles,
    /\.colbar \.topbar-settings-wrap\s*\{[^}]*order:\s*100;[^}]*flex:\s*0 0 auto;/s
  );
  assert.match(blocks, /dt-topbar-item dt-topbar-/);
  assert.match(main, /\['logo', 'miniclock', 'screenswitcher', 'settings'\]/);
  assert.match(editor, /var MIN_GRID_WIDTH = 2;/);
  // Lowered from 4 to 2 rows: the editor overlay's controls already rely on
  // `overflow: visible` to stay clickable on a very small item, and 2 rows
  // was already proven safe for miniclock, which no longer needs its own
  // separate (now-redundant) minimum.
  assert.match(editor, /var MIN_GRID_HEIGHT = 2;/);
  assert.match(editor, /var MIN_TITLE_GRID_HEIGHT = 2;/);
  assert.match(deviceEditor, /var TITLE_GRID_HEIGHT = 2;/);
  assert.doesNotMatch(editor, /MIN_MINICLOCK_GRID_HEIGHT/);
  assert.match(editor, /function _minimumGridHeight/);
  assert.match(editor, /type === 'blocktitle'\) return MIN_TITLE_GRID_HEIGHT;/);
  assert.match(
    editor,
    /item\.grid\.w < MIN_GRID_WIDTH \|\| item\.grid\.h < minimumHeight/
  );
  assert.match(editor, /width = Math\.max\(\s*MIN_GRID_WIDTH,/s);
  assert.match(editor, /height = Math\.max\(_minimumGridHeight\(item\),/);
  assert.match(
    styles,
    /\.dt-grid-screen > \.dt-grid-layout > \.dt-grid-item > \.titlegroups,[\s\S]*height: 100% !important;[\s\S]*min-height: 0 !important;[\s\S]*overflow: hidden !important;/
  );

  // renderSunrise's markup carries neither .dt_block nor .mh, so without a
  // dedicated rule a resized Sunrise grid cell kept its reserved size while
  // the visible content stayed pinned at its small natural size (looking
  // like the resize "didn't stick"). It must fill and center like the other
  // grid-aware blocks. With no icon/title header the sunrise/sunset line is
  // the block's only content and stays vertically centered (justify-content:
  // center) - a separate .sunrise-has-header rule overrides this to
  // flex-start only when a header is actually rendered (see below).
  assert.match(
    styles,
    /\.dt-grid-screen > \.dt-grid-layout > \.dt-grid-item > \.sunriseholder\s*\{[^}]*height:\s*100% !important;[^}]*min-height:\s*0 !important;[^}]*overflow:\s*hidden !important;[^}]*display:\s*flex;[^}]*align-items:\s*center;[^}]*justify-content:\s*center;/s
  );
});

test('garbage dates use the selected interface language', () => {
  const garbage = fs.readFileSync(
    path.join(root, 'js/components/garbage.js'),
    'utf8'
  );
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');

  assert.match(garbage, /garbage\.date\.locale\(settings\['language'\]\)/);
  assert.match(garbage, /localizedDate\.format\('dddd'\)/);
  assert.match(
    styles,
    /\.trash \.state\s*\{[^}]*font-size:\s*calc\(var\(--font-small\) - 2px\) !important;[^}]*margin-top:\s*-10px;/s
  );
  assert.match(
    styles,
    /> \.dt-grid-item > \.trash\s*\{[^}]*height:\s*100% !important;[^}]*min-height:\s*0 !important;[^}]*overflow:\s*hidden !important;/s
  );
});

test('timegraph uses Chart.js 4 x/y time points', () => {
  const source = fs.readFileSync(
    path.join(root, 'js/components/timegraph.js'),
    'utf8'
  );

  assert.match(source, /\.data\[length - 1\]\.x = timestamp\.valueOf\(\)/);
  assert.match(source, /x: timestamp\.valueOf\(\)/);
  assert.match(source, /data\.x = timestamp\.valueOf\(\) \+ 10000/);
  assert.match(
    source,
    /var d = \{ y: data\.y, x: timestamp\.valueOf\(\) \+ 10000 \}/
  );
  assert.match(source, /dataset\.data\[1\]\.x < minTime/);
  assert.doesNotMatch(source, /\.data\[length - 1\]\.t\s*=/);
  assert.doesNotMatch(source, /\bt:\s*timestamp/);
  assert.doesNotMatch(source, /dataset\.data\[1\]\.t/);
});

test('migration sources use LF line endings', () => {
  for (const file of [
    '.gitattributes',
    'index.html',
    'package.json',
    'package-lock.json',
    'src/_bootstrap3-compat.scss',
    'src/bootstrap-compat.js',
    'src/index.js',
    'src/chart-compat.js',
    'src/date-time.js',
    'src/handlebars-helpers.js',
    'src/loader.scss',
    'themes/modern-dark/modern-dark.css',
    'tools/log.html',
    'css/creative.css',
    'js/components/graph.js',
    'js/components/simpleblock.js',
    'js/components/timegraph.js',
    'js/loader.js',
    'js/settings.js',
    'tpl/camera_video.tpl',
  ]) {
    assert.doesNotMatch(
      fs.readFileSync(path.join(root, file), 'utf8'),
      /\r\n/,
      file
    );
  }
});

test('device editor resubmits xmltvguide and iframe URLs so an unrelated device save cannot 400', () => {
  const deviceEditorSource = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );

  const helperStart = deviceEditorSource.indexOf(
    'function _copyDefinedWidgetProperties'
  );
  const helperEnd =
    deviceEditorSource.indexOf('\n  }\n', helperStart) + '\n  }\n'.length;
  assert.notEqual(helperStart, -1, '_copyDefinedWidgetProperties not found');
  const helperSnippet = deviceEditorSource.substring(helperStart, helperEnd);

  const branchStart = deviceEditorSource.indexOf(
    "if (widget.id === 'garbage') {"
  );
  const branchEnd = deviceEditorSource.indexOf(
    'entry.custom_fields = _widgetCustomFields(definition);',
    branchStart
  );
  assert.notEqual(branchStart, -1, 'widget-type branch chain not found');
  assert.notEqual(branchEnd, -1, 'end of widget-type branch chain not found');
  const branchSnippet = deviceEditorSource.substring(branchStart, branchEnd);

  // Both widget types must be resubmitted with their required URL field, or
  // savewidgets.php rejects the entire Device Editor save with a 400 error
  // (see issue #98: adding a device fails whenever an xmltvguide/iframe
  // block already exists, because that block's URL silently dropped out of
  // the resubmitted payload).
  function runBranch(widgetId, definition, settingsObj) {
    const ctx = {
      widget: { id: widgetId },
      definition: definition,
      entry: {},
      settings: settingsObj || {},
    };
    vm.runInNewContext(helperSnippet + '\n' + branchSnippet, ctx);
    return ctx.entry;
  }

  const xmltvEntry = runBranch('xmltvguide', {
    xmltvurl: 'http://my-epg-server/guide.xml',
    channels: ['BBC1'],
    maxitems: 20,
  });
  assert.equal(xmltvEntry.xmltvurl, 'http://my-epg-server/guide.xml');
  assert.deepEqual(xmltvEntry.channels, ['BBC1']);
  assert.equal(xmltvEntry.maxitems, 20);

  // The XMLTV URL normally lives in the global xmltv_url setting rather than
  // on the block itself (that's how the Widget Editor stores it), so the
  // fallback to settings.xmltv_url must work when definition.xmltvurl is unset.
  const xmltvGlobalEntry = runBranch(
    'xmltvguide',
    { channels: ['BBC1'] },
    { xmltv_url: 'http://global-epg-server/guide.xml' }
  );
  assert.equal(xmltvGlobalEntry.xmltvurl, 'http://global-epg-server/guide.xml');

  const iframeEntry = runBranch('iframe', {
    frameurl: 'https://example.com/dashboard',
    scrollbars: false,
  });
  assert.equal(iframeEntry.frameurl, 'https://example.com/dashboard');
  assert.equal(iframeEntry.scrollbars, false);
});

test('Multi Device reuses the Custom Device engine and its per-value idx fallback', () => {
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );
  const simpleBlock = fs.readFileSync(
    path.join(root, 'js/components/simpleblock.js'),
    'utf8'
  );
  const blocksSource = fs.readFileSync(path.join(root, 'js/blocks.js'), 'utf8');

  // The Multi Device popup is a new add-flow, but it must save through the
  // existing specialType 'custom' pipeline so no rendering/parsing logic is
  // duplicated: saving, editing and CONFIG.js writing stay exactly the same
  // as any other Custom Device.
  assert.match(deviceEditor, /function openMultiDevice\(\)/);
  assert.match(deviceEditor, /function _showMultiDevicePopup\(\)/);
  assert.match(deviceEditor, /openMultiDevice: openMultiDevice/);
  assert.match(
    deviceEditor,
    /specialType: 'custom',[\s\S]*?customFields: customRows/
  );
  assert.match(simpleBlock, /action: 'multidevice'/);
  assert.match(simpleBlock, /DashticzDeviceEditor\.openMultiDevice\(\)/);

  // blocks['combine'] = {idx: 43, values: [{value: '<A>'}, {idx: 1247, value: '<B>'}]}
  // relies on each values[] entry inheriting the parent block's idx when it
  // doesn't set its own: origBlock is merged in before the per-value `value`,
  // so a later, more specific idx on the row still wins.
  assert.match(
    blocksSource,
    /\$\.extend\(newValue, protoBlock, origBlock, value\)/
  );
});

test('Radio widget is a graphical front end for the existing Streamplayer component', () => {
  const widgetEditor = fs.readFileSync(
    path.join(root, 'js/widgeteditor.js'),
    'utf8'
  );
  const layoutEditor = fs.readFileSync(
    path.join(root, 'js/layouteditor.js'),
    'utf8'
  );
  const savewidgets = fs.readFileSync(
    path.join(root, 'js/savewidgets.php'),
    'utf8'
  );
  const streamplayer = fs.readFileSync(
    path.join(root, 'js/components/streamplayer.js'),
    'utf8'
  );

  // DT_streamplayer is matched by its registered component name (Dashticz._mount
  // in dashticz.js only checks components[selector] for a string block reference),
  // so every layer must keep using the literal 'streamplayer' key rather than a
  // synthetic 'widget_radio' key, or the block silently stops being playable.
  assert.match(streamplayer, /name: 'streamplayer'/);
  assert.match(widgetEditor, /id: 'radio',\s*\n\s*blockKey: 'streamplayer'/);
  assert.match(layoutEditor, /streamplayer: 'radio'/);
  assert.match(savewidgets, /'radio' => \['key' => 'streamplayer'/);

  // New tracks are written onto the block itself (blocks['streamplayer'].tracks),
  // which getBlockConfig merges over DT_streamplayer's defaultCfg — so it takes
  // precedence over a legacy _STREAMPLAYER_TRACKS global without replacing it.
  assert.match(streamplayer, /_STREAMPLAYER_TRACKS/);
  assert.match(
    widgetEditor,
    /entry\.tracks = \(widgetConfigs\.radio \|\| \{\}\)\.tracks/
  );
  assert.match(savewidgets, /\$widget\['tracks'\]\[\] = \[/);

  // Every station row gets its own + button (per spec), not just one add
  // button below the whole list.
  assert.match(widgetEditor, /we-radio-add/);
  assert.match(widgetEditor, /we-radio-remove/);

  // tracks is edited through the dedicated station rows; it must be marked
  // as a managed property or it also shows up as a raw JSON row in the
  // generic Custom fields list.
  assert.match(widgetEditor, /radio: \{ tracks: true \}/);

  // Same issue #98 class of bug as iframe/xmltvguide: savewidgets.php requires
  // top-level tracks, so the Device Editor must resubmit them explicitly (with
  // a fallback to the legacy _STREAMPLAYER_TRACKS global) or an unrelated
  // device save would 400 out any existing Radio widget.
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );
  assert.match(
    deviceEditor,
    /widget\.id === 'radio'\) \{[\s\S]*?_STREAMPLAYER_TRACKS[\s\S]*?\}/
  );
});

test('iFrame without scaletofit/aspectratio fills its grid cell height instead of collapsing', () => {
  const frameSource = fs.readFileSync(
    path.join(root, 'js/components/frame.js'),
    'utf8'
  );

  // .dt_state only gets a real height via the .fixedheight class, which
  // dashticz.js only adds when aspectratio or a fixed height is configured
  // (see js/dashticz.js renderBlock). With both left empty (the new default,
  // see iframe_scaletofit/aspectratio defaults above) the iframe used to
  // collapse to the browser's ~150px default height. It must now measure and
  // apply the grid cell's own already-allocated height as a fallback.
  const runStart = frameSource.indexOf('run: function (me) {');
  const runEnd = frameSource.indexOf('\n  },\n\n  onResize', runStart);
  assert.notEqual(runStart, -1, 'DT_frame.run not found');
  assert.notEqual(runEnd, -1, 'end of DT_frame.run not found');
  const runBody = frameSource.substring(runStart, runEnd);

  assert.match(runBody, /else if \(!me\.block\.height\)/);
  assert.match(runBody, /closest\('\.dt-grid-item'\)/);
  // .dt_block's content-box height (not the grid item's own outer height:
  // .dt_block has its own padding the grid item doesn't) minus .dt_title's
  // own height (the block's title bar, which sits above .dt_state inside
  // that content box). Sizing .dt_state to more than that pushes it past
  // .dt_block's own bottom edge, showing as a stray scrollbar/cropped
  // content - and .dt_block itself is CSS-pinned to the grid item's full
  // height (see the .dt-grid-item > .frame rule in creative.css) so nothing
  // upstream can silently grow past the row either.
  assert.match(runBody, /find\('\.dt_block'\)\.first\(\)/);
  assert.match(runBody, /find\('\.dt_title'\)/);
  assert.match(runBody, /var availableHeight = blockHeight - titleHeight;/);
  assert.match(runBody, /dtstatecss\.height = availableHeight/);
  assert.match(runBody, /iframecss\.height = availableHeight/);

  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');
  assert.match(
    styles,
    /\.dt-grid-item > \.frame,\s*\n\.dt-grid-screen > \.dt-grid-layout > \.dt-grid-item > \.waqi,\s*\n\.dt-grid-screen > \.dt-grid-layout > \.dt-grid-item > \.log \{\s*\n\s*height: 100% !important;/
  );
});

test('Domoticz log, OWM, Sunrise/Sunset and Timegraph are added to the Widget Config editor', () => {
  const widgetEditor = fs.readFileSync(
    path.join(root, 'js/widgeteditor.js'),
    'utf8'
  );
  const layoutEditor = fs.readFileSync(
    path.join(root, 'js/layouteditor.js'),
    'utf8'
  );
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );
  const savewidgets = fs.readFileSync(
    path.join(root, 'js/savewidgets.php'),
    'utf8'
  );
  const logSource = fs.readFileSync(
    path.join(root, 'js/components/log.js'),
    'utf8'
  );
  const simpleBlockSource = fs.readFileSync(
    path.join(root, 'js/components/simpleblock.js'),
    'utf8'
  );
  const timegraphSource = fs.readFileSync(
    path.join(root, 'js/components/timegraph.js'),
    'utf8'
  );
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');

  // DT_log is matched by its registered component name (Dashticz._mount in
  // dashticz.js only checks components[selector] for a string block
  // reference), so every layer must keep using the literal 'log' key rather
  // than a 'widget_log' key, exactly like Radio's 'streamplayer' key, to stay
  // compatible with the documented columns[n] = {blocks: ['log']} shorthand.
  assert.match(logSource, /name: 'log'/);
  assert.match(widgetEditor, /id: 'log',\s*\n\s*blockKey: 'log'/);
  assert.match(layoutEditor, /\blog: 'log'/);
  assert.match(deviceEditor, /log:\s*\{\s*id: 'log'/);
  assert.match(savewidgets, /'log' => \['key' => 'log'/);

  // Sunrise (DT_simpleblock) is dispatched by block type, which blocks.js's
  // convertBlock() derives from the bare 'sunrise' key automatically, so it
  // is also keyed by its plain name rather than a 'widget_' prefix.
  assert.match(simpleBlockSource, /sunrise: \{\s*\n\s*render: renderSunrise/);
  assert.match(widgetEditor, /id: 'sunrise',\s*\n\s*blockKey: 'sunrise'/);
  assert.match(layoutEditor, /\bsunrise: 'sunrise'/);
  assert.match(deviceEditor, /sunrise:\s*\{\s*id: 'sunrise'/);
  assert.match(savewidgets, /'sunrise' => \['key' => 'sunrise'/);

  // renderSunrise builds its own markup instead of going through
  // getContainer()/getColIcon()/renderTitle() (js/dashticz.js) like every
  // other block, so the Widget Editor's Icon/Title checkboxes correctly save
  // block.icon/block.title/block.hide_title, but nothing ever painted them -
  // no icon and no title ever appeared on a Sunrise/Sunset block (#follow-up).
  // renderSunrise now reads them directly. Icon and title are combined into
  // one small .sunrise-header row (not the floated .col-icon or the 150%
  // .dt_title, both sized for a full .dt_block flex layout this small,
  // centered, single-line tile deliberately doesn't use) above the
  // sunrise/sunset line.
  const renderSunriseBody = simpleBlockSource.slice(
    simpleBlockSource.indexOf('function renderSunrise'),
    simpleBlockSource.indexOf('function renderHorizon')
  );
  assert.match(renderSunriseBody, /var icon = me\.block\.icon;/);
  assert.match(
    renderSunriseBody,
    /var showTitle = !me\.block\.hide_title && me\.block\.title;/
  );
  assert.match(renderSunriseBody, /class="sunrise-header"/);
  assert.match(renderSunriseBody, /class="title">'\s*\+\s*me\.block\.title/);
  // A hand-written/legacy Sunrise block without `icon` must retain its old
  // iconless appearance. Newly added Editor widgets still get the catalog
  // icon, but it is persisted explicitly instead of becoming a runtime
  // default for every existing CONFIG.js.
  assert.doesNotMatch(simpleBlockSource, /cfg\.icon = 'fas fa-sun'/);
  assert.match(
    widgetEditor,
    /item\.id === 'iframe' \|\| item\.id === 'sunrise'/
  );
  assert.match(widgetEditor, /iconValue: explicitDefaultIcon/);
  assert.match(widgetEditor, /var legacyImplicitIcon =/);
  // The sunrise/sunset line is its own .sunrise-data row, separate from
  // .sunrise-header, so grid mode's flex-direction: column (creative.css)
  // stacks exactly those two rows instead of flexing every individual
  // icon/span inside both onto one line (a live screenshot showed icon,
  // title and the sunrise/sunset line all crammed side by side).
  assert.match(renderSunriseBody, /class="sunrise-data"/);
  assert.match(
    styles,
    /\.dt-grid-screen > \.dt-grid-layout > \.dt-grid-item > \.sunriseholder \{[\s\S]*?flex-direction: column;/
  );
  // .sunriseholder is text-center (the sunrise/sunset line stays centered,
  // as before), but a live screenshot showed the icon+title header
  // centered along with it instead of left-aligned at the top like every
  // other device/widget's icon+title (e.g. a slide button). Override just
  // that row back to flush top-left: text-align for column/classic mode,
  // align-self for the grid rule's flex column (align-items: center there
  // would otherwise still center the header's own shrink-to-fit box, not
  // just the text inside it).
  assert.match(
    styles,
    /\.sunriseholder \.sunrise-header \{[\s\S]*?text-align: left;[\s\S]*?align-self: flex-start;/
  );
  // Pinning content to the top must only kick in when a header is actually
  // rendered - unconditionally forcing flex-start regressed the header-less
  // case (just the sunrise/sunset line) from vertically centered to stuck
  // at the top of a tall grid cell. renderSunrise only adds this class when
  // it renders a .sunrise-header.
  assert.match(
    renderSunriseBody,
    /if \(hasHeader\) classes \+= ' sunrise-has-header';/
  );
  assert.match(
    styles,
    /\.sunriseholder\.sunrise-has-header \{\s*\n\s*justify-content: flex-start;/
  );

  // OWM and Timegraph use the standard 'widget_' catalog key convention with
  // an explicit type, like weather/iframe/xmltvguide.
  assert.match(widgetEditor, /id: 'owm',\s*\n\s*blockKey: 'widget_owmwidget'/);
  assert.match(
    widgetEditor,
    /id: 'timegraph',\s*\n\s*blockKey: 'widget_timegraph'/
  );
  assert.match(savewidgets, /'owm' => \['key' => 'widget_owmwidget'/);
  assert.match(savewidgets, /'timegraph' => \['key' => 'widget_timegraph'/);
  assert.match(
    savewidgets,
    /case 'owm':[\s\S]*?\$props\['type'\] = 'owmwidget';/
  );
  assert.match(
    savewidgets,
    /case 'timegraph':[\s\S]*?\$props\['type'\] = 'timegraph';/
  );

  // OWM apikey/city/country must stay optional: an empty block-level value
  // must never be written, so DT_owmwidget's own defaultCfg
  // (js/components/owmwidget.js) keeps falling back to the global
  // config['owm_api']/owm_city/owm_country settings.
  assert.match(
    widgetEditor,
    /if \(owcfg\.apikey && owcfg\.apikey !== ''\) entry\.apikey = owcfg\.apikey;/
  );
  assert.match(
    savewidgets,
    /if \(\$apikey !== '' && strlen\(\$apikey\) <= 100\) \{\s*\n\s*\$widget\['apikey'\] = \$apikey;/
  );

  // Timegraph's Y-axis label-count property is 'yTicks', not a second
  // 'xTicks' (the shipped documentation duplicates 'xTicks' for both axes;
  // the actual component distinguishes them).
  assert.match(timegraphSource, /xTicks: 10,/);
  assert.match(timegraphSource, /yTicks: 5,/);
  assert.doesNotMatch(
    fs.readFileSync(
      path.join(root, 'docs/blocks/specials/timegraph.rst'),
      'utf8'
    ),
    /xTicks\s*\n\s*- \| Number of labels on the x-axis[\s\S]*?xTicks\s*\n\s*- \| Number of labels on the y-axis/
  );

  // A Timegraph value row without its own idx falls back to the block's main
  // idx (see DT_timegraph.run: newValue = {idx: me.idx, ...}; $.extend(newValue, value)
  // only overwrites idx when the row itself set one).
  assert.match(
    timegraphSource,
    /me\.idx = isDefined\(me\.block\.idx\) \? me\.block\.idx : me\.key/
  );
  assert.match(
    widgetEditor,
    /if \(row\.idx\) valueEntry\.idx = parseInt\(row\.idx, 10\);/
  );

  // Multiple values, each optionally from its own device, must remain
  // supported (not just a single 'values: [\"Temp\"]' array) — the dynamic
  // value-row repeater with no artificial row limit.
  assert.match(widgetEditor, /we-timegraph-value-add/);
  assert.match(widgetEditor, /we-timegraph-value-remove/);
  assert.match(widgetEditor, /_timegraphValueRowHtml/);

  // Timegraph's own 'values' array is edited through the dedicated repeater,
  // so it must be a managed property (not also shown as raw JSON in Custom fields).
  assert.match(
    widgetEditor,
    /timegraph: \{\s*\n\s*duration: true, xTicks: true, yTicks: true, xLabels: true,/
  );

  // savewidgets.php accepts both the simple string form (values: ['NettUsage'])
  // and the {idx, value, label} object form for combining several devices.
  assert.match(savewidgets, /if \(is_string\(\$tgValue\)\) \{/);
  assert.match(savewidgets, /\} elseif \(is_array\(\$tgValue\)\) \{/);
  assert.match(
    savewidgets,
    /if \(isset\(\$tgValue\['idx'\]\) && is_numeric\(\$tgValue\['idx'\]\)\)/
  );

  // NettUsage must keep working exactly as today: no new calculation logic,
  // just the existing getValue() special case.
  assert.match(timegraphSource, /case 'NettUsage':/);

  for (const locale of ['en_US', 'nl_NL']) {
    const translations = JSON.parse(
      fs.readFileSync(path.join(root, 'lang', `${locale}.json`), 'utf8')
    );
    const we = translations.settings.widgeteditor;
    assert.ok(we.log_title, `${locale} log title translation`);
    assert.ok(we.sunrise_title, `${locale} sunrise title translation`);
    assert.ok(we.owm_title, `${locale} owm title translation`);
    assert.ok(we.timegraph_title, `${locale} timegraph title translation`);
    assert.ok(
      we.timegraph_value_idx,
      `${locale} timegraph value idx translation`
    );
  }
});

test('Radio widget gets a default icon like other widgets (log, WAQI)', () => {
  const streamplayer = fs.readFileSync(
    path.join(root, 'js/components/streamplayer.js'),
    'utf8'
  );
  const logSource = fs.readFileSync(
    path.join(root, 'js/components/log.js'),
    'utf8'
  );
  const waqiSource = fs.readFileSync(
    path.join(root, 'js/components/waqi.js'),
    'utf8'
  );

  // A freshly added Radio widget had no icon at all until the user typed one
  // into the Widget Config editor's Icon custom field by hand - every other
  // widget with an Icon checkbox (log, WAQI) instead bakes a sensible default
  // into its own defaultCfg, which getBlockConfig only overrides once the
  // block itself sets an explicit icon (including icon:'' when the Icon
  // checkbox is unchecked). Match that existing pattern for streamplayer too.
  assert.match(logSource, /icon: 'fas fa-microchip'/);
  assert.match(waqiSource, /icon: 'fas fa-wind'/);
  assert.match(streamplayer, /icon: 'fas fa-broadcast-tower'/);
});

test('Timegraph widget gets a default icon like other widgets', () => {
  const timegraph = fs.readFileSync(
    path.join(root, 'js/components/timegraph.js'),
    'utf8'
  );
  const widgetEditor = fs.readFileSync(
    path.join(root, 'js/widgeteditor.js'),
    'utf8'
  );

  // Same pattern as log/WAQI/Radio/iFrame: a freshly added Timegraph widget
  // had no icon in its title bar at all until one was typed into the Widget
  // Config editor's Icon custom field by hand. getBlockConfig (dashticz.js)
  // only overrides special.defaultCfg.icon once the block itself sets an
  // explicit icon (including icon:'' when the Icon checkbox is unchecked),
  // so baking a default into defaultCfg here is fully overridable as before.
  assert.match(timegraph, /defaultCfg: \{\s*\n\s*icon: 'fas fa-chart-line',/);
  // Matches the icon already used for Timegraph's own tile in the Widget
  // Config editor's "Add Widget" catalog.
  assert.match(
    widgetEditor,
    /id: 'timegraph',[\s\S]*?icon: 'fas fa-chart-line',/
  );
});

test('Google Maps widget gets a default icon like other widgets', () => {
  const map = fs.readFileSync(path.join(root, 'js/components/map.js'), 'utf8');
  const widgetEditor = fs.readFileSync(
    path.join(root, 'js/widgeteditor.js'),
    'utf8'
  );

  // Same pattern as log/WAQI/Radio/Timegraph/iFrame: a freshly added map
  // widget (showmap: true, the default) had no icon at all - defaultCfg only
  // set one for the showmap: false (route-only) branch - so checking Icon
  // with no custom value rendered nothing. Use the same icon already shown
  // for Google Maps in the Widget Config editor's "Add Widget" catalog.
  assert.match(map, /result\.icon = 'fas fa-map-marked-alt'/);
  assert.match(
    widgetEditor,
    /id: 'map',[\s\S]*?icon: 'fas fa-map-marked-alt',/
  );
});

test('Domoticz log widget defaults to an 8x8 grid cell instead of a full-width strip', () => {
  const widgetEditor = fs.readFileSync(
    path.join(root, 'js/widgeteditor.js'),
    'utf8'
  );

  // The generic grid-default formula scales column width (1-12) proportionally
  // to gridColumns, so log's width:12 (full width, needed for column-mode
  // layouts) used to also make its *grid* default a full-width strip. log's
  // catalog entry now opts into an explicit grid-only override; the width:12
  // column-mode default is untouched.
  assert.match(widgetEditor, /gridDefaultSize: \{ width: 8, height: 8 \}/);
  assert.match(widgetEditor, /var gridDefault = catalogItem\.gridDefaultSize;/);
  assert.match(
    widgetEditor,
    /var width = gridDefault\s*\n\s*\? Math\.max\(1, Math\.min\(gridConfig\.gridColumns, gridDefault\.width\)\)/
  );
  assert.match(
    widgetEditor,
    /var height = gridDefault\s*\n\s*\? Math\.max\(1, gridDefault\.height\)/
  );
  // log's own catalog width (used for column-mode layouts) must stay 12.
  const logEntryStart = widgetEditor.indexOf("id: 'log',");
  const logEntryEnd = widgetEditor.indexOf('},', logEntryStart);
  const logEntry = widgetEditor.substring(logEntryStart, logEntryEnd);
  assert.match(logEntry, /width: 12,/);
});

test('frame and WAQI blocks clip their CSS-scaled iframe instead of leaking a scrollbar', () => {
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');

  // frame.js and waqi.js both shrink an iframe to fit the tile with
  // transform: scale(), which only changes how it's painted - the iframe's
  // pre-scale (often much wider/taller) box is still what ancestors use to
  // decide whether they need a scrollbar. Without overflow: hidden on the
  // immediate .dt_state container, that oversized box pokes out and shows a
  // stray scrollbar (frame) or crops the badge's edge (WAQI), independent of
  // and not fixed by the frame widget's own "Show scrollbars" option (that
  // only sets the iframe's own internal scrolling attribute).
  assert.match(styles, /\.frame \.dt_state \{\s*\n\s*overflow: hidden;/);
  assert.match(styles, /\.waqi \.dt_state \{[\s\S]*?overflow: hidden;/);
});

test('legacy iFrame stays iconless while the Editor persists an icon for new widgets', () => {
  const frameSource = fs.readFileSync(
    path.join(root, 'js/components/frame.js'),
    'utf8'
  );
  const widgetEditor = fs.readFileSync(
    path.join(root, 'js/widgeteditor.js'),
    'utf8'
  );
  assert.doesNotMatch(frameSource, /icon: 'fas fa-window-maximize'/);
  assert.match(
    widgetEditor,
    /id: 'iframe',[\s\S]*?icon: 'fas fa-window-maximize'/
  );
  assert.match(widgetEditor, /_usesExplicitEditorDefaultIcon\(item\)/);
});

test('iFrame widget keeps a symmetric right margin once it has an icon', () => {
  const frameSource = fs.readFileSync(
    path.join(root, 'js/components/frame.js'),
    'utf8'
  );
  // An explicitly configured icon uses the hasIcon path. It previously
  // surfaced three margin bugs in turn:
  // 1. marginRight was set to 0 while marginLeft stayed 5px.
  // 2. Shrinking .dt_state's own box width wasn't enough on its own: the
  //    iframe's *scaled visual* width is (width/scaling)*scaling === the
  //    original width regardless, so it still overflowed the narrower box.
  //    width itself must shrink before scaling is computed from it.
  // 3. The whole fix lived inside `if (scaling !== 1)`, i.e. only when
  //    scaletofit is configured. Without scaletofit (scaling stays 1),
  //    dtstatecss stayed {marginRight: '', marginLeft: ''} - no inline
  //    override - so .frame .dt_state's blanket `margin: -5px` in CSS (there
  //    to cover .dt_block's own padding when there's *no* icon) pulled
  //    .dt_state past the block's right edge instead, same missing-gap
  //    symptom with no scaling involved at all. The margin fix must apply
  //    whenever there's an icon, independent of whether scaling is active.
  assert.doesNotMatch(frameSource, /marginRight\s*=\s*'0px'/);
  assert.match(frameSource, /if \(hasIcon\) width -= 10;/);
  const scalingIndex = frameSource.indexOf('var scaling = me.block.scaletofit');
  assert.ok(
    frameSource.indexOf('if (hasIcon) width -= 10;') < scalingIndex,
    'width must shrink before scaling is computed from it'
  );

  const scalingBlockStart = frameSource.indexOf('if(scaling!==1) {');
  const scalingBlockEnd = frameSource.indexOf('\n    }', scalingBlockStart);
  const scalingBlockBody = frameSource.substring(
    scalingBlockStart,
    scalingBlockEnd
  );
  const hasIconStart = frameSource.indexOf('if (hasIcon) {', scalingBlockEnd);
  assert.notEqual(hasIconStart, -1, 'hasIcon margin fix not found');
  assert.ok(
    hasIconStart > scalingBlockEnd,
    'the hasIcon margin fix must sit outside (after) the scaling!==1 block, so it still applies when scaletofit is not configured'
  );
  assert.doesNotMatch(scalingBlockBody, /marginRight|marginLeft/);
  const hasIconEnd = frameSource.indexOf('\n    }', hasIconStart);
  const hasIconBody = frameSource.substring(hasIconStart, hasIconEnd);
  assert.match(hasIconBody, /marginRight\s*=\s*'5px'/);
  assert.match(hasIconBody, /marginLeft\s*=\s*'5px'/);
  assert.match(hasIconBody, /if \(scaling !== 1\) dtstatecss\.width = width;/);
});

test('streamplayer/sunrise stay a single shared block across screens instead of being cloned', () => {
  // These two are dispatched by their literal block key matching a
  // registered component name (Dashticz._mount in dashticz.js) rather than
  // by a 'type' property or catalog id (see js/components/streamplayer.js,
  // which has no canHandle at all - sunrise is dispatched by DT_simpleblock
  // via blocks.js's convertBlock() key-as-type derivation instead). The
  // "clone this block for a screen that doesn't already own it" logic
  // (TAAK1, issue #98 follow-up) used to rename them too - e.g.
  // 'streamplayer' -> 'screen2_streamplayer' - which made the clone
  // invisible to every component's dispatch check: the widget silently
  // stopped rendering (no icon, no content) on the second screen, and the
  // Screen Editor's per-tile overlay fell back to showing the plain drag
  // icon instead of the config cog, since it couldn't resolve the renamed
  // reference back to a widget/device kind either. 'log' used to be
  // exempted the same way but no longer is - see the dedicated test below.
  const configWriter = fs.readFileSync(
    path.join(root, 'js/configwriter.php'),
    'utf8'
  );
  const saveGridLayout = fs.readFileSync(
    path.join(root, 'js/savegridlayout.php'),
    'utf8'
  );
  const layoutEditor = fs.readFileSync(
    path.join(root, 'js/layouteditor.js'),
    'utf8'
  );
  const streamplayerSource = fs.readFileSync(
    path.join(root, 'js/components/streamplayer.js'),
    'utf8'
  );

  assert.doesNotMatch(streamplayerSource, /canHandle/);

  assert.match(
    configWriter,
    /function configwriter_is_component_dispatched_key\(\$key\)/
  );
  assert.match(
    configWriter,
    /return in_array\(\$key, \['streamplayer', 'sunrise'\], true\);/
  );
  assert.match(
    configWriter,
    /if \(configwriter_is_component_dispatched_key\(\$key\)\) \{\s*\n\s*return \$key;/
  );
  assert.match(
    saveGridLayout,
    /\$forceClone = !configwriter_is_component_dispatched_key\(\$ref\)/
  );

  // layouteditor.js's own widget-kind resolution (used to decide whether the
  // Screen Editor overlay shows a config cog or falls back to the generic
  // drag icon) recognises these by their literal key - so if
  // savewidgets.php/savegridlayout.php ever renamed one again, it would
  // still misclassify the clone as a plain, non-configurable grid item.
  assert.match(layoutEditor, /log: 'log',/);
  assert.match(layoutEditor, /sunrise: 'sunrise',/);
  assert.match(layoutEditor, /streamplayer: 'radio',/);
});

test('Domoticz log gets an independent config per screen instead of sharing one block (#log-per-screen)', () => {
  // Placing the Domoticz log widget on two screens used to always share the
  // single literal 'log' block key/definition, so editing it on one screen
  // (e.g. Max lines) silently changed it on every other screen too. 'log' is
  // no longer exempted from the screen-owned-key cloning logic that every
  // other 'widget_'-prefixed widget already gets (TAAK1) - a second screen's
  // log widget now gets a screen-prefixed key (e.g. 'screen2_log'). Dashticz
  // dispatch only matches components['log'] by exact key though, so the
  // cloned block must carry an explicit type:'log' (same convention as a
  // hand-written blocks['weather'] = {type: 'weather'}) for _mount()'s
  // object-based dispatch to still find DT_log.
  const configWriter = fs.readFileSync(
    path.join(root, 'js/configwriter.php'),
    'utf8'
  );
  const saveWidgets = fs.readFileSync(
    path.join(root, 'js/savewidgets.php'),
    'utf8'
  );

  assert.doesNotMatch(
    configWriter,
    /return in_array\(\$key, \['log', 'streamplayer', 'sunrise'\], true\);/
  );
  assert.match(
    saveWidgets,
    /case 'log':\s*\n[\s\S]{0,600}?\$props\['type'\] = 'log';/
  );
});

test('screen editor config icon resolves widget-typed blocks before their own idx looks like a device', () => {
  // TimeGraph (and any other widget whose catalog entry sets a fallback
  // idx for value rows without their own - see savewidgets.php's
  // $catalog) carries a `type` AND an `idx` at the same time. _resolveBlock
  // used to check widget-ness only after falling through an idx-shaped-value
  // check, so a widget block with its own idx was misclassified as a plain
  // device: the Screen Editor's config-cog opened that idx's Device Config
  // instead of the widget's own Widget Config.
  const layoutEditor = fs.readFileSync(
    path.join(root, 'js/layouteditor.js'),
    'utf8'
  );
  const resolveBlockBody = layoutEditor.slice(
    layoutEditor.indexOf('function _resolveBlock('),
    layoutEditor.indexOf('function _widgetIdFromReference(')
  );
  const earlyWidgetCheckIndex = resolveBlockBody.indexOf(
    '_widgetIdFromReference(ref, definition)'
  );
  const idxDeviceFallbackIndex = resolveBlockBody.indexOf(
    'String(rawIdx).match(/^(\\d+)(?:_(\\d+))?$/)'
  );
  assert.ok(
    earlyWidgetCheckIndex > -1,
    'expected _resolveBlock to call _widgetIdFromReference'
  );
  assert.ok(
    idxDeviceFallbackIndex > -1,
    'expected _resolveBlock to keep its idx-based device fallback'
  );
  assert.ok(
    earlyWidgetCheckIndex < idxDeviceFallbackIndex,
    '_resolveBlock must resolve widget-ness before falling through to idx-based device detection'
  );
  assert.match(
    resolveBlockBody,
    /var earlyWidgetId = _widgetIdFromReference\(ref, definition\);\s*\n\s*if \(earlyWidgetId\) \{\s*\n\s*return \{\s*\n\s*definition: definition,\s*\n\s*kind: 'widget',/
  );
});

test('Multi Device and Custom Device get a sensible default icon when none is configured', () => {
  // Neither popup has (Multi Device) or requires (Custom Device) the user to
  // type an icon; without a fallback the saved block carried no `icon` field
  // at all (see _showConfigPopup's options.icon/iconValue handling in
  // deviceeditor.js), and since these idx values aren't a real recognised
  // Domoticz device type there was nothing else to derive an icon from -
  // the tile rendered with no icon at all.
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );
  const multiDevicePopup = deviceEditor.slice(
    deviceEditor.indexOf('function _showMultiDevicePopup('),
    deviceEditor.indexOf('function _showSlideButtonPopup(')
  );
  const customDevicePopup = deviceEditor.slice(
    deviceEditor.indexOf('function _showCustomDevicePopup('),
    deviceEditor.indexOf('function _showMultiDevicePopup(')
  );
  assert.match(multiDevicePopup, /iconValue: 'fas fa-layer-group',/);
  assert.match(customDevicePopup, /iconValue: 'fas fa-cube',/);
});

test('Dial sizing falls back sanely instead of silently rendering oversized', () => {
  // js/components/dial.js measures the block's real container width via
  // outerWidth() when no explicit `height` is configured. On a block that
  // isn't laid out yet (or sits on an inactive screen tab, display:none),
  // that measurement is 0/undefined, so parseInt() yields NaN or 0 - never
  // a negative number. The old `height < 0` guard could therefore never
  // trigger the intended fallback, fontsize became NaN, the invalid inline
  // style was dropped by the browser, and the component's own oversized
  // CSS default (was 240px) won by default - "dial too large for the block".
  const dialComponent = fs.readFileSync(
    path.join(root, 'js/components/dial.js'),
    'utf8'
  );
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');
  assert.doesNotMatch(dialComponent, /if \(height < 0\)/);
  assert.match(dialComponent, /if \(!height \|\| isNaN\(height\)\)/);
  assert.match(
    dialComponent,
    /me\.height = \(me\.height \|\| 100\) \* \(me\.block\.scale \|\| 1\);/
  );
  assert.match(styles, /\.dt_content \.dial \{[\s\S]*?font-size: 100px;/);
  assert.doesNotMatch(styles, /font-size: 240px;/);

  // The already-existing (but previously undocumented) block-level `scale`
  // multiplier is now documented as the supported way to fine-tune a dial's
  // size manually; it isn't a reserved custom-field name so it already
  // round-trips through the Device Editor's Custom fields with no code change.
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );
  const dialDocs = fs.readFileSync(
    path.join(root, 'docs/blocks/specials/dial.rst'),
    'utf8'
  );
  assert.match(dialDocs, /\* - scale/);
  assert.doesNotMatch(
    deviceEditor,
    /protectedCustomDeviceProperties = \{[^}]*\bscale: true\b/s
  );
});

test('Dial visual mode shows an inline hint pointing to the dial docs and Custom fields', () => {
  // Selecting Dial only sets type:'dial'; every other dial parameter (color,
  // min/max, subtype, values, ...) still has to be added by hand via Custom
  // fields, so the popup surfaces a dismissable, non-blocking hint (an
  // inline alert rather than a stacked modal, so switching visual mode a
  // few times while experimenting doesn't spam the user with popups) that
  // only appears while Dial is selected and links to the dial docs.
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );
  assert.match(deviceEditor, /class="alert alert-info de-dial-hint d-none"/);
  assert.match(
    deviceEditor,
    /href="https:\/\/dashticz\.readthedocs\.io\/en\/beta\/blocks\/specials\/dial\.html"/
  );
  assert.match(deviceEditor, /function refreshDialHint\(\) \{/);
  assert.match(
    deviceEditor,
    /\$popup\.find\('\.de-dial-hint'\)\.toggleClass\('d-none', !enabled\)/
  );
  assert.match(
    deviceEditor,
    /\$popup\.on\('click', '\.de-visual-mode-button', function \(\) \{/
  );
  assert.match(deviceEditor, /dial_hint: '/);
  assert.match(deviceEditor, /dial_hint_link: '/);
});

test('Dial visual mode on a multi-value sub-device (e.g. Temp+Humidity) saves the base idx, not the sub-value idx (#118)', () => {
  // Add Device expands a multi-value Domoticz device (subCount > 1, e.g. a
  // combined Temp + Humidity sensor) into one row per value - idx "12_1",
  // "12_2" - so classic gauge/switch blocks can each bind to a single value
  // (_getAvailableDevices/_getSubValueCount). The Dial widget instead reads
  // the whole device to detect its type (js/components/dial.js make() reads
  // d.Type === 'Temp + Humidity' etc.), and DT_function.getDomoticzIdx can't
  // resolve a composite "12_1" idx to any device - it silently fell back to
  // a plain on/off switch instead of a gauge. Selecting Dial (or Bar, which
  // needs the same full device - #182) on such a row must therefore drop
  // the subidx and save the plain base idx.
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );
  assert.match(
    deviceEditor,
    /if \(options\.bar === true \|\| options\.dial === true\) \{[\s\S]*?entry\.type = 'dial';\s*\n\s*\} else if \(p\.subidx\) \{\s*\n\s*entry\.subidx = p\.subidx;\s*\n\s*\}/
  );
});

test('Device Editor keeps Dial state scoped to the active block reference', () => {
  // A Domoticz IDX can appear more than once, including on another screen.
  // Hydrating by the first blocks[...] entry with that IDX lets an old Dial
  // definition contaminate a normal copy when any later device is saved.
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );
  const lookup = deviceEditor.slice(
    deviceEditor.indexOf('function _getConfiguredBlockForCk(ck)'),
    deviceEditor.indexOf('function _getConfiguredWidthForCk(ck)')
  );

  assert.match(deviceEditor, /var deviceRefs\s*= \{\}/);
  assert.match(deviceEditor, /deviceRefs\[item\.ck\] = item\.reference/);
  assert.match(lookup, /var reference = deviceRefs\[ck\]/);
  assert.match(
    lookup,
    /reference &&[\s\S]*?blocks\[reference\] &&[\s\S]*?_toCompositeKey\(blocks\[reference\]\) === ck[\s\S]*?return blocks\[reference\]/
  );
  assert.ok(
    lookup.indexOf('return blocks[reference]') <
      lookup.indexOf('var keys = Object.keys(blocks)'),
    'the exact active-screen block must be preferred before the IDX fallback'
  );
});

test('ordinary device tiles follow their saved grid row height without an outer scrollbar', () => {
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');
  const modernDark = fs.readFileSync(
    path.join(root, 'themes/modern-dark/modern-dark.css'),
    'utf8'
  );

  // modern-dark deliberately gives regular Domoticz (.mh) blocks a 120px
  // default outside the grid. A 4-row grid tile is only 80px at the default
  // row height, so the grid-specific rule must override that fixed height.
  assert.match(
    modernDark,
    /\.mh \{[^}]*height: var\(--height-block-default\) !important;/s
  );
  assert.match(
    styles,
    /\.dt-grid-screen > \.dt-grid-layout > \.dt-grid-item > \.dt_block,\s*\.dt-grid-screen > \.dt-grid-layout > \.dt-grid-item > \.mh \{[^}]*height: 100% !important;[^}]*min-height: 0 !important;/s
  );
  assert.match(
    styles,
    /\.dt-grid-screen > \.dt-grid-layout > \.dt-grid-item \{[^}]*overflow: auto;/s
  );
});

test('Dial face/content area fills more of the dial instead of leaving roomy margins', () => {
  // .dial-container/.dial-center were 90%/85%, leaving a very visible gap
  // before the ring. `.dial.fixed .dial-center` already ships at 95% with no
  // clipping against the ring/needle (sized independently in fixed em
  // fractions of .dial itself), so 93%/88% is a safe, still-conservative
  // tightening of the default (non-fixed, non-hover) dial content area.
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');
  assert.match(
    styles,
    /\.dial \.dial-container \{[\s\S]*?width: 93%;[\s\S]*?height: 93%;/
  );
  assert.match(
    styles,
    /\.dial \.dial-center \{[\s\S]*?width: 88%;[\s\S]*?height: 88%;/
  );
});

test('Dial keeps its rendered size in sync with live editor resize (grid or column)', () => {
  // A previous attempt fixed "grid resize doesn't affect the dial" by having
  // configwriter_build_grid_layout_section (js/configwriter.php) compute and
  // persist a pixel `height` from the dragged row span for dial-typed grid
  // blocks. That caused a regression: the persisted height made dial.js pick
  // its circle diameter from HEIGHT alone (ignoring width), and any drift
  // between that PHP-computed pixel value and the browser's own CSS Grid
  // rendering showed up as scrollbars on `.dt-grid-item` (which has
  // `overflow: auto`). Reverted; configwriter_build_grid_layout_section must
  // no longer special-case dial blocks at all.
  const configWriter = fs.readFileSync(
    path.join(root, 'js/configwriter.php'),
    'utf8'
  );
  const gridSectionFn = configWriter.slice(
    configWriter.indexOf('function configwriter_build_grid_layout_section('),
    configWriter.indexOf('function configwriter_extract_block_lines(')
  );
  assert.doesNotMatch(gridSectionFn, /isDial/);
  assert.doesNotMatch(gridSectionFn, /\['height'\]/);

  // Instead, js/components/dial.js measures its own actual rendered box
  // (both width AND height, not just width) and uses the SMALLER of the
  // two - the dial is always a perfect circle (.dial is width:1em ==
  // height:1em), so it can never be made to overflow either dimension of a
  // non-square block. A ResizeObserver on that same container keeps this
  // in sync live (grid drag, column-width drag, window resize, ...)
  // instead of only updating after a save+reload, without re-running the
  // full mount/device-subscribe pipeline (see the historically-disabled
  // `resize()` function's own comment about not wanting to recreate and
  // resubscribe on every resize).
  const dialComponent = fs.readFileSync(
    path.join(root, 'js/components/dial.js'),
    'utf8'
  );
  assert.match(dialComponent, /function _dialFitSize\(me\)/);
  assert.match(
    dialComponent,
    /var \$container = inGrid\s*\n\s*\? me\.\$mountPoint\s*\n\s*: \$\(me\.mountPoint \+ ' div'\)\.first\(\);/
  );
  assert.match(
    dialComponent,
    /var measuredWidth = parseInt\(\$container\.outerWidth\(\)\);/
  );
  assert.match(
    dialComponent,
    /var measuredHeight = parseInt\(\$container\.outerHeight\(\)\);/
  );
  assert.match(
    dialComponent,
    /var inGrid = me\.\$mountPoint && me\.\$mountPoint\.hasClass\('dt-grid-item'\);/
  );
  assert.match(
    dialComponent,
    /inGrid\s*\? \[measuredWidth, measuredHeight, configuredHeight\]\s*: \[measuredWidth, configuredHeight\]/
  );
  assert.match(dialComponent, /Math\.min\.apply\(Math, candidates\)/);
  assert.match(dialComponent, /typeof ResizeObserver !== 'undefined'/);
  assert.match(dialComponent, /me\.dialResizeObserver = new ResizeObserver/);
  assert.match(dialComponent, /me\.dialResizeObserver\.observe\(/);
  assert.match(dialComponent, /me\.dialResizeObserver\.disconnect\(\);/);
  assert.match(dialComponent, /me\.dialResizeObserver = null;/);
});

test('Dial live-resize does not inflate the outer block wrapper font-size', () => {
  // getContainer() (js/dashticz.js) gives the OUTER .dt_block wrapper the
  // component name as a class too - for this component that is literally
  // "dial" (DT_dial.name === 'dial'), so a bare '.dial' selector matches
  // that outer wrapper as well as the template's own inner circle. Patching
  // font-size via such a selector inflated the wrapper's (and everything
  // em-sized inside it) font-size, overflowing the block sideways.
  // '.dt_content .dial' mirrors the scoping the dial's own CSS already uses
  // (see the base `.dt_content .dial { ... }` rule) and only reaches the
  // inner circle.
  const dialComponent = fs.readFileSync(
    path.join(root, 'js/components/dial.js'),
    'utf8'
  );
  assert.match(dialComponent, /name: 'dial',/);
  assert.match(
    dialComponent,
    /\$\(me\.mountPoint \+ ' \.dt_content \.dial'\)\.css\('font-size', me\.fontsize \+ 'px'\)/
  );
  assert.match(
    dialComponent,
    /\$\(me\.mountPoint \+ ' \.dt_content \.dial-needle'\)\.css\(\{/
  );
  assert.doesNotMatch(
    dialComponent,
    /\$\(me\.mountPoint \+ ' \.dial'\)\.css\('font-size'/
  );

  const dashticz = fs.readFileSync(path.join(root, 'js/dashticz.js'), 'utf8');
  assert.match(dashticz, /me\.name \+\s*\n?\s*'\s*dt_block/);
});

test('Dial ring/slice indicator is clipped to the dial instead of inflating ancestor scrollWidth', () => {
  // .slice is rotated (transform: rotate(-140deg)), so its axis-aligned
  // bounding box is wider/taller than its own 1em x 1em size. The old
  // deprecated `clip: rect()` used to shape it into a pie-slice only clips
  // painting, not layout - the full rotated box still counted toward the
  // scrollable overflow of every ancestor, which surfaced as visible
  // scrollbars on grid screens (.dt-grid-item has overflow: auto). A
  // dedicated .dial-ring-clip wrapper (not .dial itself, which would also
  // clip .dial-center's intentional glow/flash box-shadow that extends past
  // .dial's own edge) contains just the slice.
  const dialTpl = fs.readFileSync(path.join(root, 'tpl/dial.tpl'), 'utf8');
  assert.match(
    dialTpl,
    /<div class="dial-ring-clip">\s*\n\s*<div class="slice /
  );
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');
  assert.match(
    styles,
    /\.dial-ring-clip \{[\s\S]*?width: 1em;[\s\S]*?height: 1em;[\s\S]*?overflow: hidden;[\s\S]*?border-radius: 50%;/
  );
});

test('Dial needle is clipped to the dial instead of leaking a small overflow at every angle', () => {
  // .dial-needle::before/::after draw the needle via the CSS border-triangle
  // trick (deliberately a bit longer than .dial's own radius so the tip
  // reaches the ring), further offset by `top: -53%`. That box was never
  // clipped by any ancestor (.draggable/.dial/.dt_content are all
  // overflow:visible), so it contributed a small but constant amount
  // (confirmed empirically: ~6px on a ~200px dial) to the scrollable
  // overflow of .dt-grid-item regardless of the needle's rotation angle -
  // unlike .slice's rotation-dependent overflow, this reproduced at every
  // device value, not just specific angles. Wrapped in .dial-needle-clip,
  // sized/centered like .dial-ring-clip but centered via percentage since
  // this wrapper's parent is .dial-container (a smaller, inset box), not
  // .dial itself.
  const dialTpl = fs.readFileSync(path.join(root, 'tpl/dial.tpl'), 'utf8');
  assert.match(
    dialTpl,
    /<div class="dial-needle-clip">\s*\n\s*<div class="draggable">/
  );
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');
  assert.match(
    styles,
    /\.dial-needle-clip \{[\s\S]*?width: 1em;[\s\S]*?height: 1em;[\s\S]*?top: 50%;[\s\S]*?left: 50%;[\s\S]*?transform: translate\(-50%, -50%\);[\s\S]*?overflow: hidden;[\s\S]*?border-radius: 50%;/
  );
});

test('Domoticz log widget actually sorts, and respects the ascending option', () => {
  // The sort comparator's function body never had a `return` statement, so
  // Array.prototype.sort() received `undefined` from every comparison (=
  // "equal") and never reordered anything - a no-op sort. That also
  // explains why the ascending/descending option did nothing: `ascending`
  // (declared in defaultCfg, and correctly wired up by the Widget Config
  // editor's switch and by Device Editor - see js/widgeteditor.js and
  // js/savewidgets.php) was never even read inside refresh().
  const logSource = fs.readFileSync(
    path.join(root, 'js/components/log.js'),
    'utf8'
  );
  assert.doesNotMatch(
    logSource,
    /a\.message < b\.message \? 1 : a\.message > b\.message \? -1 : 0;\s*\n\s*\}\)/
  );
  assert.match(logSource, /var ascending = me\.block\.ascending !== false;/);

  const comparatorMatch = logSource.match(
    /function \(a, b\) \{[\s\S]*?return 0;\s*\}/
  );
  assert.ok(comparatorMatch, 'log comparator not found');
  const comparatorSource = comparatorMatch[0];

  function sortMessages(ascending, messages) {
    const context = { ascending, result: null };
    vm.runInNewContext(
      'var messages = ' +
        JSON.stringify(messages.map((m) => ({ message: m }))) +
        ';\nresult = messages.sort(' +
        comparatorSource +
        ').map(function (m) { return m.message; });',
      context
    );
    return Array.from(context.result);
  }

  const unordered = ['12:00 c', '09:00 a', '10:00 b'];
  assert.deepEqual(sortMessages(true, unordered), [
    '09:00 a',
    '10:00 b',
    '12:00 c',
  ]);
  assert.deepEqual(sortMessages(false, unordered), [
    '12:00 c',
    '10:00 b',
    '09:00 a',
  ]);

  // Widget Config editor's switch for this option, made 1.5x its default
  // .we-widget-field size for clarity, per user request.
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');
  assert.match(
    styles,
    /#we-cfg-ascending\.form-check-input \{[\s\S]*?width: 57px;[\s\S]*?height: 30px;/
  );
});

test('Camera widget no longer forces a fixed default height in grid mode (#100)', () => {
  // defaultCfg.height (320) always merges into me.block.height (see
  // getBlockConfig in js/dashticz.js), so a camera block with no explicit
  // `height` in CONFIG.js was indistinguishable from one that set height:320
  // by the time run() read me.block.height - the reported symptom (a tiny,
  // wrongly-proportioned image, unrelated to whatever CONFIG.js actually
  // contains). Checks the raw CONFIG.js block (global `blocks`) instead.
  // Classic/column mode keeps the old fixed-height fallback unchanged;
  // an explicit height (grid or classic) is always respected as before.
  const cameraComponent = fs.readFileSync(
    path.join(root, 'js/components/camera.js'),
    'utf8'
  );
  assert.match(
    cameraComponent,
    /var isGridItem = me\.\$mountPoint\.hasClass\('dt-grid-item'\);/
  );
  assert.match(
    cameraComponent,
    /var explicitHeight =\s*\n\s*typeof blocks !== 'undefined' &&\s*\n\s*blocks\[me\.key\] &&\s*\n\s*typeof blocks\[me\.key\]\.height !== 'undefined';/
  );
  assert.match(
    cameraComponent,
    /height:\s*\n\s*isGridItem && !explicitHeight\s*\n\s*\? false\s*\n\s*: cam\.block && cam\.block\.height \? cam\.block\.height : 300,/
  );

  // Empirically verified (headless browser, real grid screen): height:100%
  // alone did not resolve against the flex/grid ancestor chain (.dt_block
  // uses min-height, not height, and is a flex container) and silently
  // collapsed to the image's intrinsic aspect ratio instead. position:
  // absolute + inset, anchored to .dt_block (already position:relative),
  // reliably filled the cell instead.
  const cameraTpl = fs.readFileSync(
    path.join(root, 'tpl/camera_image.tpl'),
    'utf8'
  );
  assert.match(
    cameraTpl,
    /\{\{#if height\}\}height:\{\{height\}\}px;\{\{else\}\}position:absolute;top:0;left:0;right:0;bottom:0;height:100%;\{\{\/if\}\}/
  );
});

test('Device Editor save does not reintroduce a default widget height on a grid screen (#100)', () => {
  // savewidgets.php only omits a widget's classic-mode catalog height
  // (iframe 400px, camera 320px, etc.) when $data['gridMode'] is truthy.
  // deviceeditor.js's own _save() - which re-submits every currently placed
  // widget whenever ANY device is edited, not just widgets - posted
  // blocksOnly:gridMode but never gridMode itself, so the server always saw
  // $gridMode as false and silently wrote a fixed height into every widget
  // that never had one, on every save, even on a grid screen (reported as a
  // height value "randomly" reappearing in CONFIG.js after editing an
  // unrelated Domoticz device).
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );
  const saveWidgets = fs.readFileSync(
    path.join(root, 'js/savewidgets.php'),
    'utf8'
  );

  assert.match(
    saveWidgets,
    /'height' => \(!\$gridMode && isset\(\$catalog\[\$id\]\['height'\]\)\)\s*\n\s*\? \$catalog\[\$id\]\['height'\]\s*\n\s*: null,/
  );
  assert.match(
    deviceEditor,
    /widgets: widgetPayload,\s*\n\s*settings: pendingWidgetSettings,\s*\n\s*screen: _activeScreenPayload\(\),\s*\n\s*blocksOnly: gridMode,\s*\n[\s\S]{0,700}?gridMode: gridMode,/
  );
});

test('Device Editor keeps ordered block keys in scope through the full save chain', () => {
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );
  const saveStart = deviceEditor.indexOf('function _save()');
  const saveEnd = deviceEditor.indexOf(
    '\n  function _preserveStandbyExtraBlocks',
    saveStart
  );
  assert.notEqual(saveStart, -1, '_save not found');
  assert.notEqual(saveEnd, -1, 'end of _save not found');
  const saveSnippet = deviceEditor.substring(saveStart, saveEnd);

  // _buildDevicePayload() has its own orderedBlockKeys local, but _save()
  // also needs the list after saveblocks/savewidgets resolve so it can map
  // each returned key back to managedOrder. Without this declaration the
  // requests can succeed and then a ReferenceError still shows the generic
  // "Devices could not be saved automatically" alert.
  assert.match(
    saveSnippet,
    /var orderedBlockKeys = managedOrder\.filter\(function \(orderKey\) \{\s*\n\s*return orderKey\.indexOf\('widget:'\) !== 0;/
  );
  assert.match(
    saveSnippet,
    /orderedBlockKeys\.forEach\(function \(orderKey, index\)/
  );
});

test('Widget Editor lets a grid-mode height (iframe, camera, ...) be removed again once set (#100 follow-up)', () => {
  // The #100 fixes above stopped a *new* grid widget from getting a forced
  // default height, but a widget that already had an explicit height (from
  // before those fixes, from switching a dashboard from column to grid mode,
  // or from typing one into iframe's own "Height (px)" field and later
  // clearing it again) stayed stuck forever: _readGridConfiguredWidgets read
  // the block's current CONFIG.js height into widgetDimensions[item.id] once,
  // when the Widget Editor/config-cog popup opened, and every subsequent
  // save (_buildWidgetPayloadEntry) unconditionally resent that same cached
  // value as entry.height - regardless of the user clearing iframe's own
  // height field (which only ever wrote entry.iframeHeight, a different
  // property), and regardless of there being no such field at all for widgets
  // like camera. savewidgets.php then wrote it straight back into
  // CONFIG.js's height, so the value could never actually be removed.
  const widgetEditor = fs.readFileSync(
    path.join(root, 'js/widgeteditor.js'),
    'utf8'
  );

  assert.match(
    widgetEditor,
    /widgetDimensions\[item\.id\] = \{\s*\n\s*width: parseInt\(definition\.width, 10\) \|\| item\.width,\s*\n(?:\s*\/\/[^\n]*\n)+\s*height: null,\s*\n\s*\};/
  );

  // dimensions.height (fed by widgetDimensions[item.id] above) is the only
  // thing that can make _buildWidgetPayloadEntry set a generic entry.height
  // in grid mode; with it always null now, a grid save never resends a
  // stale height for any widget, so entry.iframeHeight/logHeight/
  // timegraphHeight (each already correctly tracking their own, clearable,
  // config field - see their own "if (icfg.height ...)" checks) are left as
  // the sole source of truth for those widgets, and camera (with no field of
  // its own at all) never gets a height reintroduced behind the user's back.
  assert.match(
    widgetEditor,
    /if \(gridMode\) \{\s*\n\s*if \(dimensions\.height\) entry\.height = dimensions\.height;\s*\n\s*\}/
  );
});

test("Device Editor's own hydration lets a grid-mode widget height be removed again once set (#100 follow-up)", () => {
  // Same bug class as the Widget Editor fix above, but in a parallel spot
  // that fix didn't touch: deviceeditor.js's own _init() hydrates
  // widgetHeights[orderKey] straight from the widget's current CONFIG.js
  // height, unconditionally (regardless of grid mode). _widgetPayload then
  // unconditionally resends that as entry.height on every Device Editor
  // save - including a save that only touches a different device, and
  // regardless of the user having since cleared iframe's own "Height (px)"
  // field via Widget Config. savewidgets.php only overrides that top-level
  // height for iframe/log/timegraph when their own *Height property is
  // explicitly sent (which Device Editor's resubmission never does), so the
  // stale cached height silently won on every subsequent Device Editor
  // save, and a once-set height could never actually be removed (reported
  // against #100 after the earlier fixes there).
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );

  assert.match(
    deviceEditor,
    /widgetHeights\[item\.orderKey\] = gridMode \? null : _parseHeight\(item\.definition\.height\);/
  );
});

test('Swipe/slide-button navigation no longer permanently misses the active-screen update (#49)', () => {
  // startSwiper() (js/main.js) creates `myswiper` asynchronously via a
  // setTimeout(...,0) plus a dynamically loaded Swiper script, with
  // unbounded timing. A single one-shot setTimeout(...,500) retry in
  // screenswitcher.js's init() missed it whenever loading took longer (slow
  // or uncached first load) and never checked again, so onSwiperChange was
  // never attached for the rest of the session - both touch-swiping and
  // slide-button clicks (goToScreen() -> myswiper.slideTo()) fire swiper's
  // own events into the void, and the active-screen DOM state never
  // updates. Poll instead (bounded, so a single-screen dashboard that never
  // creates myswiper doesn't retry forever).
  const screenswitcher = fs.readFileSync(
    path.join(root, 'js/screenswitcher.js'),
    'utf8'
  );
  assert.doesNotMatch(
    screenswitcher,
    /setTimeout\(function \(\) \{\s*\n\s*if \(typeof myswiper/
  );
  assert.match(screenswitcher, /function _attachSwiperListeners\(\)/);
  assert.match(
    screenswitcher,
    /var waitForSwiper = setInterval\(function \(\) \{/
  );
  assert.match(screenswitcher, /attempts >= maxAttempts/);
  assert.match(screenswitcher, /clearInterval\(waitForSwiper\);/);
  assert.match(
    screenswitcher,
    /_attachSwiperListeners\(\);\s*\n\s*\n\s*updateActive\(\);/
  );
});

test("Move mode Settings button opens the Multi/Custom Device's own config, not the shared-idx device (#115)", () => {
  // blocks.js's convertBlock() stamps block.type with the block's own storage
  // key as a dispatch hint for widgets conventionally keyed by their type
  // name (e.g. blocks['log'], blocks['sunrise'] - see the key-as-type tests
  // above). dashticz.js's _mountSpecialBlock() then writes that converted
  // block back into blocks[key] (`blocks[me.key] = blockdef`) once the tile
  // has rendered. For a Custom/Multi Device - which has no real widget type,
  // just a hand-picked key and an idx - that leaves blocks[key].type equal
  // to the key itself after the first render, which used to make
  // _specialFromReference's "no widget type" check fail. openConfig() then
  // fell through to matching by idx alone, opening whichever OTHER managed
  // device happens to share that idx instead of the Multi/Custom Device's
  // own editor (reported as "the Settings button points to the wrong
  // target" for Multi Devices and Custom Devices specifically).
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );
  const dashticzSource = fs.readFileSync(
    path.join(root, 'js/dashticz.js'),
    'utf8'
  );
  const blocksSource = fs.readFileSync(path.join(root, 'js/blocks.js'), 'utf8');

  // The artifact this test guards against still exists upstream (by design,
  // for the key-as-type widget dispatch convention) - convertBlock() still
  // stamps block.type with the key, and _mountSpecialBlock() still writes it
  // back into blocks[key].
  assert.match(blocksSource, /block\.type = blocktype;/);
  assert.match(dashticzSource, /blocks\[me\.key\] = blockdef;/);

  // _specialFromReference must treat a type that merely echoes the block's
  // own reference key as "no real widget type", same as it already treats
  // the Dial/Bar visual mode's type:'dial' (#182).
  assert.match(
    deviceEditor,
    /\(!definition\.type \|\| definition\.type === 'dial' \|\| definition\.type === 'bar' \|\|\s*\n\s*definition\.type === reference\) &&\s*\n\s*parseInt\(definition\.idx, 10\) > 0/
  );
});

test('Domoticz log widget can limit the number of displayed lines (#105)', () => {
  const logSource = fs.readFileSync(
    path.join(root, 'js/components/log.js'),
    'utf8'
  );
  const widgetEditor = fs.readFileSync(
    path.join(root, 'js/widgeteditor.js'),
    'utf8'
  );
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );
  const savewidgets = fs.readFileSync(
    path.join(root, 'js/savewidgets.php'),
    'utf8'
  );

  // Untouched widgets must keep showing every line (maxitems 0 = unlimited),
  // so this is purely additive and never changes existing dashboards.
  assert.match(logSource, /maxitems: 0/);
  assert.match(
    logSource,
    /if \(maxitems > 0\) \{\s*\n\s*sorted = ascending \? sorted\.slice\(-maxitems\) : sorted\.slice\(0, maxitems\);/
  );

  // Widget Config editor: dedicated field (not a raw custom_fields row), fed
  // from and read back into widgetConfigs.log, matching the pattern already
  // used for scrolltimeout/ascending.
  assert.match(
    widgetEditor,
    /log: \{ scrolltimeout: true, ascending: true, aspectratio: true, maxitems: true \}/
  );
  assert.match(
    widgetEditor,
    /_cfgField\('maxitems', llog\.log_maxitems \|\| 'Maximum lines'/
  );
  assert.match(
    widgetEditor,
    /widgetConfigs\.log\.maxitems =\s*\n\s*typeof definition\.maxitems !== 'undefined' \? String\(definition\.maxitems\) : '';/
  );
  assert.match(
    widgetEditor,
    /entry\.maxitems = parseInt\(lgcfg\.maxitems, 10\) \|\| 0;/
  );

  // Classic Device Editor's widget save-entry builder must carry it too.
  assert.match(
    deviceEditor,
    /_copyDefinedWidgetProperties\(entry, definition, \['aspectratio', 'maxitems'\]\);/
  );

  // savewidgets.php: validated, bounded, and only written to CONFIG.js when
  // explicitly set (so an untouched log widget's saved block stays unchanged).
  assert.match(
    savewidgets,
    /if \(isset\(\$entry\['maxitems'\]\) && is_numeric\(\$entry\['maxitems'\]\)\) \{\s*\n\s*\$maxitems = \(int\)\$entry\['maxitems'\];\s*\n\s*if \(\$maxitems > 0 && \$maxitems <= 500\)/
  );
  assert.match(
    savewidgets,
    /if \(isset\(\$widget\['maxitems'\]\)\) \{\s*\n\s*\$props\['maxitems'\] = \$widget\['maxitems'\];/
  );
});

test('Device Editor list labels a Multi Device distinctly from a plain Custom device', () => {
  // Both are specialType 'custom' internally (a Multi Device is just a
  // Custom device whose 'values' custom field was filled in via the
  // dedicated Multi Device popup), so the list previously labeled every one
  // of them "Custom devices" - including actual Multi Devices, which was
  // confusing since they have their own distinct add-menu entry and icon.
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );

  assert.match(
    deviceEditor,
    /var isMultiDevice = isCustom &&\s*\n\s*special\.definition &&\s*\n\s*Array\.isArray\(special\.definition\.values\) &&\s*\n\s*special\.definition\.values\.length > 0;/
  );
  assert.match(
    deviceEditor,
    /var label = isTitle[\s\S]{0,260}?\? t\.title_block[\s\S]{0,260}?: t\.dummy_device;/
  );
  assert.match(
    deviceEditor,
    /var specialIconClass = isTitle[\s\S]{0,240}?isSlideButton[\s\S]{0,80}?'fa-sliders-h'[\s\S]{0,100}?isMultiDevice[\s\S]{0,80}?'fa-layer-group'[\s\S]{0,80}?'fa-cube';/
  );
});

test("Device Config popup edits a Multi Device's values as friendly rows instead of raw JSON", () => {
  // The generic Device Config popup (opened from Move mode's Settings button
  // or the Device Editor list) showed an existing Multi Device's 'values'
  // custom field as a single raw JSON text input, indistinguishable from a
  // plain Custom device - unlike the dedicated Multi Device popup used at
  // creation time, which offers a friendly idx/value row builder. Editing an
  // existing Multi Device now gets that same row builder back.
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );

  // The 'values' row is pulled out of the generic custom-fields list before
  // rendering, so it never appears as a raw JSON text field.
  assert.match(
    deviceEditor,
    /var multiDeviceValues =[\s\S]{0,260}?isCustom &&[\s\S]{0,260}?Array\.isArray\(customRows\[valuesRowIndex\]\.value\)[\s\S]{0,180}?\? customRows\[valuesRowIndex\]\.value[\s\S]{0,80}?: null;/
  );
  assert.match(
    deviceEditor,
    /if \(multiDeviceValues\) customRows\.splice\(valuesRowIndex, 1\);/
  );
  assert.match(
    deviceEditor,
    /multiDeviceValues\.forEach\(function \(row\) \{ html \+= _multiDeviceRowHtml\(row\); \}\);/
  );

  // Row add/remove reuses the same .md-value-row markup and idx/value
  // validation as the creation popup, scoped to this popup's own instance.
  assert.match(
    deviceEditor,
    /\$popup\.on\('click', '\.md-value-add', function \(\) \{/
  );
  assert.match(
    deviceEditor,
    /\$popup\.on\('click', '\.md-value-remove', function \(\) \{/
  );

  // OK collects the friendly rows back into a single 'values' custom field
  // instead of reading a raw text input for it.
  assert.match(
    deviceEditor,
    /storedRows\.push\(\{ field: 'values', setting: JSON\.stringify\(pendingValues\), value: pendingValues \}\);/
  );
  // A hand-typed 'values' field in the generic list is still rejected as a
  // duplicate, since the dedicated row builder already owns that field.
  assert.match(
    deviceEditor,
    /var customKeys = multiDeviceValues \? \{ values: true \} : \{\};/
  );
});

test("Device Config popup lets a Custom/Multi device's main idx be corrected after creation", () => {
  // idx is a protected/reserved custom field name (see
  // protectedCustomDeviceProperties), so a Custom or Multi device's main idx
  // was only ever settable at creation time. If the underlying Domoticz
  // device was later recreated with a different idx, there was no way to
  // fix it: the tile stayed stuck on the "Getting device N" placeholder
  // forever, since the device subscription for the stale idx never resolves
  // - which also means the icon/title never render, since deviceUpdateHandler
  // never runs far enough to paint them.
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );

  assert.match(
    deviceEditor,
    /if \(isCustom\) \{[\s\S]{0,1200}?id="de-config-idx"/
  );
  assert.match(
    deviceEditor,
    /var pendingIdx =[\s\S]{0,100}?isCustom \|\| isGroupBlock[\s\S]{0,120}?special\.idx[\s\S]{0,80}?: null;[\s\S]{0,100}?if \(isCustom\) \{[\s\S]{0,120}?var rawIdx = \$\.trim\(String\(\$\('#de-config-idx'\)\.val\(\) \|\| ''\)\);[\s\S]{0,100}?var parsedIdx = parseInt\(rawIdx, 10\);[\s\S]{0,160}?valid = false;/
  );
  assert.match(
    deviceEditor,
    /if \(isCustom \|\| isGroupBlock\) special\.idx = pendingIdx;/
  );
  // A Group's idx is optional (unlike Custom/Multi Device's required one) -
  // it shares the same #de-config-idx correction field and write-back, just
  // without the required-positive-int validation branch above.
  assert.match(
    deviceEditor,
    /\} else if \(isGroupBlock\) \{\s*\n\s*\/\/ Unlike Custom\/Multi Device, a Group's idx is optional/
  );
});

test('Domoticz Security Panel device renders instead of showing an empty tile (#120)', () => {
  // Domoticz's internal Security Panel device reports Type: 'Security' but
  // no SwitchType, so getBlockTypesBlock's priority chain (HardwareType ->
  // SwitchType -> Type) never matched the only existing registration,
  // blocktypes.SwitchType.Security, and fell through to the generic default
  // renderer (value: '<Data>'), which the panel doesn't populate - an empty
  // tile. getSecurityBlock (its intended handler, dead code until now -
  // nothing referenced it) also returned a [html, boolean] tuple instead of
  // a plain string, which deviceUpdateHandler's `typeof html === 'string'`
  // check requires to actually paint anything - a handler that returns a
  // non-string must have already written to the DOM itself (like the
  // dimmer/blinds handlers do), which getSecurityBlock never did either.
  const blocktypes = fs.readFileSync(
    path.join(root, 'js/blocktypes.js'),
    'utf8'
  );
  const blocksSource = fs.readFileSync(path.join(root, 'js/blocks.js'), 'utf8');

  assert.match(
    blocktypes,
    /blocktypes\.Security = \{\s*\n\s*handler: getSecurityBlock\s*\n\}/
  );
  // The SwitchType registration stays, in case some hardware variant does
  // report it.
  assert.match(
    blocktypes,
    /SwitchType\.Security = \{\s*\n\s*handler: getSecurityBlock,\s*\n\}/
  );

  const securityBlockBody = blocksSource.slice(
    blocksSource.indexOf('function getSecurityBlock('),
    blocksSource.indexOf('function getProtectedSecurityBlock(')
  );
  assert.doesNotMatch(securityBlockBody, /return \[html, true\];/);
  assert.match(securityBlockBody, /return html;\s*\n\}/);

  const protectedBlockBody = blocksSource.slice(
    blocksSource.indexOf('function getProtectedSecurityBlock('),
    blocksSource.indexOf('function getBlockTitle(')
  );
  assert.doesNotMatch(
    protectedBlockBody,
    /return \[getStatusBlock\(secBlock\), true\];/
  );
  assert.match(protectedBlockBody, /return getStatusBlock\(secBlock\);/);
  // getStatusBlock's `title = choose(block.title, '')` never sees the
  // auto-derived device-name title deviceUpdateHandler sets, since that
  // property is defined non-enumerable (so it survives CONFIG.js saves
  // correctly) and $.extend()/for...in silently skip non-enumerable
  // properties - so a Protected security device (password required to
  // arm/disarm, a common real-world setup) rendered with a blank title
  // unless the user had set one explicitly.
  assert.match(protectedBlockBody, /secBlock\.title = getBlockTitle\(block\);/);
});

test('Clock widgets (Basic/Station/Flip/Hayman) get a default icon and correctly sized faces', () => {
  // None of the four clock components set a defaultCfg.icon (unlike e.g.
  // weather's icon: 'fas fa-sun'), so a clock tile never showed an icon
  // unless the user manually typed one into the generic Widget Config
  // "Icon" custom field - inconsistent with every other widget. Reuse the
  // same icon already used for the widget catalog's add-menu entry.
  const basicclock = fs.readFileSync(
    path.join(root, 'js/components/basicclock.js'),
    'utf8'
  );
  const stationclock = fs.readFileSync(
    path.join(root, 'js/components/stationclock.js'),
    'utf8'
  );
  const flipclock = fs.readFileSync(
    path.join(root, 'js/components/flipclock.js'),
    'utf8'
  );
  const haymanclock = fs.readFileSync(
    path.join(root, 'js/components/haymanclock.js'),
    'utf8'
  );
  const widgetEditor = fs.readFileSync(
    path.join(root, 'js/widgeteditor.js'),
    'utf8'
  );

  assert.match(widgetEditor, /icon: 'far fa-clock'/);
  [basicclock, stationclock, flipclock, haymanclock].forEach(function (source) {
    assert.match(source, /icon: 'far fa-clock'/);
  });

  // Flip/Hayman size their canvas/face from .dt_block's *content-box* height
  // (.height(), not .innerHeight() - the latter also counts .dt_block's own
  // 15px top/bottom padding) minus .dt_title's own height and .dt_state's
  // own 5px/5px vertical margin (creative.css) - the space actually
  // available for the clock face. Sizing to more than that (the previous
  // behavior: full block height, no subtraction) pushed the face past
  // .dt_block's own bottom edge, showing a scrollbar unless the block was
  // made oversized to compensate. Same fix as js/components/frame.js.
  [
    ['flipclock', flipclock],
    ['haymanclock', haymanclock],
  ].forEach(function (pair) {
    var name = pair[0];
    var source = pair[1];
    assert.match(
      source,
      /var \$title = \$\(me\.mountPoint \+ ' \.dt_title'\);/,
      name
    );
    assert.match(
      source,
      /var \$state = \$\(me\.mountPoint \+ ' \.dt_state'\);/,
      name
    );
    assert.match(
      source,
      /var titleHeight = \$title\.length && \$title\.is\(':visible'\) \? \$title\.outerHeight\(true\) : 0;/,
      name
    );
    assert.match(
      source,
      /var stateMarginV = \$state\.length\s*\n\s*\? \(parseFloat\(\$state\.css\('margin-top'\)\) \|\| 0\) \+ \(parseFloat\(\$state\.css\('margin-bottom'\)\) \|\| 0\)\s*\n\s*: 0;/,
      name
    );
    assert.match(source, /- titleHeight - stateMarginV;/, name);
  });

  // basicclock.js v4 (#175) replaced that titleHeight/stateMarginV
  // subtraction with a getBoundingClientRect()-based measurement instead:
  // assuming a fixed title height/margin wasn't reliable across themes
  // (differing title line-height/padding/block spacing, and after Save
  // those values can settle one layout pass later than the component's
  // first run()). It measures from .dt_state's actual rendered position to
  // the bottom/right edge of the owning box, matching whatever the browser
  // is actually painting regardless of theme - flip/haymanclock haven't
  // been migrated to this approach (yet).
  assert.match(
    basicclock,
    /var \$title = \$\(me\.mountPoint \+ ' \.dt_title'\);/
  );
  assert.match(
    basicclock,
    /var \$state = \$\(me\.mountPoint \+ ' \.dt_state'\);/
  );
  assert.match(
    basicclock,
    /var titleHeight = \$title\.length && \$title\.is\(':visible'\) \? \$title\.outerHeight\(true\) : 0;/
  );
  assert.doesNotMatch(basicclock, /stateMarginV/);
  assert.match(
    basicclock,
    /var sizeRect = sizeEl && sizeEl\.getBoundingClientRect \? sizeEl\.getBoundingClientRect\(\) : null;/
  );
  assert.match(
    basicclock,
    /var stateRect = stateEl && stateEl\.getBoundingClientRect \? stateEl\.getBoundingClientRect\(\) : null;/
  );
  assert.match(
    basicclock,
    /var availH = sizeRect && stateRect[\s\S]{0,100}?\? sizeRect\.bottom - stateRect\.top[\s\S]{0,180}?\$sizeBox\.outerHeight\(\)[\s\S]{0,180}?- titleHeight;/
  );

  assert.match(
    stationclock,
    /var \$title = \$mount\.find\('\.dt_title'\)\.first\(\);/
  );
  assert.match(
    stationclock,
    /var \$state = \$mount\.find\('\.dt_state'\)\.first\(\);/
  );
  // A grid item's own box is a hard, CSS-Grid-track-sized box; .dt_block
  // only *looks* fixed (height: 100% !important) but a grid item's
  // automatic minimum size still grows to fit its content unless the item
  // itself clips overflow, which .dt-grid-item doesn't. Measuring .dt_block
  // there would read that already-inflated height back, feeding a runaway
  // grow-remeasure-grow loop with every ResizeObserver tick - so all four
  // clock components measure the outer mount point instead, in grid mode
  // (same fix as js/components/dial.js's _dialFitSize()).
  [basicclock, flipclock, haymanclock].forEach(function (source, i) {
    var name = ['basicclock', 'flipclock', 'haymanclock'][i];
    assert.match(
      source,
      /me\.\$mountPoint && me\.\$mountPoint\.hasClass\('dt-grid-item'\)/,
      name
    );
  });
  assert.match(
    stationclock,
    /var inGrid = \$mount\.hasClass\('dt-grid-item'\);/
  );
  assert.match(
    stationclock,
    /var availH =\s*\n\s*\(inGrid \? \$mount\.outerHeight\(\) : \$block\.length \? \$block\.height\(\) : 0\) -/
  );

  // The JS-side subtraction above still isn't a hard guarantee: .dt_block's
  // own min-height: 100% (creative.css, shared by every grid block) is only
  // a floor, not a cap, and .dt_block's flex/box-sizing behaves slightly
  // differently once the icon+title are both turned off (empirically
  // verified: headless browser, real grid screen). If the JS measurement is
  // even a fraction short, the block grows past its grid row instead of
  // clipping, and the grid item's own overflow:auto then shows a scrollbar
  // around an unchanged-size clock face with wasted space on the sides.
  // Same belt-and-suspenders CSS cap already used for .frame/.waqi.
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');
  assert.match(
    styles,
    /\.dt-grid-screen > \.dt-grid-layout > \.dt-grid-item > \.basicclock,\s*\n\.dt-grid-screen > \.dt-grid-layout > \.dt-grid-item > \.stationclock,\s*\n\.dt-grid-screen > \.dt-grid-layout > \.dt-grid-item > \.flipclock,\s*\n\.dt-grid-screen > \.dt-grid-layout > \.dt-grid-item > \.haymanclock \{\s*\n\s*height: 100% !important;\s*\n\s*min-height: 0 !important;\s*\n\s*overflow: hidden !important;/
  );
});

test('Domoticz log widget block is capped to its grid row so it cannot trigger a second, outer scrollbar (#105)', () => {
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');

  // .log .items already scrolls internally on purpose (there are more log
  // lines than fit) via its own overflow: auto. But the *outer* .dt_block
  // was only floored by the generic min-height: 100% grid rule, so a fraction
  // of extra height from the title/content-height rounding let it grow past
  // its grid row - the grid item's own overflow: auto then added a second,
  // unwanted scrollbar around it, which looked like there wasn't enough room
  // even though the row was sized correctly. Same cap already used for
  // .frame/.waqi/the clock widgets.
  assert.match(
    styles,
    /\.dt-grid-screen > \.dt-grid-layout > \.dt-grid-item > \.frame,\s*\n\.dt-grid-screen > \.dt-grid-layout > \.dt-grid-item > \.waqi,\s*\n\.dt-grid-screen > \.dt-grid-layout > \.dt-grid-item > \.log \{\s*\n\s*height: 100% !important;\s*\n\s*min-height: 0 !important;\s*\n\s*overflow: hidden !important;/
  );
});

test('Google Maps widget is visible on grid screens instead of collapsing to zero height (#135)', () => {
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');

  // map.js's Google Maps canvas (.state_map) is height: 100% of its
  // .dt_state parent, which itself only gets a real height from the
  // .fixedheight class - added in dashticz.js's renderBlock() only when a
  // fixed pixel height is applied via inline CSS, which the grid inGrid
  // guard there intentionally skips (the grid row governs height instead).
  // So on a grid screen .map never received .fixedheight, .dt_state stayed
  // at its unsized default, and the map canvas Google Maps created
  // collapsed to that same near-zero height - rendering invisible even
  // though the API loaded and initialized fine. Reproduce .fixedheight's
  // two effects directly for grid map blocks instead.
  assert.match(
    styles,
    /\.dt-grid-screen > \.dt-grid-layout > \.dt-grid-item > \.map \{\s*\n\s*height: 100% !important;\s*\n\s*min-height: 0 !important;\s*\n\s*overflow: hidden !important;/
  );
  assert.match(
    styles,
    /\.dt-grid-screen > \.dt-grid-layout > \.dt-grid-item > \.map \.dt_content \{\s*\n\s*display: flex;\s*\n\s*flex-direction: column;\s*\n\s*height: 100%;/
  );
  assert.match(
    styles,
    /\.dt-grid-screen > \.dt-grid-layout > \.dt-grid-item > \.map \.dt_state \{\s*\n\s*height: 100%;/
  );
});

test('Lyrion Music Server (LMS) block is registered, dispatched and wired through the Wizard', () => {
  const dashticz = fs.readFileSync(path.join(root, 'js/dashticz.js'), 'utf8');
  const lms = fs.readFileSync(path.join(root, 'js/components/lms.js'), 'utf8');
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );
  const layoutEditor = fs.readFileSync(
    path.join(root, 'js/layouteditor.js'),
    'utf8'
  );
  const simpleBlock = fs.readFileSync(
    path.join(root, 'js/components/simpleblock.js'),
    'utf8'
  );
  const widgetEditor = fs.readFileSync(
    path.join(root, 'js/widgeteditor.js'),
    'utf8'
  );
  const lmsBackend = fs.readFileSync(
    path.join(root, 'vendor/dashticz/lms/index.php'),
    'utf8'
  );
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');
  const enLang = JSON.parse(
    fs.readFileSync(path.join(root, 'lang/en_US.json'), 'utf8')
  );

  // js/dashticz.js only ever loads (and therefore only ever registers) a
  // component script named in its own `specials` list at startup - a new
  // component left out of that list is dead code: Dashticz.register() for
  // it never runs, so components['lms'] never exists and every LMS block
  // silently falls through to the default/button dispatch instead.
  assert.match(dashticz, /'group',\s*\n\s*'waqi',\s*\n\s*'lms',\s*\n\s*\];/);

  // The component itself: dispatches on type: 'lms' (like js/components/group.js
  // dispatches on type: 'group'), never sends an LMS control command, and
  // shares one fetch/error implementation (DT_lms_api) with the Wizard popup
  // below rather than duplicating it.
  assert.match(
    lms,
    /canHandle: function \(block\) \{\s*\n\s*return block && block\.type === 'lms';/
  );
  assert.match(lms, /var DT_lms_api = \{/);
  assert.match(lms, /request: function \(block, params, player\)/);
  assert.match(lms, /cover: function \(block, player, coverid, artworkUrl\)/);
  assert.match(lms, /function normalizeStatus\(/);
  assert.match(lms, /Number\(status\.remote\) === 1/);
  assert.match(lms, /remoteMeta/);
  assert.match(lms, /playlist_loop/);
  // Stopped/off must not keep showing the previous track (see #18 in the task).
  assert.match(
    lms,
    /A stopped\/off player must not keep showing the last track/
  );
  // Track-change-only artwork refetch: never re-fetch while the same track
  // (coverid/artwork_url) is still playing and already successfully loaded;
  // a failed fetch is deliberately not cached this way so it gets retried
  // (see the retry-throttle key/timestamp pair right below).
  assert.match(lms, /if \(me\.lmsArtworkLoadedKey === artworkKey\) return;/);
  assert.match(lms, /if \(me\.lmsArtworkRequestKey === artworkKey\) return;/);
  // The artwork change-detection key includes the visible metadata as well
  // as coverid/artworkUrl - a radio station often keeps the same
  // coverid/artwork_url while the programme or song changes, so the key
  // must change too or a genuinely new track's artwork would never refetch.
  // Fetch priority (player lookup first, then artworkUrl, then coverid - a
  // radio track's synthetic negative coverid has no real library artwork)
  // is handled server-side, in dashticz_lms_fetch_cover() (vendor/dashticz/lms/index.php).
  assert.match(
    lms,
    /return \[\s*\n\s*meta\.remote \? 'remote' : 'local',\s*\n\s*meta\.station,\s*\n\s*meta\.artist,\s*\n\s*meta\.title,\s*\n\s*meta\.album,\s*\n\s*meta\.coverid,\s*\n\s*meta\.artworkUrl,\s*\n\s*\]\.join\('\|'\);/
  );
  // Read-only: the runtime block only ever issues the "status" poll (never a
  // play/pause/power/volume control command) - DT_lms_api.request() itself
  // is reused by the Wizard's own "serverstatus" discovery call, but that
  // lives in js/deviceeditor.js, not here.
  assert.equal(
    (lms.match(/DT_lms_api\.request\(\s*me\.block/g) || []).length,
    1
  );
  assert.match(lms, /\['status', '-', 1, STATUS_TAGS\]/);
  assert.match(lms, /STATUS_TAGS = 'tags:aclK'/);
  // Automatic refresh reuses Dashticz's own per-block polling (me.block.refresh
  // + special.refresh, wired centrally in js/dashticz.js's _mountSpecialBlock,
  // including cleanup via removeBlock's clearInterval) instead of a bespoke
  // setInterval that would need its own teardown.
  assert.doesNotMatch(lms, /setInterval\(/);
  assert.match(lms, /refresh: function \(me\) \{/);
  assert.match(lms, /defaultCfg: \{[\s\S]*refresh: 5,/);
  assert.doesNotMatch(lms, /defaultCfg: \{[\s\S]*icon:/);
  // A missing PHP curl extension never resolves itself on the next poll
  // (unlike a transient network blip), so the block shows that specific,
  // fixed backend message verbatim instead of the generic "LMS unavailable"
  // text - the constant here must match vendor/dashticz/lms/index.php's
  // own fixed string exactly.
  assert.match(
    lms,
    /LMS_CURL_REQUIRED_ERROR = 'The PHP curl extension is required for the Lyrion Music Server block\.'/
  );
  assert.match(lms, /serverError === LMS_CURL_REQUIRED_ERROR/);

  // Wizard integration (js/deviceeditor.js): a dedicated quick-add/edit
  // popup, following the same multi-instance "special block" pattern as
  // Group/HTML Block (js/deviceeditor.js's managedSpecials), not the
  // Widget Editor's singleton catalog (js/widgeteditor.js) - required so
  // multiple independent LMS blocks (#22 in the task) can each carry their
  // own server/player.
  assert.match(deviceEditor, /function openLms\(\)/);
  assert.match(deviceEditor, /function _showLmsPopup\(\)/);
  assert.match(deviceEditor, /function _lmsFieldsHtml\(prefix, values\)/);
  assert.match(deviceEditor, /function _wireLmsFields\(prefix, \$popup\)/);
  assert.match(deviceEditor, /function _readLmsFields\(prefix, \$popup\)/);
  assert.match(deviceEditor, /openLms: openLms,/);
  assert.match(deviceEditor, /specialType: 'lms'/);
  assert.match(
    deviceEditor,
    /String\(definition\.type \|\| ''\)\.toLowerCase\(\) === 'lms'/
  );
  // Server/port/username/password/player/refresh are dedicated fields (like
  // idx for Custom/Group), never generic custom_fields rows.
  assert.match(
    deviceEditor,
    /server: true, port: true, username: true, password: true, player: true,\s*\n\s*refresh: true,/
  );
  // Player discovery/"Test connection" posts a plain 'serverstatus' request
  // and reads players_loop, exactly as documented for the LMS JSON-RPC API.
  assert.match(
    deviceEditor,
    /DT_lms_api\.request\(block, \['serverstatus', 0, 999\], ''\)/
  );
  assert.match(deviceEditor, /players_loop/);
  // The saved payload writes server/port/username/password/player/refresh as
  // top-level block properties (matching js/saveblocks.php's 'lms' branch
  // below), not inside custom_fields.
  assert.match(deviceEditor, /specialEntry\.server = special\.lmsServer;/);
  assert.match(deviceEditor, /specialEntry\.player = special\.lmsPlayer;/);
  // Icon defaults off - the cover artwork is this block's own visual.
  assert.match(
    deviceEditor,
    /_quickOptionsHtml\('lm', \{\s*\n\s*icon: false,\s*\n\s*iconValue: 'fas fa-music',/
  );
  assert.match(
    deviceEditor,
    /if \(special\.specialType === 'lms'\) return 'fas fa-music';/
  );
  // Default size for a newly added block: 6 columns wide, and (grid mode
  // only - this popup is only reachable from the grid-only Widgets catalog)
  // 8 rows tall, comfortably fitting the 100px cover plus its info lines.
  // `height` means a grid-row count in grid mode but a literal CSS pixel
  // height outside it (js/dashticz.js's renderBlock()), so a fixed default
  // is only ever written for grid mode.
  assert.match(
    deviceEditor,
    /width: 6,\s*\n(?:\s*\/\/[^\n]*\n)*\s*height: gridMode \? 8 : null,/
  );

  // Entry point lives in the Widgets ("wizard") catalog popup (js/widgeteditor.js),
  // next to Spotify/Sonarr, not in the Screen Editor's "Add items" tile grid
  // (js/components/simpleblock.js) - the user asked for it to be discoverable
  // there instead. It is not a plain catalog entry: every catalog widget is a
  // singleton (one selectedWidgets[id] flag, one fixed blockKey), which is
  // incompatible with LMS's multi-instance "special block" design, so its card
  // is marked data-special-widget and always opens the existing multi-instance
  // quick-add popup (DashticzDeviceEditor.openLms()) instead of toggling a flag.
  assert.doesNotMatch(simpleBlock, /action: 'lms'/);
  assert.doesNotMatch(simpleBlock, /DashticzDeviceEditor\.openLms\(\)/);
  assert.match(widgetEditor, /function _lmsWidgetCardHtml\(\)/);
  assert.match(widgetEditor, /data-special-widget="lms"/);
  assert.match(widgetEditor, /function _openLmsFromWidgets\(\)/);
  assert.match(widgetEditor, /DashticzDeviceEditor\.openLms\(\);/);
  assert.match(
    widgetEditor,
    /if \(\$\(this\)\.data\('special-widget'\) === 'lms'\)/
  );

  // Layout Editor (js/layouteditor.js): same cog-not-drag-icon fix as HTML
  // blocks got for #168, so an LMS tile's settings control is never mistaken
  // for a plain drag handle and always opens that exact block's own config.
  assert.match(
    layoutEditor,
    /String\(definition\.type \|\| ''\)\.toLowerCase\(\) === 'lms'/
  );
  assert.match(layoutEditor, /kind: 'lms',/);
  // _decorateItem() (isConfigurable) and _openItemConfig() both dispatch
  // off one shared REFERENCE_BASED_SPECIAL_KINDS array instead of a
  // separately hand-duplicated `item.kind === 'x' || ...` chain at each
  // call site, so a new repeatable special (LMS included) only has to be
  // added to that one array to get both the cog control and correct
  // config routing - see also 'Group block gets the Layout Editor
  // config...' below, which checks the same array for 'group'.
  assert.match(
    layoutEditor,
    /var REFERENCE_BASED_SPECIAL_KINDS = \[[\s\S]{0,400}?'lms'[\s\S]{0,400}?\];/
  );
  assert.match(
    layoutEditor,
    /isConfigurable =[\s\S]{0,300}?REFERENCE_BASED_SPECIAL_KINDS\.indexOf\(item\.kind\) > -1/
  );
  assert.match(
    layoutEditor,
    /REFERENCE_BASED_SPECIAL_KINDS\.indexOf\(item\.kind\) > -1\) &&\s*\n\s*item\.reference/
  );

  // Backend bridge (vendor/dashticz/lms/index.php): same-origin gated, LAN
  // (private-IP) access explicitly allowed like vendor/dashticz/xmltv.php,
  // POST-only credentials (never in a URL), and every failure message is a
  // fixed generic string - never the raw curl error/response that might
  // otherwise echo a password back.
  assert.match(lmsBackend, /dashticz_require_same_origin\(\)/);
  assert.match(
    lmsBackend,
    /dashticz_validate_remote_url\(\s*\n?\s*'http:\/\/' \. \$request\['server'\] \. ':' \. \$request\['port'\] \. '\/jsonrpc\.js',\s*\n\s*true/
  );
  assert.match(lmsBackend, /CURLOPT_USERPWD/);
  assert.match(lmsBackend, /CURLAUTH_BASIC/);
  assert.match(
    lmsBackend,
    /'Unable to connect to Lyrion Music Server' \. \$reason \. '\.'/
  );
  assert.match(lmsBackend, /Authentication failed\./);
  assert.doesNotMatch(lmsBackend, /CURLOPT_SSL_VERIFYPEER/);
  assert.doesNotMatch(lmsBackend, /echo curl_error/);

  // CSS: fixed 100x100 cover with object-fit: cover (never distorts, never a
  // browser broken-image icon - see js/components/lms.js's placeholder div),
  // text truncates with ellipsis instead of overflowing (#20).
  assert.match(
    styles,
    /\.lms-cover \{[\s\S]*width: 100px;[\s\S]*height: 100px;/
  );
  assert.match(styles, /\.lms-cover-img \{[\s\S]*object-fit: cover;/);
  assert.match(
    styles,
    /\.lms-info > div \{[\s\S]*text-overflow: ellipsis;[\s\S]*white-space: nowrap;/
  );
  // Title/Artist/Station each carry their own --lms-*-font-size/--lms-*-color
  // override (js/components/lms.js sets them inline per block from Device
  // Config's Text style fields), falling back to the shared --font-small/
  // theme color when a block never set one. Title is bold by default,
  // unconditionally, to stand out from artist/station (#217 follow-up).
  assert.match(
    styles,
    /\.lms-title \{[\s\S]*font-size: var\(--lms-title-font-size, var\(--font-small\)\);[\s\S]*color: var\(--lms-title-color, var\(--text-title\)\);[\s\S]*font-weight: bold;/
  );
  assert.match(
    styles,
    /\.lms-artist \{[\s\S]*font-size: var\(--lms-artist-font-size, var\(--font-small\)\);[\s\S]*color: var\(--lms-artist-color, var\(--text-normal\)\);/
  );
  assert.match(
    styles,
    /\.lms-station \{[\s\S]*font-size: var\(--lms-station-font-size, var\(--font-small\)\);[\s\S]*color: var\(--lms-station-color, var\(--text-normal\)\);/
  );
  assert.match(
    styles,
    /\.lms-album \{[\s\S]*font-size: calc\(var\(--font-small\) - 2px\);[\s\S]*color: var\(--text-muted\);/
  );

  // Translations exist for both places the block's name/labels are read from
  // (js/deviceeditor.js's own quick-add/edit popup vs. its card in the
  // Widgets catalog, js/widgeteditor.js, which reads language.settings.widgeteditor).
  assert.equal(enLang.settings.deviceeditor.lms_block, 'Lyrion Music Server');
  assert.equal(enLang.settings.widgeteditor.lms_block, 'Lyrion Music Server');
  assert.ok(enLang.settings.widgeteditor.lms_description);
  assert.ok(enLang.misc.lms_player_off);
  assert.ok(enLang.misc.lms_server_unavailable);
});

test('Lyrion Music Server "Hide block when player is off" switch clears both text and artwork', () => {
  const lms = fs.readFileSync(path.join(root, 'js/components/lms.js'), 'utf8');
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );
  const saveBlocks = fs.readFileSync(
    path.join(root, 'js/saveblocks.php'),
    'utf8'
  );
  const configWriter = fs.readFileSync(
    path.join(root, 'js/configwriter.php'),
    'utf8'
  );
  const lmsDocs = fs.readFileSync(
    path.join(root, 'docs/blocks/specials/lms.rst'),
    'utf8'
  );
  const enLang = JSON.parse(
    fs.readFileSync(path.join(root, 'lang/en_US.json'), 'utf8')
  );
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');

  // Runtime (js/components/lms.js): the player being off is a normal state,
  // not an error, so this only ever suppresses the "Player off" case - never
  // "Player unavailable" (unknown/unreachable) or "Nothing is playing" -
  // and clears both the info text and the cover art placeholder, not just one.
  assert.match(
    lms,
    /var hideWhenOff = me\.block\.hide_when_off === true && meta\.known && !meta\.power;/
  );
  assert.match(lms, /if \(hideWhenOff\) \{\s*\n\s*\$info\.empty\(\);/);
  // Also resets the artwork change-detection/retry state (not just clearing
  // the DOM), so the player coming back on is treated as a fresh track
  // instead of skipping a refetch because the last-loaded key still matches.
  assert.match(
    lms,
    /var \$cover = \$existing\.find\('\.lms-cover'\);\s*\n\s*if \(hideWhenOff\) \{\s*\n\s*\$cover\.empty\(\);\s*\n\s*_resetArtworkState\(me\);\s*\n\s*return;/
  );

  // Wizard integration (js/deviceeditor.js): a dedicated field alongside
  // server/port/.../refresh - not a generic custom field (kept out of the
  // Custom fields grid via protectedCustomDeviceProperties) - read from/
  // written to the same _lmsFieldsHtml/_readLmsFields shared by both the
  // quick-add and edit popups (see the LMS wiring test above).
  assert.match(
    deviceEditor,
    /lmsHideWhenOff: kind === 'lms' \? definition\.hide_when_off === true : false,/
  );
  assert.match(deviceEditor, /id="' \+\s*\n\s*prefix \+ '-lms-hide-when-off"/);
  assert.match(
    deviceEditor,
    /hideWhenOff: \$popup\.find\('#' \+ prefix \+ '-lms-hide-when-off'\)\.is\(':checked'\),/
  );
  assert.match(deviceEditor, /lmsHideWhenOff: lms\.hideWhenOff,/);
  assert.match(
    deviceEditor,
    /special\.lmsHideWhenOff = pendingLms\.hideWhenOff;/
  );
  assert.match(
    deviceEditor,
    /specialEntry\.hide_when_off = special\.lmsHideWhenOff === true;/
  );
  assert.match(deviceEditor, /refresh: true, hide_when_off: true,/);

  // Backend (js/saveblocks.php / js/configwriter.php): defaults to false and
  // is only written to CONFIG.js when explicitly enabled - configwriter.php
  // always emits a full blocks[key] replacement, so an omitted default-false
  // property here simply never appears, same as the 'last_update' pattern
  // used elsewhere in this same writer.
  assert.match(
    saveBlocks,
    /\$lmsHideWhenOff = !empty\(\$entry\['hide_when_off'\]\);/
  );
  assert.match(saveBlocks, /'lms_hide_when_off' => \$lmsHideWhenOff,/);
  assert.match(
    configWriter,
    /if \(!empty\(\$block\['lms_hide_when_off'\]\)\) \{\s*\n\s*\$props\['hide_when_off'\] = true;/
  );

  // The switch sits in its own section outside .de-config-options (unlike
  // Icon/Updated/Title above it), so it needs the .de-lms-switch class to
  // opt into that same shared blue-switch look and 38x20 size (#170's own
  // fix applied here too) instead of falling back to Bootstrap's default.
  assert.match(
    deviceEditor,
    /class="form-check-input de-lms-switch" type="checkbox" id="/
  );
  assert.match(
    styles,
    /\.de-lms-switch\.form-check-input \{[\s\S]*?width: 38px;[\s\S]*?height: 20px;/
  );
  assert.match(
    styles,
    /\.de-lms-switch\.form-check-input:checked \{[\s\S]*?background-color: #bfdbfe/
  );

  assert.equal(
    enLang.settings.deviceeditor.lms_hide_when_off,
    'Hide block when player is off'
  );
  assert.match(lmsDocs, /hide_when_off\s+``true``/);
});

test("Lyrion Music Server's configured icon renders as a badge on the cover art, not the generic icon column (#217)", () => {
  const lms = fs.readFileSync(path.join(root, 'js/components/lms.js'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');
  const lmsDocs = fs.readFileSync(
    path.join(root, 'docs/blocks/specials/lms.rst'),
    'utf8'
  );

  // getColIcon()'s (js/dashticz.js) generic .col-icon column floats over the
  // same top-left corner .lms-cover's own artwork occupies, so turning the
  // Icon toggle on for an LMS block made it collide with the cover instead
  // of rendering as a clean addition - hidden here so lms.js renders the
  // icon itself, directly on the artwork, instead.
  assert.match(styles, /\.lms-block > \.col-icon \{\s*\n\s*display: none;/);

  // .lms-cover is the positioning context for the badge, which is pinned to
  // its top-left corner, above it (positive z-index) and excluded from
  // pointer events so it never steals a click meant for the block/cover.
  assert.match(styles, /\.lms-cover \{[\s\S]*?position: relative;/);
  assert.match(
    styles,
    /\.lms-cover-icon \{[\s\S]*?position: absolute;[\s\S]*?top: 4px;[\s\S]*?left: 4px;[\s\S]*?z-index: 1;[\s\S]*?pointer-events: none;/
  );

  // js/components/lms.js builds the badge itself from the block's own icon/
  // image config, mirroring getColIcon()'s icon-vs-image handling, and
  // injects it into every .lms-cover render path (initial skeleton, no
  // artwork available, freshly loaded artwork, and the broken-image
  // fallback) so it never depends on which of those happens to run first.
  assert.match(
    lms,
    /function _coverIconHtml\(me\) \{\s*\n\s*var icon = me\.block\.icon;\s*\n\s*if \(icon\) return '<em class="' \+ icon \+ ' lms-cover-icon"><\/em>';\s*\n\s*var image = me\.block\.image;/
  );
  assert.match(
    lms,
    /function _skeletonHtml\(me\) \{[\s\S]*?_coverIconHtml\(me\)/
  );
  assert.match(
    lms,
    /function _renderCover\(me, \$cover, dataUrl\) \{\s*\n\s*var iconHtml = _coverIconHtml\(me\);/
  );
  // Every $cover.html(...) call in _renderCover (no-artwork, error-fallback)
  // includes iconHtml so the badge survives a re-render triggered by a
  // track/station change or a failed artwork fetch, not just the first paint.
  assert.equal(
    (lms.match(/\$cover\.html\(\s*\n\s*iconHtml \+/g) || []).length,
    2
  );

  assert.match(
    lmsDocs,
    /shown as a small badge in the top-left corner of the cover artwork/
  );
});

test('Lyrion Music Server Title/Artist/Station text style (size/color) is configurable in Device Config', () => {
  const lms = fs.readFileSync(path.join(root, 'js/components/lms.js'), 'utf8');
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );
  const saveBlocks = fs.readFileSync(
    path.join(root, 'js/saveblocks.php'),
    'utf8'
  );
  const configWriter = fs.readFileSync(
    path.join(root, 'js/configwriter.php'),
    'utf8'
  );
  const enLang = JSON.parse(
    fs.readFileSync(path.join(root, 'lang/en_US.json'), 'utf8')
  );

  // Wizard (js/deviceeditor.js): _lmsFieldsHtml() renders a Size/Color pair
  // per line, shared between the quick-add popup and the normal Device
  // Config edit view for an already-saved LMS block, same as the existing
  // Server/Port/.../Player fields above it.
  assert.match(
    deviceEditor,
    /id="' \+\s*\n?\s*prefix \+ '-lms-' \+ line\.key \+ '-size"/
  );
  assert.match(
    deviceEditor,
    /id="' \+\s*\n?\s*prefix \+ '-lms-' \+ line\.key \+ '-color"/
  );
  assert.match(
    deviceEditor,
    /titleSize:[\s\S]{0,20}parseInt\(\$popup\.find\('#' \+ prefix \+ '-lms-title-size'\)\.val\(\), 10\)[\s\S]{0,10}\|\|[\s\S]{0,10}16,/
  );
  assert.match(
    deviceEditor,
    /titleColor: String\([\s\S]{0,80}\$popup\.find\('#' \+ prefix \+ '-lms-title-color'\)\.val\(\) \|\| '#ffffff'[\s\S]{0,10}\),/
  );
  // Both save paths (the quick-add popup's managedSpecials[orderKey] entry,
  // and the edit popup's special.lmsXxx = pendingLms.xxx assignment) carry
  // the 6 new fields through to the specialEntry the rest of _save() posts.
  assert.match(deviceEditor, /lmsTitleSize: lms\.titleSize,/);
  assert.match(deviceEditor, /special\.lmsTitleSize = pendingLms\.titleSize;/);
  assert.match(
    deviceEditor,
    /specialEntry\.title_size = special\.lmsTitleSize;/
  );
  assert.match(
    deviceEditor,
    /specialEntry\.title_color = special\.lmsTitleColor;/
  );

  // Backend (js/saveblocks.php): a size outside 8-60 or a non hex-color
  // value is dropped rather than rejecting the whole save.
  assert.match(saveBlocks, /\$size >= 8 && \$size <= 60\) \? \$size : null;/);
  assert.match(
    saveBlocks,
    /preg_match\('\/\^#\[0-9a-fA-F\]\{6\}\$\/', \$value\)/
  );
  assert.match(saveBlocks, /'lms_title_size' => \$lmsTitleSize,/);

  // configwriter.php: omitted entirely (not even an empty string) when never
  // set, so an untouched block's CONFIG.js entry is unchanged and
  // css/creative.css's theme defaults keep applying.
  assert.match(
    configWriter,
    /'lms_title_size' => 'title_size',[\s\S]{0,300}'lms_station_color' => 'station_color',/
  );
  assert.match(
    configWriter,
    /if \(isset\(\$block\[\$blockKey\]\) && \$block\[\$blockKey\] !== null && \$block\[\$blockKey\] !== ''\) \{\s*\n\s*\$props\[\$propKey\] = \$block\[\$blockKey\];/
  );

  // Runtime (js/components/lms.js): applied as inline CSS custom properties
  // on .lms-block-inner, matching the property names configwriter.php just
  // wrote (title_size/title_color/... - no lms_ prefix at this point).
  assert.match(
    lms,
    /var LMS_TEXT_STYLE_VARS = \{\s*\n\s*title_size: '--lms-title-font-size',\s*\n\s*title_color: '--lms-title-color',/
  );
  assert.match(lms, /_applyTextStyleVars\(me, \$existing\);/);

  assert.equal(enLang.settings.deviceeditor.lms_text_style, 'Text style');
  assert.equal(enLang.settings.deviceeditor.lms_title_line, 'Title');
});

test('LMS text style fields are protected from the generic Custom fields grid, so a saved edit is not reverted by a stale duplicate', () => {
  // Regression: title_size/title_color/artist_size/artist_color/
  // station_size/station_color are real CONFIG.js properties on an LMS
  // block, so _deviceCustomFieldRows() (js/deviceeditor.js) picked them up
  // a second time as generic "leftover" custom-field rows unless excluded
  // via protectedCustomDeviceProperties - exactly like server/port/.../
  // hide_when_off already are just above them. Those stale rows are never
  // touched by the user (they edit the dedicated Text style inputs
  // instead), so on save they still carry whatever value was on screen
  // when the popup first opened. configwriter_special_block_props()
  // (js/configwriter.php) applies a block's custom_fields entries last and
  // unconditionally (`$props[$field] = $value;`), so that stale duplicate
  // silently overwrote the correctly-updated title_size/etc. on every
  // single save - the fields never actually updated on a second edit.
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );
  assert.match(
    deviceEditor,
    /hide_when_off: true,[\s\S]{0,700}title_size: true,[\s\S]{0,20}title_color: true,[\s\S]{0,20}artist_size: true,[\s\S]{0,20}artist_color: true,[\s\S]{0,20}station_size: true,[\s\S]{0,20}station_color: true,/
  );
});

test('openConfig() preserves already-edited special-block state across repeated opens, like openLayoutConfig()', () => {
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );

  // _init(preserveDeviceState) wipes managedSpecials entirely (and, for
  // each special, re-derives it from the stale client-side blocks[]
  // snapshot from page load) unless preserveDeviceState is true. openConfig()
  // - "Open Device Config directly for a rendered block", i.e. an existing
  // one, same use case as openLayoutConfig() right below it - previously
  // called plain _init(), so reopening the same special a second time in one
  // session (e.g. to adjust an LMS block's Text style fields again) silently
  // reverted every special field to whatever was saved before this session,
  // discarding the first edit. The quick-add popups further below (openCustom,
  // openMultiDevice, openGroup, ...) correctly keep plain _init() - a brand
  // new block should never inherit a different special's stale state.
  assert.match(
    deviceEditor,
    /function openConfig\(reference\) \{[\s\S]{0,600}_init\(true\);/
  );
  assert.match(
    deviceEditor,
    /function openLayoutConfig\(reference\) \{[\s\S]{0,200}_init\(true\);/
  );
});

test('device title font size (--font-device-title) is independent and configurable from Theme settings', () => {
  const settingsJs = fs.readFileSync(path.join(root, 'js/settings.js'), 'utf8');
  const saveCustomCss = fs.readFileSync(
    path.join(root, 'js/savecustomcss.php'),
    'utf8'
  );
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');
  const themes = [
    'themes/modern-dark/modern-dark.css',
    'themes/liquid-glass-blue/liquid-glass-blue.css',
    'themes/liquid-glass-grey/liquid-glass-grey.css',
  ].map((file) => fs.readFileSync(path.join(root, file), 'utf8'));
  const enLang = JSON.parse(
    fs.readFileSync(path.join(root, 'lang/en_US.json'), 'utf8')
  );
  const nlLang = JSON.parse(
    fs.readFileSync(path.join(root, 'lang/nl_NL.json'), 'utf8')
  );

  assert.match(
    settingsJs,
    /var _THEME_FONT_VARS = \[\s*\n\s*'--font-large',\s*\n\s*'--font-device-title',\s*\n\s*'--font-small',\s*\n\s*'--font-update',\s*\n\s*\];/
  );
  assert.match(saveCustomCss, /'--font-device-title'/);
  assert.match(styles, /--font-device-title: 12px;/);
  assert.match(
    styles,
    /\.title \{\s*\n\s*color: var\(--text-title\) !important;\s*\n\s*font-size: var\(--font-device-title\) !important;/
  );
  themes.forEach((theme) => {
    assert.match(theme, /--font-device-title: 18px;/);
    assert.match(
      theme,
      /\.title \{\s*\n\s*font-size: var\(--font-device-title, 18px\) !important;/
    );
  });
  assert.equal(
    enLang.settings.theme.vars['--font-device-title'],
    'Device title text (--font-device-title)'
  );
  assert.equal(
    nlLang.settings.theme.vars['--font-device-title'],
    'Tekst device-titel (--font-device-title)'
  );
});

test('icon column width (--icon-column-width) is configurable from the Theme settings menu', () => {
  const settingsJs = fs.readFileSync(path.join(root, 'js/settings.js'), 'utf8');
  const saveCustomCss = fs.readFileSync(
    path.join(root, 'js/savecustomcss.php'),
    'utf8'
  );
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');
  const modernDark = fs.readFileSync(
    path.join(root, 'themes/modern-dark/modern-dark.css'),
    'utf8'
  );
  const liquidGlassBlue = fs.readFileSync(
    path.join(root, 'themes/liquid-glass-blue/liquid-glass-blue.css'),
    'utf8'
  );
  const liquidGlassGrey = fs.readFileSync(
    path.join(root, 'themes/liquid-glass-grey/liquid-glass-grey.css'),
    'utf8'
  );
  const enLang = JSON.parse(
    fs.readFileSync(path.join(root, 'lang/en_US.json'), 'utf8')
  );
  const nlLang = JSON.parse(
    fs.readFileSync(path.join(root, 'lang/nl_NL.json'), 'utf8')
  );

  // The icon column's own box width (.col-icon, .dt_block .col-icon) was the
  // one icon-related size still hardcoded in css/creative.css, unlike
  // --icon-font-size/--icon-image-size (the icon glyph/image content inside
  // that column) which are already theme variables - added to the same
  // _THEME_ICON_VARS-driven settings panel and save allowlist those use, so
  // it renders in the same Icon size column, no new plumbing needed.
  assert.match(
    settingsJs,
    /var _THEME_ICON_VARS = \[\s*\n\s*'--icon-font-size',\s*\n\s*'--icon-image-size',\s*\n\s*'--icon-column-width',\s*\n\s*\];/
  );
  assert.match(saveCustomCss, /'--icon-image-size', '--icon-column-width',/);

  // css/creative.css (loaded for every theme) drives both rules from the
  // variable, keeping each rule's own current literal value as its fallback
  // so a theme/install that never sets the variable renders unchanged.
  assert.match(
    styles,
    /\.col-icon \{\s*\n\s*width: var\(--icon-column-width, 40px\) !important;/
  );
  assert.match(
    styles,
    /\.dt_block \.col-icon \{\s*\n\s*margin-top: 5px;\s*\n\s*width: var\(--icon-column-width, 45px\) !important;/
  );

  // Modern Dark/Liquid Glass Blue/Liquid Glass Grey each set an explicit
  // default (matching the 45px .dt_block .col-icon already renders in
  // practice, since getContainer() always adds the dt_block class) so the
  // settings panel's field is correctly pre-filled instead of showing blank.
  [modernDark, liquidGlassBlue, liquidGlassGrey].forEach((theme) => {
    assert.match(theme, /--icon-column-width: 45px;/);
  });

  assert.equal(
    enLang.settings.theme.vars['--icon-column-width'],
    'Icon column width (--icon-column-width)'
  );
  assert.equal(
    nlLang.settings.theme.vars['--icon-column-width'],
    'Icoon kolombreedte (--icon-column-width)'
  );
});

test('Group block gets the Layout Editor config (cog) control, like HTML/LMS blocks, instead of only a drag handle', () => {
  const layoutEditor = fs.readFileSync(
    path.join(root, 'js/layouteditor.js'),
    'utf8'
  );

  // _resolveBlock() dispatches Dashticz's own client-side group/scene
  // aggregate block (js/components/group.js) on type: 'group', same as the
  // html/lms checks right above it. Without this, a group block (which uses
  // a 'devices' array rather than a numeric idx) matched none of the
  // idx-based checks further down, so _resolveBlock() returned null and the
  // block fell through to _collectGridItems()'s untyped 'grid' fallback -
  // which _decorateItem() renders with only a drag icon, never the cog.
  assert.match(
    layoutEditor,
    /String\(definition\.type \|\| ''\)\.toLowerCase\(\) === 'group'/
  );
  assert.match(layoutEditor, /kind: 'group',/);

  // isConfigurable (decides whether the tile gets the cog vs. the drag
  // icon) and _openItemConfig (routes a cog click to DashticzDeviceEditor,
  // which already understands specialType 'group' - see
  // _specialFromReference() in js/deviceeditor.js) both dispatch off the
  // shared REFERENCE_BASED_SPECIAL_KINDS array (see the LMS test above,
  // which checks the array declaration and both call sites) - here it
  // only needs to be re-checked for 'group' itself.
  assert.match(
    layoutEditor,
    /var REFERENCE_BASED_SPECIAL_KINDS = \[[\s\S]{0,400}?'group'[\s\S]{0,50}?\];/
  );
});

test('iconORimage() does not let a reset-to-empty image blank out a configured icon', () => {
  const blocks = fs.readFileSync(path.join(root, 'js/blocks.js'), 'utf8');

  // getBlockConfig() (js/dashticz.js) resets the *other* of icon/image to ''
  // (still `typeof !== 'undefined'`) whenever one of them is set, so a block
  // with a configured icon and no image ends up with both `icon: '...'` and
  // `image: ''` defined. iconORimage() must treat that '' as "not set" -
  // otherwise the image check (which used to run unconditionally whenever
  // block.image was merely defined) always won because it runs after the
  // icon check, forcing a blank <img src="img/"> in place of the icon. This
  // is what a Group block's default icon (fas fa-object-group,
  // js/deviceeditor.js's _showGroupPopup) ran into: visible in the saved
  // config, never rendered on the tile.
  assert.match(
    blocks,
    /if \(block\['icon'\]\) \{\s*\n\s*mIcon = Dashticz\.getProperty\(block\['icon'\], device\);\s*\n\s*useImage = false;/
  );
  assert.match(
    blocks,
    /if \(block\['image'\]\) \{\s*\n\s*mImage = Dashticz\.getProperty\(block\['image'\], device\);\s*\n\s*useImage = true;/
  );
  assert.doesNotMatch(blocks, /typeof block\['icon'\] !== 'undefined'/);
  assert.doesNotMatch(blocks, /typeof block\['image'\] !== 'undefined'/);
});

test('Custom device/Multi device/Group/HTML block/LMS quick-add popups and Widget Config use icon buttons for Icon/Updated/Title, not switches (#195)', () => {
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );
  const widgetEditor = fs.readFileSync(
    path.join(root, 'js/widgeteditor.js'),
    'utf8'
  );

  // _quickOptionsHtml() is shared by every Screen Editor quick-add popup
  // reachable from the "+" tile menu (Custom device 'cd', Multi Device
  // 'md', Group 'gb', LMS 'lm', HTML Block 'hb') - one conversion here
  // fixes all five at once. Same .de-config-option/.de-visual-mode-button
  // look as Device Config's own row, but rendered as plain <button>s
  // (id="<prefix>-opt-icon" etc, not data-option) since _readQuickOptions()
  // looks each one up individually per popup instance.
  assert.match(
    deviceEditor,
    /function _quickOptionsHtml\(prefix, defaults\) \{/
  );
  assert.match(
    deviceEditor,
    /\{ id: 'opt-icon', icon: 'fas fa-image', label: t\.icon, active: defaults\.icon \}/
  );
  assert.match(
    deviceEditor,
    /icon: 'fas fa-clock',\s*\n\s*label: t\.last_update,\s*\n\s*active: defaults\.lastUpdate,/
  );
  assert.match(
    deviceEditor,
    /icon: 'fas fa-heading',\s*\n\s*label: t\.show_title,\s*\n\s*active: defaults\.showTitle,/
  );
  assert.match(
    deviceEditor,
    /'<button type="button" class="btn btn-outline-secondary de-config-option'/
  );
  assert.doesNotMatch(
    deviceEditor,
    /type="checkbox" id="' \+\s*\n\s*prefix \+\s*\n?\s*'-opt-icon"/
  );

  // _wireQuickOptions(): a click handler toggling .active (no native
  // checkbox/change event any more), still special-casing the Icon button
  // to show/hide the icon custom-field row.
  assert.match(
    deviceEditor,
    /function _wireQuickOptions\(prefix, \$popup\) \{\s*\n\s*\$popup\.on\('click', '\.de-config-option', function \(\) \{/
  );
  assert.match(
    deviceEditor,
    /if \(\$\(this\)\.attr\('id'\) === prefix \+ '-opt-icon'\) \{\s*\n\s*\$\('\.' \+ prefix \+ '-opt-icon-field'\)\.toggleClass\('d-none', !active\);/
  );
  assert.match(
    deviceEditor,
    /function _readQuickOptions\(prefix\) \{\s*\n\s*var iconChecked = \$\('#' \+ prefix \+ '-opt-icon'\)\.hasClass\('active'\);/
  );
  assert.match(
    deviceEditor,
    /lastUpdate: \$\('#' \+ prefix \+ '-opt-update'\)\.hasClass\('active'\),\s*\n\s*showTitle: \$\('#' \+ prefix \+ '-opt-title'\)\.hasClass\('active'\),/
  );

  // Widget Config's own Icon/Title row (_widgetBlockOptionsHtml,
  // .we-block-options-row/.we-block-option) gets the same treatment,
  // independently of the device-side .de-config-option wiring above.
  assert.match(
    widgetEditor,
    /'<button type="button" class="btn btn-outline-secondary we-block-option'/
  );
  assert.doesNotMatch(
    widgetEditor,
    /'<input class="form-check-input we-block-option" type="checkbox" data-block-option="'/
  );
  assert.match(
    widgetEditor,
    /\$cfgModal\.on\('click', '\.we-block-option', function \(\) \{/
  );
  assert.match(
    widgetEditor,
    /refreshIconFieldVisibility\(\) \{\s*\n\s*var enabled = \$cfgModal\s*\n\s*\.find\('\[data-block-option="icon"\]'\)\s*\n\s*\.hasClass\('active'\);/
  );
});

test('Slide button quick-add popup gets an Icon toggle and a Background icon button, like every other popup (#195)', () => {
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );
  const button = fs.readFileSync(
    path.join(root, 'js/components/button.js'),
    'utf8'
  );

  // _showSlideButtonPopup() (deviceeditor.js): unlike the other quick-add
  // popups, Icon was always shown unconditionally with no toggle at all -
  // now it's a real button, id="sb-opt-icon"/class "sb-opt-icon-field"
  // matching _quickOptionsHtml()'s own naming so _wireQuickOptions('sb', ...)
  // can wire it with the exact same shared code, no bespoke handler needed.
  assert.match(
    deviceEditor,
    /'<button type="button" class="btn btn-outline-secondary de-config-option active" id="sb-opt-icon"/
  );
  assert.match(deviceEditor, /class="mb-3 sb-opt-icon-field"/);
  assert.match(deviceEditor, /_wireQuickOptions\('sb', \$popup\);/);
  assert.match(
    deviceEditor,
    /var iconChecked = \$\('#sb-opt-icon'\)\.hasClass\('active'\);/
  );
  assert.match(
    deviceEditor,
    /var iconValue = iconChecked\s*\n\s*\? \$\.trim\(/
  );

  // button.js: the old "No background" checkbox is gone from
  // actionFieldsHtml() - injectButtonBackgroundOption() appends a matching
  // Background icon button into deviceeditor.js's own
  // .de-config-options-icons row instead, reusing that row's own
  // '.de-config-option' click handler (already delegated on $popup by
  // _wireQuickOptions above) rather than wiring its own.
  assert.doesNotMatch(button, /id="dt-button-no-background"/);
  assert.match(
    button,
    /function injectButtonBackgroundOption\(\$popup\) \{\s*\n\s*var \$optionsRow = \$popup\.find\('\.de-config-options-icons'\)\.first\(\);/
  );
  assert.match(
    button,
    /'<button type="button" class="btn btn-outline-secondary de-config-option active" id="dt-button-background"/
  );
  assert.match(button, /injectButtonBackgroundOption\(\$popup\);/);
  assert.match(
    button,
    /if \(!\$\('#dt-button-background'\)\.hasClass\('active'\)\)\s*\n\s*custom\.no_background = true;/
  );
});

test('Bar and Slider show On/Off (not Open/Closed) for Dimmers, and Slider becomes available for them (#197)', () => {
  const switches = fs.readFileSync(path.join(root, 'js/switches.js'), 'utf8');
  const dialComponent = fs.readFileSync(
    path.join(root, 'js/components/dial.js'),
    'utf8'
  );
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');

  // dial.js's Bar subtype (used by both Dimmer and Blinds Percentage
  // devices) hard-coded Open/Closed for its 0%/100% segment labels
  // regardless of device type - a Dimmer showed "OPEN"/"DICHT" instead of
  // On/Off. updateBar() now branches on the live device's own SwitchType.
  assert.match(
    dialComponent,
    /var isDimmer = !!\(me\.device && me\.device\.SwitchType === 'Dimmer'\);/
  );
  assert.match(
    dialComponent,
    /var openText = isDimmer\s*\n\s*\? language\.switches && language\.switches\.state_off/
  );
  assert.match(
    dialComponent,
    /var closedText = isDimmer\s*\n\s*\? language\.switches && language\.switches\.state_on/
  );

  // getDimmerBlock() gains the same block.needle === true early-return
  // branch getBlindsBlock() already has, reusing renderBlindsSliderBlock()
  // for a working vertical Slider instead of leaving it Blinds-only.
  const dimmerBlockStart = switches.indexOf('function getDimmerBlock(');
  const dimmerBlockNeedleBranch = switches.slice(
    dimmerBlockStart,
    dimmerBlockStart + 800
  );
  assert.match(dimmerBlockNeedleBranch, /if \(block\.needle === true\) \{/);
  assert.match(
    dimmerBlockNeedleBranch,
    /renderBlindsSliderBlock\(\s*\n\s*block,\s*\n\s*device,\s*\n\s*device\['idx'\],\s*\n\s*\$div,\s*\n\s*true,\s*\n\s*false,\s*\n\s*sliderStep\s*\n\s*\);/
  );
  assert.match(dimmerBlockNeedleBranch, /return true;/);

  // renderBlindsSliderBlock() itself: On/Off labels, forced hidestop (no
  // motor to Stop), switchDevice() instead of switchBlinds(), and a
  // .dimmer-slider modifier class marking the wrap for addSlider() below.
  assert.match(switches, /var isDimmer = device\['SwitchType'\] === 'Dimmer';/);
  assert.match(
    switches,
    /var hidestop =\s*\n\s*isDimmer \|\|\s*\n\s*\(typeof block\['hide_stop'\]/
  );
  assert.match(
    switches,
    /var openLabel =\s*\n\s*block\.textOn \|\|\s*\n\s*\(isDimmer \? language\.switches\.state_on : language\.switches\.state_open\);/
  );
  assert.match(
    switches,
    /var closeLabel =\s*\n\s*block\.textOff \|\|\s*\n\s*\(isDimmer \? language\.switches\.state_off : language\.switches\.state_closed\);/
  );
  assert.match(
    switches,
    /'<div class="blinds-slider-wrap' \+\s*\n\s*\(isDimmer \? ' dimmer-slider' : ''\) \+\s*\n\s*' swiper-no-swiping/
  );
  assert.match(
    switches,
    /\$mountPoint\.find\('\.btn-blinds-up'\)\.click\(function \(\) \{\s*\n\s*if \(isDimmer\) switchDevice\(block, 'on', false\);\s*\n\s*else switchBlinds\(block, asOn \? 'On' : 'Off'\);/
  );
  assert.match(
    switches,
    /\$mountPoint\.find\('\.btn-blinds-down'\)\.click\(function \(\) \{\s*\n\s*if \(isDimmer\) switchDevice\(block, 'off', false\);\s*\n\s*else switchBlinds\(block, asOn \? 'Off' : 'On'\);/
  );

  // A Dimmer's up/down buttons are a genuine On/Off toggle, not a matched
  // pair of "move" actions like Blinds' Open/Close - the down (Off) button
  // gets a distinct .blinds-slider-action-off marker class so it can be
  // color-coded red instead of sharing Blinds' single green look for both;
  // the up (On) button is left as-is, keeping the shared green style.
  assert.doesNotMatch(
    switches,
    /blinds-slider-action-up' \+\s*\n\s*\(isDimmer/
  );
  assert.match(
    switches,
    /'<div class="blinds-slider-action blinds-slider-action-down' \+\s*\n\s*\(isDimmer \? ' blinds-slider-action-off' : ''\) \+\s*\n\s*'"><a href="javascript:void\(0\)" class="btn-blinds btn-blinds-down"/
  );
  assert.match(
    styles,
    /\.blinds-slider-action-off a \{\s*\n\s*color: #ffeaea;\s*\n\s*background: linear-gradient\(\s*\n\s*180deg,\s*\n\s*rgba\(220, 53, 69, 0\.55\),\s*\n\s*rgba\(160, 30, 42, 0\.55\)\s*\n\s*\);\s*\n\s*border: 1px solid rgba\(235, 110, 120, 0\.6\);/
  );

  // Chevron icons (fa-chevron-up/-down) imply a physical up/down motion,
  // which fits Blinds but not a Dimmer's genuine On/Off toggle - a Dimmer's
  // buttons get fa-toggle-on/fa-toggle-off instead, and the down button's
  // icon is kept fully opaque against its red background (the global
  // .fas.fa-toggle-off opacity rule elsewhere in this file is meant for a
  // small inline status icon, not this button).
  assert.match(
    switches,
    /'"><em class="fas ' \+\s*\n\s*\(isDimmer \? 'fa-toggle-on' : 'fa-chevron-up'\) \+\s*\n\s*'"><\/em><\/a><\/div>';/
  );
  assert.match(
    switches,
    /'"><em class="fas ' \+\s*\n\s*\(isDimmer \? 'fa-toggle-off' : 'fa-chevron-down'\) \+\s*\n\s*'"><\/em><\/a><\/div>';/
  );
  assert.match(
    styles,
    /\.blinds-slider-action-off a \.fa-toggle-off \{\s*\n\s*opacity: 1;/
  );

  // addSlider(): the Blinds-only top-to-bottom scale mirroring must not
  // apply to a Dimmer's Slider, which keeps jQuery UI's own normal
  // min-at-bottom/max-at-top layout (0% Off at the bottom, 100% On at the
  // top) - matching a physical dimmer/volume slider and the On/Off button
  // positions above. Gated on the .dimmer-slider class renderBlindsSliderBlock()
  // sets, not device type, so addSlider() itself stays device-agnostic.
  assert.match(
    switches,
    /var isDimmerSlider = \$wrap\.hasClass\('dimmer-slider'\);/
  );
  assert.match(
    switches,
    /function mirror\(value\) \{\s*\n\s*return \$wrap\.length && !isDimmerSlider \? min \+ max - value : value;/
  );
  assert.match(
    switches,
    /return \$wrap\.length && !isDimmerSlider \? 100 - percent : percent;/
  );

  // The fill (.ui-slider-range) must grow from the opposite anchor for a
  // Dimmer's flipped scale, or it would visually detach from the handle.
  assert.match(
    styles,
    /\.blinds-slider-wrap\.dimmer-slider \.slider \.ui-slider-range \{\s*\n\s*top: auto !important;\s*\n\s*bottom: -8px !important;/
  );

  // Device Config: Slider was previously gated to percentage Blinds only:
  // a fresh Dimmer had the Slider button disabled and no working renderer
  // behind it even if forced. It now supports the same two device types
  // Bar already does, and Inverse (meaningless for a Dimmer, which always
  // runs 0% Off to 100% On) stays hidden for it even though Slider mode
  // now applies.
  assert.match(
    deviceEditor,
    /var supportsNeedle =\s*\n\s*hasDial && \(isDimmer \|\| isBlindsPercentage \|\| options\.needle === true\);/
  );
  assert.match(
    deviceEditor,
    /function inverseApplies\(mode\) \{\s*\n\s*return mode === 'needle' && !isDimmer;/
  );
});

test('Device Config popup tags itself device/special so Automation only attaches where there is a live device', () => {
  // Automation (Device Rules) reused this popup's DOM shape alone to decide
  // whether to attach - so an idx-less special (Title, Separator, HTML
  // Block, ...) being re-edited (whose only real control can be an
  // icon/image pulldown) got an unrelated Automation section glued onto it
  // too, since those have no live Domoticz Status/nValue to trigger from.
  // A Custom/Multi Device or Group special, unlike those, still wraps a
  // real idx (same one idxLabel/Bar/Dial already resolve from special.idx)
  // and must keep the section, same as a plain device - a first cut of this
  // fix that only checked isSpecial wrongly stripped Automation from every
  // device the user gave a hand-picked block key instead of leaving it at
  // the auto-generated device_<idx> default.
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );
  const devicerules = fs.readFileSync(
    path.join(root, 'js/devicerules.js'),
    'utf8'
  );

  assert.match(
    deviceEditor,
    /var hasLiveDevice =\s*!isSpecial \|\| \(\(isCustom \|\| isGroupBlock\) && special\.idx\);/
  );
  assert.match(
    deviceEditor,
    /var html =\s*\n\s*'<div class="modal fade de-config-popup" id="de-config-popup" data-block-kind="' \+\s*\n\s*\(hasLiveDevice \? 'device' : 'special'\) \+\s*\n\s*'" tabindex="-1" aria-hidden="true">';/
  );
  assert.match(
    devicerules,
    /if \(!\$customSection\.length \|\| !\$popup\.find\('#de-config-ok'\)\.length\) return;\s*\n\s*\/\/[\s\S]{0,600}?if \(\$popup\.attr\('data-block-kind'\) === 'special'\) return;/
  );
});

test('icon/image pulldown never gets a field-name suggestion menu, in either the Device or Widget editor', () => {
  // The icon/image row is a <select> ("Icon"/"Image"), not a free-text
  // field - a suggestion menu for it makes no sense and, per the earlier
  // pointer-events overlap bug, could visually sit over unrelated controls.
  const presets = fs.readFileSync(
    path.join(root, 'js/customfieldpresets.js'),
    'utf8'
  );

  assert.match(
    presets,
    /if \(\$input\.hasClass\('de-icon-source'\) \|\| \$input\.hasClass\('we-icon-source'\)\)\s*\n\s*return false;/
  );
});

test('custom field suggestion systems also cover the Widget Editor, with widget-scoped presets', () => {
  // Widget Editor's custom fields (we-custom-field-name/-setting/-row) used
  // a separate class family from the Device Config popup's (de-/cd-), so
  // the suggestion menus simply never attached there - not a deliberate
  // exclusion, just an omission fixed by widening the same selectors.
  const presets = fs.readFileSync(
    path.join(root, 'js/customfieldpresets.js'),
    'utf8'
  );
  const setOptions = fs.readFileSync(
    path.join(root, 'js/customfieldsetoptions.js'),
    'utf8'
  );
  const behavior = fs.readFileSync(
    path.join(root, 'js/customfieldpresetbehavior.js'),
    'utf8'
  );

  [
    'we-custom-field-row',
    'we-custom-field-name',
    'we-custom-field-setting',
  ].forEach((className) => {
    assert.ok(
      presets.includes(className),
      'customfieldpresets.js must recognise .' + className
    );
  });
  assert.ok(setOptions.includes('we-custom-field-row'));
  assert.ok(setOptions.includes('we-custom-field-setting'));
  assert.ok(behavior.includes('we-custom-field-row'));
  assert.ok(behavior.includes('we-custom-field-name'));
  assert.ok(behavior.includes('we-custom-field-setting'));

  // Many device presets (textOn, batteryThreshold, iconOn, ...) only make
  // sense for a live Domoticz device, so the Widget Editor's menu must be
  // filtered to the block-agnostic subset, not just widened to reuse it.
  assert.match(
    presets,
    /function presetsForContext\(context\) \{\s*\n\s*if \(context !== 'widget'\) return PRESETS;\s*\n\s*return PRESETS\.filter\(function \(preset\) \{\s*\n\s*return preset\.widget === true;/
  );
});

test('addAutomationIndicator marks a block with an enabled Device Rule, opt-out per block', () => {
  const blocks = fs.readFileSync(path.join(root, 'js/blocks.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');

  assert.match(
    blocks,
    /addBatteryLevel\(\$div, block\);\s*\n\s*addAutomationIndicator\(\$div, block\);/
  );
  assert.match(
    blocks,
    /function addAutomationIndicator\(\$div, block\) \{\s*\n\s*\$div\.find\('\.automation-indicator'\)\.remove\(\);\s*\n\s*if \(block\.automation_indicator === false\) return;/
  );
  assert.match(
    blocks,
    /DashticzDeviceRules\.hasEnabledRules\(block\);\s*\n\s*if \(active\) \$div\.append\('<i class="automation-indicator"><\/i>'\);/
  );
  assert.match(
    css,
    /\.automation-indicator \{\s*\n\s*position: absolute;\s*\n\s*left: 0;\s*\n\s*bottom: 0;/
  );
});
