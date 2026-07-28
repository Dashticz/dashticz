/* eslint-disable no-prototype-builtins */
/* global getAllDevicesHandler objectlength config initVersion loadSettings settings getLocationParameters _DASHTICZ_VERSION*/
/* global sessionValid MobileDetect moment getBlock DT_function*/
/* global Swiper Debug*/

//To refactor later:
/* global switchSecurity*/

/*from blocks.js*/
/*global initMap */
/* global Dashticz Domoticz DT_secpanel*/
var language = {};
// eslint-disable-next-line no-unused-vars
var blocks = {};
var cache = new Date().getTime();
var throwError = null;
var loadingFilename = null;
var firstRunSetupRequired = false;

// device detection
// eslint-disable-next-line no-unused-vars
var standby = true;
var standbyActive = false;
var lastUserActivity = Date.now();
var swipebackTime = 0;
var autoSwipe = false; //will be true when autoSwipe is active
// eslint-disable-next-line no-unused-vars
var audio = {};
var screens = {};
var columns = {};
var columns_standby = {};
var defaultcolumns = false;
//move var allblocks = {};
var myswiper;
//move var addedThermostat = [];
//move var oldstates = [];
//move var onOffstates = [];
var md;
// eslint-disable-next-line no-unused-vars
var _THOUSAND_SEPARATOR = '.';
// eslint-disable-next-line no-unused-vars
var _DECIMAL_POINT = ',';
var _STANDBY_CALL_URL = '';
var _END_STANDBY_CALL_URL = '';
//move var allVariables = {};
var sessionvalid = false;

var currentScreenSet;

var _PARAMS = {};
var _CFG = {};

// eslint-disable-next-line no-unused-vars
function loadFiles() {
  loadScripts(['js/functions.js', 'js/polyfills.js']).then(prepareStart);
}

function createErrorHandler() {
  //Set custom error handling to catch syntax errors in CONFIG.js and custom.js
  window.onerror = function (msg, url, line, col) {
    if (loadingFilename) {
      var message =
        'Error loading ' +
        loadingFilename +
        '<br>\n' +
        msg +
        ' at line ' +
        line +
        ':' +
        col;
      console.log(message);
      throwError = message;
    }
  };
}

function loadStyling() {
  $(
    '<link href="' +
      'css/creative.css?_=' +
      _DASHTICZ_VERSION +
      '" rel="stylesheet">'
  ).appendTo('head');
}

function loadLogRocket() {
  var enable_logrocket = _PARAMS['logrocket'];
  return $.when(
    typeof enable_logrocket !== 'undefined' &&
      enable_logrocket &&
      $.ajax({
        url: 'https://cdn.lr-ingest.io/LogRocket.min.js',
        dataType: 'script',
        cache: true,
      }).then(function () {
        enableLogRocket(enable_logrocket);
      })
  );
}

function loadConfig() {
  var configjs = _PARAMS['cfg'] || 'CONFIG.js';
  loadingFilename = _CFG.customfolder + '/' + configjs;
  return $.ajax({
    url: loadingFilename,
    dataType: 'script',
    dataFilter: function (source) {
      if (
        source.trim() === '#EMPTY#' &&
        !_PARAMS['cfg'] &&
        _CFG.customfolder === 'custom'
      ) {
        // A tracked placeholder CONFIG.js must not be executed as JavaScript.
        // Treat it exactly like a missing first-run configuration instead.
        window.config = {};
        firstRunSetupRequired = true;
        return '';
      }
      return source;
    },
  })
    .then(
      function () {
        var tmp = loadingFilename;
        loadingFilename = null;
        if (throwError) return $.Deferred().reject(new Error(throwError));

        if (typeof config == 'undefined') {
          return $.Deferred().reject(new Error('Error in ' + tmp));
        }
      },
      function (xhr) {
        loadingFilename = null;
        if (xhr.status === 404 && !_PARAMS['cfg'] && _CFG.customfolder === 'custom') {
          // CONFIG.js not found in the default folder.
          window.config = {};
          firstRunSetupRequired = true;
          return;
        }
        return $.Deferred().reject(new Error('Load error in ' + loadingFilename));
      }
    );
}

function clearLegacyStoredSetupConfig() {
  try {
    localStorage.removeItem('dashticz_setup_config');
  } catch (err) {
    console.warn('Could not remove legacy Dashticz setup data.', err);
  }
}

function loadConfig2() {
  var configjs = _PARAMS['cfg2'];
  if (!configjs) return;
  loadingFilename = _CFG.customfolder + '/' + configjs;
  return $.ajax({
    url: loadingFilename,
    dataType: 'script',
  })
    .fail(function () {
      return $.Deferred().reject(new Error('Load error in ' + loadingFilename));
    })
    .then(function () {
      loadingFilename = null;
      if (throwError) return $.Deferred().reject(new Error(throwError));
    });
}

