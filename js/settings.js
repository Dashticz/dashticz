/* global language dashticz_version dashticz_branch newVersion config domoversion dzVents python*/
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
  last_update: {
    title: language.settings.general.last_update,
    type: 'checkbox'
  },
  default_news_url: {
    title: language.settings.general.default_news_url,
    type: 'text'
  },
  news_scroll_after: {
    title: language.settings.general.news_scroll_after,
    type: 'text',
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
  standby_call_url: {
    title: language.settings.general.standby_call_url,
    type: 'text',
  },
  standby_call_url_on_end: {
    title: language.settings.general.standby_call_url_on_end,
    type: 'text',
  },
};

settingList['screen'] = {};
settingList['screen']['title'] = language.settings.screen.title;

settingList['screen']['hide_topbar'] = {};
settingList['screen']['hide_topbar']['title'] =
  language.settings.screen.hide_topbar;
settingList['screen']['hide_topbar']['type'] = 'checkbox';

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

settingList['screen']['standby_after'] = {};
settingList['screen']['standby_after']['title'] =
  language.settings.screen.standby_after;
settingList['screen']['standby_after']['type'] = 'text';

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

settingList['screen']['security_button_icons'] = {};
settingList['screen']['security_button_icons']['title'] =
  language.settings.screen.security_button_icons;
settingList['screen']['security_button_icons']['type'] = 'checkbox';

settingList['screen']['security_panel_lock'] = {};
settingList['screen']['security_panel_lock']['title'] =
  language.settings.screen.security_panel_lock;
settingList['screen']['security_panel_lock']['type'] = 'checkbox';
settingList['screen']['security_panel_lock']['help'] =
  language.settings.screen.security_panel_lock_help;

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

settingList['localize']['calendarformat'] = {};
settingList['localize']['calendarformat']['title'] =
  language.settings.localize.calendarformat;
settingList['localize']['calendarformat']['type'] = 'text';

settingList['localize']['calendarlanguage'] = {};
settingList['localize']['calendarlanguage']['title'] =
  language.settings.localize.calendarlanguage;
settingList['localize']['calendarlanguage']['type'] = 'select';
settingList['localize']['calendarlanguage']['options'] = {};
settingList['localize']['calendarlanguage']['options']['zh_CN'] =
  language.settings.localize.cn;
settingList['localize']['calendarlanguage']['options']['da_DK'] =
  language.settings.localize.da;
settingList['localize']['calendarlanguage']['options']['de_DE'] =
  language.settings.localize.de;
settingList['localize']['calendarlanguage']['options']['en_US'] =
  language.settings.localize.en;
settingList['localize']['calendarlanguage']['options']['es_ES'] =
  language.settings.localize.es;
settingList['localize']['calendarlanguage']['options']['fi_FI'] =
  language.settings.localize.fi;
settingList['localize']['calendarlanguage']['options']['fr_FR'] =
  language.settings.localize.fr;
settingList['localize']['calendarlanguage']['options']['hu_HU'] =
  language.settings.localize.hu;
settingList['localize']['calendarlanguage']['options']['it_IT'] =
  language.settings.localize.it;
settingList['localize']['calendarlanguage']['options']['ja_JP'] =
  language.settings.localize.ja;
settingList['localize']['calendarlanguage']['options']['lt_LT'] =
  language.settings.localize.lt;
settingList['localize']['calendarlanguage']['options']['nl_NL'] =
  language.settings.localize.nl;
settingList['localize']['calendarlanguage']['options']['nb_NO'] =
  language.settings.localize.no;
settingList['localize']['calendarlanguage']['options']['pl_PL'] =
  language.settings.localize.pl;
settingList['localize']['calendarlanguage']['options']['pt_PT'] =
  language.settings.localize.pt;
settingList['localize']['calendarlanguage']['options']['ro_RO'] =
  language.settings.localize.ro;
settingList['localize']['calendarlanguage']['options']['ru_RU'] =
  language.settings.localize.ru;
settingList['localize']['calendarlanguage']['options']['sk_SK'] =
  language.settings.localize.sk;
