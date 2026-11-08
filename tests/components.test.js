const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function loadComponent(relativePath, globals) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  let registered;
  const context = Object.assign(
    {
      console,
      Dashticz: {
        register(component) {
          registered = component;
        },
      },
    },
    globals
  );
  vm.runInNewContext(source, context, { filename: relativePath });
  return registered;
}

test('Group toggleoff always sends an explicit On or Off command', () => {
  const calls = [];
  const devices = {
    1: { Status: 'Off' },
    2: { Status: 'On' },
  };
  const group = loadComponent('js/components/group.js', {
    Domoticz: { getAllDevices: () => devices },
    toLower: (value) => String(value).toLowerCase(),
    switchDevice: (block, state) => calls.push([block.idx, state]),
  });
  const clickHandler = group.defaultCfg().clickHandler;

  clickHandler({
    block: { switchMode: 'toggleoff' },
    groupState: 'off',
    devices: [1, 2],
  });
  assert.deepEqual(calls, [
    [1, 'On'],
    [2, 'On'],
  ]);

  calls.length = 0;
  clickHandler({
    block: { switchMode: 'toggleoff' },
    groupState: 'on',
    devices: [1, 2],
  });
  assert.deepEqual(calls, [
    [1, 'Off'],
    [2, 'Off'],
  ]);
});

test('Domoticz log escapes messages and keeps one namespaced listener set', () => {
  const handlers = new Map();
  const $items = {
    rendered: '',
    html(value) {
      this.rendered = value;
      return this;
    },
    off(namespace) {
      for (const eventName of handlers.keys()) {
        if (eventName.endsWith(namespace)) handlers.delete(eventName);
      }
      return this;
    },
    on(eventName, handler) {
      handlers.set(eventName, handler);
      return this;
    },
    scrollTop(callback) {
      this.lastScrollTop = callback.call({ scrollHeight: 123 });
      return this;
    },
  };
  const records = () => [
    {
      level: '1\" onclick=\"alert(2)',
      message: '2026-08-15 07:00:00.000 <img src=x onerror=alert(1)>',
    },
  ];
  const log = loadComponent('js/components/log.js', {
    $: () => $items,
    Domoticz: {
      request: () => ({
        then(callback) {
          callback({ result: records() });
        },
      }),
    },
  });
  const me = {
    block: { level: 1, ascending: true, maxitems: 0, scrolltimeout: 60 },
    mountPoint: '#log',
    popup: false,
  };

  log.refresh(me);
  log.refresh(me);

  assert.match($items.rendered, /class="level1"/);
  assert.match($items.rendered, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch($items.rendered, /<img|onclick=/);
  assert.deepEqual([...handlers.keys()].sort(), [
    'scroll.dashticzLog',
    'scrollend.dashticzLog',
  ]);
  assert.equal($items.lastScrollTop, 123);
});

test('Legacy iframe and Sunrise blocks do not acquire a new default icon', () => {
  const frame = loadComponent('js/components/frame.js', {
    navigator: { userAgent: '' },
  });
  const simpleBlock = loadComponent('js/components/simpleblock.js', {});

  assert.equal(
    Object.prototype.hasOwnProperty.call(frame.defaultCfg(), 'icon'),
    false
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      simpleBlock.defaultCfg({ type: 'sunrise' }),
      'icon'
    ),
    false
  );
});

test('Blocktitle separator does not acquire a runtime default icon', () => {
  // #169: a legacy/custom-mode blocktitle entry with no `icon` property must
  // render as a clean separator with no icon. getBlockConfig() (js/dashticz.js)
  // only merges block.icon onto the runtime cfg when CONFIG.js actually
  // defines it, so blocktitle.js's own defaultCfg must not inject one.
  const blocktitle = loadComponent('js/components/blocktitle.js', {});
  assert.equal(
    Object.prototype.hasOwnProperty.call(blocktitle.defaultCfg, 'icon'),
    false
  );
});

