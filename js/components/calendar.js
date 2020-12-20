/* global Dashticz moment settings  language  objectlength ksort infoMessage isDefined setHeight TemplateEngine */
var cal = [];
var templateEngine = TemplateEngine();

var DT_calendar = {
  name: 'calendar',
  canHandle: function (block, key) {
    return block && block.type === 'calendar';
  },
  defaultCfg: {
    icon: 'fas fa-calendar-alt',
    containerExtra: function (block) {
      if (block && block.layout === 2) block.icon = '';
    },
    emptytext: 'Geen afspraken.',
    method: 1,
  },
  run: function (me) {
    if (me.block.type === 'calendar') {
      if (me.block.icalurl) {
        if (
          (me.block.layout === 0 || me.block.layout === 1) &&
          (me.block.url || settings['calendarurl'])
        ) {
          $(me.mountPoint + ' .dt_block')
            .addClass('hover')
            .attr('data-toggle', 'modal')
            .attr('data-target', '#agenda-modal_' + me.key);
        }
        prepareCalendar(me, me.key);
      } else {
        infoMessage(
          '<font color="red">Domoticz error!',
          'Calendar "icalurl" missing on the calendar block.</font>',
          0
        );
      }
    }
  },
  refresh: function (me) {
    prepareCalendar(me, me.key);
  },
};
Dashticz.register(DT_calendar);

/**
 * Prepares the calendar object and applies block settings.
 * @param {object} me  Core component object.
 * @param {string} key The block name of the calendar.
 */
function prepareCalendar(me, key) {
  moment.locale(settings['calendarlanguage']);

  me.url = isDefined(me.block.url)
    ? me.block.url
    : isDefined(settings['calendarurl']) && settings['calendarurl'].length > 0
    ? settings['calendarurl']
    : '';
  me.dateFormat = isDefined(me.block.dateFormat)
    ? me.block.dateFormat
    : isDefined(settings['calendarformat']) &&
      settings['calendarformat'].length > 0
    ? formatDateTimeToDate(settings['calendarformat'])
    : 'ddd DD/MM/YY';
  me.timeFormat = isDefined(me.block.timeFormat)
    ? me.block.timeFormat
    : 'HH:mm';
  me.layout = isDefined(me.block.layout) ? me.block.layout : 0;
  me.icalurl = me.block.icalurl;
  me.icalurls = isObject(me.icalurl) ? objectlength(me.icalurl) : 1;
  me.maxitems = isDefined(me.block.maxitems) ? me.block.maxitems : 15;
  me.lastweek = isDefined(me.block.lastweek) ? me.block.lastweek : true;
  me.weeks = isDefined(me.block.weeks) ? me.block.weeks : 5;
  me.isoweek = isDefined(me.block.isoweek) ? me.block.isoweek : false;
  me.width = $(me.mountPoint + ' > div').width();
  me.adjustTZ = isDefined(me.block.adjustTZ) ? me.block.adjustTZ * 60 * 60 : 0;
  me.adjustAllDayTZ = isDefined(me.block.adjustAllDayTZ)
    ? me.block.adjustAllDayTZ * 60 * 60
    : false;
  me.startonly = isDefined(me.block.startonly) ? me.block.startonly : false;
  me.history = me.lastweek ? 7 : 0;
  me.update = true;
  me.isnew = true;
  cal[key] = me;

  if (cal[key].icalurls > 1) {
    getCalendarData(key, cal[key].icalurl, true, false);
  } else {
    var y = createCalObject('calendar', cal[key].icalurl, 'white');
    getCalendarData(key, y, true, false);
  }
}

/**
 * Fetches and parses calendar data using the ical url.
 * @param {string}   key     The block name of the calendar.
 * @param {string}   url     Calendar ical url that provides the ics file.
 * @param {boolean}  isnew   Does a new calendar template need creating.
 * @param {boolean}  ishol   Is this a public holiday calendar ical url.
 */