function loadLanguage() {
  //Check language before loading settings and fallback to English when not set
  var setLang = 'en_US';
  if (typeof localStorage.dashticz_language !== 'undefined') {
    setLang = localStorage.dashticz_language;
  } else if (
    typeof config !== 'undefined' &&
    typeof config.language !== 'undefined'
  ) {
    setLang = config.language;
  }
  return $.ajax({
    url: 'lang/' + setLang + '.json?v=' + _DASHTICZ_VERSION,
    dataType: 'json',
    success: function (data) {
      language = data;
    },
  });
}

function loadCustomJS() {
  if (firstRunSetupRequired) {
    return checkSetupWriteAccess();
  }

  loadingFilename = _CFG.customfolder + '/custom.js';

  return $.ajax({
    //first test whether the file exists
    url: loadingFilename + '?v=' + cache,
    type: 'HEAD',
  })
    .then(function () {
      //if it exists, try to load it
      return $.ajax({
        url: loadingFilename,
        dataType: 'script',
      }).then(function () {
        loadingFilename = null;
        if (throwError)
          //test whether we've catched an error in the errorhandler
          return $.Deferred().reject(new Error(throwError));
      });
    })
    .catch(function (res) {
      if (res.status === 404) {
        // file doesn't exist
        console.log(
          'No custom.js file in folder ' + _CFG.customfolder + '. Skipping.'
        );
        return;
      }
      var error = res || new Error('Unknown error loading custom.js');
      return $.Deferred().reject(error);
    });
}

function checkSetupWriteAccess() {
  var deferred = $.Deferred();

  function showPermissionError(message) {
    $('#loaderHolder').hide();

    if ($('#dt-setup-permission').length === 0) {
      $('body').append(
        '<div class="modal fade" id="dt-setup-permission" tabindex="-1"' +
          ' aria-labelledby="dt-setup-permission-label" aria-modal="true" role="dialog">' +
          '<div class="modal-dialog modal-dialog-centered">' +
          '<div class="modal-content">' +
          '<div class="modal-header">' +
          '<h5 class="modal-title" id="dt-setup-permission-label">Configuration permissions</h5>' +
          '</div>' +
          '<div class="modal-body">' +
          '<p id="dt-setup-permission-message"></p>' +
          '</div>' +
          '<div class="modal-footer">' +
          '<button type="button" class="btn btn-primary" id="dt-setup-permission-retry">Check again</button>' +
          '</div>' +
          '</div>' +
          '</div>' +
          '</div>'
      );
    }

    $('#dt-setup-permission-message').text(message);
    $('#dt-setup-permission-retry')
      .prop('disabled', false)
      .off('click.setupPermission')
      .on('click.setupPermission', function () {
        $(this).prop('disabled', true);
        verifyAccess(true);
      });

    bootstrap.Modal.getOrCreateInstance(
      document.getElementById('dt-setup-permission'),
      { backdrop: 'static', keyboard: false }
    ).show();
  }

  function verifyAccess(reloadWhenWritable) {
    $.ajax({
      url: 'js/checkconfigaccess.php',
      dataType: 'json',
      cache: false,
    })
      .done(function (result) {
        if (result.writable) {
          if (reloadWhenWritable) {
            window.location.reload();
          } else {
            showSetupWizard();
          }
          return;
        }

        showPermissionError(
          result.message ||
            'custom/CONFIG.js is not writable by the web server. Correct the file permissions before continuing.'
        );
      })
      .fail(function () {
        showPermissionError(
          'Dashticz could not verify write access to custom/CONFIG.js. Make sure PHP is enabled and the file is writable before continuing.'
        );
      });
  }

  verifyAccess(false);
  return deferred.promise();
}

