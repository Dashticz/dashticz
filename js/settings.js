/* global language dashticz_version dashticz_branch newVersion config isNumeric Domoticz*/
var settingList = {};
settingList.general = {
  title: language.settings.general.title,
  domoticz_ip: {
    title: language.settings.general.domoticz_ip,
    type: 'text',
    help: language.settings.general.domoticz_ip_help
  },
  app_title: {
    title:language.settings.general.app_title,
    type: 'text'
  },
  domoticz_refresh: {
    title: language.settings.general.domoticz_refresh,
    type: 'text',
    help: language.settings.general.domoticz_refresh_help,
  },
  dashticz_refresh: {
    title: language.settings.general.dashticz_refresh,
    type: 'text',
    help: language.settings.general.dashticz_refresh_help
  },
  disable_update_check: {
    title: language.settings.general.disable_update_check,
    type: 'checkbox'
  },
  loginEnabled: {
    title: language.settings.general.loginEnabled,
    type: 'checkbox',
    help: language.settings.general.loginEnabled_help
  },
  login_timeout: {
    title: language.settings.general.login_timeout,
    type: 'text'
  },
  user_name: {
    title: language.settings.general.user_name,
    type: 'text',
    help: language.settings.general.user_name_help
  },
  pass_word: {
    title: language.settings.general.pass_word,
    type: 'text',
  },
  enable_websocket: {
    title: language.settings.general.enable_websocket,
    type: 'checkbox',
    help: language.settings.general.enable_websocket_help
  },
  domoticz_timeout: {
    title: language.settings.general.domoticz_timeout,
    type: 'text',
    help: language.settings.general.domoticz_timeout_help
  },
  auto_positioning: {
    title: language.settings.general.auto_positioning,
    type: 'checkbox',
    help: language.settings.general.auto_positioning_help
  },
  use_favorites: {
    title: language.settings.general.use_favorites,
    type: 'checkbox',
    help: language.settings.general.use_favorites_help
  },
  use_hidden: {
    title: language.settings.general.use_hidden,
    type: 'checkbox',
    help: language.settings.general.use_hidden_help
  },
  room_plan: {
    title: language.settings.general.room_plan,
    type: 'text',
    help: language.settings.general.room_plan_help
  },
  colorpicker: {
    title: language.settings.general.colorpicker,
    help: language.settings.general.colorpicker_help,
    type: 'select',
    options: [
      language.settings.general.colorpicker_none,
      language.settings.general.colorpicker_old,
      language.settings.general.colorpicker_new
    ]
  },
  colorpickerscale: {
    title: language.settings.general.colorpickerscale,
    type: 'text',
    help: language.settings.general.colorpickerscale_help
  },
  last_update: {
    title: language.settings.general.last_update,
    type: 'checkbox'
  },
  disable_googleanalytics: {
    title: language.settings.general.disable_googleanalytics,
    help: language.settings.general.disable_googleanalytics_help,
    type: 'checkbox'
  },
  default_cors_url: {
    title: language.settings.general.default_cors_url,
    type: 'text',
  },
  dashticz_php_path: {
    title: language.settings.general.dashticz_php_path,
    type: 'text'
  },
};

settingList['screen'] = {};
settingList['screen']['title'] = language.settings.screen.title;

settingList['screen']['topbar_timeout'] = {};
settingList['screen']['topbar_timeout']['title'] =
  language.settings.screen.topbar_timeout ||
  'Topbar auto-hide (seconds, 0 = off)';
settingList['screen']['topbar_timeout']['type'] = 'text';
settingList['screen']['topbar_timeout']['help'] =
  language.settings.screen.topbar_timeout_help ||
  'Hide the topbar after this many seconds. Move the pointer to the top of the screen to show it again.';

settingList['screen']['show_topbar_clock'] = {
  title:
    language.settings.screen.show_topbar_clock ||
    'Show clock in topbar',
  type: 'checkbox',
  help:
    language.settings.screen.show_topbar_clock_help ||
    'Show the date/time clock in the topbar.',
};

settingList['screen']['theme'] = {};
settingList['screen']['theme']['title'] =
  language.settings.screen.dashticz_themes;
settingList['screen']['theme']['type'] = 'text';
settingList['screen']['theme']['help'] =
  language.settings.screen.dashticz_themes_help;

settingList['screen']['background_image'] = {};
settingList['screen']['background_image']['title'] =
  language.settings.screen.background_image;
settingList['screen']['background_image']['type'] = 'text';
settingList['screen']['background_image']['help'] =
  language.settings.screen.background_image.help;
settingList['screen']['background_image']['picker'] = true;

settingList['screen']['start_page'] = {};
settingList['screen']['start_page']['title'] =
  language.settings.screen.start_page;
settingList['screen']['start_page']['type'] = 'text';

settingList['screen']['enable_swiper'] = {
  title: language.settings.screen.enable_swiper,
  type: 'text',
  help: language.settings.screen.enable_swiper_help,
};

settingList['screen']['swiper_touch_move'] = {
  title: language.settings.screen.swiper_touch_move,
  type: 'checkbox',
  help: language.settings.screen.swiper_touch_move_help,
};

settingList['screen']['vertical_scroll'] = {
  title: language.settings.screen.vertical_scroll,
  type: 'text',
  help: language.settings.screen.vertical_scroll_help,
};

settingList['screen']['auto_swipe_back_to'] = {};
settingList['screen']['auto_swipe_back_to']['title'] =
  language.settings.screen.auto_swipe_back_to;
settingList['screen']['auto_swipe_back_to']['type'] = 'text';
settingList['screen']['auto_swipe_back_to']['help'] =
  language.settings.screen.auto_swipe_back_to_help;

settingList['screen']['auto_swipe_back_after'] = {};
settingList['screen']['auto_swipe_back_after']['title'] =
  language.settings.screen.auto_swipe_back_after;
settingList['screen']['auto_swipe_back_after']['type'] = 'text';

settingList['screen']['auto_slide_pages'] = {};
settingList['screen']['auto_slide_pages']['title'] =
  language.settings.screen.auto_slide_pages;
settingList['screen']['auto_slide_pages']['type'] = 'text';

settingList['screen']['slide_effect'] = {};
settingList['screen']['slide_effect']['title'] =
  language.settings.screen.slide_effect;
settingList['screen']['slide_effect']['type'] = 'select';
settingList['screen']['slide_effect']['options'] = {};
settingList['screen']['slide_effect']['options']['slide'] = 'slide';
settingList['screen']['slide_effect']['options']['fade'] = 'fade';
settingList['screen']['slide_effect']['options']['cube'] = 'cube';
settingList['screen']['slide_effect']['options']['coverflow'] = 'coverflow';
settingList['screen']['slide_effect']['options']['flip'] = 'flip';

settingList['screen']['standard_graph'] = {};
settingList['screen']['standard_graph']['title'] =
  language.settings.screen.standard_graph;
settingList['screen']['standard_graph']['type'] = 'select';
settingList['screen']['standard_graph']['options'] = {};
settingList['screen']['standard_graph']['options']['hours'] =
  language.graph.last_hours;
settingList['screen']['standard_graph']['options']['month'] =
  language.graph.last_month;
settingList['screen']['standard_graph']['options']['day'] =
  language.graph.today;

settingList['screen']['blink_color'] = {};
settingList['screen']['blink_color']['title'] =
  language.settings.screen.blink_color;
settingList['screen']['blink_color']['type'] = 'text';
settingList['screen']['blink_color']['help'] =
  language.settings.screen.blink_color_help;

settingList['screen']['edit_mode'] = {};
settingList['screen']['edit_mode']['title'] =
  language.settings.screen.edit_mode;
settingList['screen']['edit_mode']['type'] = 'checkbox';

settingList['localize'] = {};
settingList['localize']['title'] = language.settings.localize.title;

settingList['localize']['language'] = {};
settingList['localize']['language']['title'] =
  language.settings.localize.language;
settingList['localize']['language']['type'] = 'select';
settingList['localize']['language']['options'] = {};
settingList['localize']['language']['options']['zh_CN'] =
  language.settings.localize.cn;
settingList['localize']['language']['options']['cs_CZ'] =
  language.settings.localize.cs;
settingList['localize']['language']['options']['da_DK'] =
  language.settings.localize.da;
settingList['localize']['language']['options']['de_DE'] =
  language.settings.localize.de;
settingList['localize']['language']['options']['en_US'] =
  language.settings.localize.en;
settingList['localize']['language']['options']['es_ES'] =
  language.settings.localize.es;
settingList['localize']['language']['options']['fi_FI'] =
  language.settings.localize.fi;
settingList['localize']['language']['options']['fr_FR'] =
  language.settings.localize.fr;
settingList['localize']['language']['options']['hu_HU'] =
  language.settings.localize.hu;
settingList['localize']['language']['options']['it_IT'] =
  language.settings.localize.it;
settingList['localize']['language']['options']['ja_JP'] =
  language.settings.localize.ja;
settingList['localize']['language']['options']['lt_LT'] =
  language.settings.localize.lt;
