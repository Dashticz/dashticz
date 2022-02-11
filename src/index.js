window.moment = require('moment');
require('chart.js');
var $ = require('jquery');
require('jquery-ui-dist/jquery-ui.min');
require('jquery-ui-dist/jquery-ui.min.css');
//require('jquery-migrate')
require('jquery-ui-touch-punch');
require('bootstrap');
require('bootstrap/dist/css/bootstrap.min.css');
window.SpotifyWebApi = require('spotify-web-api-js');
// Next line doesn't give the right results on IE11
require('@fortawesome/fontawesome-free/css/all.min.css');
//require('@fortawesome/fontawesome-free');
//Workaround: manually add the css  in main.js
// Important!!: Manually copy the fonts from node_modules/@fortawesome/fontawesome-free/webfonts to ./webfonts
// cp ./node_modules/@fortawesome/fontawesome-free/webfonts/* ./webfonts/
// and  ./node_modules/@fortawesome/fontawesome-free/css/all.min.css to ./vendor/fontawesome-free/css
// cp ./node_modules/@fortawesome/fontawesome-free/css/all.min.css ./vendor/fontawesome-free/css/
require('mobile-detect');
// removed from functions.js
window.md5 = require('md5');
require('js-cookie');
require('script-loader!./functions.js');

var Handlebars = require('handlebars/dist/cjs/handlebars');
//import Handlebars from 'handlebars/dist/cjs/handlebars'
window.Handlebars = Handlebars;
var MomentHandler = require('handlebars.moment');
window.MomentHandler = MomentHandler;

require('./templateengine.js');
require('./handlebars-helpers.js');
var Swiper = require('swiper/bundle').default;
window.Swiper = Swiper;
//require('swiper/swiper-bundle.min.css');
import 'swiper/css/bundle'

//window.Skycons =
var Skycons=require('skycons-color');
window.Skycons = Skycons;
require('spectrum-colorpicker');
require('ion-sound');
require('hammerjs');
require('chartjs-plugin-zoom');
window.Popper = require('@popperjs/core');
window.iro = require('@jaames/iro').default;
window.ICAL = require('ical.js');
