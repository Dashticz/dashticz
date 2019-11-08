require("chart.js");
window.moment = require("moment");
require('webpack-jquery-ui');
require('webpack-jquery-ui/css');
require('jquery-ui-touch-punch');
require('bootstrap');
require('bootstrap/dist/css/bootstrap.min.css');
window.SpotifyWebApi = require('spotify-web-api-js');
require('@fortawesome/fontawesome-free/css/all.css')
require('mobile-detect');
/* removed from functions.js */
require('jquery.md5');
require('js-cookie')
require("script-loader!./functions.js")

import {
    Swiper,
    Navigation,
    Pagination,
    Scrollbar,
    Keyboard
} from 'swiper/js/swiper.esm.js';
import 'swiper/css/swiper.min.css'

// Install modules
Swiper.use([Navigation, Pagination, Scrollbar, Keyboard]);
window.Swiper = Swiper