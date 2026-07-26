/* global settings columns blocks screens */
// eslint-disable-next-line no-unused-vars
var DashticzWidgetEditor = (function () {
  'use strict';

  var catalog = [
    {
      id: 'weather',
      blockKey: 'widget_weather',
      title: 'Weer',
      description: 'Weersverwachting via OpenWeather of Weather Underground.',
      icon: 'fas fa-cloud-sun',
    },
    {
      id: 'garbage',
      blockKey: 'widget_garbage',
      title: 'Afval',
      description: 'Aankomende afvalinzamelingen.',
      icon: 'fas fa-trash-alt',
    },
    {
      id: 'spotify',
      blockKey: 'widget_spotify',
      title: 'Spotify',
      description: 'Spotify Connect-afstandsbediening.',
      icon: 'fab fa-spotify',
    },
    {
      id: 'sonarr',
      blockKey: 'widget_sonarr',
      title: 'Sonarr',
      description: 'Aankomende afleveringen uit Sonarr.',
      icon: 'fas fa-tv',
    },
    {
      id: 'clock',
      blockKey: 'widget_clock',
      title: 'Klok',
      description: 'Grote klok met datum en weekdag.',
      icon: 'far fa-clock',
    },
    {
      id: 'calendar',
      blockKey: 'widget_calendar',
      title: 'Kalender (ICS)',
      description: 'Afspraken uit een online ICS-agenda.',
      icon: 'fas fa-calendar-alt',
    },
  ];

  var selectedWidgets = {};
  var widgetDimensions = {};
  var weatherProvider = 'openweather';
  var calendarUrl = '';
  var clockType = 'basicclock';

  function open() {
    _readConfiguredWidgets();
    _buildAndShowModal();
  }

  function _readConfiguredWidgets() {
    selectedWidgets = {};
    widgetDimensions = {};
    weatherProvider =
      settings['owm_api'] || !settings['wu_api']
        ? 'openweather'
        : 'wunderground';
    calendarUrl = '';
    clockType = 'basicclock';

    if (typeof columns === 'undefined') return;

    _orderedColumnKeys().forEach(function (columnKey) {
      var column = columns[columnKey];
      if (!column || !Array.isArray(column.blocks)) return;

      column.blocks.forEach(function (reference) {
        if (typeof reference !== 'string') return;
        var item = _catalogItemByBlockKey(reference);
        if (!item) return;

        selectedWidgets[item.id] = true;
        var definition =
          typeof blocks !== 'undefined' && blocks[reference]
            ? blocks[reference]
            : {};
        widgetDimensions[item.id] = {
          width: parseInt(definition.width, 10) || null,
          height: parseInt(definition.height, 10) || null,
        };
        if (
          item.id === 'weather' &&
          definition.widget_provider === 'wunderground'
        ) {
          weatherProvider = 'wunderground';
        }
        if (
          item.id === 'calendar' &&
          typeof definition.icalurl === 'string'
        ) {
          calendarUrl = definition.icalurl;
        }
        if (
          item.id === 'clock' &&
          /^(basicclock|stationclock|flipclock|haymanclock|miniclock)$/.test(
            definition.type
          )
        ) {
          clockType = definition.type;
        }
      });
    });
  }

  function _orderedColumnKeys() {
    var result = [];
    if (
      typeof screens !== 'undefined' &&
      screens[1] &&
      Array.isArray(screens[1].columns)
    ) {
      result = screens[1].columns.map(String);
    }
    Object.keys(columns).forEach(function (columnKey) {
      if (result.indexOf(String(columnKey)) < 0) {
        result.push(String(columnKey));
      }
    });
    return result;
  }

  function _catalogItemByBlockKey(blockKey) {
    for (var i = 0; i < catalog.length; i++) {
      if (catalog[i].blockKey === blockKey) return catalog[i];
    }
    return null;
  }

  function _buildAndShowModal() {
    $('#widgeteditorpopup').remove();

    var html =
      '<div class="modal fade" id="widgeteditorpopup" tabindex="-1" aria-labelledby="we-title" aria-hidden="true">' +
      '<div class="modal-dialog modal-xl modal-dialog-scrollable">' +
      '<div class="modal-content">' +
      '<div class="modal-header">' +
      '<h5 class="modal-title" id="we-title"><i class="fas fa-puzzle-piece me-2" aria-hidden="true"></i>Widgets</h5>' +
      '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>' +
      '</div>' +
      '<div class="modal-body">' +
      '<p class="text-muted">Kies de functies die als tegel op scherm 1 moeten staan.</p>' +
      '<div class="we-widget-grid">';

    catalog.forEach(function (item) {
      html += _widgetCardHtml(item);
    });

    html +=
      '</div><div class="we-message" role="status"></div></div>' +
      '<div class="modal-footer">' +
      '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Sluiten</button>' +
      '<button type="button" class="btn btn-primary" id="we-save-btn">Opslaan</button>' +
      '</div></div></div></div>';

    $('body').append(html);
    _attachHandlers();
    window.bootstrap.Modal.getOrCreateInstance(
      document.getElementById('widgeteditorpopup')
    ).show();
  }

  function _widgetCardHtml(item) {
    var selected = !!selectedWidgets[item.id];
    var extra = '';

    if (item.id === 'weather') {
      extra =
        '<label class="we-field-label" for="we-weather-provider">Provider</label>' +
        '<select class="form-select form-select-sm we-widget-field" id="we-weather-provider">' +
        '<option value="openweather"' +
        (weatherProvider === 'openweather' ? ' selected' : '') +
        '>OpenWeather</option>' +
        '<option value="wunderground"' +
        (weatherProvider === 'wunderground' ? ' selected' : '') +
        '>Weather Underground</option></select>';
    } else if (item.id === 'calendar') {
      extra =
        '<label class="we-field-label" for="we-calendar-url">ICS-URL</label>' +
        '<input type="url" class="form-control form-control-sm we-widget-field" id="we-calendar-url" ' +
        'placeholder="https://…/calendar.ics" value="' +
        _esc(calendarUrl) +
        '">';
    } else if (item.id === 'clock') {
      extra =
        '<label class="we-field-label" for="we-clock-type">Kloktype</label>' +
        '<select class="form-select form-select-sm we-widget-field" id="we-clock-type">' +
        _clockOption('basicclock', 'Basic clock') +
        _clockOption('stationclock', 'Stationsklok') +
        _clockOption('flipclock', 'Flipclock') +
        _clockOption('haymanclock', 'Hayman clock') +
        _clockOption('miniclock', 'Miniclock') +
        '</select>';
    }

    return (
      '<div class="we-widget-card' +
      (selected ? ' we-selected' : '') +
      '" data-widget-id="' +
      item.id +
      '" role="button" tabindex="0" aria-pressed="' +
      (selected ? 'true' : 'false') +
      '">' +
      '<div class="we-widget-icon"><i class="' +
      item.icon +
      '" aria-hidden="true"></i></div>' +
      '<div class="we-widget-content"><div class="we-widget-title">' +
      item.title +
      '</div><div class="we-widget-description">' +
      item.description +
      '</div>' +
      extra +
      '</div><div class="we-widget-status">' +
      (selected ? 'Toegevoegd' : 'Klik om toe te voegen') +
      '</div></div>'
    );
  }

  function _clockOption(value, label) {
    return (
      '<option value="' +
      value +
      '"' +
      (clockType === value ? ' selected' : '') +
      '>' +
      label +
      '</option>'
    );
  }

  function _attachHandlers() {
    var $modal = $('#widgeteditorpopup');

    $modal.on('click', '.we-widget-card', function (event) {
      if ($(event.target).closest('.we-widget-field').length) return;
      _toggleWidget(String($(this).data('widget-id')));
    });

    $modal.on('keydown', '.we-widget-card', function (event) {
      if ($(event.target).closest('.we-widget-field').length) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        _toggleWidget(String($(this).data('widget-id')));
      }
    });

    $modal.on('change input', '.we-widget-field', function () {
      var id = $(this).closest('.we-widget-card').data('widget-id');
      selectedWidgets[String(id)] = true;
      _refreshCard(String(id));
      $('.we-message').removeClass('text-danger').text('');
    });

    $modal.on('click', '#we-save-btn', _save);
    $modal.one('hidden.bs.modal', function () {
      $modal.remove();
    });
  }

  function _toggleWidget(id) {
    selectedWidgets[id] = !selectedWidgets[id];
    _refreshCard(id);
  }

  function _refreshCard(id) {
    var selected = !!selectedWidgets[id];
    var $card = $('.we-widget-card[data-widget-id="' + id + '"]');
    $card
      .toggleClass('we-selected', selected)
      .attr('aria-pressed', selected ? 'true' : 'false')
      .find('.we-widget-status')
      .text(selected ? 'Toegevoegd' : 'Klik om toe te voegen');
  }

  function _save() {
    weatherProvider = $('#we-weather-provider').val() || 'openweather';
    calendarUrl = $.trim($('#we-calendar-url').val() || '');
    clockType = $('#we-clock-type').val() || 'basicclock';

    if (
      selectedWidgets.calendar &&
      !/^https?:\/\/\S+$/i.test(calendarUrl)
    ) {
      $('.we-message')
        .addClass('text-danger')
        .text('Vul voor Kalender een geldige http(s)-ICS-URL in.');
      $('#we-calendar-url').trigger('focus');
      return;
    }

    var payload = [];
    catalog.forEach(function (item) {
      if (!selectedWidgets[item.id]) return;
      var entry = { id: item.id };
      var dimensions = widgetDimensions[item.id] || {};
      if (dimensions.width) entry.width = dimensions.width;
      if (dimensions.height) entry.height = dimensions.height;
      if (item.id === 'weather') entry.provider = weatherProvider;
      if (item.id === 'calendar') entry.icalurl = calendarUrl;
      if (item.id === 'clock') entry.clockType = clockType;
      payload.push(entry);
    });

    var $save = $('#we-save-btn').prop('disabled', true).text('Opslaan…');
    $('.we-message').removeClass('text-danger').text('');

    $.getJSON(settings['dashticz_php_path'] + 'info.php?get=csrf')
      .then(function (data) {
        return $.ajax({
          url: 'js/savewidgets.php',
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify({ widgets: payload }),
          dataType: 'json',
          headers: { 'X-Dashticz-CSRF': data.token },
        });
      })
      .done(function () {
        $save.removeClass('btn-primary').addClass('btn-success').text('Opgeslagen');
        setTimeout(function () {
          window.location.reload();
        }, 700);
      })
      .fail(function (xhr) {
        var message =
          xhr.responseJSON && xhr.responseJSON.error
            ? xhr.responseJSON.error
            : 'De widgets konden niet worden opgeslagen.';
        $('.we-message').addClass('text-danger').text(message);
        $save.prop('disabled', false).text('Opslaan');
      });
  }

  function _esc(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return {
    open: open,
  };
})();

//# sourceURL=js/widgeteditor.js
