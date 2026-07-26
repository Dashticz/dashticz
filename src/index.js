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

import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import 'swiper/css/effect-cube';
import 'swiper/css/effect-coverflow';
import 'swiper/css/effect-flip';

var swiperLoader;
window.loadSwiper = function () {
  if (window.Swiper) return Promise.resolve(window.Swiper);
  if (swiperLoader) return swiperLoader;
  swiperLoader = Promise.all([import('swiper'), import('swiper/modules')]).then(
    function (modules) {
      var Swiper = modules[0].default;
      var swiperModules = modules[1];
      Swiper.use([
        swiperModules.Pagination,
        swiperModules.Keyboard,
        swiperModules.EffectFade,
        swiperModules.EffectCube,
        swiperModules.EffectCoverflow,
        swiperModules.EffectFlip,
      ]);
      window.Swiper = Swiper;
      return Swiper;
    }
  );
  return swiperLoader;
};
require('long-press-event');
