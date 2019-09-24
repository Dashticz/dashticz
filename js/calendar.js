var recurring = {};

function addCalendar(calobject, icsUrlorg) {
    if (!_PHP_INSTALLED) {
        console.error("Domoticz error!\nCalendar requires a PHP enabled web server.");
        infoMessage('<font color="red">Domoticz error!', 'Calendar requires a PHP enabled web server</font>', 0);
        return;
    }
    if (typeof (icsUrlorg.calendars) == 'undefined') {
        var icsUrl = {};
        icsUrl.calendars = [];
        icsUrl.maxitems = icsUrlorg.maxitems;
        icsUrl.calendars[0] = {};
        icsUrl.calendars[0].calendar = icsUrlorg;
        icsUrl.calFormat = icsUrlorg.calFormat;
        icsUrl.timeFormat = icsUrlorg.timeFormat;
        icsUrl.dateFormat = icsUrlorg.dateFormat;
    } else icsUrl = icsUrlorg;

    var done = 0;
    var doneitems = {};
    var amountc = objectlength(icsUrl.calendars);
    var calitems = [];
    var colors = {};

    var maxitems = 10;
    if (typeof (icsUrl.maxitems) !== 'undefined') maxitems = icsUrl.maxitems;

    for (c in icsUrl.calendars) {
        curUrl = icsUrl.calendars[c].calendar;
        if (typeof (curUrl.url) !== 'undefined') {
            createCalendarModal(calobject, curUrl);
        }

        if (typeof (curUrl.icalurl) !== 'undefined') {
            curUrl = curUrl.icalurl.replace(/webcal?\:\/\//i, 'https://');
        }

        var color = '';
        if (typeof (icsUrl.calendars[c].color) !== 'undefined') color = icsUrl.calendars[c].color;

        curUrl = curUrl.replace('https://cors-anywhere.herokuapp.com/', '');

        colors[$.md5(curUrl)] = color;
        var cache = new Date().getTime();
        curUrl = settings['dashticz_php_path'] + 'ical/?time=' + cache + '&maxitems=' + maxitems + '&url=' + curUrl;
        moment.locale(settings['calendarlanguage']);
        $.getJSON(curUrl, function (data, textstatus, jqXHR) {

            var url = this.url.replace('https://cors-anywhere.herokuapp.com/http://ical-to-json.herokuapp.com/convert.json?url=', '');
            var url = this.url.split('url=');
            var url = url[1];

            done++;
            for (e in data) {
                event1 = data[e];
                var startdateStamp = event1.start;
                var enddateStamp = event1.end;
                var startdate = moment.unix(event1.start).format(settings['calendarformat']);
                var enddate = moment.unix(event1.end).format(settings['calendarformat']);

                if (event1.allDay == '') {
                    var test = settings['calendarformat'];
                    test = test.replace('dd', '');
                    test = test.replace('dddd', '');
                    if (moment(enddate, test).format('YYYY-MM-DD') === moment(startdate, test).format('YYYY-MM-DD')) {
                        enddate = moment.unix(event1.end + 60).format('HH:mm');
                    }
                    if (enddate !== '') enddate = ' - ' + enddate;
                } else {
                    enddate = '';
                    startdate = startdate.replace('00:00', '');
                    startdate = startdate.replace('00:00:00', '');
                    startdate += ' ' + language.weekdays.entire_day
                }
                event1.enddate = enddate;
                event1.startdate = startdate;

                event1.color = colors[$.md5(url)];
                if (parseFloat(enddateStamp) > moment().format('X')) {
                    if (typeof (calitems[enddateStamp]) === 'undefined') calitems[enddateStamp] = []
                    calitems[enddateStamp].push(event1);
                }
            }

            if (done == amountc) {
                var calFormat = typeof icsUrl.calFormat !== 'undefined' ? icsUrl.calFormat : 0;
                switch (Number(calFormat)) {
                    case 1:
                        insertCalendar(calobject, calitems, icsUrl); //table
                        break;
                    case 2: //todo :)  => https://fullcalendar.io/docs/list-view
                    default:
                        insertCalendar_0(calobject, calitems, maxitems); //classic format
                }

            }
        });
    }

    setTimeout(function () {
        addCalendar(calobject, icsUrlorg);
    }, (60000 * 5));
}

function createCalendarModal(calobject, curUrl) {
    /*
        Creates the modal Dialog to show the url after clicking on the calendar
    */
    var random = getRandomInt(1, 100000);
    var html = '<div class="modal fade" id="calendar_' + random + '" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">';
    html += '<div class="modal-dialog">';
    html += '<div class="modal-content">';
    html += '<div class="modal-header">';
    html += '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>';
    html += '</div>';
    html += '<div class="modal-body">';
    html += '<iframe data-popup="' + curUrl.url + '" width="100%" height="570" frameborder="0" allowtransparency="true"></iframe> ';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    $('body').append(html);
    calobject.addClass('hover');
    calobject.attr('data-toggle', 'modal');
    calobject.attr('data-target', '#calendar_' + random);
    calobject.attr('onclick', 'setSrc(this);');
}

function insertCalendar(calobject, calitems, calBlock) {
    /*
      Generates the calendar
      calobject: The HTML container
      calitems: All calendar items
      calBlock: the calendar definition block
      */
    var counter = 1;
    var prevStartDayPart = '';
    calitems = ksort(calitems);
    var html = '<table class="calendar">';
    var calendarDateFormat, calendarTimeFormat;

    [calendarDateFormat, calendarTimeFormat] = getCalendarFormatting(calBlock);

    for (check in calitems) {
        items = calitems[check];
        for (c in items) {
            item1 = items[c];
            if (check > moment().format('X') && counter <= calBlock.maxitems) {
                var styleColor = item1.color !== '' ? ' style="color:' + item1.color + '"' : '';
                var startDayPart = formatDate(item1.start, calendarDateFormat);
                var endDayPart = formatDate(item1.end, calendarDateFormat);
                var startTimePart = moment.unix(item1.start).format(calendarTimeFormat);
                var endTimePart = moment.unix(item1.end + 60).format(calendarTimeFormat);
                var widget = '<tr><td>';
                if (prevStartDayPart !== startDayPart) {
                    widget += startDayPart
                    if (startDayPart !== endDayPart) {
                        widget += '<br>' + '-' + endDayPart
                    }

                }
                prevStartDayPart = startDayPart;
                widget += '</td>';
                widget += '<td' + styleColor + '>';
                if (item1.allDay == '') {
                    widget += startTimePart + (startDayPart !== endDayPart ? '<br>&nbsp;&nbsp;&nbsp;' : '') + ' - ' + endTimePart
                } else {
                    widget += language.weekdays.entire_day;
                }
                widget += '</td>'
                widget += '<td class="caltitle"' + styleColor + '>' + item1.title + '</td></tr>'
                //                            calobject.find('.items').append(widget);
                html += widget;
                counter++;
            }
        }
    }
    html += '</table>';
    calobject.find('.items').html(html);
}

function getCalendarFormatting(calBlock) {

    var calendarTimeFormat = typeof calBlock.timeFormat === 'undefined' ? 'LT' : calBlock.timeFormat; //The localized short time format will be used
    var calendarDateFormat = typeof calBlock.dateFormat === 'undefined' ? 'LD' : calBlock.dateFormat; // https://devhints.io/moment

    return [calendarDateFormat, calendarTimeFormat];
}

function formatDate(caltime, dateFormat) {
    if (dateFormat === "LD") { //create localized Date format
        var dateOptions = {
            month: 'short',
            day: 'numeric',
            weekday: 'short'
        };

        /*test calendar language*/
        var tmpevent = new Date(caltime * 1000);

        try {
            return tmpevent.toLocaleDateString(settings.calendarlanguage.replace(/_/g, "-"), dateOptions);
        } catch(err) {
            return tmpevent.toLocaleDateString('nl-NL', dateOptions);
        }
    } else {
        return moment.unix(caltime).format(dateFormat);
    }
}

function insertCalendar_0(calobject, calitems, maxitems) {
    /*
      Generates the calendar. Classic format
      calobject: The HTML container
      calitems: All calendar items
      maxitems: Max number of calendar items to display
      */

    calobject.find('.items').html('');
    var counter = 1;
    calitems = ksort(calitems);
    for (check in calitems) {
        items = calitems[check];
        for (c in items) {
            item1 = items[c];
            if (check > moment().format('X') && counter <= maxitems) {
                var widget = '<div style="color:' + item1['color'] + '">' + item1['startdate'] + "" + item1['enddate'] + ' - <b>' + item1['title'] + '</b></div>';
                calobject.find('.items').append(widget);
                counter++;
            }
        }
    }
}