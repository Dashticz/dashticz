/* global number_format*/

var coinsvalue = [];

var COIN_REFRESH_MS = 60000;
var COIN_SYMBOLS = { EUR: '€', GBP: '£', USD: '$' };

// eslint-disable-next-line no-unused-vars
function getCoin(coin) {
  appendCoin(coin);
  setTimeout(function () {
    getCoin(coin);
  }, COIN_REFRESH_MS);
}

function coinEscape(text) {
  return $('<div>').text(String(text)).html();
}

/* Prices come from the CoinGecko public API. coin.key is the CoinGecko coin
   id (for example 'bitcoin'); the former CoinMarketCap v1 ticker and LiteBit
   endpoints no longer exist, so coin.source is ignored. */
function appendCoin(coin) {
  var currency = String(coin['currency'] || 'USD').toUpperCase();
  var symbol = COIN_SYMBOLS[currency] || currency + ' ';
  $.getJSON(
    'https://api.coingecko.com/api/v3/simple/price?ids=' +
      encodeURIComponent(coin['key']) +
      '&vs_currencies=' +
      encodeURIComponent(currency.toLowerCase()),
    function (data) {
      var entry = data && data[coin['key']];
      var price = entry && entry[currency.toLowerCase()];
      if (typeof price !== 'number') return;

      var name = coinEscape(String(coin['key']).toUpperCase());
      var html;
      if (
        typeof coin['amount'] !== 'undefined' &&
        parseFloat(coin['amount']) > 0
      ) {
        html =
          '<div class="col-xs-6 col-data">' +
          name +
          '<br /><strong class="title">' +
          symbol +
          number_format(price, 2) +
          '</strong><br>' +
          '<span class="state">' +
          coinEscape(coin['amount']) +
          '</span>' +
          '</div>' +
          '<div class="col-xs-6 col-data col-currency">' +
          symbol +
          number_format(price * coin['amount'], 2) +
          '</div>';
      } else {
        html =
          '<div class="col-xs-12 col-data">' +
          name +
          '<br /><strong class="title">' +
          symbol +
          number_format(price, 2) +
          '</strong><br>' +
          '</div>';
      }

      coinsvalue[coin['key']] = price;
      $('.coins-' + coin['key']).html(html);
    }
  );
}