function getCalendarData(key, calendars, isnew, ishol) {
  var events = [];
  var counter = 1;

  $.each(calendars, function (name, calendar) {
    var url = makeUrl(key, calendar.ics);

    $.getJSON(url, function (data) {
      for (var e in data) {
        var ev = data[e];
        var enddate = ev.end;

        cal[key].adjustTZ =
          ev.allDay === true && cal[key].adjustAllDayTZ
            ? cal[key].adjustAllDayTZ
            : cal[key].adjustTZ;

        ev.start += cal[key].adjustTZ;
        ev.end += cal[key].adjustTZ;
        ev.name = name;
        ev.color = calendar.color;

        if (
          parseFloat(enddate) >=
          moment().subtract(cal[key].history, 'days').format('X')
        ) {
          if (isDefined(events[ev.start]) !== 'undefined')
            events[ev.start] = [];
          events[ev.start].push(ev);
        }
      }

      if (counter === cal[key].icalurls || ishol) {
        cal[key].events = ksort(events);

        switch (Number(cal[key].layout)) {
          case 2:
            generateCalendar(key, isnew, ishol);
            break;
          default:
            generateAgenda(cal[key].layout, key);
        }
      }
      counter++;
    }).catch(function () {
      console.error('Error in response from calendar with icalurl ' + url);
    });
  });
}
/**
 * Option: 0 - Generates all events and adds to the basic text agenda.
 * Option: 1 - Generates all events and adds to the HTML agenda.
 * @param {string}  opt  The agenda layout option; (1) basic or (2) table.
 * @param {string}  key  The block name of the calendar.
 */
function generateAgenda(opt, key) {
  createModalIframe(key);

  templateEngine.load('calendar_' + opt).then(function (template) {
    var data = {
      maxitems: cal[key].maxitems,
      events: cal[key].events,
      df: cal[key].dateFormat,
      tf: cal[key].timeFormat,
      startonly: cal[key].startonly,
      entire: language.weekdays.entire_day,
      emptyText : cal[key].block.emptytext
    };

    $(cal[key].mountPoint + ' .dt_state')
      .html(template(data))
      .addClass('agenda');

    if (opt === 1) {
      var p = '';
      $.each($(cal[key].mountPoint + ' .agenda-date'), function (i, el) {
        var dt = $(el).html().trim();
        if (p === dt) $(el).empty();
        p = dt;
      });
    }
  });
}

/**
 * Option: 2 - Generates all events and adds to the HTML calendar.
 * @param {string}   key     The block name of the calendar.
 * @param {boolean}  isnew   Does a new calendar template need creating.
 * @param {boolean}  ishol   Is this a public holiday calendar ical url.
 */
function generateCalendar(key, isnew, ishol) {
  templateEngine.load('calendar_2_template').then(function (template) {
    var w = cal[key].width;
    var h = parseInt(setHeight(cal[key]));
    $(cal[key].mountPoint + ' > div').css('height', h);

    if (isnew) {
      $(cal[key].mountPoint + ' .dt_state').html(
        template({ weeks: cal[key].weeks })
      );
      $(cal[key].mountPoint + ' td').css({
        height: h / 5.2,
        width: w / 7,
        maxWidth: w / 7,
      });

      $(cal[key].mountPoint + ' td').each(function (i, obj) {
        var start = cal[key].isoweek ? 'isoweek' : 'week';
        var dt = moment()
          .startOf(start)
          .subtract(cal[key].history, 'days')
          .add(i, 'days');
        $(obj).attr('data-id', dt);
        $(obj).find('div').first().html(dt.format('ddd DD MMM'));
        if (dt.isSame(moment(), 'd'))
          $(obj).find('div').first().addClass('today');
        cal[key].lastday = dt;
      });
    }

    if (cal[key].update) {
      for (var event in cal[key].events) {
        var items = cal[key].events[event];

        items.forEach(function (item) {
          if (moment.unix(item.start) < moment.unix(cal[key].lastday) / 1000) {
            $(cal[key].mountPoint + ' td').each(function (i, obj) {
              var m1 = moment.unix($(obj).data('id') / 1000);
              var m2 = moment.unix(item.start);
              var m3 = moment.unix(item.end);

              if (ishol) item.allDay = true;

              if (m1.date() === m2.date() && m1.month() === m2.month()) {
                templateEngine
                  .load('calendar_2_event')
                  .then(function (template) {
                    var data_object = {
                      name: item.name,
                      key: key,
                      start: !item.allDay ? m2.format('HH:mm') : '',
                      end: moment.unix(item.end).format('HH:mm'),
                      allday: item.allDay,
                      title: item.title,
                      info: escape(item.desc),
                      loc: item.location,
                      col: item.color,
                      c1: m3.unix() < moment().unix() ? 'historic' : '',
                      c2: item.allDay ? 'allday' : '',
                      c3: ishol ? 'hol' : '',
                    };

                    var elem = template(data_object);
                    ishol
                      ? $(obj).find('.header').after(elem)
                      : $(obj).append(elem);
                  });
              }
            });
          }
        });
      }
    }

    if (cal[key].block.holidayurl && cal[key].update) {
      var h = createCalObject('holiday', cal[key].block.holidayurl, '#5cb85c');
      getCalendarData(key, h, false, true);
      if (ishol) cal[key].update = false;
    }
  });
}