settingList['localize']['language']['options']['nl_NL'] =
  language.settings.localize.nl;
settingList['localize']['language']['options']['nb_NO'] =
  language.settings.localize.no;
settingList['localize']['language']['options']['pl_PL'] =
  language.settings.localize.pl;
settingList['localize']['language']['options']['pt_PT'] =
  language.settings.localize.pt;
settingList['localize']['language']['options']['ro_RO'] =
  language.settings.localize.ro;
settingList['localize']['language']['options']['ru_RU'] =
  language.settings.localize.ru;
settingList['localize']['language']['options']['sk_SK'] =
  language.settings.localize.sk;
settingList['localize']['language']['options']['sl_SL'] =
  language.settings.localize.sl;
settingList['localize']['language']['options']['sr_RS'] =
  language.settings.localize.sr;
settingList['localize']['language']['options']['sv_SE'] =
  language.settings.localize.sv;
settingList['localize']['language']['options']['uk_UA'] =
  language.settings.localize.uk;

settingList['localize']['timeformat'] = {};
settingList['localize']['timeformat']['title'] =
  language.settings.localize.timeformat;
settingList['localize']['timeformat']['type'] = 'text';

/* Moved to widget editor (calendar widget settings)
settingList['localize']['calendarformat'] = ...
settingList['localize']['calendarlanguage'] = ...
settingList['localize']['calendarurl'] = ...
*/

settingList['localize']['speak_lang'] = {};
settingList['localize']['speak_lang']['title'] =
  language.settings.localize.speak_language;
settingList['localize']['speak_lang']['type'] = 'select';
settingList['localize']['speak_lang']['options'] = {};
settingList['localize']['speak_lang']['options']['de-DE'] =
  language.settings.localize.de;
settingList['localize']['speak_lang']['options']['en-US'] =
  language.settings.localize.en;
settingList['localize']['speak_lang']['options']['es-ES'] =
  language.settings.localize.es;
settingList['localize']['speak_lang']['options']['fr-FR'] =
  language.settings.localize.fr;
settingList['localize']['speak_lang']['options']['it-IT'] =
  language.settings.localize.it;
settingList['localize']['speak_lang']['options']['nl-NL'] =
  language.settings.localize.nl;
settingList['localize']['speak_lang']['options']['pl-PL'] =
  language.settings.localize.pl;
settingList['localize']['speak_lang']['options']['ru-RU'] =
  language.settings.localize.ru;

settingList['media'] = {};
settingList['media']['title'] = language.settings.media.title;

settingList['media']['switch_horizon'] = {};
settingList['media']['switch_horizon']['title'] =
  language.settings.media.switch_horizon;
settingList['media']['switch_horizon']['type'] = 'text';
settingList['media']['switch_horizon']['help'] =
  language.settings.media.switch_horizon_help;

settingList['media']['host_nzbget'] = {};
settingList['media']['host_nzbget']['title'] =
  language.settings.media.host_nzbget;
settingList['media']['host_nzbget']['type'] = 'text';
settingList['media']['host_nzbget']['help'] =
  language.settings.media.host_nzbget_help;

settingList['media']['hide_mediaplayer'] = {};
settingList['media']['hide_mediaplayer']['title'] =
  language.settings.media.hide_mediaplayer;
settingList['media']['hide_mediaplayer']['type'] = 'checkbox';

/* Widget settings shown as tiles in Custom mode (not Wizard). */
var weatherIconOptions = {
  line: 'Dynamic line icons',
  linestatic: 'Static version of the line icons',
  fill: 'Dynamic filled icons',
  static: 'Static icons',
  meteo: 'Alternative set of static icons',
};

var widgetEditorTranslations =
  (language.settings && language.settings.widgeteditor) || {};

var widgetSettingTiles = [
  {
    id: 'weather',
    title: widgetEditorTranslations.weather_title || 'Weather',
    icon: 'fas fa-cloud-sun-rain',
    settings: {
      owm_api: { title: language.settings.weather.owm_api, type: 'text' },
      owm_city: { title: language.settings.weather.owm_city, type: 'text' },
      owm_name: { title: language.settings.weather.owm_name, type: 'text' },
      owm_country: { title: language.settings.weather.owm_country, type: 'text' },
      owm_lang: {
        title: language.settings.weather.owm_lang,
        type: 'text',
        help: language.settings.weather.owm_lang_help,
      },
      owm_cnt: {
        title: language.settings.weather.owm_cnt,
        type: 'text',
        help: language.settings.weather.owm_cnt_help,
      },
      owm_days: {
        title: language.settings.weather.owm_days,
        type: 'checkbox',
        help: language.settings.weather.owm_days_help,
      },
      owm_min: {
        title: language.settings.weather.owm_min,
        type: 'checkbox',
        help: language.settings.weather.owm_min_help,
      },
      weather_show_rain: {
        title:
          (language.settings.weather && language.settings.weather.show_rain) ||
          'Show rain',
        type: 'checkbox',
      },
      weather_show_description: {
        title:
          (language.settings.weather &&
            language.settings.weather.show_description) ||
          'Show description',
        type: 'checkbox',
      },
      weather_show_wind: {
        title:
          (language.settings.weather && language.settings.weather.show_wind) ||
          'Show wind',
        type: 'checkbox',
      },
      weather_show_gust: {
        title:
          (language.settings.weather && language.settings.weather.show_gust) ||
          'Show gust',
        type: 'checkbox',
      },
      weather_icons: {
        title:
          (language.settings.weather && language.settings.weather.icons) ||
          'Weather icons',
        type: 'select',
        options: weatherIconOptions,
      },
      wu_api: { title: language.settings.weather.wu_api, type: 'text' },
      wu_city: { title: language.settings.weather.wu_city, type: 'text' },
      wu_name: { title: language.settings.weather.wu_name, type: 'text' },
      wu_country: { title: language.settings.weather.wu_country, type: 'text' },
      use_fahrenheit: {
        title: language.settings.weather.use_fahrenheit,
        type: 'checkbox',
      },
      use_beaufort: {
        title: language.settings.weather.use_beaufort,
        type: 'checkbox',
      },
      translate_windspeed: {
        title: language.settings.weather.translate_windspeed,
        type: 'checkbox',
        help: language.settings.weather.translate_windspeed_help,
      },
    },
  },
  {
    id: 'clock',
    title: widgetEditorTranslations.clock_title || 'Clock',
    icon: 'fas fa-clock',
    settings: {
      clock_size: {
        title:
          (language.settings.widgets && language.settings.widgets.clock_size) ||
          'Size (px)',
        type: 'text',
        help:
          (language.settings.widgets &&
            language.settings.widgets.clock_size_help) ||
          'Empty = fit to tile width. Example: 120',
      },
      clock_scale: {
        title:
          (language.settings.widgets && language.settings.widgets.clock_scale) ||
          'Scale',
        type: 'text',
        help:
          (language.settings.widgets &&
            language.settings.widgets.clock_scale_help) ||
          'Relative scale factor, e.g. 0.75 (default 1)',
      },
      boss_stationclock: {
        title: language.settings.localize.boss_stationclock,
        type: 'select',
        options: {
          NoBoss: 'NoBoss',
          BlackBoss: 'BlackBoss',
          RedBoss: 'RedBoss',
          ViennaBoss: 'ViennaBoss',
        },
      },
      hide_seconds: {
        title: language.settings.localize.hide_seconds,
        type: 'checkbox',
      },
      hide_seconds_stationclock: {
        title: language.settings.localize.hide_seconds_stationclock,
        type: 'checkbox',
      },
    },
  },
  {
    id: 'garbage',
    title: widgetEditorTranslations.garbage_title || 'Garbage',
    icon: 'fas fa-trash-alt',
    settings: {
      garbage_company: {
        title: language.settings.garbage.garbage_company,
        type: 'text',
      },
      garbage_zipcode: {
        title: language.settings.garbage.garbage_zipcode,
        type: 'text',
      },
      garbage_street: {
        title: language.settings.garbage.garbage_street,
        type: 'text',
      },
      garbage_housenumber: {
        title: language.settings.garbage.garbage_housenumber,
        type: 'text',
      },
      garbage_housenumberadd: {
        title: language.settings.garbage.garbage_housenumberaddition,
        type: 'text',
      },
      garbage_maxitems: {
        title: language.settings.garbage.garbage_maxitems,
        type: 'text',
      },
      garbage_width: {
        title: language.settings.garbage.garbage_width,
        type: 'text',
      },
      garbage_icalurl: {
        title: language.settings.garbage.garbage_icalurl,
        type: 'text',
      },
      google_api_key: {
        title: language.settings.garbage.google_api_key,
        type: 'text',
        help: language.settings.garbage.google_api_key_help,
      },
      garbage_calendar_id: {
        title: language.settings.garbage.garbage_calendar_id,
        type: 'text',
        help: language.settings.garbage.garbage_calendar_id_help,
      },
      garbage_hideicon: {
        title: language.settings.garbage.garbage_hideicon,
        type: 'checkbox',
      },
      garbage_icon_use_colors: {
        title: language.settings.garbage.garbage_icon_use_colors,
        type: 'checkbox',
      },
      garbage_use_colors: {
        title: language.settings.garbage.garbage_use_colors,
        type: 'checkbox',
      },
      garbage_use_names: {
        title: language.settings.garbage.garbage_use_names,
        type: 'checkbox',
      },
      garbage_use_cors_prefix: {
        title: language.settings.garbage.garbage_use_cors_prefix,
        type: 'checkbox',
        help: language.settings.garbage.garbage_use_prefix_help,
      },
    },
  },
  {
    id: 'calendar',
    title: widgetEditorTranslations.calendar_title || 'Calendar',
    icon: 'fas fa-calendar-alt',
    settings: {
      calendarformat: {
        title: language.settings.localize.calendarformat,
        type: 'text',
      },
      calendarlanguage: {
        title: language.settings.localize.calendarlanguage,
        type: 'text',
      },
      calendarurl: {
        title: language.settings.localize.calendarurl || 'Calendar URL',
        type: 'text',
      },
    },
  },
  {
    id: 'sonarr',
    title: widgetEditorTranslations.sonarr_title || 'Sonarr',
    icon: 'fas fa-tv',
    settings: {
      sonarr_url: {
        title: language.settings.media.sonarr_url,
        type: 'text',
      },
      sonarr_apikey: {
        title: language.settings.media.sonarr_apikey,
        type: 'text',
      },
      sonarr_maxitems: {
        title: language.settings.media.sonarr_maxitems,
        type: 'text',
      },
    },
  },
  {
    id: 'spotify',
    title: widgetEditorTranslations.spotify_title || 'Spotify',
    icon: 'fab fa-spotify',
    settings: {
      spot_clientid: {
        title: language.settings.media.spot_clientid,
        type: 'text',
      },
    },
  },
  {
    id: 'secpanel',
    title: widgetEditorTranslations.secpanel_title || 'Security panel',
    icon: 'fas fa-shield-alt',
    settings: {
      security_button_icons: {
        title: language.settings.screen.security_button_icons,
        type: 'checkbox',
      },
      security_panel_lock: {
        title: language.settings.screen.security_panel_lock,
        type: 'checkbox',
        help: language.settings.screen.security_panel_lock_help,
      },
    },
  },
  {
    id: 'publictransport',
    title:
      widgetEditorTranslations.publictransport_title || 'Public transport',
    icon: 'fas fa-train',
    settings: {},
  },
  {
    id: 'trafficinfo',
    title: widgetEditorTranslations.trafficinfo_title || 'Traffic information',
    icon: 'fas fa-car',
    settings: {
      anwb_apikey: {
        title:
          (language.settings.widgets && language.settings.widgets.anwb_apikey) ||
          'ANWB API key',
        type: 'text',
        help:
          (language.settings.widgets &&
            language.settings.widgets.anwb_apikey_help) ||
          'API key for ANWB traffic info (trafficinfo widget).',
      },
    },
  },
  {
    id: 'alarmmeldingen',
    title: widgetEditorTranslations.alarmmeldingen_title || '112',
    icon: 'fas fa-bullhorn',
    settings: {},
  },
  {
    id: 'camera',
    title: widgetEditorTranslations.camera_title || 'Cameras',
    icon: 'fas fa-video',
    settings: {},
  },
  {
    id: 'map',
    title: widgetEditorTranslations.map_title || 'Google Maps',
    icon: 'fas fa-map-marked-alt',
    settings: {
      gm_api: {
        title: language.settings.localize.gm_api,
        type: 'text',
      },
      gm_zoomlevel: {
        title: language.settings.localize.gm_zoomlevel,
        type: 'text',
      },
      gm_latitude: {
        title: language.settings.localize.gm_latitude,
        type: 'text',
      },
      gm_longitude: {
        title: language.settings.localize.gm_longitude,
        type: 'text',
      },
    },
  },
  {
    id: 'longfonds',
    title: widgetEditorTranslations.longfonds_title || 'Air quality',
    icon: 'fas fa-wind',
    settings: {
      longfonds_zipcode: {
        title: language.settings.weather.longfonds_zipcode,
        type: 'text',
      },
      longfonds_housenumber: {
        title: language.settings.weather.longfonds_housenumber,
        type: 'text',
      },
    },
  },
  {
    id: 'moon',
    title: widgetEditorTranslations.moon_title || 'Moon',
    icon: 'fas fa-moon',
    settings: {
      idx_moonpicture: {
        title: language.settings.weather.idx_moonpicture,
        type: 'text',
        help: language.settings.weather.idx_moonpicture_help,
      },
    },
  },
  {
    id: 'news',
    title: widgetEditorTranslations.news_title || 'News',
    icon: 'fas fa-newspaper',
    settings: {
      default_news_url: {
        title: language.settings.general.default_news_url,
        type: 'text',
      },
      news_scroll_after: {
        title: language.settings.general.news_scroll_after,
        type: 'text',
      },
    },
  },
];