test('Lyrion Music Server block dispatches on type: lms and has no default icon', () => {
  const lms = loadComponent('js/components/lms.js', {
    settings: { dashticz_php_path: 'js/' },
    language: { misc: {} },
    $: Object.assign(() => ({ text: () => ({ html: () => '' }) }), {
      ajax: () => ({ then: () => ({ catch: () => {} }) }),
    }),
  });
  assert.equal(lms.name, 'lms');
  assert.equal(lms.canHandle({ type: 'lms' }), true);
  assert.equal(lms.canHandle({ type: 'blocktitle' }), false);
  assert.equal(!!lms.canHandle(null), false);
  // #169 precedent: a component's own defaultCfg must not inject a runtime
  // default icon - getBlockConfig() (js/dashticz.js) only applies block.icon
  // when the block's own CONFIG.js entry defines it. The cover artwork is
  // this block's own visual, so no icon is shown unless explicitly configured.
  assert.equal(
    Object.prototype.hasOwnProperty.call(lms.defaultCfg, 'icon'),
    false
  );
  assert.equal(lms.defaultCfg.refresh, 5);
  assert.equal(lms.defaultCfg.width, 6);
  assert.equal(lms.defaultCfg.port, 9000);
  assert.equal(typeof lms.refresh, 'function');
});

test('Webpack cleans stale output while preserving legacy font assets', () => {
  const config = require(path.join(root, 'build/webpack.config.js'));
  assert.equal(config.output.clean.keep.test('assets/fonts/legacy.woff'), true);
  assert.equal(config.output.clean.keep.test('obsolete-chunk.js'), false);
});

/* Runs one refresh of the F1 widget (next mode) against a fake bridge
   answer and returns the HTML it renders and the bridge request. */
function renderF1(block, answer, location) {
  let request;
  let html = '';
  const mount = {
    css() {},
    find(selector) {
      return {
        length: 0,
        each() {},
        html(value) {
          if (selector === '.dt_state' && value !== undefined) html = value;
        },
      };
    },
  };
  const f1 = loadComponent('js/components/f1.js', {
    Date,
    $: { extend: (target, ...rest) => Object.assign(target, ...rest) },
    settings: {},
    Domoticz: {
      getAllDevices: () => ({ _settings: { Location: location || {} } }),
    },
    DT_function: {
      clampNumber: (value, def) => (value === undefined ? def : Number(value)),
      escapeHtml: (value) => String(value),
      bridge(_url, req) {
        request = req;
        return { then: (ok) => ok(answer) };
      },
      bridgeError: () => 'error',
      t: (_key, def) => def,
    },
  });
  f1.refresh({ block, $mountPoint: mount });
  return { html, request };
}

test('F1 widget follows summer time in the time zone from the bridge', () => {
  const realNow = Date.now;
  const summer = Date.parse('2026-10-24T12:00:00Z') / 1000;
  const winter = Date.parse('2026-10-25T12:00:00Z') / 1000;
  Date.now = () => Date.parse('2026-10-01T00:00:00Z');
  try {
    const answer = (ts, timezone) => ({
      events: [
        { start: ts, end: ts + 3600, session: 'Race', gp: '', location: '' },
      ],
      timezone,
    });
    const base = { f1mode: 'next', f1language: 'en', f1visibility: 365 };
    // 12:00 UTC is 14:00 in summer time and 13:00 in winter time.
    assert.match(
      renderF1(base, answer(summer, 'Europe/Amsterdam')).html,
      /Sat 24 Oct 14:00/
    );
    assert.match(
      renderF1(base, answer(winter, 'Europe/Amsterdam')).html,
      /Sun 25 Oct 13:00/
    );
    assert.match(
      renderF1(base, answer(summer, 'America/New_York')).html,
      /Sat 24 Oct 08:00/
    );
    // Offset 0 is not an override: the time zone still applies.
    assert.match(
      renderF1({ ...base, f1utcoffset: 0 }, answer(summer, 'Europe/Amsterdam'))
        .html,
      /Sat 24 Oct 14:00/
    );
    // An unknown zone is ignored; the fixed offset ignores summer time.
    assert.doesNotMatch(
      renderF1(base, answer(summer, 'Nope/Zone')).html,
      /undefined|NaN/
    );
    assert.match(
      renderF1({ ...base, f1utcoffset: 1 }, answer(summer, 'Europe/Amsterdam'))
        .html,
      /Sat 24 Oct 13:00/
    );
  } finally {
    Date.now = realNow;
  }
});

