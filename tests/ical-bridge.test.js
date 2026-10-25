const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const { spawn, spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const icalDir = path.join(root, 'vendor/dashticz/ical');

/* One single event and one weekly series whose UNTIL is the start of its
   last occurrence (inclusive per RFC 5545). The bridge only looks a limited
   number of days ahead, so the dates are relative to now (whole hours, UTC). */
const HOUR = 3600;
const base = Math.floor(Date.now() / 1000 / HOUR) * HOUR + 30 * 24 * HOUR;
const single = base;
const weekly = [base + 24 * HOUR, base + 8 * 24 * HOUR, base + 15 * 24 * HOUR];

function icsTime(seconds) {
  return new Date(seconds * 1000).toISOString().replace(/[-:]|\.\d{3}/g, '');
}

const ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//Dashticz test//EN',
  'BEGIN:VEVENT',
  'UID:single@dashticz.test',
  `DTSTAMP:${icsTime(base)}`,
  `DTSTART:${icsTime(single)}`,
  `DTEND:${icsTime(single + HOUR)}`,
  'SUMMARY:Single event',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:weekly@dashticz.test',
  `DTSTAMP:${icsTime(base)}`,
  `DTSTART:${icsTime(weekly[0])}`,
  `DTEND:${icsTime(weekly[0] + HOUR)}`,
  `RRULE:FREQ=WEEKLY;UNTIL=${icsTime(weekly[2])}`,
  'SUMMARY:Weekly event',
  'END:VEVENT',
  'END:VCALENDAR',
  '',
].join('\r\n');

function serveIcs() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'text/calendar');
      res.end(ICS);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

/* Runs vendor/dashticz/ical/index.php from the command line (it reads its
   query from argv in that case). */