function isCustomConfigMode() {
  return String(settings['config_mode'] || 'wizard').toLowerCase() === 'custom';
}

var settingsCategoryIcons = {
  general: 'fas fa-sliders-h',
  screen: 'fas fa-desktop',
  standby: 'fas fa-moon',
  localize: 'fas fa-globe',
  media: 'fas fa-film',
  widgets: 'fas fa-puzzle-piece',
  other: 'fas fa-ellipsis-h',
  about: 'fas fa-info-circle',
};

settingList['standby'] = {
  title:
    (language.settings.standby && language.settings.standby.title) || 'Standby',
  standby_after: {
    title:
      (language.settings.standby && language.settings.standby.standby_after) ||
      language.settings.screen.standby_after,
    type: 'text',
    help:
      (language.settings.standby &&
        language.settings.standby.standby_after_help) ||
      'Enter standby mode after this many minutes. Use 0 to disable.',
  },
  standby_call_url: {
    title:
      (language.settings.standby && language.settings.standby.standby_call_url) ||
      language.settings.general.standby_call_url,
    type: 'text',
  },
  standby_call_url_on_end: {
    title:
      (language.settings.standby &&
        language.settings.standby.standby_call_url_on_end) ||
      language.settings.general.standby_call_url_on_end,
    type: 'text',
  },
  standby_background: {
    title:
      (language.settings.standby && language.settings.standby.path_url) ||
      'Pad/URL',
    type: 'text',
    help:
      (language.settings.standby &&
        language.settings.standby.standby_background_help) ||
      'Path or URL for the standby screen background, e.g. img/bg11.jpg',
    picker: true,
  },
};

settingList['other'] = {};
settingList['other']['title'] = language.settings.other.title;

settingList['other']['setpoint_min'] = {};
settingList['other']['setpoint_min']['title'] =
  language.settings.other.setpoint_min;
settingList['other']['setpoint_min']['type'] = 'text';

settingList['other']['setpoint_max'] = {};
settingList['other']['setpoint_max']['title'] =
  language.settings.other.setpoint_max;
settingList['other']['setpoint_max']['type'] = 'text';

/* settingList['other']['evohome_status'] = {};
settingList['other']['evohome_status']['title'] = language.settings.other.evohome_status;
settingList['other']['evohome_status']['type'] = 'text';
settingList['other']['evohome_status']['help'] = language.settings.other.evohome_status_help; */

settingList['other']['evohome_boost_zone'] = {};
settingList['other']['evohome_boost_zone']['title'] =
  language.settings.other.evohome_boost_zone;
settingList['other']['evohome_boost_zone']['type'] = 'text';

settingList['other']['evohome_boost_hw'] = {};
settingList['other']['evohome_boost_hw']['title'] =
  language.settings.other.evohome_boost_hw;
settingList['other']['evohome_boost_hw']['type'] = 'text';

settingList['about'] = {};
settingList['about']['title'] = language.settings.about.title;

settingList['about']['about_text'] = {};
settingList['about']['about_text']['title'] =
  'Dashticz V' + dashticz_version + ' ' + dashticz_branch + '<br>' + newVersion;
/*
settingList['about']['about_text2'] = {};
settingList['about']['about_text2']['title'] =
  '<br>For more help visit: <a href="https://dashticz.readthedocs.io/" target="_blank">https://dashticz.readthedocs.io/</a><br>You can also check out our helpful <a href="https://www.domoticz.com/forum/viewforum.php?f=67" target="_blank">community</a> in Dashticz topic on the Domoticz forum.';

settingList['about']['about_text4'] = {};
settingList['about']['about_text4']['title'] =
  'If you have any issues you can report them in our community thread <a href="https://www.domoticz.com/forum/viewtopic.php?f=67&t=17427" target="_blank">Bug report</a>.';
*/
var _CORS_PATH = '';