function showSetupWizard() {
  var deferred = $.Deferred();

  $('#loaderHolder').hide();

  // Field definitions: type 'text' = text input, 'toggle01' = 0/1 toggle switch,
  // 'select' = named string options, 'selectstr' = named string options stored as-is.
  var wizardFields = [
    { section: 'Connection (Domoticz)' },
    {
      id: 'domoticz_ip',
      label: 'Domoticz URL *',
      type: 'text',
      def: 'http://192.168.1.5:8080',
      help: 'URL and port of your Domoticz server',
      required: true,
    },
    {
      id: 'loginEnabled',
      label: 'Login required',
      type: 'toggle01',
      def: '0',
    },
    {
      id: 'client_id',
      label: 'OAuth client ID',
      type: 'text',
      def: 'Dashticz',
    },
    {
      id: 'client_secret',
      label: 'OAuth client secret',
      type: 'text',
      def: 'DashticzPassword',
    },

    { section: 'General' },
    {
      id: 'app_title',
      label: 'Dashboard name',
      type: 'text',
      def: 'Dashticz',
    },
    {
      id: 'language',
      label: 'Language',
      type: 'select',
      def: 'nl_NL',
      options: [
        ['nl_NL', 'Nederlands'],
        ['en_US', 'English'],
        ['de_DE', 'Deutsch'],
        ['fr_FR', 'Français'],
      ],
    },
    {
      id: 'theme',
      label: 'Theme',
      type: 'select',
      def: 'modern-dark',
      options: [
        ['modern-dark', 'Modern Dark'],
        ['default', 'Default'],
        ['white', 'White'],
      ],
    },
    {
      id: 'topbar_timeout',
      label: 'Topbar auto-hide (s, 0=off)',
      type: 'text',
      def: '5',
    },
  ];

  function escapeSetupHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fieldId(key) {
    return 'dt-setup-' + key.replace(/_/g, '-');
  }

  function renderField(field) {
    var id = fieldId(field.id);
    var html = '<div class="py-2 border-bottom row gx-0 align-items-center">';
    html +=
      '<label for="' +
      id +
      '" class="col-6 col-form-label col-form-label-sm pe-2">' +
      field.label +
      '</label>';
    html += '<div class="col-6">';

    if (field.type === 'text') {
      html +=
        '<input type="text" class="form-control form-control-sm" id="' +
        id +
        '" value="' +
        escapeSetupHtml(field.def) +
        '">';
    } else if (field.type === 'toggle01') {
      html +=
        '<div class="form-check form-switch mt-1">' +
        '<input class="form-check-input" type="checkbox" role="switch" id="' +
        id + '"' + (field.def === '1' ? ' checked' : '') + ' style="width:4em;height:2em;">' +
        '</div>';
    } else if (field.type === 'select01') {
      html += '<select class="form-select form-select-sm" id="' + id + '">';
      html +=
        '<option value="0"' +
        (field.def === '0' ? ' selected' : '') +
        '>No (0)</option>';
      html +=
        '<option value="1"' +
        (field.def === '1' ? ' selected' : '') +
        '>Yes (1)</option>';
      html += '</select>';
    } else if (field.type === 'selectbool') {
      html += '<select class="form-select form-select-sm" id="' + id + '">';
      html +=
        '<option value="false"' +
        (field.def === 'false' ? ' selected' : '') +
        '>No</option>';
      html +=
        '<option value="true"' +
        (field.def === 'true' ? ' selected' : '') +
        '>Yes</option>';
      html += '</select>';
    } else if (field.type === 'select' || field.type === 'selectstr') {
      html += '<select class="form-select form-select-sm" id="' + id + '">';
      field.options.forEach(function (option) {
        html +=
          '<option value="' +
          escapeSetupHtml(option[0]) +
          '"' +
          (field.def === option[0] ? ' selected' : '') +
          '>' +
          escapeSetupHtml(option[1]) +
          '</option>';
      });
      html += '</select>';
    }

    if (field.help) html += '<div class="form-text">' + field.help + '</div>';
    html += '</div></div>';
    return html;
  }

  var body =
    '<p class="text-muted small">Configure the basic settings to connect to Domoticz.</p>';
  wizardFields.forEach(function (field) {
    if (field.section !== undefined) {
      body +=
        '<h6 class="border-bottom pb-1 mt-3 mb-2 small fw-bold">' +
        field.section +
        '</h6>';
    } else {
      body += renderField(field);
    }
  });

  var html =
    '<div class="modal fade" id="dt-setup-wizard" tabindex="-1"' +
    ' aria-labelledby="dt-setup-label" aria-modal="true" role="dialog">' +
    '<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">' +
    '<div class="modal-content">' +
    '<div class="modal-header py-2">' +
    '<h5 class="modal-title" id="dt-setup-label">Dashticz Setup</h5>' +
    '</div>' +
    '<div class="modal-body py-2">' +
    body +
    '<div class="alert alert-danger d-none mt-2" id="dt-setup-error" role="alert"></div>' +
    '</div>' +
    '<div class="modal-footer py-2">' +
    '<button type="button" class="btn btn-primary btn-sm" id="dt-setup-save">Save &amp; Start</button>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>';

  $('body').append(html);

  var modalElement = document.getElementById('dt-setup-wizard');
  var modal = new bootstrap.Modal(modalElement, {
    backdrop: 'static',
    keyboard: false,
  });
  modal.show();

  $('#dt-setup-save').on('click', function () {
    var $error = $('#dt-setup-error');
    $error.addClass('d-none').text('');

    var ip = $('#' + fieldId('domoticz_ip')).val().trim();
    if (!ip) {
      $error.removeClass('d-none').text('Enter the Domoticz URL.');
      return;
    }

    var postData = {};
    wizardFields.forEach(function (field) {
      if (!field.id) return;
      var value = $('#' + fieldId(field.id)).val();
      if (value === null || value === undefined) return;
      if (
        field.type === 'text' ||
        field.type === 'select' ||
        field.type === 'selectstr'
      ) {
        postData[field.id] = JSON.stringify(
          value.trim ? value.trim() : value
        );
      } else if (field.type === 'select01') {
        postData[field.id] = JSON.stringify(parseInt(value, 10));
      } else if (field.type === 'selectbool') {
        postData[field.id] = JSON.stringify(value === 'true');
      } else if (field.type === 'toggle01') {
        postData[field.id] = JSON.stringify(
          $('#' + fieldId(field.id)).is(':checked') ? 1 : 0
        );
      }
    });

    $('#dt-setup-save').prop('disabled', true);

    $.getJSON(settings['dashticz_php_path'] + 'info.php?get=csrf')
      .then(function (data) {
        return $.ajax({
          url: 'js/savesettings.php',
          method: 'POST',
          data: postData,
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
            : 'Settings could not be saved. Check if PHP is enabled.';
        $error.removeClass('d-none').text(message);
        $('#dt-setup-save').prop('disabled', false);
      });
  });

  // Keep the normal startup chain paused until saving reloads the page.
  return deferred.promise();
}

function configureDashticz() {
  $(
    '<link href="vendor/weather/css/weather-icons.min.css?v=' +
      cache +
      '" rel="stylesheet">'
  ).appendTo('head');

  if (settings['theme'] !== 'default') {
    $(
      '<link rel="stylesheet" type="text/css" href="themes/' +
        settings['theme'] +
        '/' +
        settings['theme'] +
        '.css?v=' +
        cache +
        '" />'
    ).appendTo('head');
  }

  loadCustomCss();

  return $.when(
    DT_function.loadDTScript('js/switches.js'),
    DT_function.loadDTScript('js/tempcontrol.js'),
    DT_function.loadDTScript('js/dashticz.js'),
    DT_function.loadDTScript('js/blocks.js'),
    DT_function.loadDTScript('js/login.js'),
    DT_function.loadDTScript('js/moon.js'),
    DT_function.loadDTScript('js/colorpicker.js'),
    DT_function.loadDTScript('js/fullscreen.js')
  )
    .then(function () {
      return DT_function.loadDTScript('js/blocktypes.js');
    })
    .then(function () {
      return Dashticz.init();
    })
    .then(function () {
      if (typeof beforeFirstRenderHook === 'function')
        return beforeFirstRenderHook();
    })
    .then(function () {
      if (typeof screens === 'undefined' || objectlength(screens) === 0) {
        screens = {};
        screens[1] = {};
        screens[1]['background'] = settings['background_image'];
        screens[1]['columns'] = [];
        if (objectlength(columns) === 0) defaultcolumns = true;
        if (defaultcolumns === false) {
          for (var c in columns) {
            if (c !== 'bar') screens[1]['columns'].push(c);
          }
        }
      }
    });
}

function prepareStart() {
  _PARAMS = getLocationParameters();

  _CFG.customfolder = _PARAMS['folder'] || 'custom';
  // First-run settings must live in CONFIG.js, never in browser storage.
  clearLegacyStoredSetupConfig();

  createErrorHandler();
  loadStyling();
  loadLogRocket()
    .then(loadConfig)
    .then(loadConfig2)
    .then(loadLanguage)
    .then(getSettings)
    .then(function () {
      return loadScript('js/dt_function.js');
    })
    .then(addDebug)
    .then(loadCustomJS)
    .then(configureDashticz)
    .then(function () {
      if (settings['security_panel_lock'])
        Domoticz.subscribe('_secstatus', true, checkSecurityStatus);
      sessionvalid = sessionValid();
      /*
      if (
        typeof settings['gm_api'] !== 'undefined' &&
        settings['gm_api'] !== '' &&
        settings['gm_api'] !== 0
      ) {
        return $.ajax({
          url:
            'https://maps.googleapis.com/maps/api/js?key=' + settings['gm_api'],
          dataType: 'script',
          cache: true,
        }).done(function () {
          setTimeout(function () {
            initMap();
          }, 2000);
        });
      }*/
    })
    .then(function () {
      if (sessionvalid) {
        setTimeout(function () {
          $('#loaderHolder').fadeOut();
        }, 500);
        $('body').css('overflow', 'auto');
        onLoad();
      }
    })
    .catch(function (err) {
      console.error(err);
      showError(err.message);
    });

  function getSettings() {
    return $.ajax({
      url: 'js/version.js',
      dataType: 'script',
      cache: false,
    })
      .then(function () {
        return initVersion();
      })
      .then(function () {
        return $.ajax({
          url: 'js/settings.js',
          dataType: 'script',
          cache: false,
        });
      })
      .then(function () {
        loadSettings();
        checkCfgSettings();
      });
  }

  function checkCfgSettings() {
    Object.keys(_PARAMS).forEach(function (key) {
      if (typeof settings[key] !== 'undefined') settings[key] = _PARAMS[key];
    });
    if (_PARAMS.code) {
      settings.code = _PARAMS.code;
    }
    settings.state = document.location.href;
    if (_PARAMS.state) {
      settings.state = atob(_PARAMS.state);
      window.history.replaceState({}, null, settings.state);
    }
    if (_PARAMS.error) {
      var safeOAuthError = $('<div>').text(_PARAMS.error).html();
      var err = 'Domoticz authentication problem (' + safeOAuthError + ')';
      if (_PARAMS.error === 'unauthorized_client') {
        err +=
          '<br>Check client_id in CONFIG.js.<br>Note: OAuth2 flow only is supported for Domoticz >=2023.2<br>';
      }
      throw new Error(err);
      return;
    }
  }
}

function loadCustomCss() {
  var customcss = _PARAMS['css'] || 'custom.css';
  var filename = _CFG.customfolder + '/' + customcss;
  $.ajax({
    url: filename + '?v=' + cache,
    success: function (data) {
      $('<style></style>').appendTo('head').html(data);
    },
    error: function () {
      console.log('No valid custom css file: ' + filename + '. Skipping.');
    },
  });
}

function enableLogRocket(enable_logrocket) {
  console.log('enabling LogRocket');
  if (!window.LogRocket) return;
  window.LogRocket.init('ewgztp/dashticz');
  window.LogRocket.identify(enable_logrocket);
}

function addDebug() {
  return $.ajax({
    url: 'js/debug.js',
    dataType: 'script',
    cache: true,
  }).then(function () {
    return Debug.init();
  });
}

function showError(msg) {
  if (msg) $('#error').html(msg);
  $('#hide').show();
  $('#loaderHolder').fadeOut();
}

//Prevent Chrome warnings on event handlers
function defaultPassiveHandlers() {
  jQuery.event.special.touchstart = {
    setup: function (_, ns, handle) {
      if (ns.includes('noPreventDefault')) {
        this.addEventListener('touchstart', handle, {
          passive: false,
        });
      } else {
        this.addEventListener('touchstart', handle, {
          passive: true,
        });
      }
    },
  };
}

function autoSlide() {
  if (typeof myswiper === 'undefined') return;
  var nextSlide = myswiper.activeIndex + 1;
  var valid = false;
  while (!valid) {
    if (nextSlide === myswiper.activeIndex) {
      console.log(
        'autoswiping but all auto_slide_page paramaters are 0. Disabling auto swipe'
      );
      settings.auto_slide_pages = 0;
      settings.auto_swipe_back_after = 0;
      return;
    }
    if (nextSlide > myswiper.slides.length - 1) {
      nextSlide = 0;
    }
    valid = true;
    if (
      typeof currentScreenSet[nextSlide].auto_slide_page !== 'undefined' &&
      !currentScreenSet[nextSlide].auto_slide_page
    ) {
      //auto_slide_page screen parameter is 0, skipping to next screen
      nextSlide = nextSlide + 1;
      valid = false;
    }
  }

  toSlide(nextSlide);
}

function tryDashticzRefresh(timeout, msg) {
  setTimeout(function () {
    console.log(msg);
    Debug.log(msg);
    Dashticz.isAvailable()
      .then(function (res) {
        if (res)
          // eslint-disable-next-line no-self-assign
          window.location.href = window.location.href;
        else {
          tryDashticzRefresh(
            10 * 1000,
            'Dashticz not available: postponing refresh'
          );
        }
      })
      .catch(function () {
        Debug.log(Debug.ERROR, 'Dashticz refresh failed');
        tryDashticzRefresh(
          10 * 1000,
          'Catch: Dashticz not available: postponing refresh'
        );
      });
  }, timeout);
}

function onLoad() {
  defaultPassiveHandlers();
  var touchsupport =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0;
  if (!touchsupport) {
    // browser doesn't support touch
    document.documentElement.className += ' non-touch';
  }
  md = new MobileDetect(window.navigator.userAgent);

  $('body').attr('unselectable', 'on').css({
    '-moz-user-select': 'none',
    '-o-user-select': 'none',
    '-khtml-user-select': 'none',
    '-webkit-user-select': 'none',
    '-ms-user-select': 'none',
    'user-select': 'none',
  });
  //    .on('selectstart', function () {
  //      return false;
  //    });

  buildScreens();
  DT_function.loadDTScript('js/topbar.js').then(function () {
    DashticzTopbar.init();
  });

  setClockDateWeekday();
  setInterval(
    function () {
      setClockDateWeekday();
    },
    settings['hide_seconds'] ? 30000 : 1000
  );

  enableRefresh();
  setClassByTime();

  setInterval(function () {
    setClassByTime();
  }, 60000);

  var dashticzRefresh = Number(settings['dashticz_refresh']);

  if (dashticzRefresh > 0) {
    tryDashticzRefresh(
      dashticzRefresh * 60 * 1000,
      'Trying to refresh Dashticz'
    );
  }

  if (settings['auto_swipe_back_after'] > 0 || settings.auto_slide_pages > 0) {
    setInterval(function () {
      swipebackTime += 1000;
      if (settings.auto_slide_pages > 0) {
        if (typeof myswiper === 'undefined') return;
        var currentSlide = myswiper.activeIndex;
        var swipeTimeout = Number(
          currentScreenSet[currentSlide].auto_slide_page ||
            settings.auto_slide_pages
        );
        if (!autoSwipe) swipeTimeout += Number(settings.auto_swipe_back_after);
        if (swipebackTime > swipeTimeout * 1000) {
          autoSlide();
          autoSwipe = true;
          swipebackTime = 0;
        }
        return;
      }

      if (settings.auto_swipe_back_to > 0) {
        //swipe back to specified screen
        if (swipebackTime >= settings['auto_swipe_back_after'] * 1000) {
          toSlide(settings['auto_swipe_back_to'] - 1);
          swipebackTime = 0;
        }
        return;
      }
    }, 1000);
  }
  /* //Error: URL invalid ...
  if (
    typeof settings['disable_googleanalytics'] == 'undefined' ||
    parseFloat(settings['disable_googleanalytics']) == 0
  ) {
    var googleAnalytics = '<script>';
    googleAnalytics +=
      "(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){";
    googleAnalytics +=
      '(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),';
    googleAnalytics +=
      'm=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)';
    googleAnalytics +=
      "})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');";

    googleAnalytics += "ga('create', 'UA-102837285-1', 'auto');";
    googleAnalytics += "ga('send', 'pageview');";

    googleAnalytics += '</script>';
    $('body').prepend(googleAnalytics);
  }*/

  function registerUserActivity(event) {
    lastUserActivity = Date.now();
    swipebackTime = 0;
    autoSwipe = false;

    if (standbyActive) {
      Debug.log('Standby: user activity (' + event.type + ')');
      disableStandby();
    }
  }

  // Listen in the capture phase so controls that stop event propagation still
  // count as activity. Pointer events cover mouse, touch and pen input in
  // modern browsers; the other events are fallbacks for older browsers.
  var activityEvents = window.PointerEvent
    ? ['pointerdown', 'pointermove']
    : ['mousedown', 'mousemove', 'touchstart', 'touchmove'];
  activityEvents.push('keydown', 'click');
  activityEvents.forEach(function (eventName) {
    document.addEventListener(eventName, registerUserActivity, true);
  });

  if (parseFloat(settings['standby_after']) > 0) {
    if (typeof settings['standby_call_url'] !== 'undefined') {
      _STANDBY_CALL_URL = settings['standby_call_url'];
    }
    if (typeof settings['standby_call_url_on_end'] !== 'undefined') {
      _END_STANDBY_CALL_URL = settings['standby_call_url_on_end'];
    }
    setInterval(function () {
      if (standbyActive != true) {
        var inactiveFor = Date.now() - lastUserActivity;
        if (inactiveFor >= settings['standby_after'] * 1000 * 60) {
          $('body').addClass('standby');
          $('.dt-container').hide();
          if (objectlength(columns_standby) > 0) buildStandby();
          if (
            typeof _STANDBY_CALL_URL !== 'undefined' &&
            _STANDBY_CALL_URL !== ''
          ) {
            $.get(_STANDBY_CALL_URL);
          }
          standbyActive = true;
        }
      }
    }, 5000);
  }
}

var oldTime = 0;

function triggerTime() {
  Debug.log('ping');
  var currentTime = Date.now();
  var targetTime = oldTime + 10000;
  var diff = currentTime - oldTime;
  if (currentTime - oldTime > 11000) {
    Debug.log('Time error: ' + diff / 1000);
  }

  if (currentTime >= targetTime) targetTime = currentTime + 10000;
  setTimeout(triggerTime, targetTime - currentTime);
  oldTime = currentTime;
}

function setClockDateWeekday() {
  $('.clock').html(
    moment()
      .locale(settings['language'])
      .format(
        settings['hide_seconds'] ? settings['shorttime'] : settings['longtime']
      )
  );
  $('.date').html(
    moment().locale(settings['language']).format(settings['longdate'])
  );
  $('.weekday').html(
    moment().locale(settings['language']).format(settings['weekday'])
  );
}

function resolveBackgroundImagePath(path) {
  var value = String(path || '').trim();
  if (!value) return '';
  if (/^(https?:)?\/\//i.test(value) || value.indexOf('/') >= 0) {
    return value;
  }
  return 'img/' + value;
}

function isMiniclockBlock(ref) {
  return (
    ref === 'miniclock' ||
    (ref && typeof ref === 'object' && ref.type === 'miniclock')
  );
}

function buildTopbarBlocks(existingBlocks) {
  var showClock = Number(settings['show_topbar_clock']) === 1;
  var blocks = Array.isArray(existingBlocks) ? existingBlocks.slice() : null;

  if (!blocks) {
    return showClock
      ? ['logo', 'miniclock', 'settings']
      : [{ type: 'logo', width: 10 }, 'settings'];
  }

  blocks = blocks.filter(function (ref) {
    return !isMiniclockBlock(ref);
  });

  if (showClock) {
    var logoIdx = -1;
    for (var i = 0; i < blocks.length; i++) {
      if (
        blocks[i] === 'logo' ||
        (blocks[i] && typeof blocks[i] === 'object' && blocks[i].type === 'logo')
      ) {
        logoIdx = i;
        break;
      }
    }
    blocks.splice(logoIdx >= 0 ? logoIdx + 1 : 0, 0, 'miniclock');
  } else {
    // Give the logo more room when the clock is hidden.
    blocks = blocks.map(function (ref) {
      if (ref === 'logo') {
        return { type: 'logo', width: 10 };
      }
      if (ref && typeof ref === 'object' && ref.type === 'logo' && !ref.width) {
        return $.extend({}, ref, { width: 10 });
      }
      return ref;
    });
  }

  return blocks;
}

function toSlide(num) {
  if (typeof myswiper !== 'undefined') myswiper.slideTo(num, 0, true);
}

function buildStandby() {
  if ($('.screenstandby').length == 0) {
    var standbyBackground =
      settings['standby_background'] || settings['background_image'] || '';
    var backgroundStyle = '';
    if (standbyBackground) {
      backgroundStyle =
        'background-image:url(\'' +
        resolveBackgroundImagePath(standbyBackground) +
        '\');';
    }
    var screenhtml =
      '<div class="screen screenstandby swiper-slide slidestandby" style="height:' +
      $(window).height() +
      'px;' +
      backgroundStyle +
      '"><div class="row"></div></div>';
    $('div.screen').hide();
    $('#settingspopup').modal('hide');
    $('div.dt-container').before(screenhtml);

    for (var c in columns_standby) {
      getBlock(columns_standby[c], 'standby' + c, 'div.screenstandby', true);
    }

    $('.screenstandby').on('click touchend', function (event) {
      Debug.log('Click or touchend in standby');
      disableStandby();
      event.stopPropagation();
      return false;
    });
  } else {
    $('.screenstandby').show();
  }
}

function buildDefaultScreens() {
  if (!screens[1]) screens[1] = {};
  screens[1].columns = [1, 2];
  columns[1] = {
    blocks: [],
    width: 10,
  };
  columns[2] = {
    blocks: [
      'clock',
      {
        title: 'Dashticz manual',
        url: 'https://dashticz.readthedocs.io',
      },
      {
        title: 'Dashticz forum',
        url: 'https://www.domoticz.com/forum/viewforum.php?f=67',
      },
      'sunrise',
      {
        btnimage: 'moon',
      },
    ],
    width: 2,
  };
  var alldevices = Domoticz.getAllDevices();
  $.each(alldevices, function (idx, device) {
    var idx_n = parseInt(idx);
    if (idx_n && (!settings['use_favorites'] || device.Favorite)) {
      columns[1].blocks.push(idx_n);
    }
  });
}

function buildScreens() {
  if (screens[1] && !screens[1].columns.length && settings['auto_positioning']) {
    buildDefaultScreens();
  }
  var allscreens = {};
  for (var t in screens) {
    if (
      typeof screens[t]['maxwidth'] !== 'undefined' &&
      typeof screens[t]['maxheight'] !== 'undefined'
    ) {
      allscreens[screens[t]['maxwidth']] = screens[t];
    } else {
      var maxwidth = 5000;
      if (typeof allscreens[maxwidth] == 'undefined') {
        allscreens[maxwidth] = {};
        allscreens[maxwidth]['maxwidth'] = maxwidth;
        allscreens[maxwidth]['maxheight'] = maxwidth;
      }
      allscreens[maxwidth][t] = screens[t];
    }
  }
  screens = allscreens;
  var keys = Object.keys(screens);
  var len = keys.length;
  keys.sort(function (a, b) {
    return a - b;
  });
  for (var i = 0; i < len; i++) {
    t = keys[i];
    if (
      typeof screens[t]['maxwidth'] == 'undefined' ||
      (parseFloat(screens[t]['maxwidth']) >= $(window).width() &&
        parseFloat(screens[t]['maxheight']) >= $(window).height())
    ) {
      currentScreenSet = [];
      for (var s in screens[t]) {
        currentScreenSet.push(screens[t][s]);
        if (s !== 'maxwidth' && s !== 'maxheight') {
          var screenhtml =
            '<div data-screenindex="' +
            s +
            '" class="screen screen' +
            s +
            ' swiper-slide slide' +
            s +
            '"';
          if (typeof screens[t][s]['background'] === 'undefined') {
            screens[t][s]['background'] = settings['background_image'];
          }
          if (typeof screens[t][s]['background'] !== 'undefined') {
            screenhtml +=
              'style="background-image:url(\'' +
              resolveBackgroundImagePath(screens[t][s]['background']) +
              '\');"';
          } else if (
            typeof screens[t][s][1] !== 'undefined' &&
            typeof screens[t][s][1]['background'] !== 'undefined'
          ) {
            screenhtml +=
              'style="background-image:url(\'' +
              resolveBackgroundImagePath(screens[t][s][1]['background']) +
              '\');"';
          }

          screenhtml += '><div class="row"></div></div>';
          $('div.contents').append(screenhtml);

          if (
            Number(settings['hide_topbar']) !== 1 ||
            Number(settings['topbar_timeout']) > 0
          ) {
            if (typeof columns['bar'] == 'undefined') {
              columns['bar'] = {};
            }
            columns['bar']['blocks'] = buildTopbarBlocks(columns['bar']['blocks']);
            getBlock(columns['bar'], 'bar', 'div.screen' + s, false);
          }

          for (var cs in screens[t][s]['columns']) {
            if (typeof screens[t] !== 'undefined') {
              var c = screens[t][s]['columns'][cs];
              getBlock(columns[c], c, 'div.screen' + s, false);
            }
          }
        }
      }
      break;
    }
  }

  buildSwipingScrolling();
}

function buildSwipingScrolling() {
  var enable_swiper = Number(settings['enable_swiper']);
  var vertical_screen = window.innerWidth < 768;
  var multi_screen = $('.dt-container .screen').length > 1;
  var start_swiper =
    multi_screen &&
    (enable_swiper === 2 || (enable_swiper === 1 && !vertical_screen));
  if (start_swiper) startSwiper();
  var vertical_scroll = Number(settings['vertical_scroll']);
  if (vertical_scroll === 2 || (vertical_scroll === 1 && !start_swiper)) {
    $('.swiper-slide').addClass('vertical-scroll');
  }
}

function startSwiper() {
  $('.dt-container').addClass('swiper');
  $('.contents').addClass('swiper-wrapper');
  setTimeout(function () {
    window.loadSwiper().then(function (Swiper) {
      myswiper = new Swiper('.swiper', {
        pagination: {
          el: '.swiper-pagination',
          clickable: true,
        },
        autoHeight: false,
        //      speed: 0,
        loop: false,
        initialSlide: settings['start_page'] - 1,
        effect: settings['slide_effect'],
        keyboard: {
          enabled: true,
          onlyInViewport: false,
        },
        direction: 'horizontal',
        allowTouchMove: settings.swiper_touch_move,
      });
      myswiper.on('transitionStart', function () {
        $('.slide').removeClass('selectedbutton');
      });
      myswiper.on('transitionEnd', function () {
        $('.slide' + (1 + this.activeIndex)).addClass('selectedbutton');
      });
      $('.slide' + settings['start_page']).addClass('selectedbutton');
    }).catch(function (err) {
      console.error('Unable to load Swiper', err);
    });
  }, 100);
}

function setClassByTime() {
  var d = new Date();
  var n = d.getHours();
  var newClass;

  if (n >= 20 || n <= 5) {
    newClass = 'night';
  } else if (n >= 6 && n <= 10) {
    newClass = 'morning';
  } else if (n >= 11 && n <= 15) {
    newClass = 'noon';
  } else if (n >= 16 && n <= 19) {
    newClass = 'afternoon';
  }

  for (var t in screens) {
    for (var s in screens[t]) {
      if (typeof screens[t][s]['background_' + newClass] !== 'undefined') {
        $('.screen.screen' + s).css(
          'background-image',
          "url('" +
            resolveBackgroundImagePath(screens[t][s]['background_' + newClass]) +
            "')"
        );
      }
    }
  }

  $('body').removeClass('morning noon afternoon night').addClass(newClass);
}

// eslint-disable-next-line no-unused-vars
function enterCode(armLevel) {
  var code;
  code = prompt(language.misc.enter_pincode);
  if (code != null) switchSecurity(armLevel, code);
}

// eslint-disable-next-line no-unused-vars
function infoMessage(sub, msg, timeOut) {
  if (timeOut == null) {
    timeOut = 8000;
  }
  if (timeOut == 0) {
    $('body').append(
      '<div class="update">' +
        sub +
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' +
        msg +
        '&nbsp;&nbsp;</div>'
    );
  } else {
    $('body').append(
      '<div class="update">' +
        sub +
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' +
        msg +
        '&nbsp;&nbsp;</div>'
    );
    setTimeout(function () {
      $('.update').fadeOut();
    }, timeOut);
  }
}

// eslint-disable-next-line no-unused-vars
function removeLoading() {
  $('#loadingMessage').css('display', 'none');
}

function disableStandby() {
  lastUserActivity = Date.now();
  if (standbyActive == true) {
    if (
      typeof _END_STANDBY_CALL_URL !== 'undefined' &&
      _END_STANDBY_CALL_URL !== ''
    ) {
      $.get(_END_STANDBY_CALL_URL);
    }
  }

  if (objectlength(columns_standby) > 0) {
    $('div.screen').show();
  }
  $('.screenstandby').hide(); //hide instead of remove, because removing blocks including unsubscribe has not been implemented.
  $('body').removeClass('standby');
  $('.dt-container').show();
  standbyActive = false;
}

//END OF STANDBY FUNCTION

function enableRefresh() {
  Domoticz.subscribe('_devices', true, getAllDevicesHandler);
}

/* START: SECURITY PANEL */
function checkSecurityStatus(res) {
  DT_secpanel.CheckStatus(res);
}

window.addEventListener('orientationchange', function () {
  checkSecurityStatus(Domoticz.getAllDevices()['_secstatus']);
});
/* END: SECURITY PANEL */

//# sourceURL=js/main.js