settingList['localize']['calendarlanguage']['options']['sl_SL'] =
  language.settings.localize.sl;
settingList['localize']['calendarlanguage']['options']['sv_SE'] =
  language.settings.localize.sv;
settingList['localize']['calendarlanguage']['options']['uk_UA'] =
  language.settings.localize.uk;

settingList['localize']['calendarurl'] = {};
settingList['localize']['calendarurl']['title'] =
  language.settings.localize.calendarurl;
settingList['localize']['calendarurl']['type'] = 'text';

/* Not used anymore
settingList['localize']['calendar_parse_localy'] = {};
settingList['localize']['calendar_parse_localy']['title'] = language.settings.localize.calendar_parse_localy;
settingList['localize']['calendar_parse_localy']['type'] = 'checkbox';
*/

settingList['localize']['hide_seconds'] = {};
settingList['localize']['hide_seconds']['title'] =
  language.settings.localize.hide_seconds;
settingList['localize']['hide_seconds']['type'] = 'checkbox';

settingList['localize']['hide_seconds_stationclock'] = {};
settingList['localize']['hide_seconds_stationclock']['title'] =
  language.settings.localize.hide_seconds_stationclock;
settingList['localize']['hide_seconds_stationclock']['type'] = 'checkbox';

settingList['localize']['boss_stationclock'] = {};
settingList['localize']['boss_stationclock']['title'] =
  language.settings.localize.boss_stationclock;
settingList['localize']['boss_stationclock']['type'] = 'text';

settingList['localize']['gm_api'] = {};
settingList['localize']['gm_api']['title'] = language.settings.localize.gm_api;
settingList['localize']['gm_api']['type'] = 'text';

settingList['localize']['gm_zoomlevel'] = {};
settingList['localize']['gm_zoomlevel']['title'] =
  language.settings.localize.gm_zoomlevel;
settingList['localize']['gm_zoomlevel']['type'] = 'text';

settingList['localize']['gm_latitude'] = {};
settingList['localize']['gm_latitude']['title'] =
  language.settings.localize.gm_latitude;
settingList['localize']['gm_latitude']['type'] = 'text';

settingList['localize']['gm_longitude'] = {};
settingList['localize']['gm_longitude']['title'] =
  language.settings.localize.gm_longitude;
settingList['localize']['gm_longitude']['type'] = 'text';

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

settingList['weather'] = {};
settingList['weather']['title'] = language.settings.weather.title;

settingList['weather']['wu_api'] = {};
settingList['weather']['wu_api']['title'] = language.settings.weather.wu_api;
settingList['weather']['wu_api']['type'] = 'text';

settingList['weather']['wu_city'] = {};
settingList['weather']['wu_city']['title'] = language.settings.weather.wu_city;
settingList['weather']['wu_city']['type'] = 'text';

settingList['weather']['wu_name'] = {};
settingList['weather']['wu_name']['title'] = language.settings.weather.wu_name;
settingList['weather']['wu_name']['type'] = 'text';

settingList['weather']['wu_country'] = {};
settingList['weather']['wu_country']['title'] =
  language.settings.weather.wu_country;
settingList['weather']['wu_country']['type'] = 'text';

settingList['weather']['owm_api'] = {};
settingList['weather']['owm_api']['title'] = language.settings.weather.owm_api;
settingList['weather']['owm_api']['type'] = 'text';

settingList['weather']['owm_city'] = {};
settingList['weather']['owm_city']['title'] =
  language.settings.weather.owm_city;
settingList['weather']['owm_city']['type'] = 'text';

settingList['weather']['owm_name'] = {};
settingList['weather']['owm_name']['title'] =
  language.settings.weather.owm_name;
settingList['weather']['owm_name']['type'] = 'text';

settingList['weather']['owm_country'] = {};
settingList['weather']['owm_country']['title'] =
  language.settings.weather.owm_country;
settingList['weather']['owm_country']['type'] = 'text';

settingList['weather']['owm_lang'] = {};
settingList['weather']['owm_lang']['title'] =
  language.settings.weather.owm_lang;