var defaultSettings = {
  batteryThreshold: 20,
  language: 'en_US',
  speak_lang: 'en_US',
  timeformat: 'DD-MM-YY HH:mm',
  calendarformat: 'dd DD.MM HH:mm',
  shortdate: 'D MMM',
  longdate: 'D MMMM YYYY',
  shorttime: 'HH:mm',
  longtime: 'HH:mm:ss',
  weekday: 'dddd',
  calendarlanguage: 'en_US',
  domoticz_ip: 'http://192.168.1.10:1407',
  user_name: '',
  pass_word: '',
  app_title: 'Dashticz',
  domoticz_refresh: 5,
  dashticz_refresh: 60,
  dashticz_php_path: './vendor/dashticz/',
  enable_websocket: true,
  wu_api: '',
  wu_country: 'NL',
  wu_city: 'Amsterdam',
  owm_api: '',
  owm_country: 'de',
  owm_city: 'Mainaschaff',
  owm_days: 0,
  owm_cnt: 4,
  owm_min: true,
  weather_show_rain: 1,
  weather_show_description: 1,
  weather_show_wind: 0,
  weather_show_gust: 0,
  weather_icons: 'line',
  boss_stationclock: 'RedBoss',
  clock_size: '',
  clock_scale: 1,
  use_fahrenheit: 0,
  use_beaufort: 0,
  slide_effect: 'slide',
  hide_mediaplayer: 0,
  auto_swipe_back_to: 1,
  auto_slide_pages: 0,
  start_page: 1,
  auto_positioning: 0,
  topbar_timeout: 5,
  show_topbar_clock: 0,
  use_favorites: 0,
  use_hidden: 0,
  translate_windspeed: 1,
  static_weathericons: 0,
  last_update: 1,
  vertical_scroll: 2,
  enable_swiper: 2,
  swiper_touch_move: 1,
  auto_swipe_back_after: 0,
  standby_after: 0,
  standby_background: '',
  anwb_apikey: '',
  config_mode: 'wizard',
  selector_instead_of_buttons: 0,
  default_news_url: 'https://www.nu.nl/rss/Algemeen',
  news_scroll_after: 7,
  standard_graph: 'hours',
  blink_color: '255, 255, 255, 1',
  edit_mode: 0,
  colorpicker: 2,
  colorpickerscale: 1,
  units: {
    names: {
      kwh: 'kWh',
      watt: 'W',
      gas: 'm3',
      water: 'l',
      time: '',
    },
    decimals: {
      kwh: 2,
      watt: 2,
      gas: 1,
      water: 0,
      time: 0,
    },
  },
  garbage: {
    gft: {
      kliko: 'green',
      code: '#375b23',
      name: 'GFT',
      icon: 'img/garbage/kliko_green.png',
    },
    pmd: {
      kliko: 'orange',
      code: '#db5518',
      name: 'PMD',
      icon: 'img/garbage/kliko_orange.png',
    },
    rest: {
      kliko: 'grey',
      code: '#5e5d5c',
      name: 'Restafval',
      icon: 'img/garbage/kliko_grey.png',
    },
    papier: {
      kliko: 'blue',
      code: '#153477',
      name: 'Papier',
      icon: 'img/garbage/kliko_blue.png',
    },
    kca: {
      kliko: 'red',
      code: '#b21807',
      name: 'Chemisch afval',
      icon: 'img/garbage/kliko_red.png',
    },
    brown: {
      kliko: 'brown',
      code: '#7c3607',
      name: 'Bruin',
      icon: 'img/garbage/kliko_brown.png',
    },
    black: {
      kliko: 'black',
      code: '#000000',
      name: 'Zwart',
      icon: 'img/garbage/kliko_black.png',
    },
    milieu: {
      kliko: 'yellow',
      code: '#f9e231',
      name: 'Geel',
      icon: 'img/garbage/kliko_yellow.png',
    },
    kerstboom: {
      kliko: 'green',
      code: '#375b23',
      name: 'Kerstboom',
      icon: 'img/garbage/tree.png',
    },
    aeea: {
      kliko: 'yellow',
      code: '#f9e231',
      name: 'AEEA',
      icon: 'img/garbage/kliko_yellow.png',
    },
    textiel: {
      kliko: 'orange',
      code: '#db5518',
      name: 'Textiel',
      icon: 'img/garbage/kliko_orange.png',
    },
    sorti: {
      kliko: 'brown',
      code: '#7c3607',
      name: 'Sorti',
      icon: 'img/garbage/kliko_brown.png',
    },
    duo: {
      kliko: 'grey',
      code: '#5e5d5c',
      name: 'Duo',
      icon: 'img/garbage/kliko_grey.png',
    },
  },
  garbage_mapping: {
    rest: ['grof', 'grey', 'rest', 'grijs', 'grijze','ménagers résiduels'],
    gft: ['gft', 'tuin', 'refuse bin', 'green', 'groen', 'biodégradables', 'snoei', 'organiques'],
    pmd: ['plastic', 'pmd', 'verpakking', 'kunststof', 'valorlux', 'packages','pbp','pbd','pmc'],
    papier: ['papier', 'blauw', 'blue', 'recycling bin collection', 'paper'],
    kca: ['chemisch', 'kca', 'kga'],
    brown: ['brown', 'verre'],
    black: ['black', 'zwart'],
    milieu: ['milieu'],
    kerstboom: ['kerst', 'sapin'],
    aeea: ['aeea'],
    textiel: ['textiel'],
    sorti: ['sorti'],
    duo: ['duo'],
  },
  garbage_use_names: 0,
  garbage_use_colors: 0,
  garbage_icon_use_colors: 1,
  garbage_use_cors_prefix: 1,
  lineColors: ['#eee', '#eee', '#eee'],
  pointSize: 3,
  room_plan: 0,
  theme: 'default',
  background_image: 'img/bg11.jpg',
  loginEnabled: 0,
  security_button_icons: 0,
  security_panel_lock: 0,
  disable_update_check: 0,
  setpoint_min: 5,
  setpoint_max: 40,
  evohome_status: 'Auto',
  evohome_boost_zone: 60,
  evohome_boost_hw: 15,
  login_timeout: 60,
  refresh_method: 0,
  domoticz_timeout: 1000,
  use_cors: 0,
  cached_scripts: true,
  heartbeat: 0,
  fake_domoticz: false,
};

var settings = {};

/* I don't think this code is needed anymore ...
if (typeof(Storage) !== "undefined") {
    $.each(localStorage, function (key, value) {
        if (key.substr(0, 9) == 'dashticz_') {
            settings[key.substr(9)] = value;
        }
    });
}*/

$.extend(settings, defaultSettings, config);

//The Config settings for all checkbox items will be converted to a number
for (var s in settingList) {
  for (var t in settingList[s]) {
    if (
      typeof settingList[s][t].type !== 'undefined' &&
      settingList[s][t].type === 'checkbox'
    ) {
      settings[t] = Number(settings[t]);
    }
  }
}

// eslint-disable-next-line no-unused-vars
var _TEMP_SYMBOL = '°C';
if (settings['use_fahrenheit'] === 1) _TEMP_SYMBOL = '°F';

var phpversion = 'Not installed';
var systemInfo = null;
var _PHP_INSTALLED = false;

