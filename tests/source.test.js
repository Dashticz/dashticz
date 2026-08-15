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

test('first-run setup hands off to the Custom/Wizard mode picker after reload', () => {
  const main = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
  const simpleBlock = fs.readFileSync(
    path.join(root, 'js/components/simpleblock.js'),
    'utf8'
  );

  const saveHandler = main.slice(main.indexOf("$('#dt-setup-save').on('click'"));
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
  assert.match(simpleBlock, /if \(mode === currentMode\) \{\s*\n\s*_closeConfigModePicker\(\);/);
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
    assert.ok(translations.settings.config_mode.picker_title, `${locale} mode-picker title translation`);
    assert.ok(translations.settings.config_mode.custom_mode, `${locale} Custom mode tile title translation`);
    assert.ok(translations.settings.config_mode.wizard_mode, `${locale} Wizard mode tile title translation`);
    assert.ok(translations.settings.config_mode.custom_mode_desc, `${locale} Custom mode tile description translation`);
    assert.ok(translations.settings.config_mode.wizard_mode_desc, `${locale} Wizard mode tile description translation`);
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

  // Device Config is Icon/Data/Update/Dial/Title, centered on one row (Icon and
  // Title only for a separator/title bar, which has no data value or
  // last-update of its own). Title visibility is a checkbox here too, not
  // just a typed Field/Setting row: it toggles hide_title exactly like the
  // Widget Config editor's Title checkbox does.
  assert.match(deviceEditor, /\? \['icon', 'show_title'\]/);
  assert.match(deviceEditor, /: \['icon', 'hide_data', 'last_update', 'dial', 'show_title'\]/);
  assert.match(deviceEditor, /configOptions\.forEach/);
  assert.match(deviceEditor, /if \(option === 'hide_data'\) \{\s*\n\s*checked = options\.hide_data !== true/);
  assert.match(deviceEditor, /isSpecial \? special\.showTitle !== false : deviceTitleVisible\[ck\] !== false/);
  assert.match(deviceEditor, /updated\[option\] = option === 'hide_data' \? !checked : checked/);
  assert.match(deviceEditor, /var pendingShowTitle = updated\.show_title !== false/);
  assert.match(deviceEditor, /special\.showTitle = pendingShowTitle/);
  assert.match(deviceEditor, /deviceTitleVisible\[ck\] = pendingShowTitle/);
  assert.match(widgetEditor, /options\.hide_data !== true/);
  assert.match(widgetEditor, /hide_data: !\$cfgModal\.find\('\[data-block-option="hide_data"\]'\)\.is\(':checked'\)/);
  assert.match(deviceEditor, /de-config-options-five/);
  assert.match(styles, /\.de-config-options-three[\s\S]*grid-template-columns: repeat\(3/);
  assert.match(styles, /\.de-config-options-four[\s\S]*grid-template-columns: repeat\(4/);
  assert.match(styles, /\.de-config-options-five[\s\S]*grid-template-columns: repeat\(5/);
  assert.match(styles, /\.de-config-options \.form-check-input[\s\S]*width: 32px;[\s\S]*height: 32px;/);
  assert.match(deviceEditor, /icon: true, iconValue: null, hide_data: false, last_update: false/);
  assert.match(styles, /\.we-block-option\.form-check-input[\s\S]*width: 32px;[\s\S]*height: 32px;/);

  // Dial checkbox: writes type:'dial' into CONFIG.js (the only way to render a
  // device as a dial block; a hand-typed 'type' custom field stays rejected as
  // reserved), and round-trips back into the checkbox when re-opening Device Config.
  assert.match(deviceEditor, /dial: definition\.type === 'dial'/);
  assert.match(deviceEditor, /dial: configured\.type === 'dial'/);
  assert.match(deviceEditor, /if \(specialOptions\.dial === true\) specialEntry\.type = 'dial'/);
  assert.match(deviceEditor, /if \(options\.dial === true\) \{\s*\n[\s\S]*?entry\.type = 'dial';\s*\n\s*\} else if \(p\.subidx\) \{\s*\n\s*entry\.subidx = p\.subidx;\s*\n\s*\}/);
  assert.match(
    deviceEditor,
    /\(!definition\.type \|\| definition\.type === 'dial' \|\| definition\.type === reference\) &&\s*\n\s*parseInt\(definition\.idx, 10\) > 0/
  );
  assert.match(saveBlocks, /function _dashticz_editor_block_type\(\$entry\)/);
  assert.match(saveBlocks, /'type' => _dashticz_editor_block_type\(\$entry\)/);
  assert.match(configWriter, /if \(!empty\(\$device\['type'\]\)\) \{\s*\n\s*\$props\['type'\] = \(string\)\$device\['type'\];/);

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
  // New iframe widgets default to no scaling/aspect ratio so they simply
  // fill the tile's own width/height; existing saved blocks with explicit
  // values keep working via the hydration path below.
  assert.match(widgetEditor, /scaletofit: '',/);
  assert.match(widgetEditor, /aspectratio: '',/);
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
  assert.match(flipClock, /FlipClock\(\$state, 0,/);
  assert.match(flipClock, /showSeconds: !settings\['hide_seconds'\]/);
  assert.doesNotMatch(flipClock, /showSecoonds/);
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
  assert.doesNotMatch(basicClock, /\$\(me\.mountPoint \+ ' \.dt_content'\)\.html\(/);
  assert.match(stationClock, /\$\(me\.mountPoint \+ ' \.dt_state'\)\.html\(/);
  assert.doesNotMatch(stationClock, /\$\(me\.mountPoint \+ ' \.dt_content'\)\.html\(/);
  assert.match(flipClock, /FlipClock\(\$state, 0,/);
  assert.match(haymanClock, /\$\(me\.mountPoint \+ ' \.dt_state'\)\.html\(template\(me\.block\)\)/);
  assert.doesNotMatch(haymanClock, /\$\(me\.mountPoint \+ ' \.dt_block'\)\.html\(template/);
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
  assert.match(theme, /--block-gap: 0px/);
  assert.match(theme, /--border-color-inactive: rgba\(42, 94, 151, \.5\)/);
  assert.match(theme, /--border-color-active: rgba\(112, 160, 218, \.5\)/);
  assert.match(theme, /--border-color-block: rgba\(112, 160, 218, \.2\)/);
  assert.match(theme, /--border-color-selector: var\(--border-color-inactive\)/);
  assert.match(theme, /border: var\(--block-gap\) solid transparent !important/);
  assert.match(theme, /inset 0 0 0 var\(--main-border-width\) var\(--border-color-block\)/);
  assert.match(theme, /--radius-border: 16px/);
  assert.match(theme, /\.transbg \.btn[\s\S]*border: 1px solid var\(--border-color-inactive\) !important/);
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
  // Lowered from 4 to 2 rows: the editor overlay's controls already rely on
  // `overflow: visible` to stay clickable on a very small item, and 2 rows
  // was already proven safe for miniclock, which no longer needs its own
  // separate (now-redundant) minimum.
  assert.match(editor, /var MIN_GRID_HEIGHT = 2;/);
  assert.match(editor, /var MIN_TITLE_GRID_HEIGHT = 3;/);
  assert.doesNotMatch(editor, /MIN_MINICLOCK_GRID_HEIGHT/);
  assert.match(editor, /function _minimumGridHeight/);
  assert.match(editor, /type === 'blocktitle'\) return MIN_TITLE_GRID_HEIGHT;/);
  assert.match(editor, /item\.grid\.w < MIN_GRID_WIDTH \|\| item\.grid\.h < minimumHeight/);
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
    /\.dt-grid-screen > \.dt-grid-layout > \.dt-grid-item > \.sunriseholder\s*\{[^}]*min-height:\s*100%;[^}]*display:\s*flex;[^}]*align-items:\s*center;[^}]*justify-content:\s*center;/s
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

test('Multi Device reuses the Custom Device engine and its per-value idx fallback', () => {
  const deviceEditor = fs.readFileSync(path.join(root, 'js/deviceeditor.js'), 'utf8');
  const simpleBlock = fs.readFileSync(path.join(root, 'js/components/simpleblock.js'), 'utf8');
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
  const widgetEditor = fs.readFileSync(path.join(root, 'js/widgeteditor.js'), 'utf8');
  const layoutEditor = fs.readFileSync(path.join(root, 'js/layouteditor.js'), 'utf8');
  const savewidgets = fs.readFileSync(path.join(root, 'js/savewidgets.php'), 'utf8');
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
  assert.match(widgetEditor, /entry\.tracks = \(widgetConfigs\.radio \|\| \{\}\)\.tracks/);
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
  const deviceEditor = fs.readFileSync(path.join(root, 'js/deviceeditor.js'), 'utf8');
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
  const runStart = frameSource.indexOf('run: function(me) {');
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
  const widgetEditor = fs.readFileSync(path.join(root, 'js/widgeteditor.js'), 'utf8');
  const layoutEditor = fs.readFileSync(path.join(root, 'js/layouteditor.js'), 'utf8');
  const deviceEditor = fs.readFileSync(path.join(root, 'js/deviceeditor.js'), 'utf8');
  const savewidgets = fs.readFileSync(path.join(root, 'js/savewidgets.php'), 'utf8');
  const logSource = fs.readFileSync(path.join(root, 'js/components/log.js'), 'utf8');
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
  assert.match(renderSunriseBody, /var showTitle = !me\.block\.hide_title && me\.block\.title;/);
  assert.match(renderSunriseBody, /class="sunrise-header"/);
  assert.match(renderSunriseBody, /class="title">'\s*\+\s*me\.block\.title/);
  // A hand-written/legacy Sunrise block without `icon` must retain its old
  // iconless appearance. Newly added Editor widgets still get the catalog
  // icon, but it is persisted explicitly instead of becoming a runtime
  // default for every existing CONFIG.js.
  assert.doesNotMatch(simpleBlockSource, /cfg\.icon = 'fas fa-sun'/);
  assert.match(widgetEditor, /item\.id === 'iframe' \|\| item\.id === 'sunrise'/);
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
  assert.match(renderSunriseBody, /if \(hasHeader\) classes \+= ' sunrise-has-header';/);
  assert.match(
    styles,
    /\.sunriseholder\.sunrise-has-header \{\s*\n\s*justify-content: flex-start;/
  );

  // OWM and Timegraph use the standard 'widget_' catalog key convention with
  // an explicit type, like weather/iframe/xmltvguide.
  assert.match(widgetEditor, /id: 'owm',\s*\n\s*blockKey: 'widget_owmwidget'/);
  assert.match(widgetEditor, /id: 'timegraph',\s*\n\s*blockKey: 'widget_timegraph'/);
  assert.match(savewidgets, /'owm' => \['key' => 'widget_owmwidget'/);
  assert.match(savewidgets, /'timegraph' => \['key' => 'widget_timegraph'/);
  assert.match(savewidgets, /case 'owm':[\s\S]*?\$props\['type'\] = 'owmwidget';/);
  assert.match(savewidgets, /case 'timegraph':[\s\S]*?\$props\['type'\] = 'timegraph';/);

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
    fs.readFileSync(path.join(root, 'docs/blocks/specials/timegraph.rst'), 'utf8'),
    /xTicks\s*\n\s*- \| Number of labels on the x-axis[\s\S]*?xTicks\s*\n\s*- \| Number of labels on the y-axis/
  );

  // A Timegraph value row without its own idx falls back to the block's main
  // idx (see DT_timegraph.run: newValue = {idx: me.idx, ...}; $.extend(newValue, value)
  // only overwrites idx when the row itself set one).
  assert.match(timegraphSource, /me\.idx = isDefined\(me\.block\.idx\) \? me\.block\.idx : me\.key/);
  assert.match(widgetEditor, /if \(row\.idx\) valueEntry\.idx = parseInt\(row\.idx, 10\);/);

  // Multiple values, each optionally from its own device, must remain
  // supported (not just a single 'values: [\"Temp\"]' array) — the dynamic
  // value-row repeater with no artificial row limit.
  assert.match(widgetEditor, /we-timegraph-value-add/);
  assert.match(widgetEditor, /we-timegraph-value-remove/);
  assert.match(widgetEditor, /_timegraphValueRowHtml/);

  // Timegraph's own 'values' array is edited through the dedicated repeater,
  // so it must be a managed property (not also shown as raw JSON in Custom fields).
  assert.match(widgetEditor, /timegraph: \{\s*\n\s*duration: true, xTicks: true, yTicks: true, xLabels: true,/);

  // savewidgets.php accepts both the simple string form (values: ['NettUsage'])
  // and the {idx, value, label} object form for combining several devices.
  assert.match(savewidgets, /if \(is_string\(\$tgValue\)\) \{/);
  assert.match(savewidgets, /\} elseif \(is_array\(\$tgValue\)\) \{/);
  assert.match(savewidgets, /if \(isset\(\$tgValue\['idx'\]\) && is_numeric\(\$tgValue\['idx'\]\)\)/);

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
    assert.ok(we.timegraph_value_idx, `${locale} timegraph value idx translation`);
  }
});

test('Radio widget gets a default icon like other widgets (log, WAQI)', () => {
  const streamplayer = fs.readFileSync(
    path.join(root, 'js/components/streamplayer.js'),
    'utf8'
  );
  const logSource = fs.readFileSync(path.join(root, 'js/components/log.js'), 'utf8');
  const waqiSource = fs.readFileSync(path.join(root, 'js/components/waqi.js'), 'utf8');

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
  const widgetEditor = fs.readFileSync(path.join(root, 'js/widgeteditor.js'), 'utf8');

  // Same pattern as log/WAQI/Radio/iFrame: a freshly added Timegraph widget
  // had no icon in its title bar at all until one was typed into the Widget
  // Config editor's Icon custom field by hand. getBlockConfig (dashticz.js)
  // only overrides special.defaultCfg.icon once the block itself sets an
  // explicit icon (including icon:'' when the Icon checkbox is unchecked),
  // so baking a default into defaultCfg here is fully overridable as before.
  assert.match(timegraph, /defaultCfg: \{\s*\n\s*icon: 'fas fa-chart-line',/);
  // Matches the icon already used for Timegraph's own tile in the Widget
  // Config editor's "Add Widget" catalog.
  assert.match(widgetEditor, /id: 'timegraph',[\s\S]*?icon: 'fas fa-chart-line',/);
});

test('Google Maps widget gets a default icon like other widgets', () => {
  const map = fs.readFileSync(path.join(root, 'js/components/map.js'), 'utf8');
  const widgetEditor = fs.readFileSync(path.join(root, 'js/widgeteditor.js'), 'utf8');

  // Same pattern as log/WAQI/Radio/Timegraph/iFrame: a freshly added map
  // widget (showmap: true, the default) had no icon at all - defaultCfg only
  // set one for the showmap: false (route-only) branch - so checking Icon
  // with no custom value rendered nothing. Use the same icon already shown
  // for Google Maps in the Widget Config editor's "Add Widget" catalog.
  assert.match(map, /icon='fas fa-map-marked-alt'/);
  assert.match(widgetEditor, /id: 'map',[\s\S]*?icon: 'fas fa-map-marked-alt',/);
});

test('Domoticz log widget defaults to an 8x8 grid cell instead of a full-width strip', () => {
  const widgetEditor = fs.readFileSync(path.join(root, 'js/widgeteditor.js'), 'utf8');

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
  const widgetEditor = fs.readFileSync(path.join(root, 'js/widgeteditor.js'), 'utf8');
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
  const scalingBlockBody = frameSource.substring(scalingBlockStart, scalingBlockEnd);
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
  const configWriter = fs.readFileSync(path.join(root, 'js/configwriter.php'), 'utf8');
  const saveGridLayout = fs.readFileSync(path.join(root, 'js/savegridlayout.php'), 'utf8');
  const layoutEditor = fs.readFileSync(path.join(root, 'js/layouteditor.js'), 'utf8');
  const streamplayerSource = fs.readFileSync(
    path.join(root, 'js/components/streamplayer.js'),
    'utf8'
  );

  assert.doesNotMatch(streamplayerSource, /canHandle/);

  assert.match(configWriter, /function configwriter_is_component_dispatched_key\(\$key\)/);
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
  const configWriter = fs.readFileSync(path.join(root, 'js/configwriter.php'), 'utf8');
  const saveWidgets = fs.readFileSync(path.join(root, 'js/savewidgets.php'), 'utf8');

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
  const layoutEditor = fs.readFileSync(path.join(root, 'js/layouteditor.js'), 'utf8');
  const resolveBlockBody = layoutEditor.slice(
    layoutEditor.indexOf('function _resolveBlock('),
    layoutEditor.indexOf('function _widgetIdFromReference(')
  );
  const earlyWidgetCheckIndex = resolveBlockBody.indexOf('_widgetIdFromReference(ref, definition)');
  const idxDeviceFallbackIndex = resolveBlockBody.indexOf("String(rawIdx).match(/^(\\d+)(?:_(\\d+))?$/)");
  assert.ok(earlyWidgetCheckIndex > -1, 'expected _resolveBlock to call _widgetIdFromReference');
  assert.ok(idxDeviceFallbackIndex > -1, 'expected _resolveBlock to keep its idx-based device fallback');
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
  const deviceEditor = fs.readFileSync(path.join(root, 'js/deviceeditor.js'), 'utf8');
  const multiDevicePopup = deviceEditor.slice(
    deviceEditor.indexOf('function _showMultiDevicePopup('),
    deviceEditor.indexOf('function _showSlideButtonPopup(')
  );
  const customDevicePopup = deviceEditor.slice(
    deviceEditor.indexOf('function _showCustomDevicePopup('),
    deviceEditor.indexOf('function _showMultiDevicePopup(')
  );
  assert.match(multiDevicePopup, /iconValue: 'fas fa-layer-group',/);
  assert.match(customDevicePopup, /iconValue: iconValue \|\| 'fas fa-cube',/);
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
  const dialComponent = fs.readFileSync(path.join(root, 'js/components/dial.js'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');
  assert.doesNotMatch(dialComponent, /if \(height < 0\)/);
  assert.match(dialComponent, /if \(!height \|\| isNaN\(height\)\)/);
  assert.match(dialComponent, /me\.height = \(me\.height \|\| 100\) \* \(me\.block\.scale \|\| 1\);/);
  assert.match(styles, /\.dt_content \.dial \{[\s\S]*?font-size: 100px;/);
  assert.doesNotMatch(styles, /font-size: 240px;/);

  // The already-existing (but previously undocumented) block-level `scale`
  // multiplier is now documented as the supported way to fine-tune a dial's
  // size manually; it isn't a reserved custom-field name so it already
  // round-trips through the Device Editor's Custom fields with no code change.
  const deviceEditor = fs.readFileSync(path.join(root, 'js/deviceeditor.js'), 'utf8');
  const dialDocs = fs.readFileSync(path.join(root, 'docs/blocks/specials/dial.rst'), 'utf8');
  assert.match(dialDocs, /\* - scale/);
  assert.doesNotMatch(deviceEditor, /protectedCustomDeviceProperties = \{[^}]*\bscale: true\b/s);
});

test('Dial checkbox shows an inline hint pointing to the dial docs and Custom fields', () => {
  // Checking Dial only sets type:'dial'; every other dial parameter (color,
  // min/max, subtype, values, ...) still has to be added by hand via Custom
  // fields, so the popup surfaces a dismissable, non-blocking hint (an
  // inline alert rather than a stacked modal, so toggling the checkbox a
  // few times while experimenting doesn't spam the user with popups) that
  // only appears while Dial is checked and links to the dial docs.
  const deviceEditor = fs.readFileSync(path.join(root, 'js/deviceeditor.js'), 'utf8');
  assert.match(deviceEditor, /class="alert alert-info de-dial-hint d-none"/);
  assert.match(deviceEditor, /href="https:\/\/dashticz\.readthedocs\.io\/en\/beta\/blocks\/specials\/dial\.html"/);
  assert.match(deviceEditor, /function refreshDialHint\(\) \{/);
  assert.match(deviceEditor, /\$popup\.find\('\.de-dial-hint'\)\.toggleClass\('d-none', !enabled\)/);
  assert.match(deviceEditor, /\$popup\.on\('change', '\[data-option="dial"\]', refreshDialHint\)/);
  assert.match(deviceEditor, /dial_hint: '/);
  assert.match(deviceEditor, /dial_hint_link: '/);
});

test('Dial checkbox on a multi-value sub-device (e.g. Temp+Humidity) saves the base idx, not the sub-value idx (#118)', () => {
  // Add Device expands a multi-value Domoticz device (subCount > 1, e.g. a
  // combined Temp + Humidity sensor) into one row per value - idx "12_1",
  // "12_2" - so classic gauge/switch blocks can each bind to a single value
  // (_getAvailableDevices/_getSubValueCount). The Dial widget instead reads
  // the whole device to detect its type (js/components/dial.js make() reads
  // d.Type === 'Temp + Humidity' etc.), and DT_function.getDomoticzIdx can't
  // resolve a composite "12_1" idx to any device - it silently fell back to
  // a plain on/off switch instead of a gauge. Checking Dial on such a row
  // must therefore drop the subidx and save the plain base idx.
  const deviceEditor = fs.readFileSync(path.join(root, 'js/deviceeditor.js'), 'utf8');
  assert.match(
    deviceEditor,
    /if \(options\.dial === true\) \{[\s\S]*?entry\.type = 'dial';\s*\n\s*\} else if \(p\.subidx\) \{\s*\n\s*entry\.subidx = p\.subidx;\s*\n\s*\}/
  );
});

test('Dial face/content area fills more of the dial instead of leaving roomy margins', () => {
  // .dial-container/.dial-center were 90%/85%, leaving a very visible gap
  // before the ring. `.dial.fixed .dial-center` already ships at 95% with no
  // clipping against the ring/needle (sized independently in fixed em
  // fractions of .dial itself), so 93%/88% is a safe, still-conservative
  // tightening of the default (non-fixed, non-hover) dial content area.
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');
  assert.match(styles, /\.dial \.dial-container \{[\s\S]*?width: 93%;[\s\S]*?height: 93%;/);
  assert.match(styles, /\.dial \.dial-center \{[\s\S]*?width: 88%;[\s\S]*?height: 88%;/);
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
  const configWriter = fs.readFileSync(path.join(root, 'js/configwriter.php'), 'utf8');
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
  const dialComponent = fs.readFileSync(path.join(root, 'js/components/dial.js'), 'utf8');
  assert.match(dialComponent, /function _dialFitSize\(me\)/);
  assert.match(
    dialComponent,
    /var \$container = inGrid\s*\n\s*\? me\.\$mountPoint\s*\n\s*: \$\(me\.mountPoint \+ ' div'\)\.first\(\);/
  );
  assert.match(dialComponent, /var measuredWidth = parseInt\(\$container\.outerWidth\(\)\);/);
  assert.match(dialComponent, /var measuredHeight = parseInt\(\$container\.outerHeight\(\)\);/);
  assert.match(dialComponent, /var inGrid = me\.\$mountPoint && me\.\$mountPoint\.hasClass\('dt-grid-item'\);/);
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
  const dialComponent = fs.readFileSync(path.join(root, 'js/components/dial.js'), 'utf8');
  assert.match(dialComponent, /name: 'dial',/);
  assert.match(
    dialComponent,
    /\$\(me\.mountPoint \+ ' \.dt_content \.dial'\)\.css\('font-size', me\.fontsize \+ 'px'\)/
  );
  assert.match(dialComponent, /\$\(me\.mountPoint \+ ' \.dt_content \.dial-needle'\)\.css\(\{/);
  assert.doesNotMatch(dialComponent, /\$\(me\.mountPoint \+ ' \.dial'\)\.css\('font-size'/);

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
  const logSource = fs.readFileSync(path.join(root, 'js/components/log.js'), 'utf8');
  assert.doesNotMatch(
    logSource,
    /a\.message < b\.message \? 1 : a\.message > b\.message \? -1 : 0;\s*\n\s*\}\)/
  );
  assert.match(logSource, /var ascending = me\.block\.ascending !== false;/);

  const start = logSource.indexOf('function (a, b) {\n          if (a.message');
  const end = logSource.indexOf('return 0;\n        }', start) + 'return 0;\n        }'.length;
  assert.notEqual(start, -1);
  const comparatorSource = logSource.substring(start, end);

  function sortMessages(ascending, messages) {
    const context = { ascending, result: null };
    vm.runInNewContext(
      'var messages = ' + JSON.stringify(messages.map((m) => ({ message: m }))) +
        ';\nresult = messages.sort(' + comparatorSource + ').map(function (m) { return m.message; });',
      context
    );
    return Array.from(context.result);
  }

  const unordered = ['12:00 c', '09:00 a', '10:00 b'];
  assert.deepEqual(sortMessages(true, unordered), ['09:00 a', '10:00 b', '12:00 c']);
  assert.deepEqual(sortMessages(false, unordered), ['12:00 c', '10:00 b', '09:00 a']);

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
  const cameraComponent = fs.readFileSync(path.join(root, 'js/components/camera.js'), 'utf8');
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
  const cameraTpl = fs.readFileSync(path.join(root, 'tpl/camera_image.tpl'), 'utf8');
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
  const deviceEditor = fs.readFileSync(path.join(root, 'js/deviceeditor.js'), 'utf8');
  const saveWidgets = fs.readFileSync(path.join(root, 'js/savewidgets.php'), 'utf8');

  assert.match(
    saveWidgets,
    /'height' => \(!\$gridMode && isset\(\$catalog\[\$id\]\['height'\]\)\)\s*\n\s*\? \$catalog\[\$id\]\['height'\]\s*\n\s*: null,/
  );
  assert.match(
    deviceEditor,
    /widgets: widgetPayload,\s*\n\s*settings: pendingWidgetSettings,\s*\n\s*screen: _activeScreenPayload\(\),\s*\n\s*blocksOnly: gridMode,\s*\n[\s\S]{0,700}?gridMode: gridMode,/
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
  const widgetEditor = fs.readFileSync(path.join(root, 'js/widgeteditor.js'), 'utf8');

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
  const deviceEditor = fs.readFileSync(path.join(root, 'js/deviceeditor.js'), 'utf8');

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
  const screenswitcher = fs.readFileSync(path.join(root, 'js/screenswitcher.js'), 'utf8');
  assert.doesNotMatch(screenswitcher, /setTimeout\(function \(\) \{\s*\n\s*if \(typeof myswiper/);
  assert.match(screenswitcher, /function _attachSwiperListeners\(\)/);
  assert.match(screenswitcher, /var waitForSwiper = setInterval\(function \(\) \{/);
  assert.match(screenswitcher, /attempts >= maxAttempts/);
  assert.match(screenswitcher, /clearInterval\(waitForSwiper\);/);
  assert.match(screenswitcher, /_attachSwiperListeners\(\);\s*\n\s*\n\s*updateActive\(\);/);
});

test('Move mode Settings button opens the Multi/Custom Device\'s own config, not the shared-idx device (#115)', () => {
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
  const deviceEditor = fs.readFileSync(path.join(root, 'js/deviceeditor.js'), 'utf8');
  const dashticzSource = fs.readFileSync(path.join(root, 'js/dashticz.js'), 'utf8');
  const blocksSource = fs.readFileSync(path.join(root, 'js/blocks.js'), 'utf8');

  // The artifact this test guards against still exists upstream (by design,
  // for the key-as-type widget dispatch convention) - convertBlock() still
  // stamps block.type with the key, and _mountSpecialBlock() still writes it
  // back into blocks[key].
  assert.match(blocksSource, /block\.type = blocktype;/);
  assert.match(dashticzSource, /blocks\[me\.key\] = blockdef;/);

  // _specialFromReference must treat a type that merely echoes the block's
  // own reference key as "no real widget type", same as it already treats
  // the Dial checkbox's type:'dial'.
  assert.match(
    deviceEditor,
    /\(!definition\.type \|\| definition\.type === 'dial' \|\| definition\.type === reference\) &&\s*\n\s*parseInt\(definition\.idx, 10\) > 0/
  );
});

test('Domoticz log widget can limit the number of displayed lines (#105)', () => {
  const logSource = fs.readFileSync(path.join(root, 'js/components/log.js'), 'utf8');
  const widgetEditor = fs.readFileSync(path.join(root, 'js/widgeteditor.js'), 'utf8');
  const deviceEditor = fs.readFileSync(path.join(root, 'js/deviceeditor.js'), 'utf8');
  const savewidgets = fs.readFileSync(path.join(root, 'js/savewidgets.php'), 'utf8');

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
  assert.match(widgetEditor, /log: \{ scrolltimeout: true, ascending: true, aspectratio: true, maxitems: true \}/);
  assert.match(widgetEditor, /_cfgField\('maxitems', llog\.log_maxitems \|\| 'Maximum lines'/);
  assert.match(
    widgetEditor,
    /widgetConfigs\.log\.maxitems =\s*\n\s*typeof definition\.maxitems !== 'undefined' \? String\(definition\.maxitems\) : '';/
  );
  assert.match(widgetEditor, /entry\.maxitems = parseInt\(lgcfg\.maxitems, 10\) \|\| 0;/);

  // Classic Device Editor's widget save-entry builder must carry it too.
  assert.match(
    deviceEditor,
    /_copyDefinedWidgetProperties\(entry, definition, \['aspectratio', 'maxitems'\]\);/
  );

  // savewidgets.php: validated, bounded, and only written to CONFIG.js when
  // explicitly set (so an untouched log widget's saved block stays unchanged).
  assert.match(savewidgets, /if \(isset\(\$entry\['maxitems'\]\) && is_numeric\(\$entry\['maxitems'\]\)\) \{\s*\n\s*\$maxitems = \(int\)\$entry\['maxitems'\];\s*\n\s*if \(\$maxitems > 0 && \$maxitems <= 500\)/);
  assert.match(savewidgets, /if \(isset\(\$widget\['maxitems'\]\)\) \{\s*\n\s*\$props\['maxitems'\] = \$widget\['maxitems'\];/);
});

test('Device Editor list labels a Multi Device distinctly from a plain Custom device', () => {
  // Both are specialType 'custom' internally (a Multi Device is just a
  // Custom device whose 'values' custom field was filled in via the
  // dedicated Multi Device popup), so the list previously labeled every one
  // of them "Custom devices" - including actual Multi Devices, which was
  // confusing since they have their own distinct add-menu entry and icon.
  const deviceEditor = fs.readFileSync(path.join(root, 'js/deviceeditor.js'), 'utf8');

  assert.match(
    deviceEditor,
    /var isMultiDevice = isCustom &&\s*\n\s*special\.definition &&\s*\n\s*Array\.isArray\(special\.definition\.values\) &&\s*\n\s*special\.definition\.values\.length > 0;/
  );
  assert.match(
    deviceEditor,
    /var label = isTitle\s*\n\s*\? t\.title_block\s*\n\s*: \(isMultiDevice \? t\.multi_device : \(isCustom \? t\.custom_devices : \(isSlideButton \? t\.slide_button : t\.dummy_device\)\)\);/
  );
  assert.match(
    deviceEditor,
    /isSlideButton \? 'fa-sliders-h' : \(isMultiDevice \? 'fa-layer-group' : 'fa-cube'\)/
  );
});

test('Device Config popup edits a Multi Device\'s values as friendly rows instead of raw JSON', () => {
  // The generic Device Config popup (opened from Move mode's Settings button
  // or the Device Editor list) showed an existing Multi Device's 'values'
  // custom field as a single raw JSON text input, indistinguishable from a
  // plain Custom device - unlike the dedicated Multi Device popup used at
  // creation time, which offers a friendly idx/value row builder. Editing an
  // existing Multi Device now gets that same row builder back.
  const deviceEditor = fs.readFileSync(path.join(root, 'js/deviceeditor.js'), 'utf8');

  // The 'values' row is pulled out of the generic custom-fields list before
  // rendering, so it never appears as a raw JSON text field.
  assert.match(
    deviceEditor,
    /var multiDeviceValues = \(isCustom && valuesRowIndex > -1 &&\s*\n\s*Array\.isArray\(customRows\[valuesRowIndex\]\.value\) &&\s*\n\s*customRows\[valuesRowIndex\]\.value\.length\)\s*\n\s*\? customRows\[valuesRowIndex\]\.value\s*\n\s*: null;/
  );
  assert.match(deviceEditor, /if \(multiDeviceValues\) customRows\.splice\(valuesRowIndex, 1\);/);
  assert.match(deviceEditor, /multiDeviceValues\.forEach\(function \(row\) \{ html \+= _multiDeviceRowHtml\(row\); \}\);/);

  // Row add/remove reuses the same .md-value-row markup and idx/value
  // validation as the creation popup, scoped to this popup's own instance.
  assert.match(deviceEditor, /\$popup\.on\('click', '\.md-value-add', function \(\) \{/);
  assert.match(deviceEditor, /\$popup\.on\('click', '\.md-value-remove', function \(\) \{/);

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

test('Device Config popup lets a Custom/Multi device\'s main idx be corrected after creation', () => {
  // idx is a protected/reserved custom field name (see
  // protectedCustomDeviceProperties), so a Custom or Multi device's main idx
  // was only ever settable at creation time. If the underlying Domoticz
  // device was later recreated with a different idx, there was no way to
  // fix it: the tile stayed stuck on the "Getting device N" placeholder
  // forever, since the device subscription for the stale idx never resolves
  // - which also means the icon/title never render, since deviceUpdateHandler
  // never runs far enough to paint them.
  const deviceEditor = fs.readFileSync(path.join(root, 'js/deviceeditor.js'), 'utf8');

  assert.match(
    deviceEditor,
    /if \(isCustom\) \{[\s\S]{0,1200}?id="de-config-idx"/
  );
  assert.match(
    deviceEditor,
    /var pendingIdx = isCustom \? special\.idx : null;\s*\n\s*if \(isCustom\) \{\s*\n\s*var rawIdx = \$\.trim\(String\(\$\('#de-config-idx'\)\.val\(\) \|\| ''\)\);\s*\n\s*var parsedIdx = parseInt\(rawIdx, 10\);\s*\n\s*if \(!\(parsedIdx > 0 && String\(parsedIdx\) === rawIdx\)\) \{\s*\n\s*valid = false;/
  );
  assert.match(deviceEditor, /if \(isCustom\) special\.idx = pendingIdx;/);
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
  const blocktypes = fs.readFileSync(path.join(root, 'js/blocktypes.js'), 'utf8');
  const blocksSource = fs.readFileSync(path.join(root, 'js/blocks.js'), 'utf8');

  assert.match(
    blocktypes,
    /blocktypes\.Security = \{\s*\n\s*handler: getSecurityBlock\s*\n\}/
  );
  // The SwitchType registration stays, in case some hardware variant does
  // report it.
  assert.match(blocktypes, /SwitchType\.Security = \{\s*\n\s*handler: getSecurityBlock,\s*\n\}/);

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
  assert.doesNotMatch(protectedBlockBody, /return \[getStatusBlock\(secBlock\), true\];/);
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
  const basicclock = fs.readFileSync(path.join(root, 'js/components/basicclock.js'), 'utf8');
  const stationclock = fs.readFileSync(path.join(root, 'js/components/stationclock.js'), 'utf8');
  const flipclock = fs.readFileSync(path.join(root, 'js/components/flipclock.js'), 'utf8');
  const haymanclock = fs.readFileSync(path.join(root, 'js/components/haymanclock.js'), 'utf8');
  const widgetEditor = fs.readFileSync(path.join(root, 'js/widgeteditor.js'), 'utf8');

  assert.match(widgetEditor, /icon: 'far fa-clock'/);
  [basicclock, stationclock, flipclock, haymanclock].forEach(function (source) {
    assert.match(source, /icon: 'far fa-clock'/);
  });

  // All four size their canvas/face from .dt_block's *content-box* height
  // (.height(), not .innerHeight() - the latter also counts .dt_block's own
  // 15px top/bottom padding) minus .dt_title's own height and .dt_state's
  // own 5px/5px vertical margin (creative.css) - the space actually
  // available for the clock face. Sizing to more than that (the previous
  // behavior: full block height, no subtraction) pushed the face past
  // .dt_block's own bottom edge, showing a scrollbar unless the block was
  // made oversized to compensate. Same fix as js/components/frame.js.
  [
    ['basicclock', basicclock],
    ['flipclock', flipclock],
    ['haymanclock', haymanclock],
  ].forEach(function (pair) {
    var name = pair[0];
    var source = pair[1];
    assert.match(source, /var \$title = \$\(me\.mountPoint \+ ' \.dt_title'\);/, name);
    assert.match(source, /var \$state = \$\(me\.mountPoint \+ ' \.dt_state'\);/, name);
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

  assert.match(stationclock, /var \$title = \$mount\.find\('\.dt_title'\)\.first\(\);/);
  assert.match(stationclock, /var \$state = \$mount\.find\('\.dt_state'\)\.first\(\);/);
  assert.match(stationclock, /var availH = \(\$block\.length \? \$block\.height\(\) : 0\) - titleHeight - stateMarginV;/);

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
