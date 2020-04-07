/* global Dashticz moment settings config language time objectlength ksort infoMessage isDefined setHeight functions*/
var cal = {};
var DT_calendar = {
  name: "calendar",
  canHandle: function(block, key) {
    return (
      block && block.type === 'calendar'
    );
  },
  run: function(me) {
    if (me.block.type === 'calendar') {
      if (me.block.icalurl) {
        prepareCalendar(me);
      } else {
        infoMessage('<font color="red">Domoticz error!', 'Calendar "icalurl" missing on the calendar block.</font>', 0);
      }
    }
  }
};
Dashticz.register(DT_calendar);

/**
 * Prepares the calendar object and applies block settings.
 * @param {object} me  Core component object.
 */
function prepareCalendar(me) {
  
  moment.locale(settings["language"]);

  cal.url = isDefined(me.block.url)
    ? me.block.url
    : isDefined(settings["calendarurl"]) && settings["calendarurl"].length > 0
    ? settings["calendarurl"]
    : "";
  cal.dateFormat = isDefined(me.block.dateFormat)
    ? me.block.dateFormat
    : isDefined(settings["calendarformat"]) &&
      settings["calendarformat"].length > 0
    ? settings["calendarformat"]
    : "ddd DD/MM/YY";
  cal.timeFormat = isDefined(me.block.timeFormat)
    ? me.block.timeFormat
    : "HH:mm";
  cal.layout = isDefined(me.block.layout) ? me.block.layout : 0;
  cal.icalurl = me.block.icalurl;
  cal.icalurls = isObject(cal.icalurl) ? objectlength(cal.icalurl) : 1;
  cal.maxitems = isDefined(me.block.maxitems) ? me.block.maxitems : 15;
  cal.lastweek = isDefined(me.block.lastweek) ? me.block.lastweek : true;
  cal.weeks = isDefined(me.block.weeks) ? me.block.weeks : 5;
  cal.isoweek = isDefined(me.block.isoweek) ? me.block.isoweek : false;
  cal.width = $(me.mountPoint + " > div").width();
  cal.adjustTZ = isDefined(me.block.adjustTZ) ? me.block.adjustTZ * 60 * 60 : 0;
  cal.adjustAllDayTZ = isDefined(me.block.adjustAllDayTZ)? me.block.adjustAllDayTZ * 60 * 60 : false;
  cal.startonly = isDefined(me.block.startonly) ? me.block.startonly : false;
  cal.history = cal.lastweek ? 7 : 0;
  cal.update = true;
  cal.isnew = true;

  $.extend(cal, me);

  if (cal.icalurls > 1) {
    getCalendarData(cal.icalurl, true, false);
  } else {
    var y = createCalObject('calendar', cal.icalurl, 'transparent');
    getCalendarData(y, true, false);
  }
}

/**
 * Fetches and parses calendar data using the ical url.
 * @param {string}   url     Calendar ical url that provides the ics file.
 * @param {boolean}  isnew   Does a new calendar template need creating.
 * @param {boolean}  ishol   Is this a public holiday calendar ical url.
 */
function getCalendarData(calendars, isnew, ishol) {
  var events = [];
  var counter = 1;

  $.each(calendars, function (name, calendar) {
    url = makeUrl(calendar.ics);

    $.getJSON(url, function (data) {
      for (var e in data) {
        var ev = data[e];
        var enddate = ev.end;

        cal.adjustTZ =
          ev.allDay === true && cal.adjustAllDayTZ
            ? cal.adjustAllDayTZ
            : cal.adjustTZ;

        ev.start += cal.adjustTZ;
        ev.end += cal.adjustTZ;
        ev.name = name;
        ev.color = calendar.color;

        if (
          parseFloat(enddate) >=
          moment().subtract(cal.history, "days").format("X")
        ) {
          if (isDefined(events[ev.start]) !== "undefined")
            events[ev.start] = [];
          events[ev.start].push(ev);
        }
      }

      if (counter === cal.icalurls || ishol) {
        cal.events = ksort(events);

        switch (Number(cal.layout)) {
          case 1:
            generateAgendaHtml();
            break;
          case 2:
            generateCalendar(isnew, ishol);
            break;
          default:
            generateAgenda();
        }
      }
      counter++;
    }).catch(function () {
      console.error("Error in response from calendar with icalurl " + url);
    });
  });
}
/**
 * Option: 0 - Generates all events and adds to the basic text agenda.
 */