function escapeSettingsHtml(value) {
  return String(value === null || typeof value === 'undefined' ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatSystemInfo(fallback) {
  if (!systemInfo) return fallback;
  return (
    (systemInfo.os_name || systemInfo.os_family || fallback) +
    (systemInfo.os_version ? ' ' + systemInfo.os_version : '') +
    (systemInfo.architecture ? ' (' + systemInfo.architecture + ')' : '')
  );
}

function renderSettingsRow(settingName, definition) {
  if (typeof definition.type === 'undefined') {
    return '<div class="settings-static">' + definition.title + '</div>';
  }

  var controlId = 'setting-' + settingName;
  var value = typeof settings[settingName] === 'undefined'
    ? ''
    : settings[settingName];
  var html = '<div class="settings-row">';
  html +=
    '<label class="settings-label" for="' +
    escapeSettingsHtml(controlId) +
    '">' +
    definition.title +
    '</label>';
  html +=
    '<div class="settings-control' +
    (definition.type === 'checkbox' ? ' settings-control-switch' : '') +
    '">';

  if (definition.type === 'text') {
    html +=
      '<input class="form-control" type="text" id="' +
      escapeSettingsHtml(controlId) +
      '" name="' +
      escapeSettingsHtml(settingName) +
      '" value="' +
      escapeSettingsHtml(value) +
      '">';
  }

  if (definition.type === 'checkbox') {
    html += '<div class="form-check form-switch settings-switch">';
    html +=
      '<input class="form-check-input" type="checkbox" id="' +
      escapeSettingsHtml(controlId) +
      '" name="' +
      escapeSettingsHtml(settingName) +
      '" value="1"' +
      (Number(value) === 1 ? ' checked' : '') +
      '>';
    html += '</div>';
  }

  if (definition.type === 'select') {
    html +=
      '<select id="' +
      escapeSettingsHtml(controlId) +
      '" name="' +
      escapeSettingsHtml(settingName) +
      '" class="form-select">';
    html += '<option value=""></option>';
    for (var optionValue in definition.options) {
      html +=
        '<option value="' +
        escapeSettingsHtml(optionValue) +
        '"' +
        (value == optionValue ? ' selected' : '') +
        '>' +
        escapeSettingsHtml(definition.options[optionValue]) +
        '</option>';
    }
    html += '</select>';
  }

  html += '</div><div class="settings-help-slot">';
  if (typeof definition.help !== 'undefined') {
    var help = escapeSettingsHtml(definition.help);
    html +=
      '<button type="button" class="settings-help" data-bs-toggle="tooltip" ' +
      'data-bs-trigger="click" data-bs-placement="right" ' +
      'data-bs-custom-class="settings-tooltip" title="' +
      help +
      '" aria-label="' +
      help +
      '"><i class="fas fa-info-circle" aria-hidden="true"></i></button>';
  }
  html += '</div></div>';
  return html;
}

// eslint-disable-next-line no-unused-vars
function loadSettings() {
  return $.ajax({
    url: settings['dashticz_php_path'] + 'info.php?get=systeminfo',
    dataType: 'json',
    success: function (data) {
      systemInfo = data;
      phpversion = data.php_version;
      _PHP_INSTALLED = true;
      $('#php_version').text(phpversion);
      $('#os_version').text(formatSystemInfo('Unknown'));
    },
  })
    .catch(function () {
      console.log('PHP not installed.');
    })
    .then(function () {
      if (
        typeof settings['default_cors_url'] === 'undefined' ||
        settings['default_cors_url'] === ''
      ) {
        if (_PHP_INSTALLED)
          _CORS_PATH = settings['dashticz_php_path'] + 'cors.php?';
        else {
          _CORS_PATH = 'https://cors-anywhere.herokuapp.com/';
          console.log('PHP not enabled and default_cors_url not set.');
          console.log('CORS proxy: ' + _CORS_PATH);
        }
        //    _CORS_PATH = 'http://192.168.178.18:8081/';
      } else _CORS_PATH = settings['default_cors_url'];

      var html =
        '<div class="modal fade" id="settingspopup" tabindex="-1" aria-labelledby="settings-title" aria-hidden="true">';
      html +=
        '<div class="modal-dialog modal-xl modal-dialog-scrollable modal-dialog-settings">';
      html += '<div class="modal-content">';
      html += '<div class="modal-body">';
      html +=
        '<h2 class="visually-hidden" id="settings-title">' +
        escapeSettingsHtml(language.settings.title || 'Dashticz settings') +
        '</h2>';
      html += '<div class="settings-header">';
      html +=
        '<div class="settings-brand"><img src="img/favicon/app-icon-192x192.png" ' +
        'width="38" height="38" alt=""><span>Dashticz</span></div>';
      html += '</div>';

      html += '<div class="settings-tab-content">';
      html +=
        '<input type="hidden" name="config_mode" value="' +
        escapeSettingsHtml(settings['config_mode'] || 'wizard') +
        '">';
      html += renderSettingsCategoryHome();
      html += '</div>';
      html += '</div><div class="modal-footer settings-footer">';
      html += '<div class="settings-footer-actions">';
      html +=
        '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">' +
        language.settings.close +
        '</button> ';
      if (settings['loginEnabled'] == true)
        html +=
          '<button onClick="logout()" type="button" class="btn btn-primary" data-bs-dismiss="modal">' +
          language.settings.general.logout +
          '</button> ';
      html +=
        '<button onClick="saveSettings();" type="button" class="btn btn-primary" data-bs-dismiss="modal">' +
        language.settings.save +
        '</button></div></div>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
      setTimeout(function () {
        $('body').append(html);

        addSettingsAboutItems();
        bindSettingsCategoryTiles();
        bindBackgroundPickers();
        bindSettingsUpdateControls();
        bindWeatherProviderToggle();
        bindClockTypeToggle();

        $('#php_version').html(phpversion);

        if (window.bootstrap && window.bootstrap.Tooltip) {
          $('#settingspopup [data-bs-toggle="tooltip"]').each(function () {
            window.bootstrap.Tooltip.getOrCreateInstance(this);
          });
        }
      }, 100);
    });
}

function getSettingsCategories() {
  var preferred = [
    'general',
    'screen',
    'standby',
    'localize',
    'media',
    'widgets',
    'other',
    'about',
  ];
  var tabs = [];
  preferred.forEach(function (id) {
    if (id === 'widgets') {
      if (isCustomConfigMode()) {
        tabs.push(id);
      }
      return;
    }
    if (settingList[id]) {
      tabs.push(id);
    }
  });
  for (var settingGroup in settingList) {
    if (tabs.indexOf(settingGroup) === -1) {
      tabs.push(settingGroup);
    }
  }
  return tabs;
}

function getSettingsCategoryTitle(id) {
  if (id === 'widgets') {
    return (
      (language.settings.widgets && language.settings.widgets.title) || 'Widgets'
    );
  }
  return settingList[id] && settingList[id].title
    ? settingList[id].title
    : id;
}

function renderSettingsCategoryHome() {
  var backLabel = language.settings.back || 'Back';
  var chooseLabel =
    language.settings.choose || 'Choose a category to configure.';
  var tabs = getSettingsCategories();
  var html =
    '<div id="settings-home">' +
    '<p class="settings-intro">' +
    escapeSettingsHtml(chooseLabel) +
    '</p>' +
    '<div class="settings-tiles" id="settings-category-tiles">';

  for (var ti = 0; ti < tabs.length; ti++) {
    var id = tabs[ti];
    var title = getSettingsCategoryTitle(id);
    var icon = settingsCategoryIcons[id] || 'fas fa-cog';
    html +=
      '<button type="button" class="settings-tile" data-settings-category="' +
      escapeSettingsHtml(id) +
      '">' +
      '<i class="' +
      escapeSettingsHtml(icon) +
      '" aria-hidden="true"></i>' +
      '<span>' +
      escapeSettingsHtml(title) +
      '</span></button>';
  }
  html += '</div></div>';

  for (ti = 0; ti < tabs.length; ti++) {
    id = tabs[ti];
    title = getSettingsCategoryTitle(id);
    icon = settingsCategoryIcons[id] || 'fas fa-cog';
    html +=
      '<div class="settings-category-panel d-none" id="settings-category-' +
      escapeSettingsHtml(id) +
      '" data-settings-panel="' +
      escapeSettingsHtml(id) +
      '">';
    html +=
      '<button type="button" class="btn btn-sm btn-outline-secondary settings-category-back mb-3">' +
      '<i class="fas fa-arrow-left me-1" aria-hidden="true"></i>' +
      escapeSettingsHtml(backLabel) +
      '</button>';
    html +=
      '<h5 class="settings-panel-title"><i class="' +
      escapeSettingsHtml(icon) +
      ' me-2" aria-hidden="true"></i>' +
      escapeSettingsHtml(title) +
      '</h5>';
    if (id === 'widgets') {
      html += renderWidgetSettingsTab();
    } else {
      for (var s in settingList[id]) {
        if (s !== 'title') {
          // Standby path field is rendered as part of the background picker.
          if (id === 'standby' && s === 'standby_background') {
            continue;
          }
          if (settingList[id][s] && settingList[id][s].picker) {
            html += renderBackgroundPicker(s, settingList[id][s]);
            continue;
          }
          html += renderSettingsRow(s, settingList[id][s]);
        }
      }
      if (id === 'standby') {
        html += renderBackgroundPicker(
          'standby_background',
          settingList.standby.standby_background
        );
      }
    }
    html += '</div>';
  }

  return html;
}

function backgroundOptionLabel(imagePath) {
  var name = String(imagePath || '')
    .replace(/^img\//i, '')
    .replace(/\.[^.]+$/, '');
  if (/^custom\//i.test(name)) {
    return 'CUSTOM_' + name.replace(/^custom\//i, '');
  }
  if (/^bg_?/i.test(name)) {
    return 'BG_' + name.replace(/^bg_?/i, '');
  }
  return name || imagePath;
}

function resolveBackgroundUrl(path) {
  var value = String(path || '').trim();
  if (!value) return '';
  if (/^(https?:)?\/\//i.test(value) || value.indexOf('/') >= 0) {
    return value;
  }
  return 'img/' + value;
}

function renderBackgroundPicker(settingName, definition) {
  var pickLabel =
    (language.settings.standby && language.settings.standby.pick_background) ||
    'Choose background image';
  var pathLabel =
    (language.settings.standby && language.settings.standby.path_url) ||
    definition.title ||
    'Pad/URL';
  var customLabel =
    (language.settings.standby && language.settings.standby.custom_path) ||
    'Custom path / URL';
  var current = typeof settings[settingName] !== 'undefined' && settings[settingName] !== null
    ? String(settings[settingName])
    : '';
  var help = definition.help || '';
  var pickId = 'setting-' + settingName + '_pick';
  var pathId = 'setting-' + settingName;
  var previewId = 'settings-bg-preview-' + settingName;
  var html = '';

  html += '<div class="settings-row settings-bg-picker-row">';
  html +=
    '<label class="settings-label" for="' +
    escapeSettingsHtml(pickId) +
    '">' +
    escapeSettingsHtml(pickLabel) +
    '</label>';
  html += '<div class="settings-control">';
  html +=
    '<select id="' +
    escapeSettingsHtml(pickId) +
    '" class="form-select settings-bg-pick" data-bg-target="' +
    escapeSettingsHtml(settingName) +
    '">' +
    '<option value="">' +
    escapeSettingsHtml(customLabel) +
    '</option></select>';
  html +=
    '<div class="settings-standby-bg-preview settings-bg-preview" id="' +
    escapeSettingsHtml(previewId) +
    '" data-bg-preview="' +
    escapeSettingsHtml(settingName) +
    '" aria-hidden="true"></div>';
  html += '</div><div class="settings-help-slot"></div></div>';

  html += '<div class="settings-row settings-bg-path-row" data-bg-path-row="' +
    escapeSettingsHtml(settingName) +
    '">';
  html +=
    '<label class="settings-label" for="' +
    escapeSettingsHtml(pathId) +
    '">' +
    escapeSettingsHtml(pathLabel) +
    '</label>';
  html += '<div class="settings-control">';
  html +=
    '<input class="form-control settings-bg-path" type="text" id="' +
    escapeSettingsHtml(pathId) +
    '" name="' +
    escapeSettingsHtml(settingName) +
    '" value="' +
    escapeSettingsHtml(current) +
    '" placeholder="img/bg11.jpg or https://…">';
  html += '</div><div class="settings-help-slot">';
  if (help) {
    html +=
      '<button type="button" class="settings-help" data-bs-toggle="tooltip" ' +
      'data-bs-trigger="click" data-bs-placement="right" ' +
      'data-bs-custom-class="settings-tooltip" title="' +
      escapeSettingsHtml(help) +
      '" aria-label="' +
      escapeSettingsHtml(help) +
      '"><i class="fas fa-info-circle" aria-hidden="true"></i></button>';
  }
  html += '</div></div>';

  return html;
}

function renderWidgetSettingsTab() {
  var backLabel =
    (language.settings.widgets && language.settings.widgets.back) ||
    language.settings.back ||
    'Back';
  var chooseLabel =
    (language.settings.widgets && language.settings.widgets.choose) ||
    'Choose a widget to configure its settings.';
  var html =
    '<p class="settings-intro settings-widgets-intro">' +
    escapeSettingsHtml(chooseLabel) +
    '</p>';
  html +=
    '<div class="settings-tiles settings-widget-tiles" id="settings-widget-tiles">';
  widgetSettingTiles.forEach(function (tile) {
    html +=
      '<button type="button" class="settings-tile settings-widget-tile" data-widget-id="' +
      escapeSettingsHtml(tile.id) +
      '">' +
      '<i class="' +
      escapeSettingsHtml(tile.icon) +
      '" aria-hidden="true"></i>' +
      '<span>' +
      escapeSettingsHtml(tile.title) +
      '</span></button>';
  });
  html += '</div>';

  widgetSettingTiles.forEach(function (tile) {
    html +=
      '<div class="settings-widget-panel d-none" id="settings-widget-panel-' +
      escapeSettingsHtml(tile.id) +
      '" data-widget-panel="' +
      escapeSettingsHtml(tile.id) +
      '">';
    html +=
      '<button type="button" class="btn btn-sm btn-outline-secondary settings-widget-back mb-3">' +
      '<i class="fas fa-arrow-left me-1" aria-hidden="true"></i>' +
      escapeSettingsHtml(backLabel) +
      '</button>';
    html +=
      '<h5 class="settings-panel-title settings-widget-panel-title"><i class="' +
      escapeSettingsHtml(tile.icon) +
      ' me-2" aria-hidden="true"></i>' +
      escapeSettingsHtml(tile.title) +
      '</h5>';
    if (tile.id === 'weather') {
      html += renderWeatherWidgetSettings(tile);
    } else if (tile.id === 'clock') {
      html += renderClockWidgetSettings(tile);
    } else {
      for (var key in tile.settings) {
        html += renderSettingsRow(key, tile.settings[key]);
      }
      if (!Object.keys(tile.settings).length) {
        html +=
          '<p class="settings-intro">' +
          escapeSettingsHtml(
            (language.settings.widgets &&
              language.settings.widgets.no_global_settings) ||
              'This widget has no global settings. Configure it in the Widget editor or in CONFIG.js.'
          ) +
          '</p>';
      }
    }
    html += '</div>';
  });

  return html;
}

function getWeatherProviderPreference() {
  if (settings['owm_api'] || !settings['wu_api']) {
    return 'openweather';
  }
  return 'wunderground';
}

function renderClockWidgetSettings(tile) {
  var html =
    '<div class="settings-row">' +
    '<label class="settings-label" for="setting-clock_type_ui">Type</label>' +
    '<div class="settings-control">' +
    '<select id="setting-clock_type_ui" class="form-select settings-clock-type">' +
    '<option value="basicclock">Basic clock</option>' +
    '<option value="stationclock" selected>Stationsklok</option>' +
    '<option value="flipclock">Flipclock</option>' +
    '<option value="haymanclock">Hayman clock</option>' +
    '<option value="miniclock">Miniclock</option>' +
    '</select></div><div class="settings-help-slot"></div></div>';

  html +=
    '<div class="settings-clock-size-group">';
  html +=
    '<h6 class="settings-weather-heading">' +
    ((language.settings.widgeteditor &&
      language.settings.widgeteditor.display) ||
      'Display') +
    '</h6>';
  if (tile.settings.clock_size) {
    html += renderSettingsRow('clock_size', tile.settings.clock_size);
  }
  if (tile.settings.clock_scale) {
    html += renderSettingsRow('clock_scale', tile.settings.clock_scale);
  }
  html += '</div>';

  html +=
    '<div class="settings-clock-group" data-clock-type="flipclock" style="display:none">';
  html += '<h6 class="settings-weather-heading">Flipclock</h6>';
  if (tile.settings.hide_seconds) {
    html += renderSettingsRow('hide_seconds', tile.settings.hide_seconds);
  }
  html += '</div>';

  html +=
    '<div class="settings-clock-group" data-clock-type="stationclock">';
  html += '<h6 class="settings-weather-heading">Stationsklok</h6>';
  if (tile.settings.boss_stationclock) {
    html += renderSettingsRow('boss_stationclock', tile.settings.boss_stationclock);
  }
  if (tile.settings.hide_seconds_stationclock) {
    html += renderSettingsRow(
      'hide_seconds_stationclock',
      tile.settings.hide_seconds_stationclock
    );
  }
  html += '</div>';

  html +=
    '<div class="settings-clock-group" data-clock-type="miniclock" style="display:none">' +
    '<p class="settings-intro">' +
    escapeSettingsHtml(
      (language.settings.widgets && language.settings.widgets.miniclock_note) ||
        'Miniclock has no extra display options.'
    ) +
    '</p></div>';

  return html;
}

function bindClockTypeToggle() {
  var $popup = $('#settingspopup');
  if (!$popup.length) return;

  $popup
    .off('change.clocktype')
    .on('change.clocktype', '.settings-clock-type', function () {
      var type = $(this).val() || 'stationclock';
      $popup.find('.settings-clock-group').each(function () {
        $(this).toggle(String($(this).data('clock-type')) === type);
      });
      $popup.find('.settings-clock-size-group').toggle(type !== 'miniclock');
    });
}

function renderWeatherWidgetSettings(tile) {
  var provider = getWeatherProviderPreference();
  var html =
    '<div class="settings-row">' +
    '<label class="settings-label" for="setting-weather_provider_ui">Provider</label>' +
    '<div class="settings-control">' +
    '<select id="setting-weather_provider_ui" class="form-select settings-weather-provider">' +
    '<option value="openweather"' +
    (provider === 'openweather' ? ' selected' : '') +
    '>OpenWeather</option>' +
    '<option value="wunderground"' +
    (provider === 'wunderground' ? ' selected' : '') +
    '>Weather Underground</option>' +
    '</select></div><div class="settings-help-slot"></div></div>';

  var owmKeys = [
    'owm_api',
    'owm_city',
    'owm_name',
    'owm_country',
    'owm_lang',
    'owm_cnt',
    'owm_days',
    'owm_min',
    'weather_show_rain',
    'weather_show_description',
    'weather_show_wind',
    'weather_show_gust',
    'weather_icons',
  ];
  var wuKeys = ['wu_api', 'wu_city', 'wu_name', 'wu_country'];
  var sharedKeys = ['use_fahrenheit', 'use_beaufort', 'translate_windspeed'];

  html +=
    '<div class="settings-weather-group" data-weather-provider="openweather"' +
    (provider === 'openweather' ? '' : ' style="display:none"') +
    '>';
  html += '<h6 class="settings-weather-heading">OpenWeather</h6>';
  owmKeys.forEach(function (key) {
    if (tile.settings[key]) {
      html += renderSettingsRow(key, tile.settings[key]);
    }
  });
  html += '</div>';

  html +=
    '<div class="settings-weather-group" data-weather-provider="wunderground"' +
    (provider === 'wunderground' ? '' : ' style="display:none"') +
    '>';
  html += '<h6 class="settings-weather-heading">Weather Underground</h6>';
  wuKeys.forEach(function (key) {
    if (tile.settings[key]) {
      html += renderSettingsRow(key, tile.settings[key]);
    }
  });
  html += '</div>';

  html += '<h6 class="settings-weather-heading">Display</h6>';
  sharedKeys.forEach(function (key) {
    if (tile.settings[key]) {
      html += renderSettingsRow(key, tile.settings[key]);
    }
  });

  return html;
}

function bindWeatherProviderToggle() {
  var $popup = $('#settingspopup');
  if (!$popup.length) return;

  $popup
    .off('change.weatherprovider')
    .on('change.weatherprovider', '.settings-weather-provider', function () {
      var provider = $(this).val() === 'wunderground' ? 'wunderground' : 'openweather';
      $popup.find('.settings-weather-group').each(function () {
        var group = String($(this).data('weather-provider'));
        $(this).toggle(group === provider);
      });
    });
}

function showSettingsHome() {
  var $popup = $('#settingspopup');
  $popup.find('.settings-category-panel, .settings-widget-panel').addClass('d-none');
  $popup.find('#settings-home').removeClass('d-none');
  $popup
    .find('#settings-widget-tiles, .settings-widgets-intro')
    .removeClass('d-none');
}

function showSettingsCategory(id) {
  var $popup = $('#settingspopup');
  $popup.find('#settings-home').addClass('d-none');
  $popup.find('.settings-category-panel, .settings-widget-panel').addClass('d-none');
  $popup.find('#settings-category-' + id).removeClass('d-none');
  $popup
    .find('#settings-widget-tiles, .settings-widgets-intro')
    .removeClass('d-none');
  $popup
    .find('#settings-category-widgets > .settings-category-back, #settings-category-widgets > .settings-panel-title')
    .removeClass('d-none');
}

function bindSettingsCategoryTiles() {
  var $popup = $('#settingspopup');
  if (!$popup.length) return;

  $popup.off('click.settingsnav');
  $popup.on('click.settingsnav', '.settings-tile[data-settings-category]', function () {
    showSettingsCategory(String($(this).data('settings-category')));
  });
  $popup.on('click.settingsnav', '.settings-category-back', function () {
    showSettingsHome();
  });
  $popup.on('click.settingsnav', '.settings-widget-tile', function () {
    var id = String($(this).data('widget-id'));
    $popup.find('#settings-widget-tiles, .settings-widgets-intro').addClass('d-none');
    $popup
      .find(
        '#settings-category-widgets > .settings-category-back, #settings-category-widgets > .settings-panel-title'
      )
      .addClass('d-none');
    $popup.find('.settings-widget-panel').addClass('d-none');
    $popup.find('#settings-widget-panel-' + id).removeClass('d-none');
  });
  $popup.on('click.settingsnav', '.settings-widget-back', function () {
    $popup.find('.settings-widget-panel').addClass('d-none');
    $popup
      .find('#settings-widget-tiles, .settings-widgets-intro')
      .removeClass('d-none');
    $popup
      .find(
        '#settings-category-widgets > .settings-category-back, #settings-category-widgets > .settings-panel-title'
      )
      .removeClass('d-none');
  });
}

function bindBackgroundPickers() {
  var $popup = $('#settingspopup');
  if (!$popup.length) return;

  var $picks = $popup.find('.settings-bg-pick');
  if (!$picks.length) return;

  function syncPreview(settingName, path) {
    var $preview = $popup.find('[data-bg-preview="' + settingName + '"]');
    if (!$preview.length) return;
    if (!path) {
      $preview.removeClass('is-visible').css('background-image', '');
      return;
    }
    $preview
      .addClass('is-visible')
      .css('background-image', "url('" + resolveBackgroundUrl(path) + "')");
  }

  function selectMatchingOption($pick, path) {
    var match = false;
    var normalized = String(path || '').trim();
    $pick.find('option').each(function () {
      var optionVal = String($(this).val() || '');
      if (
        optionVal &&
        (optionVal === normalized ||
          optionVal === resolveBackgroundUrl(normalized) ||
          resolveBackgroundUrl(optionVal) === resolveBackgroundUrl(normalized))
      ) {
        match = true;
        $pick.val(optionVal);
        return false;
      }
    });
    if (!match) {
      $pick.val('');
    }
  }

  function syncPathVisibility(settingName, isCustom) {
    var $row = $popup.find('[data-bg-path-row="' + settingName + '"]');
    // Always show Pad/URL so custom values stay editable; emphasize when custom.
    $row.toggleClass('is-custom', !!isCustom);
  }

  $.getJSON('js/listbackgrounds.php')
    .done(function (data) {
      var images = (data && data.images) || [];
      $picks.each(function () {
        var $pick = $(this);
        var settingName = String($pick.data('bg-target') || '');
        var $path = $popup.find('#setting-' + settingName);
        images.forEach(function (imagePath) {
          var exists = false;
          $pick.find('option').each(function () {
            if ($(this).val() === imagePath) {
              exists = true;
              return false;
            }
          });
          if (exists) return;
          $pick.append(
            $('<option></option>')
              .attr('value', imagePath)
              .text(backgroundOptionLabel(imagePath))
          );
        });
        selectMatchingOption($pick, $path.val());
        syncPreview(settingName, $path.val());
        syncPathVisibility(settingName, !$pick.val());
      });
    })
    .fail(function () {
      $picks.each(function () {
        var $pick = $(this);
        var settingName = String($pick.data('bg-target') || '');
        var $path = $popup.find('#setting-' + settingName);
        selectMatchingOption($pick, $path.val());
        syncPreview(settingName, $path.val());
        syncPathVisibility(settingName, true);
      });
    });

  $popup
    .off('change.bgpick')
    .on('change.bgpick', '.settings-bg-pick', function () {
      var $pick = $(this);
      var settingName = String($pick.data('bg-target') || '');
      var $path = $popup.find('#setting-' + settingName);
      var value = $pick.val();
      if (value) {
        $path.val(value);
        syncPreview(settingName, value);
        syncPathVisibility(settingName, false);
      } else {
        // Custom path / URL: keep current value for editing and focus the field.
        syncPreview(settingName, $path.val());
        syncPathVisibility(settingName, true);
        $path.trigger('focus');
      }
    });

  $popup
    .off('input.bgpath')
    .on('input.bgpath', '.settings-bg-path', function () {
      var $path = $(this);
      var settingName = String($path.attr('name') || '');
      var $pick = $popup.find('.settings-bg-pick[data-bg-target="' + settingName + '"]');
      selectMatchingOption($pick, $path.val());
      syncPreview(settingName, $path.val());
      syncPathVisibility(settingName, !$pick.val());
    });
}

function bindSettingsUpdateControls() {
  var $popup = $('#settingspopup');
  if (!$popup.length) return;

  $popup.off('click.settingsupdate change.settingsupdate');
  // Keep the Update label as a focus helper: scroll/show the log area.
  $popup.on('click.settingsupdate', '#settings-update-toggle', function () {
    $popup.find('#settings-update-log').removeClass('d-none');
  });
  $popup.on('click.settingsupdate', '#settings-update-run', function () {
    runDashticzUpdate($popup.find('#settings-update-branch').val());
  });
}

function renderSettingsUpdateControls() {
  var update = (language.settings && language.settings.update) || {};
  return (
    '<div class="settings-update settings-about-update" id="settings-update">' +
    '<button type="button" class="btn btn-outline-secondary settings-update-btn" id="settings-update-toggle">' +
    escapeSettingsHtml(update.button || 'Update') +
    '</button>' +
    '<div class="settings-update-panel" id="settings-update-panel">' +
    '<label class="settings-update-label" for="settings-update-branch">' +
    escapeSettingsHtml(update.branch || 'Branch') +
    '</label>' +
    '<select id="settings-update-branch" class="form-select">' +
    '<option value="beta">Beta</option>' +
    '<option value="main">Main</option>' +
    '</select>' +
    '<button type="button" class="btn btn-primary settings-update-run" id="settings-update-run">' +
    escapeSettingsHtml(update.run || 'Run update') +
    '</button>' +
    '</div>' +
    '<pre class="settings-update-log d-none" id="settings-update-log"></pre>' +
    '</div>'
  );
}

// eslint-disable-next-line no-unused-vars
function runDashticzUpdate(branch) {
  var $log = $('#settings-update-log');
  var $run = $('#settings-update-run');
  branch = String(branch || 'beta').toLowerCase() === 'main' ? 'main' : 'beta';

  $run.prop('disabled', true);
  $log
    .removeClass('d-none text-danger text-success')
    .text(
      (language.settings.update && language.settings.update.running) ||
        'Updating…'
    );

  $.getJSON(settings['dashticz_php_path'] + 'info.php?get=csrf')
    .then(function (data) {
      return $.ajax({
        url: 'js/update.php',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ branch: branch }),
        headers: {
          'X-Dashticz-CSRF': data && data.token ? data.token : '',
        },
      });
    })
    .done(function (result) {
      var lines = [];
      if (result && result.log) {
        result.log.forEach(function (entry) {
          lines.push('$ git ' + entry.command);
          if (entry.stdout) lines.push(entry.stdout);
          if (entry.stderr) lines.push(entry.stderr);
        });
      }
      if (result && result.success) {
        $log
          .addClass('text-success')
          .text(
            ((language.settings.update && language.settings.update.success) ||
              'Update completed. Reload Dashticz to use the new version.') +
              '\n\n' +
              lines.join('\n')
          );
      } else {
        var failText =
          ((result && result.error) ||
            (language.settings.update && language.settings.update.failed) ||
            'Update failed.') +
          '\n\n' +
          lines.join('\n');
        if (result && result.hint) {
          failText += '\n\n' + result.hint;
        }
        $log.addClass('text-danger').text(failText);
      }
    })
    .fail(function (xhr) {
      var message =
        (xhr.responseJSON && xhr.responseJSON.error) ||
        (language.settings.update && language.settings.update.failed) ||
        'Update failed.';
      $log.addClass('text-danger').text(message);
    })
    .always(function () {
      $run.prop('disabled', false);
    });
}

// eslint-disable-next-line no-unused-vars
function setConfigMode(mode) {
  mode = String(mode || '').toLowerCase() === 'custom' ? 'custom' : 'wizard';
  settings['config_mode'] = mode;

  $.getJSON(settings['dashticz_php_path'] + 'info.php?get=csrf')
    .then(function (data) {
      return $.ajax({
        url: configEditorUrl('js/saveconfigmode.php'),
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ config_mode: mode }),
        dataType: 'json',
        headers: { 'X-Dashticz-CSRF': data.token },
      });
    })
    .done(function () {
      window.location.reload();
    })
    .fail(function (xhr) {
      var message =
        xhr.responseJSON && xhr.responseJSON.error
          ? xhr.responseJSON.error
          : 'Could not save config mode.';
      alert(message);
    });
}

