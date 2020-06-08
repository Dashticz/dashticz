require('chart.js');
window.moment = require('moment');
var $ = require('jquery');
require('jquery-ui-dist/jquery-ui.min');
require('jquery-ui-dist/jquery-ui.min.css');
//require('jquery-migrate')
require('jquery-ui-touch-punch');
require('bootstrap');
require('bootstrap/dist/css/bootstrap.min.css');
window.SpotifyWebApi = require('spotify-web-api-js');
require('@fortawesome/fontawesome-free/css/all.css');
require('mobile-detect');
/* removed from functions.js */
require('jquery.md5');
require('js-cookie');
require('script-loader!./functions.js');

var Handlebars = require('handlebars');
window.Handlebars = Handlebars;
var MomentHandler = require('handlebars.moment');
window.MomentHandler = MomentHandler;

require('./templateengine.js');
require('./handlebars-helpers.js');
var Swiper = require('swiper').default;
window.Swiper = Swiper;
require('swiper/css/swiper.min.css');

window.Skycons = require('skycons')(window);
require('spectrum-colorpicker');
require('ion-sound');
require('hammerjs');
require('chartjs-plugin-zoom');
