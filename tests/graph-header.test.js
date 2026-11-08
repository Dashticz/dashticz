const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'js/components/graph.js'),
  'utf8'
);

/* A custom graph header is evaluated as JavaScript after the current value of
   its devices has been filled in. A text device could contain a quote, so the
   value must be turned into a number first, not pasted into the expression. */
test('graph custom header only inserts numeric device values into its expression', () => {
  assert.ok(
    source.includes(`'parseFloat("' + parseFloat(device.currentValue) + '")'`)
  );
  assert.doesNotMatch(source, /'parseFloat\("' \+ device\.currentValue/);
});

/* Custom data and customHeader formulas from the config run through
   compileGraphFormula()/evaluateGraphFormula() instead of eval(), so a
   formula only sees the variables the docs name (d, device, devices). */
function loadFormulaHelpers() {
  const start = source.indexOf('function compileGraphFormula');
  const end = source.indexOf('function createCustomData');
  assert.ok(start !== -1 && end > start, 'formula helpers not found');
  const sandbox = {};
  require('node:vm').runInNewContext(
    source.slice(start, end) +
      'this.compileGraphFormula = compileGraphFormula;' +
      'this.evaluateGraphFormula = evaluateGraphFormula;',
    sandbox
  );
  return sandbox;
}

test('graph formulas are evaluated without eval()', () => {
  assert.doesNotMatch(source, /\beval\(/);
});

test('graph custom data formulas see d', () => {
  const { compileGraphFormula } = loadFormulaHelpers();
  const nett = compileGraphFormula('d.v_43+d.v2_43-d.r1_43-d.r2_43;', ['d']);
  assert.equal(nett({ v_43: 3, v2_43: 2, r1_43: 1, r2_43: 0.5 }), 3.5);
});

test('graph customHeader formulas see device and devices', () => {
  const { evaluateGraphFormula } = loadFormulaHelpers();
  assert.equal(
    evaluateGraphFormula('"Usage: " + devices[6].Usage', {
      devices: { 6: { Usage: '5 W' } },
    }),
    'Usage: 5 W'
  );
  assert.equal(
    evaluateGraphFormula(
      'device.currentValue.split(",").slice(0,2).join("|")',
      { device: { currentValue: '1,2,3' }, devices: {} }
    ),
    '1|2'
  );
  assert.equal(
    evaluateGraphFormula(
      '(parseFloat("20")-parseFloat("18.5")).toFixed(2) + " C" // comment',
      { devices: {} }
    ),
    '1.50 C'
  );
  // Local variables of the graph code are not visible to a formula.
  assert.throws(() => evaluateGraphFormula('header', { devices: {} }));
});