function addSettingsAboutItems() {
  var $div = $('#settings-category-about');
  if (!$div.length) $div = $('#tabs-about');
  var about =
    (language.settings && language.settings.about) || {};
  var unknown = about.unknown || 'Unknown';
  var domoticzInfo =
    typeof Domoticz !== 'undefined' && Domoticz.info ? Domoticz.info : {};
  var osText = formatSystemInfo(unknown);
  var aboutItems = [
    {
      id: 'domoticz_version',
      label: about.domoticz_version || 'Domoticz version',
      value: domoticzInfo.versionText || domoticzInfo.version || unknown,
    },
    {
      id: 'dzvents_version',
      label: about.dzvents_version || 'dzVents version',
      value: domoticzInfo.dzVentsVersion || unknown,
    },
    {
      id: 'python_version',
      label: about.python_version || 'Python version',
      value: domoticzInfo.pythonVersion || unknown,
    },
    {
      id: 'php_version',
      label: about.php_version || 'PHP version',
      value: phpversion || unknown,
    },
    {
      id: 'os_version',
      label: about.os_version || 'Operating system',
      value: osText,
    },
  ];

  $div.append('<p>');
  aboutItems.forEach(function (item) {
    $div.append(
      '<div class="about-item">' +
        escapeSettingsHtml(item.label) +
        ': <span id="' +
        item.id +
        '">' +
        escapeSettingsHtml(item.value) +
        '</span></div>'
    );
  });
  $div.append('</p>');
  $div.append(
    '<p>' +
      escapeSettingsHtml(
        about.help_intro || 'For more help visit:'
      ) +
      ' <a href="https://dashticz.readthedocs.io/" target="_blank">https://dashticz.readthedocs.io/</a><br>' +
      escapeSettingsHtml(
        about.community_intro ||
          'You can also visit the Dashticz community forum.'
      ) +
      ' <a href="https://www.domoticz.com/forum/viewforum.php?f=67" target="_blank">' +
      escapeSettingsHtml(about.community || 'Community') +
      '</a></p>'
  );
  // Update is intentionally available only from the Info tile.
  $div.append(renderSettingsUpdateControls());
  refreshAboutDomoticzVersions();
}

