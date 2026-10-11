const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');

function load() {
  const requests = [];
  const mounted = {};
  const timers = [];
  const context = {
    requests,
    mounted,
    timers,
    number_format: (value, decimals) => Number(value).toFixed(decimals),
    setTimeout: (fn, ms) => timers.push(ms),
    $: Object.assign(
      (selector) => {
        if (typeof selector === 'string' && selector[0] === '<') {
          let text = '';
          return {
            text(value) {
              text = String(value);
              return this;
            },
            html() {
              return text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
            },
          };
        }
        return { html: (html) => (mounted[selector] = html) };
      },
      {
        getJSON: (url, callback) => requests.push({ url, callback }),
      }
    ),
  };
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(root, 'js/coins.js'), 'utf8') +
      '\nthis.getCoin = getCoin; this.coinsvalue = coinsvalue;',
    context
  );
  return context;
}

test('coins are fetched from CoinGecko with the block key and currency', () => {
  const ctx = load();
  ctx.getCoin({ key: 'bitcoin', currency: 'EUR' });
  assert.equal(
    ctx.requests[0].url,
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur'
  );
  assert.deepEqual(ctx.timers, [60000]);
});

test('a price is rendered with its currency symbol and amount value', () => {
  const ctx = load();
  ctx.getCoin({ key: 'bitcoin', currency: 'EUR', amount: 2 });
  ctx.requests[0].callback({ bitcoin: { eur: 1000.5 } });
  const html = ctx.mounted['.coins-bitcoin'];
  assert.match(html, /BITCOIN/);
  assert.match(html, /€1000\.50/);
  assert.match(html, /€2001\.00/);
  assert.equal(ctx.coinsvalue.bitcoin, 1000.5);
});

test('a response without a price leaves the block unchanged', () => {
  const ctx = load();
  ctx.getCoin({ key: 'bitcoin', currency: 'EUR' });
  ctx.requests[0].callback({});
  assert.equal(ctx.mounted['.coins-bitcoin'], undefined);
});