settingList['weather']['owm_lang']['type'] = 'text';
settingList['weather']['owm_lang']['help'] =
  language.settings.weather.owm_lang_help;

settingList['weather']['owm_days'] = {};
settingList['weather']['owm_days']['title'] =
  language.settings.weather.owm_days;
settingList['weather']['owm_days']['type'] = 'checkbox';
settingList['weather']['owm_days']['help'] =
  language.settings.weather.owm_days_help;

settingList['weather']['owm_cnt'] = {};
settingList['weather']['owm_cnt']['title'] = language.settings.weather.owm_cnt;
settingList['weather']['owm_cnt']['type'] = 'text';
settingList['weather']['owm_cnt']['help'] =
  language.settings.weather.owm_cnt_help;

settingList['weather']['owm_min'] = {};
settingList['weather']['owm_min']['title'] = language.settings.weather.owm_min;
settingList['weather']['owm_min']['type'] = 'checkbox';
settingList['weather']['owm_min']['help'] =
  language.settings.weather.owm_min_help;

settingList['weather']['use_fahrenheit'] = {};
settingList['weather']['use_fahrenheit']['title'] =
  language.settings.weather.use_fahrenheit;
settingList['weather']['use_fahrenheit']['type'] = 'checkbox';

settingList['weather']['use_beaufort'] = {};
settingList['weather']['use_beaufort']['title'] =
  language.settings.weather.use_beaufort;
settingList['weather']['use_beaufort']['type'] = 'checkbox';

settingList['weather']['translate_windspeed'] = {};
settingList['weather']['translate_windspeed']['title'] =
  language.settings.weather.translate_windspeed;
settingList['weather']['translate_windspeed']['type'] = 'checkbox';
settingList['weather']['translate_windspeed']['help'] =
  language.settings.weather.translate_windspeed_help;

settingList['weather']['static_weathericons'] = {};
settingList['weather']['static_weathericons']['title'] =
  language.settings.weather.static_weathericons;
settingList['weather']['static_weathericons']['type'] = 'checkbox';

settingList['weather']['idx_moonpicture'] = {};
settingList['weather']['idx_moonpicture']['title'] =
  language.settings.weather.idx_moonpicture;
settingList['weather']['idx_moonpicture']['type'] = 'text';
settingList['weather']['idx_moonpicture']['help'] =
  language.settings.weather.idx_moonpicture_help;

settingList['weather']['longfonds_zipcode'] = {};
settingList['weather']['longfonds_zipcode'] = {
  title: language.settings.weather.longfonds_zipcode,
  type: 'text',
};
settingList['weather']['longfonds_housenumber'] = {};
settingList['weather']['longfonds_housenumber'] = {
  title: language.settings.weather.longfonds_housenumber,
  type: 'text',
};

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

settingList['media']['spot_clientid'] = {};
settingList['media']['spot_clientid']['title'] =
  language.settings.media.spot_clientid;
settingList['media']['spot_clientid']['type'] = 'text';

settingList['media']['sonarr_url'] = {};
settingList['media']['sonarr_url']['title'] =
  language.settings.media.sonarr_url;
settingList['media']['sonarr_url']['type'] = 'text';

settingList['media']['sonarr_apikey'] = {};
settingList['media']['sonarr_apikey']['title'] =
  language.settings.media.sonarr_apikey;
settingList['media']['sonarr_apikey']['type'] = 'text';

settingList['media']['sonarr_maxitems'] = {};
settingList['media']['sonarr_maxitems']['title'] =
  language.settings.media.sonarr_maxitems;
settingList['media']['sonarr_maxitems']['type'] = 'text';

settingList['media']['hide_mediaplayer'] = {};
settingList['media']['hide_mediaplayer']['title'] =
  language.settings.media.hide_mediaplayer;
settingList['media']['hide_mediaplayer']['type'] = 'checkbox';

