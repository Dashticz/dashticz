import $ from 'jquery';
window.jQuery = $;
window.$ = $;

window.moment = require('moment');
import Chart from 'chart.js/auto';
window.Chart = Chart;
import 'chartjs-adapter-moment';
import zoomPlugin from 'chartjs-plugin-zoom';
Chart.register(zoomPlugin);
require('jquery-ui-dist/jquery-ui.min');
require('jquery-ui-dist/jquery-ui.min.css');
require('jquery-ui-touch-punch');
require('bootstrap');
//require('bootstrap/dist/css/bootstrap.min.css'); //Preloaded via ./src/loader.scss
window.SpotifyWebApi = require('spotify-web-api-js');
require('@fortawesome/fontawesome-free/css/all.min.css');
window.MobileDetect=require('mobile-detect');
// removed from functions.js
window.md5 = require('md5');
//require('js-cookie');
import Cookies from 'js-cookie';
window.Cookies = Cookies;
//var Handlebars = require('handlebars');

import Handlebars from 'handlebars';
window.Handlebars = Handlebars;
var MomentHandler = require('handlebars.moment');
window.MomentHandler = MomentHandler;

require('./templateengine.js');
require('./handlebars-helpers.js');
var Skycons=require('skycons-color');
window.Skycons = Skycons;
require('spectrum-colorpicker');
require('ion-sound');
require('hammerjs');
window.Popper = require('@popperjs/core');
window.iro = require('@jaames/iro').default;
window.ICAL = require('ical.js');

//var Swiper = require('swiper/swiper-bundle.min.js');
import Swiper from 'swiper/bundle';
window.Swiper = Swiper;
//require('swiper/swiper-bundle.min.css');
import 'swiper/css/bundle';
require('long-press-event');