function runBridge(params) {
  return new Promise((resolve, reject) => {
    const query = new URLSearchParams(params).toString();
    const child = spawn('php', ['index.php', query], { cwd: icalDir });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

function eventList(events) {
  return Object.values(events).filter(
    (event) => event && typeof event === 'object' && !Array.isArray(event)
  );
}

/* All former parser methods (0: SG_iCal, 1: om/icalparser, 2:
   johngrogg/ics-parser) now use sabre/vobject, so every method returns the
   same, complete expansion with an inclusive UNTIL and no PHP warnings. */
test('ical bridge returns the same events for every method value', async () => {
  const server = await serveIcs();
  try {
    const url = `http://127.0.0.1:${server.address().port}/test.ics`;
    for (const method of ['0', '1', '2', '']) {
      const { code, stdout } = await runBridge({
        url,
        method,
        maxitems: '50',
        history: '3650',
      });
      assert.equal(code, 0, `method ${method} exit code`);
      let events;
      try {
        events = JSON.parse(stdout);
      } catch (e) {
        assert.fail(`method ${method} did not return clean JSON: ${stdout}`);
      }
      const list = eventList(events);
      const titles = (name) => list.filter((event) => event.title === name);
      assert.equal(titles('Single event').length, 1, `method ${method}`);
      const starts = titles('Weekly event')
        .map((event) => event.start)
        .sort((a, b) => a - b);
      assert.deepEqual(starts, weekly, `method ${method} occurrences`);
      assert.deepEqual(events._errors, [], `method ${method} _errors`);
      // Sorted by start, with the fields the calendar component reads.
      assert.deepEqual(
        list.map((event) => event.start),
        [weekly[0], single, weekly[1], weekly[2]].sort((a, b) => a - b)
      );
      assert.deepEqual(Object.keys(list[0]).sort(), [
        'allDay',
        'date',
        'desc',
        'end',
        'id',
        'location',
        'start',
        'title',
      ]);
    }
  } finally {
    server.close();
  }
});

test('ical bridge honours maxitems and maps webcal URLs to https', async () => {
  const server = await serveIcs();
  try {
    const { stdout } = await runBridge({
      url: `http://127.0.0.1:${server.address().port}/test.ics`,
      maxitems: '2',
    });
    const events = JSON.parse(stdout);
    assert.deepEqual(events._errors, []);
    assert.equal(eventList(events).length, 2);
  } finally {
    server.close();
  }
  const dir = icalDir.replace(/\\/g, '/');
  const result = spawnSync(
    'php',
    [
      '-r',
      `require '${dir}/dashticz_ical.php'; echo json_encode(array_map('dashticz_ical_normalize_url', array(' webcal://a.example/x.ics', 'WEBCALS://b.example/y', 'https://c.example/z')));`,
    ],
    { encoding: 'utf8' }
  );
  assert.deepEqual(JSON.parse(result.stdout), [
    'https://a.example/x.ics',
    'https://b.example/y',
    'https://c.example/z',
  ]);
});

/* Runs dashticz_ical_occurrences() on an iCalendar text for a fixed window
   (the whole of 2026) in Europe/Amsterdam. */
function occurrences(lines, from = '2026-01-01', to = '2027-01-01') {
  const dir = icalDir.replace(/\\/g, '/');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', ...lines, 'END:VCALENDAR']
    .join('\r\n')
    .replace(/\$/g, '\\$');
  const result = spawnSync(
    'php',
    [
      '-r',
      `date_default_timezone_set('Europe/Amsterdam'); require '${dir}/dashticz_ical.php';
       $w = array();
       $list = dashticz_ical_occurrences(${JSON.stringify(ics)}, strtotime('${from}'), strtotime('${to}'), null, 500, $w);
       echo json_encode(array('list' => array_map(function ($o) {
         return array($o['title'], date('Y-m-d H:i', $o['start']), $o['end'] === null ? null : date('Y-m-d H:i', $o['end']), $o['allDay'], $o['date']);
       }, $list), 'warnings' => $w));`,
    ],
    { encoding: 'utf8' }
  );
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

function vevent(uid, ...props) {
  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    'DTSTAMP:20260101T000000Z',
    `SUMMARY:${uid}`,
    ...props,
    'END:VEVENT',
  ];
}

const AMSTERDAM = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Amsterdam',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

const starts = (result, title) =>
  result.list.filter((o) => o[0] === title).map((o) => o[1]);

test('recurrence rules that the former parsers got wrong', () => {
  const result = occurrences([
    // om/icalparser showed this every week.
    ...vevent(
      'biweekly',
      'DTSTART;TZID=Europe/Amsterdam:20260105T190000',
      'DTEND;TZID=Europe/Amsterdam:20260105T200000',
      'RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO;COUNT=4'
    ),
    // Last Friday of the month (Dashticz/dashticz#1353).
    ...vevent(
      'lastfri',
      'DTSTART:20260130T090000Z',
      'DTEND:20260130T100000Z',
      'RRULE:FREQ=MONTHLY;BYDAY=-1FR;COUNT=3'
    ),
    // om/icalparser 3.x broke BYMONTHDAY=-1.
    ...vevent(
      'lastday',
      'DTSTART:20260131T080000Z',
      'DTEND:20260131T090000Z',
      'RRULE:FREQ=MONTHLY;BYMONTHDAY=-1;COUNT=3'
    ),
    // RDATE without RRULE: om/icalparser invented yearly repeats.
    ...vevent(
      'rdate',
      'DTSTART:20260415T190000Z',
      'DTEND:20260415T200000Z',
      'RDATE:20260501T190000Z,20260601T190000Z'
    ),
    // Leap day: only in leap years, not on 1 March.
    ...vevent(
      'leap',
      'DTSTART;VALUE=DATE:20240229',
      'DTEND;VALUE=DATE:20240301',
      'RRULE:FREQ=YEARLY'
    ),
    ...AMSTERDAM,
  ]);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(starts(result, 'biweekly'), [
    '2026-01-05 19:00',
    '2026-01-19 19:00',
    '2026-02-02 19:00',
    '2026-02-16 19:00',
  ]);
  assert.deepEqual(starts(result, 'lastfri'), [
    '2026-01-30 10:00',
    '2026-02-27 10:00',
    '2026-03-27 10:00',
  ]);
  // The third one is in summer time: 08:00 UTC is 10:00 local.
  assert.deepEqual(starts(result, 'lastday'), [
    '2026-01-31 09:00',
    '2026-02-28 09:00',
    '2026-03-31 10:00',
  ]);
  assert.deepEqual(starts(result, 'rdate'), [
    '2026-04-15 21:00',
    '2026-05-01 21:00',
    '2026-06-01 21:00',
  ]);
  assert.deepEqual(starts(result, 'leap'), []);
  assert.deepEqual(
    starts(
      occurrences(
        vevent('leap', 'DTSTART;VALUE=DATE:20240229', 'RRULE:FREQ=YEARLY'),
        '2028-01-01',
        '2029-01-01'
      ),
      'leap'
    ),
    ['2028-02-29 00:00']
  );
});

test('EXDATE, moved occurrences, all-day events and Windows time zones', () => {
  const result = occurrences([
    ...vevent(
      'exdate',
      'DTSTART:20260601T100000Z',
      'DTEND:20260601T110000Z',
      'RRULE:FREQ=DAILY;COUNT=4',
      'EXDATE:20260602T100000Z'
    ),
    ...vevent(
      'moved',
      'DTSTART:20260601T100000Z',
      'DTEND:20260601T110000Z',
      'RRULE:FREQ=WEEKLY;COUNT=3'
    ),
    'BEGIN:VEVENT',
    'UID:moved',
    'DTSTAMP:20260101T000000Z',
    'RECURRENCE-ID:20260608T100000Z',
    'SUMMARY:moved later',
    'DTSTART:20260609T140000Z',
    'DTEND:20260609T150000Z',
    'END:VEVENT',
    ...vevent(
      'allday',
      'DTSTART;VALUE=DATE:20260710',
      'DTEND;VALUE=DATE:20260713'
    ),
    ...vevent('noend', 'DTSTART;VALUE=DATE:20260801'),
    ...vevent(
      'windows',
      'DTSTART;TZID=W. Europe Standard Time:20260302T083000',
      'DTEND;TZID=W. Europe Standard Time:20260302T090000'
    ),
  ]);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(starts(result, 'exdate'), [
    '2026-06-01 12:00',
    '2026-06-03 12:00',
    '2026-06-04 12:00',
  ]);
  assert.deepEqual(starts(result, 'moved'), [
    '2026-06-01 12:00',
    '2026-06-15 12:00',
  ]);
  assert.deepEqual(starts(result, 'moved later'), ['2026-06-09 16:00']);
  assert.deepEqual(
    result.list.find((o) => o[0] === 'allday'),
    ['allday', '2026-07-10 00:00', '2026-07-13 00:00', true, '2026-07-10']
  );
  assert.deepEqual(
    result.list.find((o) => o[0] === 'noend'),
    ['noend', '2026-08-01 00:00', '2026-08-02 00:00', true, '2026-08-01']
  );
  assert.deepEqual(starts(result, 'windows'), ['2026-03-02 08:30']);
});

test('one broken or endless event does not hide the rest of the calendar', () => {
  const result = occurrences([
    ...vevent(
      'endless',
      'DTSTART:19900101T000000Z',
      'DTEND:19900101T000100Z',
      'RRULE:FREQ=MINUTELY'
    ),
    ...vevent('broken', 'DTSTART:20260601T100000Z', 'RRULE:FREQ=NONSENSE'),
    ...vevent('fine', 'DTSTART:20260601T100000Z', 'DTEND:20260601T110000Z'),
  ]);
  assert.deepEqual(starts(result, 'fine'), ['2026-06-01 12:00']);
  assert.equal(result.warnings.length, 2);
  assert.match(result.warnings.join('\n'), /"endless"/);
  assert.match(result.warnings.join('\n'), /"broken"/);
});

test('every iCalendar consumer uses the shared sabre/vobject helper', () => {
  const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
  const composer = JSON.parse(read('vendor/dashticz/ical/composer.json'));
  assert.deepEqual(Object.keys(composer.require), ['sabre/vobject']);
  for (const gone of [
    'vendor/dashticz/ical/ical5',
    'vendor/dashticz/ical/vendor/om',
    'vendor/dashticz/ical/vendor/johngrogg',
  ]) {
    assert.ok(!fs.existsSync(path.join(root, gone)), `${gone} is removed`);
  }
  assert.match(
    read('vendor/dashticz/ical/index.php'),
    /dashticz_ical_occurrences\(/
  );
  assert.match(
    read('vendor/dashticz/f1/f1.php'),
    /dashticz_ical_occurrences\(/
  );
  const garbage = read('js/components/garbage.js');
  assert.match(garbage, /'ical\/index\.php'/);
  assert.doesNotMatch(garbage, /loadIcal|ICAL\./);
  assert.doesNotMatch(read('src/index.js'), /ical\.js/);
  assert.ok(!('ical.js' in JSON.parse(read('package.json')).dependencies));
});