settingList.garbage = {
  title: language.settings.garbage.title,
  garbage_company: {
    title: language.settings.garbage.garbage_company,
    type: 'select',
    options: {
      afvalalert: 'Afval Alert (NL)',
      afvalstoffendienst:
        'Afvalstoffendienst: Hertogenbosch, Vlijmen, ... (NL)',
      almere: 'Almere',
      alphenaandenrijn: 'Alphen aan de Rijn (NL)',
      area: 'Area',
      avalex: 'Avalex (NL)',
      avri: 'Rivierenland (Zaltbommel, ...)(NL)',
      barafvalbeheer: 'Bar-afvalbeheer (Barendrecht, Rhoon)(NL)',
      best: 'Best (NL)',
      blink:
        'Blink: Asten, Deurne, Gemert-Bakel, Heeze-Leende, Helmond, Laarbeek, Nuenen, Someren (NL)',
      circulusberkel: 'Circulus Berkel (NL)',
      cure: 'Cure: Eindhoven, Geldrop-Mierlo, Valkenswaard (NL)',
      cyclusnv:
        'Cyclus NV: Bodegraven-Reeuwijk, Gouda, Kaag en Braassem, Krimpen aan den IJssel, Krimpenerwaard, Montfoort, Nieuwkoop, Waddinxveen en Zuidplas (NL)',
      dar:
        'Dar: Berg en Dal, Beuningen, Druten, Heumen, Nijmegen, Wijchen (NL)',
      deafvalapp: 'Afval App (NL)',
      edg: 'EDG (DE)',
      gad: 'Grondstoffen- en Afvalstoffendienst regio Gooi en Vechtstreek (NL)',
      gemeenteberkelland: 'Berkelland: Borculo, Eibergen, Neede en Ruurlo (NL)',
      goes: 'Goes (NL)',
      googlecalendar: 'Google Calender',
      groningen: 'Groningen (NL)',
      hvc: 'HVC Groep (NL)',
      ical: 'iCal',
      katwijk: 'Katwijk (NL)',
      maashorst: 'Maashorst (NL)',
      meerlanden: 'Meerlanden (NL)',
      mijnafvalwijzer: 'Mijn Afval Wijzer (NL)',
      omrin: 'Omrin (NL)',
      purmerend: 'Purmerend',
      rd4: 'Rd4',
      recycleapp: 'RecycleApp (BE)',
      rmn: 'RMN (NL)',
      rova: 'Rova (NL)',
      sudwestfryslan: 'Sudwest Fryslan (NL)',
      suez: 'Suez: Arnhem (NL)',
      twentemilieu: 'Twente Milieu (NL)',
      uden: 'Uden (NL)',
      veldhoven: 'Veldhoven (NL)',
      venlo: 'Venlo (NL)',
      venray: 'Venray (NL)',
      vianen: 'Vianen (NL)',
      waalre: 'Waalre (NL)',
      waardlanden:
        'Waardlanden: Gorinchem, Hardinxveld-Giessendam, Molenlanden en Vijfheerenlanden (NL)',
    },
  },
};

settingList['garbage']['garbage_icalurl'] = {};
settingList['garbage']['garbage_icalurl']['title'] =
  language.settings.garbage.garbage_icalurl;
settingList['garbage']['garbage_icalurl']['type'] = 'text';

settingList['garbage']['google_api_key'] = {};
settingList['garbage']['google_api_key']['title'] =
  language.settings.garbage.google_api_key;
settingList['garbage']['google_api_key']['type'] = 'text';
settingList['garbage']['google_api_key']['help'] =
  language.settings.garbage.google_api_key_help;

settingList['garbage']['garbage_calendar_id'] = {};
settingList['garbage']['garbage_calendar_id']['title'] =
  language.settings.garbage.garbage_calendar_id;
settingList['garbage']['garbage_calendar_id']['type'] = 'text';
settingList['garbage']['garbage_calendar_id']['help'] =
  language.settings.garbage.garbage_calendar_id_help;

settingList['garbage']['garbage_zipcode'] = {};
settingList['garbage']['garbage_zipcode']['title'] =
  language.settings.garbage.garbage_zipcode;
settingList['garbage']['garbage_zipcode']['type'] = 'text';

