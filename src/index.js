require("chart.js");
window.moment = require("moment");
require('jquery');
//require('jquery-ui')
require("jquery-ui/ui/widgets/tabs");
require("jquery-ui/ui/widgets/slider");
require('jquery-ui/themes/base/all.css');
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
require("script-loader!./functions.js");

var Handlebars=require("handlebars")
window.Handlebars = Handlebars;

require('./templateengine.js');
var Swiper = require('swiper').default;
window.Swiper = Swiper;
require( 'swiper/css/swiper.min.css');

window.Skycons = require("skycons")(window);
require('spectrum-colorpicker');
require('ion-sound');
require('hammerjs');
require('chartjs-plugin-zoom');
