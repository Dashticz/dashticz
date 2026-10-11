const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadMoonPhase() {
  const context = {};
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'js/moon.js'), 'utf8') +
      '\nthis.MoonPhase = MoonPhase;',
    context
  );
  return context.MoonPhase;
}

/* The Button widget shows img/moon/moon.NN.png for the phase of today
   (js/components/button.js getMoonInfo). These are well known moments of the
   lunar cycle: the phase is 0/1 at new moon, 0.25 at first quarter, 0.5 at
   full moon and 0.75 at last quarter. */
test('moon phase matches known new, quarter and full moons', () => {
  const MoonPhase = loadMoonPhase();
  const cases = [
    ['2000-01-06T18:14:00Z', 'New Moon', 1, 0],
    ['2000-01-14T13:34:00Z', 'First Quarter', 0.25, 0.5],
    ['2000-01-21T04:40:00Z', 'Full Moon', 0.5, 1],
    ['2000-01-28T07:57:00Z', 'Third Quarter', 0.75, 0.5],
    ['2026-10-10T12:00:00Z', 'New Moon', 1, 0],
  ];
  for (const [iso, name, phase, illum] of cases) {
    const moon = new MoonPhase(new Date(iso));
    assert.equal(moon.phaseName(), name, iso);
    assert.ok(Math.abs(moon.phase() - phase) < 0.01, `${iso} phase`);
    assert.ok(Math.abs(moon.illum() - illum) < 0.01, `${iso} illum`);
  }
});

test('moon phase image index stays within the 100 images of img/moon', () => {
  const MoonPhase = loadMoonPhase();
  for (let day = 0; day < 60; day++) {
    const moon = new MoonPhase(new Date(Date.UTC(2026, 9, 1 + day, 12)));
    const index = parseInt(moon.phase() * 100 + 50) % 100;
    assert.ok(index >= 0 && index <= 99, `day ${day}: ${index}`);
    assert.ok(
      fs.existsSync(
        path.join(
          __dirname,
          '..',
          'img/moon',
          `moon.${('0' + index).slice(-2)}.png`
        )
      ),
      `image for index ${index}`
    );
  }
});

/* The quarter methods and age() are not used by the dashboard yet, but they
   used to throw or return NaN because the quarters were never calculated. */
test('moon quarters, next quarters and age are calculated', () => {
  const MoonPhase = loadMoonPhase();
  const minutes = 60;
  const close = (seconds, iso, label) =>
    assert.ok(
      Math.abs(seconds - Date.parse(iso) / 1000) < 5 * minutes,
      `${label}: ${new Date(seconds * 1000).toISOString()} vs ${iso}`
    );

  const january = new MoonPhase(new Date('2000-01-10T00:00:00Z'));
  close(january.newMoon(), '2000-01-06T18:14:00Z', 'new moon');
  close(january.firstQuarter(), '2000-01-14T13:34:00Z', 'first quarter');
  close(january.fullMoon(), '2000-01-21T04:40:00Z', 'full moon');
  close(january.lastQuarter(), '2000-01-28T07:57:00Z', 'last quarter');
  close(january.nextNewMoon(), '2000-02-05T13:03:00Z', 'next new moon');

  const october = new MoonPhase(new Date('2026-10-25T12:00:00Z'));
  close(october.newMoon(), '2026-10-10T15:50:00Z', 'new moon 2026');

  for (const iso of ['2000-01-10T00:00:00Z', '2026-10-25T12:00:00Z']) {
    const moon = new MoonPhase(new Date(iso));
    const sequence = [
      moon.newMoon(),
      moon.firstQuarter(),
      moon.fullMoon(),
      moon.lastQuarter(),
      moon.nextNewMoon(),
      moon.nextFirstQuarter(),
      moon.nextFullMoon(),
      moon.nextLastQuarter(),
    ];
    for (let i = 1; i < sequence.length; i++) {
      const days = (sequence[i] - sequence[i - 1]) / 86400;
      assert.ok(days > 6.5 && days < 8.5, `${iso}: step ${i} is ${days} days`);
    }
    assert.ok(moon.age() >= 0 && moon.age() < 29.6, `${iso} age ${moon.age()}`);
  }
});