settingList['garbage']['garbage_street'] = {};
settingList['garbage']['garbage_street']['title'] =
  language.settings.garbage.garbage_street;
settingList['garbage']['garbage_street']['type'] = 'text';

settingList['garbage']['garbage_housenumber'] = {};
settingList['garbage']['garbage_housenumber']['title'] =
  language.settings.garbage.garbage_housenumber;
settingList['garbage']['garbage_housenumber']['type'] = 'text';

settingList['garbage']['garbage_housenumberadd'] = {};
settingList['garbage']['garbage_housenumberadd']['title'] =
  language.settings.garbage.garbage_housenumberaddition;
settingList['garbage']['garbage_housenumberadd']['type'] = 'text';

settingList['garbage']['garbage_maxitems'] = {};
settingList['garbage']['garbage_maxitems']['title'] =
  language.settings.garbage.garbage_maxitems;
settingList['garbage']['garbage_maxitems']['type'] = 'text';

settingList['garbage']['garbage_width'] = {};
settingList['garbage']['garbage_width']['title'] =
  language.settings.garbage.garbage_width;
settingList['garbage']['garbage_width']['type'] = 'text';

settingList['garbage']['garbage_hideicon'] = {};
settingList['garbage']['garbage_hideicon']['title'] =
  language.settings.garbage.garbage_hideicon;
settingList['garbage']['garbage_hideicon']['type'] = 'checkbox';

settingList['garbage']['garbage_icon_use_colors'] = {};
settingList['garbage']['garbage_icon_use_colors']['title'] =
  language.settings.garbage.garbage_icon_use_colors;
settingList['garbage']['garbage_icon_use_colors']['type'] = 'checkbox';

settingList['garbage']['garbage_use_colors'] = {};
settingList['garbage']['garbage_use_colors']['title'] =
  language.settings.garbage.garbage_use_colors;
settingList['garbage']['garbage_use_colors']['type'] = 'checkbox';

settingList['garbage']['garbage_use_names'] = {};
settingList['garbage']['garbage_use_names']['title'] =
  language.settings.garbage.garbage_use_names;
settingList['garbage']['garbage_use_names']['type'] = 'checkbox';

settingList['garbage']['garbage_use_cors_prefix'] = {};
settingList['garbage']['garbage_use_cors_prefix']['title'] =
  language.settings.garbage.garbage_use_cors_prefix;
settingList['garbage']['garbage_use_cors_prefix']['type'] = 'checkbox';
settingList['garbage']['garbage_use_cors_prefix']['help'] =
  language.settings.garbage.garbage_use_prefix_help;

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

settingList['about']['about_text2'] = {};
settingList['about']['about_text2']['title'] =
  '<br>For more help visit: <a href="https://dashticz.readthedocs.io/" target="_blank">https://dashticz.readthedocs.io/</a><br>You can also check out our helpful <a href="https://www.domoticz.com/forum/viewforum.php?f=67" target="_blank">community</a> in Dashticz topic on the Domoticz forum.';

settingList['about']['about_text4'] = {};
settingList['about']['about_text4']['title'] =
  'If you have any issues you can report them in our community thread <a href="https://www.domoticz.com/forum/viewtopic.php?f=67&t=17427" target="_blank">Bug report</a>.';

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
  boss_stationclock: 'RedBoss',
  use_fahrenheit: 0,
  use_beaufort: 0,
  hide_topbar: 0,
  slide_effect: 'slide',
  hide_mediaplayer: 0,
  auto_swipe_back_to: 1,
  auto_slide_pages: 0,
  start_page: 1,
  auto_positioning: 1,
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
  selector_instead_of_buttons: 0,
  default_news_url: 'http://www.nu.nl/rss/algemeen',
  news_scroll_after: 7,
  standard_graph: 'hours',
  blink_color: '255, 255, 255, 1',
  edit_mode: 0,
  colorpicker: 2,
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
    rest: ['grof', 'grey', 'rest', 'grijs', 'grijze'],
    gft: [
      'gft',
      'tuin',
      'refuse bin',
      'green',
      'groen',
      'Biodégradables',
      'snoei',
    ],
    pmd: ['plastic', 'pmd', 'verpakking', 'kunststof', 'valorlux', 'packages','pbp'],
    papier: ['papier', 'blauw', 'blue', 'recycling bin collection', 'paper'],
    kca: ['chemisch', 'kca', 'kga'],
    brown: ['brown', 'verre'],
    black: ['black', 'zwart'],
    milieu: ['milieu'],
    kerstboom: ['kerst'],
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
  background_image: 'img/bg2.jpg',
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
  refresh_method: 1,
  domoticz_timeout: 2000,
  use_cors: 0,
  cached_scripts: true,
  heartbeat: 0
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

