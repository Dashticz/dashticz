const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const icalDir = path.join(root, 'vendor/dashticz/ical');

/* One single event and one weekly series whose UNTIL is the start of its
   last occurrence (inclusive per RFC 5545). The bridge only looks about a
   year ahead, so the dates are relative to now (whole hours, UTC). */
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
   query from argv in that case) with the given parser method. */
function runBridge(url, method) {
  return new Promise((resolve, reject) => {
    const query = new URLSearchParams({
      url,
      method: String(method),
      maxitems: '50',
      history: '3650',
    }).toString();
    const child = spawn('php', ['index.php', query], { cwd: icalDir });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

/* Method 0 is the legacy SG_iCal parser: it is only checked for the first
   occurrence (its recurrence expansion differs) and, on PHP 8.1+, reports
   deprecations in "_errors". Methods 1
   (om/icalparser) and 2 (johngrogg/ics-parser, the vendored copy kept up to
   date with Composer) expand the series and honour the inclusive UNTIL.
   Method 2 must not put PHP warnings into the JSON (method 1 reports a
   harmless "Timezone ID 'Z'" warning for UTC times). */
test('ical bridge returns the events of every parser method', async () => {
  const server = await serveIcs();
  try {
    const url = `http://127.0.0.1:${server.address().port}/test.ics`;
    for (const method of [0, 1, 2]) {
      const { code, stdout } = await runBridge(url, method);
      assert.equal(code, 0, `method ${method} exit code`);
      let events;
      try {
        events = JSON.parse(stdout);
      } catch (e) {
        assert.fail(`method ${method} did not return clean JSON: ${stdout}`);
      }
      const list = Object.values(events).filter(
        (event) => event && typeof event === 'object' && !Array.isArray(event)
      );
      const titles = (name) => list.filter((event) => event.title === name);
      assert.equal(titles('Single event').length, 1, `method ${method}`);
      const starts = titles('Weekly event')
        .map((event) => event.start)
        .sort((a, b) => a - b);
      if (method === 0) {
        assert.equal(starts[0], weekly[0], 'method 0 first occurrence');
      } else {
        assert.deepEqual(starts, weekly, `method ${method} occurrences`);
      }
      if (method === 2) {
        assert.deepEqual(events._errors || [], [], 'method 2 _errors');
      }
    }
  } finally {
    server.close();
  }
});
