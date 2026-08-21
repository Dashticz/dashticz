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
window.SpotifyWebApi = require('spotify-web-api-js');
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
window.ICAL = require('ical.js');

// Loaded statically (not via a lazy import() chunk) - on at least one real
// Android tablet, fetching the separate Swiper chunk at runtime silently
// failed (screen-switcher buttons and mouse drag on desktop still worked,
// since those don't depend on it, but touch swiping - which only Swiper
// provides - did nothing). Bundling it up front avoids that extra runtime
// fetch entirely.
import Swiper from 'swiper/bundle';
window.Swiper = Swiper;
import 'swiper/css/bundle';
require('long-press-event');
