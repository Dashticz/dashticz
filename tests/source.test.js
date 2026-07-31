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
  assert.match(topbar, /getBars\(\)\.slideDown\(400\)/);
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
  assert.match(editor, /js\/savewidgets\.php/);
  assert.match(editor, /js\/savelayout\.php/);
  assert.match(editor, /js\/savegridlayout\.php/);
  assert.match(editor, /function _collectGridItems/);
  assert.match(editor, /function convertCurrentScreenToGrid/);
  assert.match(editor, /function _buildColumnGridConversion/);
  assert.match(editor, /function _firstFreeGridPosition/);
  assert.match(editor, /function _moveGridItem/);
  assert.match(editor, /function _resizeGridItem/);
  assert.match(editor, /function _saveGrid/);
  assert.match(editor, /--dt-grid-x/);
  assert.match(editor, /--dt-grid-h/);
  assert.match(simpleBlock, /Wizard gebruikt altijd een vrije grid-layout/);
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
  assert.match(stylesheet, /background: #dc3545/);
  assert.match(stylesheet, /\.dle-size-label \{[\s\S]*bottom: 4px/);
  assert.match(
    deviceEditor,
    /var ck\s+= String\(\$\(this\)\.attr\('data-ck'\)\)/
  );
  assert.match(deviceEditor, /function _activeScreenPayload/);
  assert.match(deviceEditor, /function _activeScreenDom/);
  assert.match(deviceEditor, /\$activeScreen\.find\('\[data-colindex\]'\)/);
  assert.match(deviceEditor, /screen: _activeScreenPayload\(\)/);
  assert.match(deviceEditor, /function _widgetFromReference/);
  assert.match(deviceEditor, /widget_alarmmeldingen: \{ id: 'alarmmeldingen', title: '112' \}/);
  assert.match(deviceEditor, /_widgetPayload\(orderKey\)/);
  assert.match(deviceEditor, /Widget - /);
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

  assert.match(simpleBlock, /widgeteditoricon/);
  assert.match(simpleBlock, /fas fa-puzzle-piece/);
  assert.match(simpleBlock, /js\/widgeteditor\.js/);
  assert.match(simpleBlock, /config-mode-btn/);
  assert.match(simpleBlock, /data-mode="custom"/);
  assert.match(simpleBlock, /data-mode="wizard"/);
  assert.match(settings, /widgetSettingTiles/);
  assert.match(settings, /isCustomConfigMode/);
  assert.match(settings, /setConfigMode/);
  assert.match(settings, /config_mode: 'wizard'/);
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
  assert.match(widgetEditor, /we-cfg-calendar-url/);
  assert.match(widgetEditor, /we-cfg-clock-type/);
  assert.match(widgetEditor, /id="we-camera-add"/);
  assert.match(widgetEditor, /class="we-camera-row/);
  assert.match(widgetEditor, /entry\.cameras = cameraConfigs/);
  assert.equal(english.settings.widgeteditor.weather_title, 'Weather');
  assert.equal(english.settings.widgeteditor.camera_title, 'Cameras');
  assert.equal(dutch.settings.widgeteditor.weather_title, 'Weer');
  assert.equal(dutch.settings.widgeteditor.camera_title, "Camera's");
  for (const [id, width, height] of [
    ['weather', 4, 120],
    ['spotify', 4, 120],
    ['sonarr', 4, 120],
    ['calendar', 4, 120],
    ['publictransport', 4, 260],
    ['trafficinfo', 4, 260],
    ['alarmmeldingen', 4, 160],
    ['camera', 4, 320],
    ['map', 4, 500],
    ['longfonds', 4, 120],
    ['news', 4, 240],
  ]) {
    assert.match(
      widgetEditor,
      new RegExp(`id: '${id}'[\\s\\S]*?width: ${width},[\\s\\S]*?height: ${height},`)
    );
  }
  assert.match(widgetEditor, /js\/savewidgets\.php/);
  assert.match(widgetEditor, /js\/savelayout\.php/);
  assert.match(widgetEditor, /js\/savegridlayout\.php/);
  assert.match(widgetEditor, /blocksOnly: gridMode/);
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
  assert.match(simpleBlock, /title="Widgets toevoegen"/);
  assert.match(fullscreen, /title="Volledig scherm"/);
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

test('legacy expert settings stay configurable but are hidden from the settings menu', () => {
  const settings = fs.readFileSync(path.join(root, 'js/settings.js'), 'utf8');
  assert.match(settings, /boss_stationclock:/);
  assert.match(settings, /blink_color: '255, 255, 255, 1'/);
  assert.match(settings, /edit_mode: 0/);
  assert.match(settings, /speak_lang: 'en_US'/);
  assert.match(settings, /widgetSettingTiles/);
  assert.match(settings, /config_mode: 'wizard'/);
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
  assert.match(theme, /\.transbg\.titlegroups/);
  assert.match(theme, /\.titlegroups[\s\S]*background: var\(--blocktitle\) !important/);
  assert.match(theme, /\.colbar \.miniclock[\s\S]*background: transparent !important/);
  assert.match(theme, /\.titlegroups[\s\S]*box-shadow: none !important/);
  assert.match(theme, /\.titlegroups \.col-icon img\.icon/);
  assert.match(theme, /@media \(max-width: 767\.98px\)/);
  assert.match(theme, /\.standby \.transbg[\s\S]*background: #000 !important/);
  assert.match(theme, /\.standby \.transbg[\s\S]*border: 0 !important/);
  assert.match(theme, /\.standby \.transbg[\s\S]*backdrop-filter: none !important/);
  assert.match(
    blocks,
    /!block\['hide_data'\] \|\| settings\['theme'\] === 'modern-dark'/
  );
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

  assert.match(styles, /\.standby \.screenstandby \.fas[\s\S]*color: #fff !important;/);
  assert.doesNotMatch(styles, /\.standby \.fas(?:,|\s*\{)/);
  assert.match(styles, /\.we-widget-icon\s*\{[^}]*color: #0d6efd;/);
  assert.match(styles, /\.we-config-btn\s*\{[^}]*color: #6c757d;/);
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
  assert.match(switcher, /title="Standby">S</);
  assert.match(switcher, /dt-screen-add/);
  assert.match(switcher, /js\/savescreens\.php/);
  assert.match(switcher, /enterStandbyManual/);
  assert.match(switcher, /standbyEditMode/);
  assert.match(styles, /\.dt-screen-btn\s*\{/);
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

  assert.match(styles, /\.colbar\s*\{[^}]*display:\s*flex !important;[^}]*flex-wrap:\s*nowrap;/s);
  assert.match(styles, /\.colbar \.logo\s*\{[^}]*order:\s*1;[^}]*flex:\s*0 1 auto;/s);
  assert.match(styles, /\.colbar \.miniclock\s*\{[^}]*order:\s*2;[^}]*flex:\s*1 1 auto;/s);
  assert.match(styles, /\.colbar \.dt-screen-switcher-host\s*\{[^}]*order:\s*3;[^}]*margin-left:\s*auto;/s);
  assert.match(styles, /\.colbar \.topbar-settings-wrap\s*\{[^}]*order:\s*4;[^}]*flex:\s*0 0 auto;/s);
  assert.match(blocks, /dt-topbar-item dt-topbar-/);
  assert.match(main, /\['logo', 'miniclock', 'screenswitcher', 'settings'\]/);
  assert.match(editor, /var MIN_GRID_WIDTH = 2;/);
  assert.match(editor, /var MIN_GRID_HEIGHT = 4;/);
  assert.match(editor, /item\.grid\.w < MIN_GRID_WIDTH \|\| item\.grid\.h < MIN_GRID_HEIGHT/);
  assert.match(editor, /width = Math\.max\(\s*MIN_GRID_WIDTH,/s);
  assert.match(editor, /height = Math\.max\(MIN_GRID_HEIGHT,/);
});

test('garbage dates use the selected interface language', () => {
  const garbage = fs.readFileSync(
    path.join(root, 'js/components/garbage.js'),
    'utf8'
  );

  assert.match(garbage, /garbage\.date\.locale\(settings\['language'\]\)/);
  assert.match(garbage, /localizedDate\.format\('dddd'\)/);
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