test('F1 widget sends the Domoticz location only in domoticz time zone mode', () => {
  const location = { Latitude: '52.37', Longitude: '4,9' };
  const answer = { events: [] };
  const base = { f1mode: 'next' };
  assert.deepEqual(
    Object.keys(renderF1(base, answer, location).request).sort(),
    ['pollMinutes', 'url']
  );
  const request = renderF1(
    { ...base, f1timezone: 'domoticz' },
    answer,
    location
  ).request;
  assert.equal(request.lat, 52.37);
  assert.equal(request.lon, 4.9);
  assert.equal(
    renderF1({ ...base, f1timezone: 'domoticz' }, answer, {}).request.lat,
    undefined
  );
});

test('Car info reads tyre pressures and rates them', () => {
  const car = loadComponent('js/components/car.js', {
    DT_function: { escapeHtml: (value) => String(value) },
  });
  assert.equal(car.canHandle({ carmode: 'info' }), true);
  assert.equal(car.canHandle({ type: 'hpilo' }), false);
  assert.equal(car.parsePressure({ Data: '2.4 bar' }), 2.4);
  assert.equal(car.parsePressure({ Data: '2,3 bar' }), 2.3);
  assert.equal(car.parsePressure({ Data: 'n/a' }), null);
  assert.equal(car.parsePressure(null), null);
  assert.equal(car.tyreLevel(2.4), 'ok');
  assert.equal(car.tyreLevel(2.1), 'warn');
  assert.equal(car.tyreLevel(1.8), 'low');
  assert.equal(car.tyreLevel(null), 'na');
  assert.equal(car.parsePercentage({ Data: '140 %' }), 100);
});

test('Car info draws only the configured devices', () => {
  const devices = { 7: { Data: '2.4 bar' }, 9: { Data: '80 %' } };
  const car = loadComponent('js/components/car.js', {
    DT_function: { escapeHtml: (value) => String(value) },
    Domoticz: { getAllDevices: (idx) => devices[idx] },
  });
  let html = '';
  const state = {
    html(value) {
      html = value;
      return state;
    },
    find: () => ({ on: () => {} }),
  };
  const me = {
    block: { carmode: 'info', carfl: '7', carsoc: '9', carrr: 'x' },
    $mountPoint: { find: () => state },
  };
  car.render(me);
  assert.match(html, /car-tyre-fl car-tyre-ok/);
  assert.match(html, /car-soc/);
  assert.match(html, /width:80%/);
  assert.doesNotMatch(html, /car-range/);
  assert.doesNotMatch(html, /car-tyre-rr/);
  assert.equal(car.isClosed('Closed'), true);
  assert.equal(car.isClosed('Unlocked'), false);
  assert.equal(car.isClosed('Open'), false);
  assert.equal(car.imageUrl('custom/car.webp'), 'img/custom/car.webp');
  assert.equal(car.imageUrl('../x.png'), '');
});