/**
 * Displays detail of the event when clicked showing a popup.
 * @param {string} pop The clickable html event element to launch the popup.
 */
function showInfo(pop) {
  if ($('.cal-modal').length > 0) $('.cal-modal').remove();

  var info = unescape($(pop).data('info'));
  var key = $(pop).data('key');
  var loc = $(pop).data('loc');
  var color = $(pop).data('color');
  var calurl = cal[key].url;

  templateEngine.load('calendar_2_modal').then(function (template) {
    var data_object = {
      title: $(pop).data('title'),
      time: !$(pop).data('allday')
        ? ': ' + $(pop).data('start') + ' - ' + $(pop).data('end')
        : '',
      info: info,
      name: $(pop).data('name'),
      caltext:
        calurl.length > 0
          ? 'Launch full calendar'
          : 'Add your "[calendarurl]" in config.js',
      calurl:
        calurl.length > 0
          ? calurl
          : 'https://dashticz.readthedocs.io/en/beta/dashticzconfiguration.html#config-parameters',
      loc: loc,
      lochide: loc.length === 0 ? 'loc-hide' : '',
      locurl: 'https://www.google.com/maps/search/' + loc,
    };
    $(document.body).append(template(data_object));
    if (info.length > 0) $('.cal-info').html($.parseHTML(info));
    if (color !== 'transparent') $('.cal-modal').css('borderColor', color);
    $(document.body).on('click', '.cal-close', function () {
      $('.cal-modal').remove();
    });
  });
}

/**
 * Creates a calendar object when user has not specified an object in their block config.
 * @param {string}  name    The name of the calendar.
 * @param {string}  url     The ical url to the ics file.
 * @param {string}  color   The color used for identifying an event between combined calendars.
 */
function createCalObject(name, url, color) {
  var x = {};
  var y = {};
  x.ics = url;
  x.color = color;
  y[name] = x;
  return y;
}

/**
 * Constructs the ical url to avoid cross-origin issues.
 * @param {string}  key  The block name of the calendar.
 * @param {string}  url  The ical url used to fetch the ics file.
 */
function makeUrl(key, url) {
  return (
    settings['dashticz_php_path'] +
    'ical/index.php?time=' +
    new Date().getTime() +
    '&maxitems=' +
    cal[key].maxitems +
    '&history=' +
    cal[key].history +
    '&url=' +
    url
      .replace(/webcal?\:\/\//i, 'https://')
      .replace('https://cors-anywhere.herokuapp.com/', '') +
    '&method=' +
    cal[key].block.method
  );
}

/**
 * Creates the modal Dialog to show the url after clicking on the calendar.
 * @param {string}  key  The block name of the calendar.
 */
function createModalIframe(key) {
  $('#agenda-modal_' + key).remove();
  templateEngine.load('calendar_modal_iframe').then(function (template) {
    $('body').append(template({ key: key, url: cal[key].url }));
  });
}

/**
 * Converts a DateTime format to a Date only format.
 * @param {string}  f  The input DateTime format.
 */
function formatDateTimeToDate(f) {
  return f
    .split(' ')
    .filter(function (a) {
      return !a.includes(':');
    })
    .join(' ')
    .replace(/a/gi, '');
}
//# sourceURL=js/components/calendar.js
