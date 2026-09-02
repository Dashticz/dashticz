import $ from 'jquery';
import './loader.scss';
window.jQuery = $;
window.$ = $;

import moment from './date-time.js';
window.moment = moment;
import Chart from './chart-compat.js';
window.Chart = Chart;
require('jquery-ui-dist/jquery-ui.min');
require('jquery-ui-dist/jquery-ui.min.css');
require('jquery-ui-touch-punch');
require('./bootstrap-compat.js');
require('@fortawesome/fontawesome-free/css/all.min.css');
require('@fortawesome/fontawesome-free/css/v4-shims.min.css');
window.MobileDetect = require('mobile-detect');
window.md5 = require('md5');
import Cookies from 'js-cookie';
window.Cookies = Cookies;

import Handlebars from 'handlebars';
window.Handlebars = Handlebars;

require('./templateengine.js');
require('./handlebars-helpers.js');
var Skycons = require('skycons-color');
window.Skycons = Skycons;
require('spectrum-colorpicker');
require('ion-sound');
require('hammerjs');
window.Popper = require('@popperjs/core');
window.iro = require('@jaames/iro').default;

var spotifyApiPromise;
window.loadSpotifyApi = function () {
  if (window.SpotifyWebApi) return Promise.resolve(window.SpotifyWebApi);
  if (!spotifyApiPromise) {
    spotifyApiPromise = import(
      /* webpackChunkName: "spotify-api" */ 'spotify-web-api-js'
    ).then(function (module) {
      window.SpotifyWebApi = module.default || module;
      return window.SpotifyWebApi;
    });
  }
  return spotifyApiPromise;
};

var icalPromise;
window.loadIcal = function () {
  if (window.ICAL) return Promise.resolve(window.ICAL);
  if (!icalPromise) {
    icalPromise = import(/* webpackChunkName: "ical" */ 'ical.js').then(
      function (module) {
        window.ICAL = module.default || module;
        return window.ICAL;
      }
    );
  }
  return icalPromise;
};

// Loaded statically (not via a lazy import() chunk) - on at least one real
// Android tablet, fetching the separate Swiper chunk at runtime silently
// failed (screen-switcher buttons and mouse drag on desktop still worked,
// since those don't depend on it, but touch swiping - which only Swiper
// provides - did nothing). Bundling it up front avoids that extra runtime
// fetch entirely. Only register modules used by the screen switcher; all
// configurable transition effects remain available.
import Swiper from 'swiper';
import {
  A11y,
  EffectCoverflow,
  EffectCube,
  EffectFade,
  EffectFlip,
  Keyboard,
  Pagination,
} from 'swiper/modules';
Swiper.use([
  A11y,
  EffectCoverflow,
  EffectCube,
  EffectFade,
  EffectFlip,
  Keyboard,
  Pagination,
]);
window.Swiper = Swiper;
import 'swiper/css';
import 'swiper/css/a11y';
import 'swiper/css/effect-coverflow';
import 'swiper/css/effect-cube';
import 'swiper/css/effect-fade';
import 'swiper/css/effect-flip';
import 'swiper/css/pagination';
require('long-press-event');