test('Toon finds its devices by name and draws only those', () => {
  const devices = {
    1: {
      idx: '1',
      HardwareName: 'Toon',
      Type: 'Temp',
      Name: 'Woonkamer Toon Temp',
      Temp: 19.7,
    },
    2: {
      idx: '2',
      HardwareName: 'Toon',
      Type: 'Setpoint',
      Name: 'Thermostaat',
      SetPoint: '19.5',
    },
    3: {
      idx: '3',
      HardwareName: 'Toon',
      Type: 'General',
      SubType: 'Pressure',
      Name: 'Keteldruk',
      Data: '1.8 Bar',
    },
    4: {
      idx: '4',
      HardwareName: 'Toon',
      Type: 'Light/Switch',
      Name: 'Toon - Scene',
      Level: 30,
      LevelNames: Buffer.from('|Weg|Slapen|Thuis').toString('base64'),
    },
    5: { idx: '5', HardwareName: 'Other', Type: 'Temp', Name: 'Buiten' },
  };
  const toon = loadComponent('js/components/toon.js', {
    DT_function: { escapeHtml: (value) => String(value) },
    Domoticz: { getAllDevices: (idx) => (idx ? devices[idx] : devices) },
    atob: (value) => Buffer.from(value, 'base64').toString(),
  });
  assert.equal(toon.canHandle({ toonmode: 'info' }), true);
  assert.equal(toon.canHandle({ carmode: 'info' }), false);
  const found = toon.findDevices();
  assert.equal(found.room.idx, '1');
  assert.equal(found.setpoint.idx, '2');
  assert.equal(found.pressure.idx, '3');
  assert.equal(found.scene.idx, '4');
  assert.equal(found.boiler, null);
  const direct = toon.fromBridge({
    room: 19.7,
    setpoint: 20.5,
    pressure: 1.6,
    boiler: 'heating',
    modulation: 45,
    scene: 30,
    program: 'Program is off',
  });
  assert.equal(direct.room.Temp, 19.7);
  assert.equal(direct.setpoint.SetPoint, 20.5);
  assert.equal(direct.pressure.Data, '1.6 Bar');
  assert.equal(direct.modulation.Data, '45 %');
  assert.equal(direct.scene.Level, 30);
  assert.equal(toon.levels(direct.scene).length, 4);
  assert.equal(toon.fromBridge(null).room, null);
  assert.equal(
    toon.findDevices({ toonsource: 'dashticz' }, { room: 18 }).room.Temp,
    18
  );
  assert.equal(
    JSON.stringify(toon.levels(found.scene)),
    '[[10,"Weg"],[20,"Slapen"],[30,"Thuis"]]'
  );
  assert.equal(toon.parseNumber('1.8 Bar'), 1.8);
  let html = '';
  const state = {
    html(value) {
      html = value;
      return state;
    },
  };
  toon.render({ $mountPoint: { find: () => state } });
  assert.match(html, /toon-temp-value">19.7/);
  assert.match(html, /data-act="up"/);
  assert.match(html, /toon-scene active" data-act="scene" data-level="30"/);
  assert.doesNotMatch(html, /toon-boiler/);
});

test('Mower finds its devices by name and shows only Start and Park', () => {
  const names =
    '|(select)|Start (2.0h)|Pause|ResumeSchedule|ParkUntilFurtherNotice|ParkUntilNextSchedule';
  const devices = {
    1: {
      idx: '1',
      HardwareName: 'Husqvarna',
      Type: 'General',
      Name: 'Husqvarna - R4 - State',
      Data: 'Parked until Tomorrow 11:00',
    },
    2: {
      idx: '2',
      HardwareName: 'Husqvarna',
      Type: 'General',
      Name: 'Husqvarna - R4 - Next Schedule',
      Data: 'Tomorrow 11:00\n<body><p>Grass too short</p></body>',
    },
    3: {
      idx: '3',
      HardwareName: 'Husqvarna',
      Type: 'Light/Switch',
      BatteryLevel: 80,
      Name: 'Husqvarna - R4 - Run',
      Status: 'Off',
      Data: 'Off',
    },
    4: {
      idx: '4',
      HardwareName: 'Husqvarna',
      Type: 'Light/Switch',
      Name: 'Husqvarna - R4 - Actions',
      LevelNames: Buffer.from(names).toString('base64'),
    },
    5: {
      idx: '5',
      HardwareName: 'Other',
      Type: 'General',
      Name: 'Other - State',
    },
  };
  const mower = loadComponent('js/components/mower.js', {
    DT_function: { escapeHtml: (value) => String(value) },
    Domoticz: { getAllDevices: (idx) => (idx ? devices[idx] : devices) },
    atob: (value) => Buffer.from(value, 'base64').toString(),
  });
  assert.equal(mower.canHandle({ mowermode: 'info' }), true);
  assert.equal(mower.canHandle({ toonmode: 'info' }), false);
  const found = mower.findDevices();
  assert.equal(found.state.idx, '1');
  assert.equal(found.schedule.idx, '2');
  assert.equal(found.run.idx, '3');
  assert.equal(found.actions.idx, '4');
  assert.equal(found.location, null);
  const direct = mower.fromBridge({
    status: 'Parked in base',
    parked: true,
    nextStart: Date.UTC(2026, 10, 2, 11, 0),
    battery: 80,
  });
  assert.equal(direct.battery.BatteryLevel, 80);
  assert.equal(direct.run.Status, 'Off');
  assert.equal(
    JSON.stringify(mower.actionButtons(direct.actions)),
    '[{"level":20,"label":"Start"},{"level":60,"label":"Park"}]'
  );
  assert.match(direct.state.Data, /^Parked until .*11:00$/);
  assert.equal(
    mower.nextStartText(Date.UTC(2026, 10, 1, 9, 5), new Date(2026, 10, 1, 8)),
    '09:05'
  );
  assert.equal(
    mower.nextStartText(Date.UTC(2026, 10, 5, 9, 5), new Date(2026, 10, 1, 8)),
    '05-11 09:05'
  );
  assert.equal(
    JSON.stringify(mower.cleanText(devices[2].Data)),
    '["Tomorrow 11:00","Grass too short"]'
  );
  assert.equal(
    JSON.stringify(mower.actionButtons(found.actions)),
    '[{"level":20,"label":"Start"},{"level":60,"label":"Park"}]'
  );
  let html = '';
  const state = {
    html(value) {
      html = value;
      return state;
    },
  };
  mower.render({ $mountPoint: { find: () => state } });
  assert.match(html, /mower-state">Parked until Tomorrow 11:00/);
  assert.match(html, /mower-value">80 %/);
  assert.match(html, /mower-bar-fill" style="width:80%/);
  assert.match(html, /data-level="20">Start/);
  assert.match(html, /data-level="60">Park/);
  assert.doesNotMatch(html, /Pause|Resume/);
});

test('Home Connect widget groups the plugin devices per appliance', () => {
  const dev = (idx, Name, Data, Status) => ({
    idx,
    Name,
    Data,
    Status,
    HardwareName: 'Home Connect',
  });
  const devices = {
    1: dev(1, '$Wasmachine Power', 'On', 'On'),
    2: dev(2, '$Wasmachine Progress', '40 %'),
    3: dev(3, '$Wasmachine Remaining time', '1h 20min'),
    4: dev(4, 'Droger Aan/uit', 'Off', 'Off'),
    5: dev(5, 'Droger Voortgang', '100 %'),
    6: dev(6, 'Koffieautomaat Power', 'On', 'On'),
    7: dev(7, 'Koffieautomaat Notifications', 'No active alerts.'),
    8: dev(8, 'Vaatwasser Power', 'On', 'On'),
    9: dev(9, 'Vaatwasser Progress', '100 %'),
    11: dev(11, 'Home Connect - Oven Power', 'Off', 'Off'),
    10: { idx: 10, Name: 'Other Progress', Data: '5 %', HardwareName: 'X' },
  };
  const hc = loadComponent('js/components/homeconnect.js', {
    Domoticz: { getAllDevices: () => devices },
    DT_function: {
      escapeHtml: (v) => String(v),
      t: (key, fallback) => fallback,
    },
  });
  assert.equal(hc.canHandle({ hcmode: 'appliances' }), true);
  assert.equal(hc.canHandle({ mowermode: 'info' }), false);
  assert.equal(
    JSON.stringify(hc.appliances({}).map((a) => a.name)),
    JSON.stringify([
      'Wasmachine',
      'Droger',
      'Koffieautomaat',
      'Vaatwasser',
      'Oven',
    ])
  );
  assert.equal(hc.remainingMinutes('1h 20min'), 80);
  assert.equal(hc.remainingMinutes('45 min'), 45);
  assert.equal(hc.remainingMinutes('45'), 45);
  assert.equal(hc.remainingMinutes('soon'), null);
  const now = new Date(2026, 10, 8, 10, 0).getTime();
  assert.equal(hc.finishTime('1h 20min', now), '11:20');
  assert.equal(hc.alertText(devices[7]), '');
  const html = hc.homeconnectHtml({}, now);
  assert.match(html, /Wasmachine/);
  assert.match(html, /<svg class="homeconnect-icon homeconnect-icon-washer"/);
  assert.doesNotMatch(html, /Home Connect/);
  assert.match(html, /<b class="homeconnect-pct">40%<\/b> ready at 11:20/);
  assert.match(html, /Vaatwasser<\/span><span[^>]*homeconnect-done/);
  assert.doesNotMatch(html, /Droger|Koffieautomaat|Other/);
  // Hide an appliance, and set a device by idx.
  assert.equal(
    JSON.stringify(
      hc.appliances({ hcexclude: 'droger, vaatwasser' }).map((a) => a.name)
    ),
    JSON.stringify(['Wasmachine', 'Koffieautomaat', 'Oven'])
  );
  const manual = hc.appliances({
    hcdevices: { Oven: { power: 1, progress: 2, name: 'Bakoven' } },
  });
  assert.equal(manual[manual.length - 1].name, 'Bakoven');
  // An alert shows as a warning.
  devices[7].Data = 'Drip tray full';
  assert.match(hc.homeconnectHtml({}, now), /homeconnect-warning">Drip tray/);
});

test('Home Connect widget reads the devices of the Dutch plugin', () => {
  const dev = (idx, Name, Data, Status, SubType) => ({
    idx,
    Name,
    Data,
    Status,
    SubType,
    HardwareName: 'HomeConnect_API',
  });
  const devices = {};
  [
    ['Home Connect', 'Aangemeld'],
    ['Wasmachine Status', 'Bezig, Katoen, Vergrendeld', '', 'Alert'],
    ['Wasmachine Aan/uit', 'On', 'On'],
    ['Wasmachine Voortgang', '57%'],
    ['Wasmachine Resterende tijd', '38 min'],
    ['Wasmachine Programma', 'Katoen, klaar om ongeveer 16:03'],
    [
      'Wasmachine Bediening op afstand',
      'Op afstand starten toegestaan',
      '',
      'Alert',
    ],
    ['Wasmachine Programma klaar', 'Geen melding', '', 'Alert'],
    ['Droger Aan/uit', 'Off', 'Off'],
    ['Droger Voortgang', '0%'],
    ['Droger Resterende tijd', '0 min'],
    ['Koffieautomaat Aan/uit', 'On', 'On'],
    ['Koffieautomaat Voortgang', '0%'],
    ['Koffieautomaat Status', 'Niet actief', '', 'Alert'],
    ['Koffieautomaat Leeg lekbakjes', 'Geen melding', '', 'Alert'],
  ].forEach((item, i) => {
    devices[i + 1] = dev(i + 1, item[0], item[1], item[2], item[3]);
  });
  const hc = loadComponent('js/components/homeconnect.js', {
    Domoticz: { getAllDevices: () => devices },
    DT_function: {
      escapeHtml: (v) => String(v),
      t: (key, fallback) => fallback,
    },
  });
  const now = new Date(2026, 10, 8, 15, 25).getTime();
  // The hardware name is set in the block.
  assert.equal(hc.appliances({ hchardware: 'huishoud' }).length, 0);
  assert.equal(hc.appliances({}).length, 3);
  assert.equal(hc.appliances({ hchardware: 'HomeConnect_API' }).length, 3);
  // The name must be exactly the same.
  assert.equal(hc.appliances({ hchardware: 'homeconnect_api' }).length, 0);
  assert.equal(hc.appliances({ hchardware: 'Home Connect' }).length, 0);
  let html = hc.homeconnectHtml({}, now);
  assert.match(html, /Wasmachine<\/span><span.*57%<\/b> ready at 16:03/);
  assert.doesNotMatch(html, /Droger|Koffieautomaat|Katoen|afstand/);
  // A finished program without a progress device: the check mark.
  devices[2].Data = 'Klaar, Katoen';
  assert.match(
    hc.homeconnectHtml({}, now),
    /Wasmachine<\/span><span[^>]*homeconnect-done/
  );
  devices[2].Data = 'Bezig, Katoen, 0%, klaar om ongeveer 16:03';
  // Without Progress and Remaining time devices: from the status text.
  const progress = devices[4];
  const remaining = devices[5];
  delete devices[4];
  delete devices[5];
  assert.match(
    hc.homeconnectHtml({}, now),
    /Wasmachine<\/span><span.*0%<\/b> ready at 16:03/
  );
  // With a Progress device but no Remaining time: the time of the status.
  devices[4] = progress;
  assert.match(
    hc.homeconnectHtml({}, now),
    /Wasmachine<\/span><span.*57%<\/b> ready at 16:03/
  );
  devices[5] = remaining;
  devices[2].Data = 'Bezig, Katoen, Vergrendeld';
  // A status that needs attention is a warning.
  devices[2].Data = 'Actie vereist: lekbak vol (+2)';
  assert.match(
    hc.homeconnectHtml({}, now),
    /Wasmachine<\/span><span[^>]*homeconnect-warning">Actie vereist: lekbak vol \(\+2\)/
  );
  devices[2].Data = 'Bezig, Katoen, Vergrendeld';
  // The coffee machine gets a message: a warning, no status.
  devices[15].Data = 'Lekbakje vol';
  html = hc.homeconnectHtml({}, now);
  assert.match(
    html,
    /Koffieautomaat<\/span><span[^>]*homeconnect-warning">Lekbakje vol/
  );
  assert.equal(hc.appliances({})[2].alerts.length, 1);
});

test('Home Connect widget shows each coffee machine message once', () => {
  const dev = (idx, Name, Data, Status, SubType) => ({
    idx,
    Name,
    Data,
    Status,
    SubType,
    HardwareName: 'Home Connect',
  });
  const devices = {
    1: dev(1, 'Koffieautomaat Aan/uit', 'On', 'On'),
    2: dev(
      2,
      'Koffieautomaat Status',
      'Actie vereist: lekbak vol (+1)',
      '',
      'Alert'
    ),
    3: dev(
      3,
      'Koffieautomaat Meldingen',
      'Lekbak vol, Waterreservoir leeg',
      '',
      'Alert'
    ),
    // The per-message "$" devices, read when use_hidden is on.
    4: dev(4, '$Koffieautomaat Lekbak vol', 'Lekbak vol', '', 'Alert'),
    5: dev(
      5,
      '$Koffieautomaat Waterreservoir leeg',
      'Waterreservoir leeg',
      '',
      'Alert'
    ),
  };
  const hc = loadComponent('js/components/homeconnect.js', {
    Domoticz: { getAllDevices: () => devices },
    DT_function: {
      escapeHtml: (v) => String(v),
      t: (key, fallback) => fallback,
    },
  });
  assert.match(
    hc.homeconnectHtml({}),
    /homeconnect-warning">Actie vereist: Lekbak vol, Waterreservoir leeg<\/span>/
  );
  // Without the Notifications device the per-message devices are used.
  delete devices[3];
  devices[2].Data = 'Gereed';
  assert.match(
    hc.homeconnectHtml({}),
    /homeconnect-warning">Lekbak vol, Waterreservoir leeg<\/span>/
  );
  // In stand-by (Power off) an open message still shows, the status does not.
  devices[1].Status = 'Off';
  devices[1].Data = 'Off';
  devices[2].Data = 'Actie vereist: lekbak vol (+1)';
  devices[5].Data = 'Geen melding';
  assert.match(
    hc.homeconnectHtml({}),
    /Koffieautomaat<\/span><span[^>]*homeconnect-warning">Lekbak vol<\/span>/
  );
  // Off without messages: left out.
  devices[4].Data = 'Geen melding';
  assert.match(hc.homeconnectHtml({}), /No active appliances/);
});

test('Home Connect widget can read another Domoticz', () => {
  const hc = loadComponent('js/components/homeconnect.js', {
    DT_function: { escapeHtml: String, t: (key, fallback) => fallback },
  });
  assert.equal(hc.remoteBase({}), '');
  assert.equal(
    hc.remoteBase({ hcip: '192.168.1.190' }),
    'http://192.168.1.190:8080'
  );
  assert.equal(
    hc.remoteBase({ hcip: ' 192.168.1.190 ', hcport: '8081' }),
    'http://192.168.1.190:8081'
  );
  assert.equal(
    hc.remoteBase({ hcip: 'https://dz.local:443/' }),
    'https://dz.local:443'
  );
  // The devices of that Domoticz are passed in.
  const devices = {
    1: {
      idx: '1',
      Name: 'Droger Aan/uit',
      Status: 'On',
      HardwareName: 'HomeConnect_API',
    },
    2: {
      idx: '2',
      Name: 'Droger Voortgang',
      Data: '30%',
      HardwareName: 'HomeConnect_API',
    },
  };
  assert.match(hc.homeconnectHtml({}, undefined, devices), /Droger/);
  assert.match(hc.homeconnectHtml({}, undefined, {}), /No active appliances/);
});