function generateAgenda() {

  var tem = '<div class="col-xs-12 items"></div>';
  $(cal.mountPoint + ' > div').html(Handlebars.compile(tem));

  var t = '';
  var d = '';
 
  t += '  {{#each events as | items |}}';
  t += '    {{#ifLe @index ../maxitems}}'
  t += '      {{#each items as | item |}}';
  t += '        <div style="color:{{item.color}};">';
  t += '          {{moment item.start input="X" format=../../df}} - ';
  t += '          {{#unless item.allDay}}';
  t += '            {{moment item.start input="X" format=../../tf}}';
  t += '            {{#unless ../../startonly}}';
  t += '              -{{moment item.end input="X" format=../../tf}} - ';
  t += '            {{/unless}}';
  t += '          {{else}}';
  t += '            {{../../entire}} - ';
  t += '          {{/unless}}';
  t += '          {{item.title}}';
  t += '        </div>';
  t += '      {{/each}}';
  t += '    {{/ifLe}}'
  t += '  {{/each}}';

  d = {
    maxitems: cal.maxitems,
    events: cal.events,
    df: cal.dateFormat,
    tf: cal.timeFormat,
    startonly: cal.startonly,
    entire: language.weekdays.entire_day
  }

  $(cal.mountPoint + ' .items').html(Handlebars.compile(t)(d));
}


/**
 * Option: 1 - Generates all events and adds to the HTML agenda.
 */
function generateAgendaHtml() {

  var p = '';
  var t = '';
  var d = '';

  t += '<table class="agenda">';
  t += '  {{#each events as | items |}}';
  t += '    {{#ifLe @index ../maxitems}}'
  t += '      {{#each items as | item |}}';
  t += '        <tr><td class="agenda-date">{{moment item.start input="X" format=../../df}}</td>';
  t += '        <td class="agenda-time"style="color:{{item.color}};">';
  t += '          {{#unless item.allDay}}';
  t += '            {{moment item.start input="X" format=../../tf}}';
  t += '            {{#unless ../../startonly}}';
  t += '              - {{moment item.end input="X" format=../../tf}}';
  t += '            {{/unless}}';
  t += '          {{else}}';
  t += '            {{../../entire}}';
  t += '          {{/unless}}';
  t += '        </td>';
  t += '        <td class="agenda-title" style="color:{{item.color}};">{{item.title}}</td></tr>'
  t += '      {{/each}}';
  t += '    {{/ifLe}}'
  t += '  {{/each}}';
  t += '</table>';

  d = {
    maxitems: cal.maxitems,
    events: cal.events,
    df: cal.dateFormat,
    tf: cal.timeFormat,
    startonly: cal.startonly,
    entire: language.weekdays.entire_day
  }

  $(cal.mountPoint + ' > div').html(Handlebars.compile(t)(d));
  $.each($('.agenda-date'), function(i, el) {    
    var dt = $(el).html().trim();
    if(p === dt) $(el).empty();
    p = dt;
  });
}

/**
 * Option: 3 - Generates all events and adds to the HTML calendar.
 * @param {boolean}  isnew   Does a new calendar template need creating.
 * @param {boolean}  ishol   Is this a public holiday calendar ical url.
 */
function generateCalendar(isnew, ishol) {

  if(isnew) addTemplate();
  cal.events = ksort(cal.events);

  if(cal.update){

    for (var event in cal.events) {  

      var items = cal.events[event];

      for (var i in items) {

        var item = items[i];

        if (moment.unix(item.start) < moment.unix(cal.lastday)/1000) {

          $(cal.mountPoint + " td").each(function(i, obj) {

            var m1 = moment.unix($(obj).data('id')/1000);
            var m2 = moment.unix(item.start);
            var m3 = moment.unix(item.end);
            var t = '';

            if(ishol) item.allDay = true;
            
            if(m1.date() === m2.date() && m1.month() === m2.month()){
              
              t += '<div class="event {{c1}} {{c2}} {{c3}}" style="color:{{col}};" onclick="showInfo(this)"';
              t += '     data-color="{{col}}" data-name="{{name}}" data-start="{{start}}" data-end="{{end}}"';
              t += '          data-allday="{{allday}}" data-title="{{title}}" data-info="{{info}}" data-loc="{{loc}}">';
              t += '  <div>{{start}}</div>';
              t += '  <div>{{title}}</div>';
              t += '</div>';
              
              var d = {
                name: item.name,
                start: !item.allDay? m2.format("HH:mm") : '',
                end: moment.unix(item.end).format("HH:mm"),
                allday: item.allDay,
                title: item.title,
                info: escape(item.desc),
                loc: item.location,
                col: item.color,
                c1: m3.unix() < moment().unix()? 'historic' : '',
                c2: item.allDay? 'allday' : '',
                c3: ishol? 'hol' : ''
              }

              var elem = Handlebars.compile(t)(d);
              ishol? $(obj).find('.header').after(elem) : $(obj).append(elem);
            }          
          });       
        }
      }
    }
  }
  if(cal.block.holidayurl && cal.update) {
    var h = createCalObject('holiday', cal.block.holidayurl, '#5cb85c');
    getCalendarData(h, false, true);
    if(ishol) cal.update = false;
  }  
}

/**
 * Creates the calendar template for the first calendar (ical url) only. 
 */