var phpversion = '<br>PHP not installed!!';
var _PHP_INSTALLED = false;

// eslint-disable-next-line no-unused-vars
function loadSettings() {
  return $.ajax({
    url: settings['dashticz_php_path'] + 'info.php?get=phpversion',
    dataType: 'json',
    success: function (data) {
      phpversion = '<br> PHP version: ' + data;
      _PHP_INSTALLED = true;
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

      settingList['about']['about_text5'] = {};
      settingList['about']['about_text5']['title'] =
        domoversion + dzVents + python + phpversion;

      var html =
        '<div class="modal fade" id="settingspopup" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">';
      html += '<div class="modal-dialog modal-dialog-settings">';
      html += '<div class="modal-content">';
      html += '<div class="modal-body"><br />';
      html += '<div class="row">';

      html += '<ul class="nav nav-pills">';
      var first = true;
      for (var b in settingList) {
        var c = '';
        if (first) {
          c = ' class="active"';
          first = false;
        }
        html +=
          '<li' +
          c +
          '><a data-toggle="pill" href="#tabs-' +
          b +
          '">' +
          settingList[b]['title'] +
          '</a></li>';
      }
      html += '</ul>';

      html += '<div class="tab-content"><br /><br />';

      first = true;
      for (b in settingList) {
        c = '';
        if (first) {
          c = ' active in';
          first = false;
        }
        html += '<div class="tab-pane fade' + c + '" id="tabs-' + b + '">';
        for (s in settingList[b]) {
          if (s !== 'title') {
            html += '<div class="row">';
            html +=
              '<div class="col-xs-5" style="margin-bottom:1px;"><label style="margin-top: 6px;font-size: 12px;">' +
              settingList[b][s]['title'] +
              '</label>';
            if (typeof settingList[b][s]['help'] !== 'undefined')
              html +=
                '<span class="glyphicon" title="' +
                settingList[b][s]['help'] +
                '">&nbsp;&#xe086;</span>';
            html += '</div>';
            html += '<div class="col-xs-7" style="margin-bottom:1px;">';
            var val = '';
            if (typeof settings[s] !== 'undefined') val = settings[s];
            if (settingList[b][s]['type'] === 'text')
              html +=
                '<div><input class="form-control" type="text" name="' +
                s +
                '" value="' +
                val +
                '" style="max-width:75%;" /></div>';
            if (settingList[b][s]['type'] === 'checkbox') {
              var sel = '';
              if (settings[s] == 1) sel = 'checked';
              html +=
                '<div class="material-switch pull-left"><input type="checkbox" id="' +
                s +
                '" name="' +
                s +
                '" value="1" ' +
                sel +
                ' style="margin-top:11px;" /><label for="' +
                s +
                '" class="label-success"></label></div>';
            }
            if (settingList[b][s]['type'] === 'select') {
              html +=
                '<select name="' +
                s +
                '" class="form-control" style="max-width:75%;padding-left: 8px;color: #555 !important;">';
              html += '<option value=""></option>';
              for (var o in settingList[b][s]['options']) {
                sel = '';
                if (settings[s] == o) sel = 'selected';
                html +=
                  '<option value="' +
                  o +
                  '" ' +
                  sel +
                  '>' +
                  settingList[b][s]['options'][o] +
                  '</option>';
              }
              html += '</select>';
            }
            html += '</div>';
            html += '</div>';
          }
        }
        html += '</div>';
      }
      html += '</div>';
      html +=
        '</div><div class="modal-footer"><button type="button" class="btn btn-secondary" data-dismiss="modal">' +
        language.settings.close +
        '</button> ';
      if (settings['loginEnabled'] == true)
        html +=
          '<button onClick="logout()" type="button" class="btn btn-primary" data-dismiss="modal">' +
          language.settings.general.logout +
          '</button> ';
      html +=
        '<button onClick="saveSettings();" type="button" class="btn btn-primary" data-dismiss="modal">' +
        language.settings.save +
        '</button></div>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
      setTimeout(function () {
        $('body').append(html);

        if (typeof settings['domoticz_ip'] === 'undefined') {
          if ($('.settingsicon').length == 0)
            $('body').prepend(
              '<div data-id="settings" class="settings settingsicon col-xs-12 text-right" data-toggle="modal" data-target="#settingspopup"><em class="fa fa-cog" /><div>'
            );
          $('.settingsicon').trigger('click');
        }
      }, 2000);
      $('#tabs').tabs();
    });
}

// eslint-disable-next-line no-unused-vars
function saveSettings() {
  var saveSettings = {};
  var alertSettings = 'var config = {}\n';
  $('div#settingspopup input[type="text"],div#settingspopup select').each(
    function () {
      if (typeof Storage !== 'undefined')
        localStorage.setItem('dashticz_' + $(this).attr('name'), $(this).val());
      if ($(this).val() == 1 || $(this).val() == 0) {
        var val = parseFloat($(this).val());
        if (isNaN(val)) val = 0;
        alertSettings +=
          "config['" + $(this).attr('name') + "'] = " + val + ';\n';
        saveSettings[$(this).attr('name')] = val;
      } else
        alertSettings +=
          "config['" + $(this).attr('name') + "'] = '" + $(this).val() + "';\n";
      saveSettings[$(this).attr('name')] = "'" + $(this).val() + "'";
    }
  );

  $('div#settingspopup input[type="checkbox"]').each(function () {
    if ($(this).is(':checked')) {
      if (typeof Storage !== 'undefined')
        localStorage.setItem('dashticz_' + $(this).attr('name'), $(this).val());
      alertSettings += "config['" + $(this).attr('name') + "'] = 1;\n";
      saveSettings[$(this).attr('name')] = 1;
    } else {
      if (typeof Storage !== 'undefined')
        localStorage.setItem('dashticz_' + $(this).attr('name'), 0);
      alertSettings += "config['" + $(this).attr('name') + "'] = 0;\n";
      saveSettings[$(this).attr('name')] = 0;
    }
  });

  $.post('js/savesettings.php', saveSettings, function (data) {
    if (data !== '') {
      var html =
        '<div class="modal fade" id="settingsoutput" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">';
      html += '<div class="modal-dialog modal-dialog-settings">';
      html += '<div class="modal-content">';
      html +=
        '<div class="modal-body" style="padding:20px;font-size:14px;"><br>';
      html +=
        '<strong>' +
        language.settings.infosave +
        '</strong><br>If you like my work, you can buy me a beer at: <a href="https://www.paypal.me/robgeerts" target="_blank">https://www.paypal.me/robgeerts</a><br><br><textarea style="width:100%;height:500px;" id="codeToCopy">';

      html += alertSettings;

      html += '</textarea>';
      html +=
        '</div><div class="modal-footer"><button onClick="window.location.href=window.location.href;" type="button" class="btn btn-primary" data-dismiss="modal">' +
        language.settings.close_reload +
        '</button></div>';
      html += '</div>';
      html += '</div>';
      html +=
        '</div><div class="settingsoutput" data-toggle="modal" data-target="#settingsoutput"><em class="fas fa-cog" /><div>';

      $('body').append(html);
      setTimeout(function () {
        $('.settingsoutput').trigger('click');
      }, 1000);
    } else {
      // eslint-disable-next-line no-self-assign
      window.location.href = window.location.href;
    }
  });
}
