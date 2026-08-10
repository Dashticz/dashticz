const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function filesBelow(directory, extension) {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...filesBelow(fullPath, extension));
    else if (entry.isFile() && fullPath.endsWith(extension)) result.push(fullPath);
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
  const end = source.indexOf('\n// eslint-disable-next-line no-unused-vars\nfunction initVersion()', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const context = { left, right, result: null };
  vm.runInNewContext(
    source.substring(start, end) +
      '\nresult = compareVersions(left, right);',
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
  assert.doesNotMatch(source, /myswiper\.on\('(?:slideChange|transitionEnd)\.screenswitcher'/);
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
  assert.match(
    source,
    /id: 'topbar_timeout',[\s\S]*?def: '5'/
  );
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
  assert.match(installDocs, /DASHTICZ_INSTALL_DIR=\/var\/www\/html\/my-dashboard/);
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
      else if (entry.isFile() && fullPath.endsWith('.json')) result.push(fullPath);
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
  const settingsSource = fs.readFileSync(path.join(root, 'js/settings.js'), 'utf8');
  const widgetEditor = fs.readFileSync(path.join(root, 'js/widgeteditor.js'), 'utf8');
  const deviceEditor = fs.readFileSync(path.join(root, 'js/deviceeditor.js'), 'utf8');
  const layoutEditor = fs.readFileSync(path.join(root, 'js/layouteditor.js'), 'utf8');
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

  for (const source of [settingsSource, widgetEditor, deviceEditor, layoutEditor, simpleBlock]) {
    assert.doesNotMatch(
      source,
      /Wizard gebruikt|Tegel verwijderd|Geen tegels|Devices toevoegen|Widgets toevoegen|Tegels verplaatsen|Custom iconen topbalk|Aan: Custom iconen/
    );
  }
  assert.match(layoutEditor, /language\.settings\.layouteditor/);
  assert.match(deviceEditor, /language\.settings\.deviceeditor/);
  assert.match(simpleBlock, /function _showConfigModeWarning\(mode, onContinue\)/);
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
      source.matchAll(/(?:href|src|content)="(img\/favicon\/[^"?]+)(?:\?[^\"]*)?"/g),
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
  assert.equal(runtimeVersion, packageVersion);
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
  const domoticz = fs.readFileSync(path.join(root, 'js/domoticz-api.js'), 'utf8');
  const loader = fs.readFileSync(path.join(root, 'js/loader.js'), 'utf8');
  const camera = fs.readFileSync(path.join(root, 'js/components/camera.js'), 'utf8');

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
  assert.doesNotMatch(
    styles,
    /\.colbar\s*\{[^}]*display:\s*flex !important;/s
  );
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
  const editor = fs.readFileSync(
    path.join(root, 'js/layouteditor.js'),
    'utf8'
  );
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
  assert.match(editor, /dle-config-button/);
  assert.match(editor, /function _openItemConfig/);
  assert.match(editor, /DashticzDeviceEditor\.openConfig\(item\.reference\)/);
  assert.match(editor, /DashticzWidgetEditor\.openLayoutConfig\(item\.widgetId\)/);
  assert.match(deviceEditor, /function openConfig\(reference\)/);
  assert.match(
    domoticzBlock,
    /document\.body\.classList\.contains\('dle-active'\)\) return;/
  );
  assert.match(stylesheet, /> \.dle-block \{[\s\S]*height: 100% !important;/);
  const blocksSource = fs.readFileSync(path.join(root, 'js/blocks.js'), 'utf8');
  assert.match(blocksSource, /children\('\.dle-overlay'\)\.detach\(\)/);
  assert.match(blocksSource, /var oldLayoutEditorBlocks = \$div\.toArray\(\)/);
  assert.match(blocksSource, /DashticzLayoutEditor\.replaceBlockReference\(oldBlock, newBlock\)/);
  assert.match(editor, /function replaceBlockReference\(oldBlock, newBlock\)/);
  assert.match(editor, /original\.block = newBlock/);
  assert.match(editor, /replaceBlockReference: replaceBlockReference/);
  assert.match(editor, /\$editingScreen[\s\S]*find\('\.dle-overlay'\)[\s\S]*remove\(\)/);
  assert.match(editor, /js\/savewidgets\.php/);
  assert.match(editor, /js\/savelayout\.php/);
  assert.match(editor, /js\/savegridlayout\.php/);
  assert.match(editor, /function _collectGridItems/);
  assert.match(editor, /function convertCurrentScreenToGrid/);
  assert.match(editor, /function _buildColumnGridConversion/);
  assert.match(editor, /function _emptyGridConversion/);
  assert.match(editor, /var allowEmpty = targetMode === 'wizard'/);
  assert.match(editor, /if \(allowEmpty\) return _emptyGridConversion\(screenNumber\)/);
  assert.match(editor, /convertCurrentScreenToGrid\(false, 'wizard'\)/);
  assert.match(editor, /if \(gridCollectionError\) \{/);
  assert.doesNotMatch(editor, /gridCollectionError \|\| !items\.length/);
  assert.match(editor, /function _firstFreeGridPosition/);
  assert.match(editor, /function _moveGridItem/);
  assert.match(editor, /function _resizeGridItem/);
  assert.match(editor, /function _saveGrid/);
  assert.match(editor, /--dt-grid-x/);
  assert.match(editor, /--dt-grid-h/);
  assert.match(simpleBlock, /_showConfigModeWarning\(mode, function \(\)/);
  assert.match(
    simpleBlock,
    /convertCurrentScreenToGrid\(\s*true,\s*'wizard'/
  );
  assert.match(editor, /widgetResult\.blockKeys/);
  assert.match(editor, /widget_alarmmeldingen: 'alarmmeldingen'/);
  assert.match(editor, /widgets\.push\(_widgetPayload\(item\)\)/);
  assert.match(editor, /definition\.rss \|\| 'https:\/\/www\.alarmeringen\.nl\/feeds\/all\.rss'/);
  assert.match(editor, /if \(definition\.filter\) entry\.filter = definition\.filter/);
  assert.match(editor, /_startDrag\(event, item, \$canvas\[0\]\)/);
  assert.match(editor, /\$\(item\.visibleBlocks\)[\s\S]*children\('\.dle-overlay'\)/);
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
  assert.doesNotMatch(deviceEditor, /entry\.key = gridRefs\[_deviceOrderKey\(ck\)\]/);
  assert.match(deviceEditor, /\$activeScreen\.find\('\[data-colindex\]'\)/);
  assert.match(deviceEditor, /screen: _activeScreenPayload\(\)/);
  assert.match(deviceEditor, /function _widgetFromReference/);
  assert.match(deviceEditor, /widget_alarmmeldingen:\s+\{ id: 'alarmmeldingen',\s+title: translatedTitles\.alarmmeldingen \}/);
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
  assert.match(blocksSource, /Object\.defineProperty\(block, '_dashticzAutoTitle'/);
  assert.match(blocksSource, /value: typeof block\.title === 'undefined'/);
  assert.match(blocksSource, /Object\.defineProperty\(block, 'title',[\s\S]*value: device\.Name[\s\S]*enumerable: false/);
});

test('screen editor add menu exposes device, widget, custom-device and separator workflows', () => {
  const simpleBlock = fs.readFileSync(path.join(root, 'js/components/simpleblock.js'), 'utf8');
  const screenSwitcher = fs.readFileSync(path.join(root, 'js/screenswitcher.js'), 'utf8');
  const editor = fs.readFileSync(path.join(root, 'js/deviceeditor.js'), 'utf8');
  const writer = fs.readFileSync(path.join(root, 'js/configwriter.php'), 'utf8');
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
  assert.match(simpleBlock, /\$popup\.find\('\.dt-screeneditor-add-tile'\)\.prop\('disabled', true\)/);
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
  assert.match(editor, /\$rows\.last\(\)\.find\('\.cd-custom-field-add'\)\.removeClass\('d-none'\)/);
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
    assert.ok(translations.settings.deviceeditor.custom_devices, `${locale} custom devices translation`);
    assert.ok(translations.settings.deviceeditor.custom_device_name, `${locale} custom device name translation`);
    assert.ok(translations.settings.deviceeditor.custom_device_options, `${locale} custom device options translation`);
    assert.ok(translations.settings.deviceeditor.separator, `${locale} separator translation`);
    assert.ok(translations.settings.widgeteditor.add_menu_title, `${locale} add-menu translation`);
    assert.ok(translations.settings.widgeteditor.add_device, `${locale} add-device translation`);
    assert.ok(translations.settings.widgeteditor.devices, `${locale} devices tile translation`);
    assert.ok(translations.settings.config_mode.warning_title, `${locale} mode-warning title translation`);
    assert.ok(translations.settings.config_mode.confirm_wizard, `${locale} Wizard warning translation`);
    assert.ok(translations.settings.config_mode.confirm_custom, `${locale} Custom warning translation`);
    assert.ok(translations.settings.config_mode.cancel, `${locale} warning cancel translation`);
    assert.ok(translations.settings.config_mode.continue, `${locale} warning continue translation`);
    assert.ok(translations.settings.theme.custom_css_active, `${locale} custom-css status translation`);
    assert.ok(translations.settings.layouteditor.configure_device, `${locale} configure-device translation`);
    assert.ok(translations.settings.layouteditor.configure_widget, `${locale} configure-widget translation`);
    assert.ok(translations.settings.widgeteditor.custom_devices, `${locale} custom-device tile translation`);
    assert.ok(translations.settings.widgeteditor.separator, `${locale} separator tile translation`);
    for (const key of [
      'calendar_source', 'calendar_default_name', 'calendar_name',
      'calendar_color', 'calendar_add', 'calendar_remove',
      'calendar_name_required', 'calendar_duplicate_name',
      'calendar_needs_source', 'invalid_calendar_url',
    ]) {
      assert.ok(translations.settings.widgeteditor[key], `${locale} ${key} translation`);
    }
  }
});

test('device and widget config editors share full widget config and preserve hidden device fields', () => {
  const deviceEditor = fs.readFileSync(path.join(root, 'js/deviceeditor.js'), 'utf8');
  const widgetEditor = fs.readFileSync(path.join(root, 'js/widgeteditor.js'), 'utf8');
  const saveBlocks = fs.readFileSync(path.join(root, 'js/saveblocks.php'), 'utf8');
  const configWriter = fs.readFileSync(path.join(root, 'js/configwriter.php'), 'utf8');
  const layoutEditor = fs.readFileSync(path.join(root, 'js/layouteditor.js'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
  const settings = fs.readFileSync(path.join(root, 'js/settings.js'), 'utf8');
  const blocksSource = fs.readFileSync(path.join(root, 'js/blocks.js'), 'utf8');
  const simpleBlock = fs.readFileSync(path.join(root, 'js/components/simpleblock.js'), 'utf8');
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

  // Device Config is exactly Icon/Data/Update, centered on one row (Icon only
  // for a separator/title bar, which has no data value or last-update of its own).
  assert.match(deviceEditor, /isTitle \? \['icon'\] : \['icon', 'hide_data', 'last_update'\]/);
  assert.match(deviceEditor, /configOptions\.forEach/);
  assert.match(deviceEditor, /option === 'hide_data' \? options\.hide_data !== true/);
  assert.match(deviceEditor, /updated\[option\] = option === 'hide_data' \? !checked : checked/);
  assert.match(widgetEditor, /options\.hide_data !== true/);
  assert.match(widgetEditor, /hide_data: !\$cfgModal\.find\('\[data-block-option="hide_data"\]'\)\.is\(':checked'\)/);
  assert.match(deviceEditor, /de-config-options-three/);
  assert.match(styles, /\.de-config-options-three[\s\S]*grid-template-columns: repeat\(3/);
  assert.match(styles, /\.de-config-options \.form-check-input[\s\S]*width: 32px;[\s\S]*height: 32px;/);
  assert.match(deviceEditor, /icon: true, iconValue: null, hide_data: false, last_update: false/);
  assert.match(styles, /\.we-block-option\.form-check-input[\s\S]*width: 32px;[\s\S]*height: 32px;/);

  // Title is a system Field/Setting row and c is hidden while being preserved in the payload.
  assert.match(deviceEditor, /field: 'title'[\s\S]*system: true/);
  assert.match(deviceEditor, /Object\.prototype\.hasOwnProperty\.call\(definition, 'c'\)/);
  assert.doesNotMatch(blocksSource, /block\.c = c/);
  assert.match(blocksSource, /block\._dashticzColumn = c/);
  assert.match(simpleBlock, /me\.block\._dashticzColumn === 'bar'/);
  assert.match(deviceEditor, /preserved\.c = definition\.c/);
  assert.match(deviceEditor, /field === 'title' \|\| field === 'icon' \|\| field === 'c'/);
  assert.match(deviceEditor, /custom_fields = customFields/);
  assert.match(widgetEditor, /preservedFields\.c = definition\.c/);
  assert.match(widgetEditor, /entry\.custom_fields\[field\] = _encodeCustomSettingValue/);
  assert.match(widgetEditor, /field: 'title'[\s\S]*system: true/);

  // A custom icon is only applied through the top-level icon property while Icon is enabled.
  assert.match(deviceEditor, /updated\.icon !== true/);
  assert.match(deviceEditor, /t\.icon_requires_checkbox/);
  assert.match(deviceEditor, /options\.iconValue/);
  assert.match(deviceEditor, /entry\.icon = options\.iconValue/);
  assert.match(deviceEditor, /specialEntry\.icon = specialOptions\.iconValue/);

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
  assert.match(deviceEditor, /_esc\(t\.device_config\) \+ ' — ' \+ _esc\(displayName\)/);

  // Existing typed Field/Setting support remains in both editors and server validation stays active.
  assert.match(widgetEditor, /we-custom-field-name/);
  assert.match(widgetEditor, /we-custom-field-setting/);
  assert.match(widgetEditor, /function _parseCustomSetting/);
  assert.match(widgetEditor, /entry\.custom_fields/);
  // Stale editor-managed properties must never be posted as custom widget fields.
  assert.match(widgetEditor, /_isProtectedCustomWidgetProperty\(property\)/);
  assert.match(widgetEditor, /!rawSetting \|\| _isProtectedCustomWidgetProperty\(lowerField\)/);
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
  assert.match(layoutEditor, /DashticzDeviceEditor\.openConfig\(item\.reference\)/);

  // Any successfully loaded custom stylesheet is identified in the Theme panel.
  assert.match(main, /data-dashticz-custom-css/);
  assert.match(settings, /function bindThemeCustomCssNotice\(\)/);
  assert.match(settings, /themeLabels\.custom_css_active/);
  assert.match(styles, /\.settings-custom-css-notice[\s\S]*border: 2px solid #198754/);

  // Screen Editor controls share one explicit button and icon size.
  assert.match(styles, /\.dle-drag-icon,[\s\S]*\.dle-config-button[\s\S]*width: 32px;[\s\S]*height: 32px;/);
  assert.match(styles, /\.dle-remove-button[\s\S]*width: 32px;[\s\S]*height: 32px;/);
  assert.match(styles, /\.dle-remove-button \.fas[\s\S]*font-size: 16px !important/);
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
  const dashticz = fs.readFileSync(path.join(root, 'js/dashticz.js'), 'utf8');
  const settings = fs.readFileSync(path.join(root, 'js/settings.js'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');
  const weather = fs.readFileSync(
    path.join(root, 'js/components/weather.js'),
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
  assert.match(simpleBlock, /DT_function\.loadDTScript\('js\/widgeteditor\.js'\)/);
  assert.match(simpleBlock, /config-mode-btn/);
  assert.match(simpleBlock, /data-mode="custom"/);
  assert.match(simpleBlock, /data-mode="wizard"/);
  assert.match(settings, /widgetSettingTiles/);
  assert.match(settings, /isCustomConfigMode/);
  assert.match(settings, /setConfigMode/);
  assert.match(settings, /config_mode: 'wizard'/);
  assert.match(settings, /background_image: '\/img\/custom\/BG_Dashticz_bw\.png'/);
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
    assert.match(settings, new RegExp(`id: '${id}'`));
  }
  assert.doesNotMatch(settings, /settingList\['screen'\]\['security_button_icons'\]/);
  assert.doesNotMatch(settings, /settingList\['localize'\]\['gm_api'\]/);
  assert.doesNotMatch(settings, /settingList\['other'\]\['longfonds_zipcode'\]/);
  assert.doesNotMatch(settings, /settingList\.general = \{[^}]*default_news_url:/);
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
  assert.match(widgetEditor, /id="we-camera-add"/);
  assert.match(widgetEditor, /class="we-camera-row/);
  assert.match(widgetEditor, /weather:\s*\{[\s\S]*provider:/);
  assert.match(widgetEditor, /clock:\s*\{[\s\S]*clockType:\s*'basicclock'/);
  assert.match(widgetEditor, /calendar:\s*\{[\s\S]*sources:\s*\[_defaultCalendarSource\(0\)\]/);
  assert.match(widgetEditor, /function _normaliseCalendarSources/);
  assert.match(widgetEditor, /function _calendarSourcesObject/);
  assert.match(widgetEditor, /publictransport:\s*\{[\s\S]*provider:\s*'treinen'[\s\S]*station:\s*'UT'/);
  assert.match(widgetEditor, /alarmmeldingen:\s*\{[\s\S]*rss:\s*'https:\/\/www\.alarmeringen\.nl\/feeds\/all\.rss'[\s\S]*filter:\s*''/);
  assert.match(widgetEditor, /camera:\s*\{[\s\S]*cameras:\s*_defaultCameraConfigs\(\)/);
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
      new RegExp(`id: '${id}'[\\s\\S]*?width: ${width},[\\s\\S]*?height: ${height},`)
    );
  }
  assert.match(widgetEditor, /if \(item\.id === 'garbage'\) \{[\s\S]*entry\.displayTitle = _widgetTitle\(item\);/);
  assert.match(deviceEditor, /if \(widget\.id === 'garbage'\) \{[\s\S]*entry\.displayTitle = widget\.title;/);
  assert.match(layouteditor, /if \(item\.widgetId === 'garbage'\) \{[\s\S]*?entry\.displayTitle[\s\S]*?garbage_title/s);
  assert.match(savewidgets, /'garbage' => \['key' => 'widget_garbage', 'width' => 5, 'height' => 160\],/);
  assert.match(savewidgets, /\$id === 'garbage' && isset\(\$entry\['displayTitle'\]\)/);
  assert.match(savewidgets, /\$props\['title'\] = isset\(\$widget\['displayTitle'\]\) \? \$widget\['displayTitle'\] : 'Afval';/);
  assert.match(widgetEditor, /garbage_maxitems: _s\('garbage_maxitems', '4'\)/);
  assert.match(widgetEditor, /garbage_maxdays: _s\('garbage_maxdays', '32'\)/);
  assert.match(widgetEditor, /calendar_maxitems: _s\('calendar_maxitems', '15'\)/);
  assert.match(widgetEditor, /scaletofit: '300'/);
  assert.match(widgetEditor, /aspectratio: '0\.9'/);
  assert.match(widgetEditor, /delete entry\.iframeHeight/);
  assert.match(savewidgets, /unset\(\$props\['height'\]\)/);
  assert.equal(english.settings.garbage.garbage_maxdays, 'Maximum days ahead');
  assert.equal(dutch.settings.localize.calendar_maxitems, 'Zichtbare kalenderregels');
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
  assert.match(widgetEditor, /if \(!selectedWidgets\[item\.widgetId\]\) return/);
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
  assert.match(widgetEditor, /xmltvguide:\s*\{[\s\S]*xmltvurl:\s*_s\('xmltv_url'\)[\s\S]*layout:\s*_s\('xmltv_layout', '0'\)[\s\S]*separator:\s*_s\('xmltv_separator', '-'\)[\s\S]*refresh:\s*_s\('xmltv_refresh', '3600'\)/);
  assert.match(widgetEditor, /data-cfg-key="xmltv_layout"/);
  assert.match(widgetEditor, /data-cfg-key="xmltv_separator"/);
  assert.match(widgetEditor, /data-cfg-key="xmltv_refresh"/);
  assert.match(widgetEditor, /configSettings\.xmltv_url = widgetConfigs\.xmltvguide\.xmltvurl \|\| '';/);
  assert.match(widgetEditor, /configSettings\.xmltv_layout = widgetConfigs\.xmltvguide\.layout \|\| '0';/);
  assert.match(widgetEditor, /configSettings\.xmltv_refresh = widgetConfigs\.xmltvguide\.refresh \|\| '3600';/);
  assert.match(widgetEditor, /entry\.layout = parseInt\(xcfg\.layout, 10\) === 1 \? 1 : 0;/);
  assert.match(widgetEditor, /entry\.separator = xcfg\.separator \|\| '-';/);
  assert.match(widgetEditor, /entry\.refresh = parseInt\(xcfg\.refresh, 10\) \|\| 3600;/);
  // _hydrateGridWidget must read back layout, separator and refresh so reopening
  // the settings popup shows the previously saved values in grid mode.
  assert.match(widgetEditor, /item\.id === 'xmltvguide'[\s\S]*widgetConfigs\.xmltvguide\.layout[\s\S]*widgetConfigs\.xmltvguide\.separator[\s\S]*widgetConfigs\.xmltvguide\.refresh/s);
  assert.match(layouteditor, /item\.widgetId === 'xmltvguide'[\s\S]*settings\['xmltv_url'\][\s\S]*settings\['xmltv_layout'\][\s\S]*settings\['xmltv_refresh'\]/s);
  assert.match(savewidgets, /'xmltv_url'\s*=>\s*'string'/);
  assert.match(savewidgets, /\$id === 'xmltvguide'[\s\S]*\$widget\['layout'\][\s\S]*\$widget\['separator'\][\s\S]*\$widget\['refresh'\]/s);
  assert.match(savewidgets, /case 'xmltvguide':[\s\S]*\$props\['type'\] = 'xmltvguide';[\s\S]*\$props\['title'\] = 'TV Guide';/s);
  // savegridlayout must prefer $allBlockLines over $existingGridBlocks so that a
  // URL change saved by savewidgets.php (blocksOnly) is not silently discarded
  // when savegridlayout.php runs immediately afterwards.
  assert.match(savegridlayout, /isset\(\$allBlockLines\[[\s\S]*?\$propsLiteral = \$allBlockLines\[[\s\S]*?isset\(\$existingGridBlocks\[/s);
});

test('XMLTV grid tiles fit complete rows without an internal scrollbar', () => {
  const component = fs.readFileSync(
    path.join(root, 'js/components/xmltvguide.js'),
    'utf8'
  );
  const css = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');

  assert.match(component, /new ResizeObserver\(function \(\) \{[\s\S]*_fitXmltvRows\(me\)/);
  assert.match(component, /function _fitXmltvRows\(me\)/);
  assert.match(component, /getBoundingClientRect\(\)\.bottom > availableBottom/);
  assert.match(css, /> \.xmltvguide \{[\s\S]*height: 100% !important;[\s\S]*overflow: hidden !important;/);
  assert.match(css, /\.xmltvguide \.dt_state \{[\s\S]*overflow: hidden !important;/);
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
  assert.match(source, /updateTime\(\);\s*Dashticz\.setInterval/);
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
  assert.match(basicClock, /maxFontSize: 42/);
  assert.match(basicClock, /Math\.min\(fontSize, me\.block\.maxFontSize\)/);
  assert.match(stationClock, /function clockFitSize/);
  assert.match(stationClock, /if \(me\.block\.maxSize\)/);
  assert.match(stationClock, /var width = clockFitSize\(me, 120\)/);
  assert.match(flipClock, /minEmSize: 3\.5/);
  assert.match(flipClock, /maxEmSize: 7/);
  assert.match(flipClock, /FlipClock\(\$content, 0,/);
  assert.match(flipClock, /showSeconds: !settings\['hide_seconds'\]/);
  assert.doesNotMatch(flipClock, /showSecoonds/);
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
  const settingsSource = fs.readFileSync(path.join(root, 'js/settings.js'), 'utf8');

  // Verify the auto-detect logic is present in the source.
  assert.match(settingsSource, /_configModeAutoDetected/);
  assert.match(settingsSource, /typeof config\['config_mode'\] === 'undefined'/);
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
    return { settings: ctx.settings, autoDetected: ctx._configModeAutoDetected };
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
  const source = fs.readFileSync(path.join(root, 'js/configwriter.php'), 'utf8');

  assert.match(source, /\/\/ \[standby-editor-start\]/);
  assert.match(source, /\/\/ \[standby-editor-end\]/);
  assert.match(source, /configwriter_strip_legacy_columns_standby\(\\?\$config\)/);
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
  assert.match(bootstrapStyles, /data-toggle="buttons"/);
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
  const switchSource = fs.readFileSync(path.join(root, 'js/switches.js'), 'utf8');
  const editorSource = fs.readFileSync(path.join(root, 'js/deviceeditor.js'), 'utf8');

  assert.match(blockSource, /if \(!block\['hide_data'\]\) \{/);
  assert.doesNotMatch(blockSource, /settings\['theme'\] === 'modern-dark'/);
  assert.doesNotMatch(switchSource, /blocks\['hide_data'\]/);
  assert.match(editorSource, /hide_data: configured\.hide_data === true/);
  assert.match(editorSource, /entry\.hide_data = options\.hide_data === true/);
});

test('calendar editor behavior is documented without a version bump', () => {
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const changes = fs.readFileSync(path.join(root, 'CHANGES.md'), 'utf8');

  assert.match(readme, /Calendar Widget Config shows every source/);
  assert.match(readme, /Personal: \{ ics:/);
  assert.match(readme, /holidayurl/);
  assert.match(readme, /property `c`/);
  assert.match(readme, /framed active-stylesheet notice/);
  assert.match(changes, /repeatable named calendar sources/);
  assert.match(changes, /single-string and legacy `calendars` formats remain readable/);
  assert.match(changes, /Hidden compatibility property `c`/);
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
  assert.match(theme, /--block-gap: 3px/);
  assert.match(theme, /--border-color-inactive: rgba\(42, 94, 151, \.5\)/);
  assert.match(theme, /--border-color-active: rgba\(112, 160, 218, \.5\)/);
  assert.match(theme, /--border-color-block: rgba\(112, 160, 218, \.2\)/);
  assert.match(theme, /--border-color-selector: var\(--border-color-inactive\)/);
  assert.match(theme, /border: var\(--block-gap\) solid transparent !important/);
  assert.match(theme, /inset 0 0 0 var\(--main-border-width\) var\(--border-color-block\)/);
  assert.match(theme, /--radius-border: 16px/);
  assert.match(theme, /\.transbg \.btn[\s\S]*border: 1px solid var\(--border-color-inactive\) !important/);
  assert.match(theme, /\.transbg \.selector-buttons \.btn/);
  assert.match(theme, /min-width: 56px/);
  assert.match(theme, /min-height: 44px/);
  assert.match(theme, /font-size: 18px !important/);
  assert.match(theme, /\.transbg \.btn\.active/);
  assert.match(theme, /border-color: var\(--border-color-active\) !important/);
  assert.match(theme, /\.transbg select/);
  assert.match(theme, /\.transbg select[\s\S]*border: 1px solid var\(--border-color-selector\) !important/);
  assert.match(theme, /\.transbg \.col-data > select/);
  assert.match(theme, /\.transbg \.col-data > select[\s\S]*min-height: 44px/);
  assert.match(theme, /\.transbg select:focus,[\s\S]*border-color: var\(--border-color-selector\) !important/);
  assert.doesNotMatch(theme, /linear-gradient/);
  assert.match(theme, /\.mh \.btn\.active/);
  assert.match(
    theme,
    /\.transbg\.titlegroups,[\s\S]*height: var\(--height-block-default\) !important[\s\S]*min-height: var\(--height-block-default\) !important/
  );
  assert.match(theme, /\.titlegroups \.dt_content,[\s\S]*justify-content: flex-start !important/);
  assert.match(theme, /\.titlegroups \.dt_title,[\s\S]*text-align: left !important/);
  assert.match(theme, /\.trash \.state \{[\s\S]*text-align: right !important/);
  assert.match(theme, /\.trash \.state table \{[\s\S]*margin-left: auto !important/);
  assert.match(theme, /\.trash \.trashtype,[\s\S]*\.trash \.trashdate \{[\s\S]*text-align: right !important/);
  assert.match(theme, /\.titlegroups \.dt_state,[\s\S]*display: none !important/);
  assert.match(theme, /\.transbg\.titlegroups/);
  assert.match(theme, /\.titlegroups[\s\S]*background: var\(--main-bg\) !important/);
  assert.match(theme, /\.titlegroups[\s\S]*border: var\(--block-gap\) solid transparent !important/);
  assert.match(theme, /\.titlegroups[\s\S]*border-radius: var\(--radius-border\) !important/);
  assert.match(theme, /\.colbar \.miniclock[\s\S]*background: transparent !important/);
  assert.doesNotMatch(theme, /^\.miniclock\s*\{[^}]*background:/m);
  assert.match(theme, /\.titlegroups[\s\S]*var\(--panel-shadow\) !important/);
  assert.match(theme, /\.titlegroups \.col-icon img\.icon/);
  assert.match(theme, /@media \(max-width: 767\.98px\)/);
  assert.match(theme, /\.standby \.transbg[\s\S]*background: #000 !important/);
  assert.match(theme, /\.standby \.transbg[\s\S]*border: 0 !important/);
  assert.match(theme, /\.standby \.transbg[\s\S]*backdrop-filter: none !important/);
  assert.doesNotMatch(theme, /https?:\/\//i);
  assert.doesNotMatch(theme, /url\s*\(/i);
  assert.match(readme, /config\['theme'\] = 'modern-dark'/);
});

test('settings modal uses compact Bootstrap 5 controls and aligned help icons', () => {
  const settings = fs.readFileSync(path.join(root, 'js/settings.js'), 'utf8');
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
  assert.doesNotMatch(styles, /\.material-switch/);
});

test('settings theme selector loads valid installed themes', () => {
  const settings = fs.readFileSync(path.join(root, 'js/settings.js'), 'utf8');

  assert.match(
    settings,
    /settingList\['theme'\].*theme.*type.*'select'/s
  );
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

  assert.match(styles, /\.standby \.screenstandby \.fas[\s\S]*color: var\(--text-light\) !important;/);
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
  const writer = fs.readFileSync(path.join(root, 'js/configwriter.php'), 'utf8');

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
  assert.match(switcher, /\.dt-screen-delete'[\s\S]*\.prop\('disabled', !canDelete\)/);
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
  assert.match(styles, /body\.standby-edit \.dt-screen-switcher-bar\.is-visible/);
  assert.match(switcher, /mountEditorIcons\(\$bar\)/);
  assert.match(switcher, /setStandbyBarVisible/);
  assert.match(switcher, /bindStandbyBarHover/);
  assert.match(switcher, /clientY\s*<\s*56/);
});

test('topbar and layout editor keep controls usable', () => {
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');
  const editor = fs.readFileSync(path.join(root, 'js/layouteditor.js'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
  const blocks = fs.readFileSync(path.join(root, 'js/blocks.js'), 'utf8');
  const simpleblock = fs.readFileSync(
    path.join(root, 'js/components/simpleblock.js'),
    'utf8'
  );

  assert.match(styles, /\.colbar\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*nowrap;/s);
  assert.match(styles, /\.colbar \.logo\s*\{[^}]*flex:\s*0 1 auto;/s);
  assert.match(styles, /\.colbar\.transbg\s*\{[^}]*padding-top:\s*8px;[^}]*padding-bottom:\s*6px;[^}]*border:\s*3px solid transparent;/s);
  assert.match(styles, /\.colbar \.miniclock\s*\{[^}]*flex:\s*1 1 auto;[^}]*height:\s*40px !important;/s);
  assert.match(styles, /\.colbar \.miniclock\s*\{[^}]*background:\s*transparent !important;[^}]*box-shadow:\s*none !important;/s);
  assert.match(simpleblock, /data-id="miniclock" class="miniclock mh dt_block transbg col-xs-/);
  assert.match(styles, /\.colbar \.dt-screen-switcher-host\s*\{[^}]*order:\s*99;[^}]*margin-left:\s*auto;/s);
  assert.match(styles, /\.colbar \.topbar-settings-wrap\s*\{[^}]*order:\s*100;[^}]*flex:\s*0 0 auto;/s);
  assert.match(blocks, /dt-topbar-item dt-topbar-/);
  assert.match(main, /\['logo', 'miniclock', 'screenswitcher', 'settings'\]/);
  assert.match(editor, /var MIN_GRID_WIDTH = 2;/);
  assert.match(editor, /var MIN_GRID_HEIGHT = 4;/);
  assert.match(editor, /var MIN_TITLE_GRID_HEIGHT = 3;/);
  assert.match(editor, /var MIN_MINICLOCK_GRID_HEIGHT = 2;/);
  assert.match(editor, /function _minimumGridHeight/);
  assert.match(editor, /type === 'miniclock'\) return MIN_MINICLOCK_GRID_HEIGHT;/);
  assert.match(editor, /item\.grid\.w < MIN_GRID_WIDTH \|\| item\.grid\.h < minimumHeight/);
  assert.match(editor, /width = Math\.max\(\s*MIN_GRID_WIDTH,/s);
  assert.match(editor, /height = Math\.max\(_minimumGridHeight\(item\),/);
  assert.match(
    styles,
    /\.dt-grid-screen > \.dt-grid-layout > \.dt-grid-item > \.titlegroups,[\s\S]*height: 100% !important;[\s\S]*min-height: 0 !important;[\s\S]*overflow: hidden !important;/
  );
});

test('garbage dates use the selected interface language', () => {
  const garbage = fs.readFileSync(
    path.join(root, 'js/components/garbage.js'),
    'utf8'
  );

  assert.match(garbage, /garbage\.date\.locale\(settings\['language'\]\)/);
  assert.match(garbage, /localizedDate\.format\('dddd'\)/);
});


test('timegraph uses Chart.js 4 x/y time points', () => {
  const source = fs.readFileSync(
    path.join(root, 'js/components/timegraph.js'),
    'utf8'
  );

  assert.match(source, /\.data\[length - 1\]\.x = timestamp\.valueOf\(\)/);
  assert.match(source, /x: timestamp\.valueOf\(\)/);
  assert.match(source, /data\.x = timestamp\.valueOf\(\) \+ 10000/);
  assert.match(source, /var d = \{ y: data\.y, x: timestamp\.valueOf\(\) \+ 10000 \}/);
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
    assert.doesNotMatch(fs.readFileSync(path.join(root, file), 'utf8'), /\r\n/, file);
  }
});

test('device editor resubmits xmltvguide and iframe URLs so an unrelated device save cannot 400', () => {
  const deviceEditorSource = fs.readFileSync(path.join(root, 'js/deviceeditor.js'), 'utf8');

  const helperStart = deviceEditorSource.indexOf('function _copyDefinedWidgetProperties');
  const helperEnd = deviceEditorSource.indexOf('\n  }\n', helperStart) + '\n  }\n'.length;
  assert.notEqual(helperStart, -1, '_copyDefinedWidgetProperties not found');
  const helperSnippet = deviceEditorSource.substring(helperStart, helperEnd);

  const branchStart = deviceEditorSource.indexOf("if (widget.id === 'garbage') {");
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