function addTemplate(){

  var w = cal.width;
  var h = parseInt(setHeight(cal));
  var t = '';
  var d = '';

  t += '<table class="cal_table">';
  t += '  {{#times weeks}}';
  t += '  <tr nowrap>';
  t += '    {{#times 7}}';
  t += '    <td>';
  t += '      <div class="header"></div>';
  t += '    </td>';
  t += '    {{/times}}';
  t += '  </tr>';
  t += '  {{/times}}';
  t += '</table>';

  d = { weeks: cal.weeks }

  $(cal.mountPoint + ' > div').css("height", h);
  $(cal.mountPoint + ' > div').html(Handlebars.compile(t)(d));
  $(cal.mountPoint + " td").css({ height: h / 5.2, width: w / 7, maxWidth: w / 7 });
  $(cal.mountPoint + " td").each(function(i, obj) {
    var start = cal.isoweek? 'isoweek' : 'week';
    var dt = moment().startOf(start).subtract(cal.history,'days').add(i,'days'); 
    $(obj).attr('data-id', dt);
    $(obj).find('div').first().html(dt.format('ddd DD MMM'));
    if(dt.isSame(moment(), 'd')) $(obj).find('div').first().addClass('today');
    cal.lastday = dt;
  });
}

/**
 * Displays detail of the event when clicked showing a popup.
 * @param {string} pop The clickable html event element to launch the popup.
 */
function showInfo(pop){

  if($('.cal-modal').length > 0) $('.cal-modal').remove();

  var info = unescape($(pop).data('info'));
  var loc = $(pop).data('loc');
  var color = $(pop).data('color');
  var calurl = cal.url;
  var t = ''; var d = '';

  t += '<div class="cal-modal">';
  t += ' <div class="cal-title">{{title}}{{time}}<i class="far fa-window-close cal-close"></i></div>';
  t += ' <div class="cal-info"><span>There are no details for this event.</span></div>';
  t += ' <div class="cal-footer">';
  t += '  <a href="{{calurl}}" target="_blank">{{caltext}}</a>';
  t += '  <a class="pull-right" href="{{locurl}}" target="_blank">{{loc}}</a>';
  t += '</div>';

  d = {
    title: $(pop).data('title'),
    time: !$(pop).data('allday')? ': ' + $(pop).data('start') + ' - ' + $(pop).data('end') : '',
    info: info,
    name: $(pop).data('name'),
    caltext: calurl.length > 0? 'Launch full calendar' : 'Add your "[calendarurl]" in config.js',
    calurl: calurl.length > 0? calurl : 'https://dashticz.readthedocs.io/en/beta/dashticzconfiguration.html#config-parameters',
    loc: loc,
    lochide: loc.length === 0? 'loc-hide' : '',
    locurl: 'https://www.google.com/maps/search/' + loc
  }

  $(document.body).append(Handlebars.compile(t)(d));
  if(info.length > 0) $('.cal-info').html($.parseHTML(info));
  if(color !== 'transparent') $('.cal-modal').css('borderColor', color);;
  $(document.body).on('click', '.cal-close', function() {
    $('.cal-modal').remove();
  });  
}

/**
 * Creates a calendar object when user has not specified an object in their block config.
 * @param {string}  name    The name of the calendar.
 * @param {string}  url     The ical url to the ics file.
 * @param {string}  color   The color used for identifying an event between combined calendars.
 */
function createCalObject(name, url, color){
  var x = {};
  var y = {};
  x.ics = url;
  x.color = color;    
  y[name] = x;
  return y;
}

/**
 * Constructs the ical url to avoid cross-origin issues.
 * @param {string}  url  The ical url used to fetch the ics file.
 */
function makeUrl(url){
  return settings['dashticz_php_path'] + 'ical/?time=' + new Date().getTime() + '&maxitems=' + cal.maxitems + '&history=' + cal.history + '&url=' + url
  .replace(/webcal?\:\/\//i, "https://")
  .replace("https://cors-anywhere.herokuapp.com/", "");
}

/*
    Creates the modal Dialog to show the url after clicking on the calendar
*/
$(document.body).on('click', '.agenda', function() {

  $('#agenda-modal').remove();
  var t = '';

  t += '<div class="modal fade" id="agenda-modal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">';
  t += '  <div class="modal-dialog">';
  t += '    <div class="modal-content">';
  t += '      <div class="modal-header">';
  t += '        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>';
  t += '      </div>';
  t += '      <div class="modal-body">';
  t += '        <iframe src="{{url}}" width="100%" height="570" frameborder="0" allowtransparency="true"></iframe> ';
  t += '      </div>';
  t += '    </div>';
  t += '  </div>';
  t += '</div>';

  $('body').append(Handlebars.compile(t)({url: cal.url}));
  $(cal.mountPoint + ' div').addClass('hover');
  $(cal.mountPoint + ' div').attr('data-toggle', 'modal');
  $(cal.mountPoint + ' div').attr('data-target', '#agenda-modal');
});
//# sourceURL=js/components/calendar.js