function refreshAboutDomoticzVersions() {
  if (
    typeof Domoticz === 'undefined' ||
    !Domoticz.request ||
    !$('#domoticz_version').length
  ) {
    return;
  }

  Domoticz.request('type=command&param=getversion').then(function (data) {
    if (!data) return;
    if (data.version) $('#domoticz_version').text(data.version);
    if (data.dzvents_version) {
      $('#dzvents_version').text(data.dzvents_version);
    }
    if (data.python_version) {
      $('#python_version').text(data.python_version);
    }
  });
}
// eslint-disable-next-line no-unused-vars
function saveSettings() {
  var saveSettings = {};
  var alertSettings = 'var config = {}\n';

  // Submit only controls that differ from the values rendered in the modal.
  // Untouched assignments and hand-written variables remain intact.
  function addChangedSetting(settingName, value) {
    if (JSON.stringify(settings[settingName]) === JSON.stringify(value)) return;
    var serializedValue = JSON.stringify(value);
    saveSettings[settingName] = serializedValue;
    alertSettings +=
      'config[' + JSON.stringify(settingName) + '] = ' + serializedValue + ';\n';
  }
  $('div#settingspopup input[type="text"],div#settingspopup input[type="hidden"],div#settingspopup select').each(
    function () {
        // Skip UI-only controls that must not become config[...] keys.
        if (
          !$(this).attr('name') ||
          $(this).is(
            '#settings-update-branch, #setting-standby_background_pick, #setting-background_image_pick, #setting-weather_provider_ui, #setting-clock_type_ui'
          )
        ) {
          return;
        }
      var val = $(this).val();
      if (isNumeric(val))
        val = parseFloat(val);
      var settingName = $(this).attr('name');
      addChangedSetting(settingName, val);
    }
  );

  $('div#settingspopup input[type="checkbox"]').each(function () {
    var settingName = $(this).attr('name');
    if (!settingName) return;
    addChangedSetting(settingName, $(this).is(':checked') ? 1 : 0);
  });

  function showSettingsOutput(saved, errorMessage) {
      var html =
        '<div class="modal fade" id="settingsoutput" tabindex="-1" aria-labelledby="settings-output-title" aria-hidden="true">';
      html +=
        '<div class="modal-dialog modal-dialog-scrollable modal-dialog-settings">';
      html += '<div class="modal-content">';
      html +=
        '<div class="modal-body" style="padding:20px;font-size:14px;">' +
        '<h2 class="visually-hidden" id="settings-output-title">Settings output</h2>';
      html +=
        '<strong>' +
        (saved
          ? language.settings.infosave
          : 'Settings were not saved automatically.') +
        '</strong><br>';

      if (!saved) {
        html +=
          '<span class="text-danger"></span><br>Copy the configuration below to custom/' + cfgFile + '.<br><br>';
      }

      html += '<textarea style="width:100%;height:500px;" id="codeToCopy"></textarea>';

      html +=
        '</div><div class="modal-footer"><button onClick="window.location.href=window.location.href;" type="button" class="btn btn-primary" data-bs-dismiss="modal">' +
        language.settings.close_reload +
        '</button></div>';
      html += '</div>';
      html += '</div>';
      html +=
        '</div><button type="button" class="settingsoutput" hidden ' +
        'data-bs-toggle="modal" data-bs-target="#settingsoutput" ' +
        'aria-label="Open settings output"></button>';

      $('body').append(html);
      $('#codeToCopy').val(alertSettings);
      if (!saved) {
        $('#settingsoutput .text-danger').text(
          errorMessage || 'Settings could not be saved automatically.'
        );
      }
      setTimeout(function () {
        $('.settingsoutput').trigger('click');
      }, 1000);
  }

  var cfgFile = (typeof _PARAMS !== 'undefined' && _PARAMS['cfg']) || 'CONFIG.js';

  $.getJSON(settings['dashticz_php_path'] + 'info.php?get=csrf')
    .then(function (data) {
      return $.ajax({
        url: configEditorUrl('js/savesettings.php'),
        method: 'POST',
        data: saveSettings,
        dataType: 'json',
        headers: {
          'X-Dashticz-CSRF': data.token,
        },
      });
    })
    .done(function () {
      var selectedLanguage = saveSettings.language;
      if (selectedLanguage) {
        localStorage.dashticz_language = JSON.parse(selectedLanguage);
      }
      // eslint-disable-next-line no-self-assign
      window.location.href = window.location.href;
    })
    .fail(function (xhr) {
      var message =
        xhr.responseJSON && xhr.responseJSON.error
          ? xhr.responseJSON.error
          : 'Settings could not be saved automatically.';
      showSettingsOutput(false, message);
    });
}
//# sourceURL=js/settings.js
