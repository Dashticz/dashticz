/* global _PHP_INSTALLED infoMessage settings moment language*/
/* global objectlength getRandomInt ksort*/

/*  addCalendar adds the calendar to calobject
    icsUrlorg:    string, in case of adding default calendar
                object, in case of adding custom calendar via block definition from CONFIG.js
*/
// eslint-disable-next-line no-unused-vars
function addCalendar(calobject, icsUrlorg) {
    if (!_PHP_INSTALLED) {
        console.error("Domoticz error!\nCalendar requires a PHP enabled web server.");
        infoMessage('<font color="red">Domoticz error!', 'Calendar requires a PHP enabled web server</font>', 0);
        return;
    }
    var icsUrl = {}
    if (typeof (icsUrlorg.calendars) == 'undefined') {
        icsUrl.calendars = [];
        icsUrl.maxitems = icsUrlorg.maxitems;
        icsUrl.calendars[0] = {};
        icsUrl.calendars[0].calendar = icsUrlorg;
        icsUrl.calFormat = icsUrlorg.calFormat;
        icsUrl.timeFormat = icsUrlorg.timeFormat;
        icsUrl.dateFormat = icsUrlorg.dateFormat;
        icsUrl.fixAllDay = icsUrlorg.fixAllDay;
    } else icsUrl = icsUrlorg;

    var done = 0;
    var amountc = objectlength(icsUrl.calendars); //count of calendars
    var calitems = [];
    var colors = {};

    var maxitems = 10;
    if (typeof (icsUrl.maxitems) !== 'undefined') maxitems = icsUrl.maxitems;

    for (var c in icsUrl.calendars) {
        var curCalendar = icsUrl.calendars[c].calendar;
        if (typeof (curCalendar.url) !== 'undefined') {
            createCalendarModal(calobject, curCalendar);
        }


        var curUrl = curCalendar.icalurl
        if (typeof (curUrl) === 'undefined') {
            console.error('icalurl in Calendar block not defined');
            return
        }

        // eslint-disable-next-line no-useless-escape
        curUrl = curUrl.replace(/webcal?\:\/\//i, 'https://');

        var color = '';
        if (typeof (icsUrl.calendars[c].color) !== 'undefined') color = icsUrl.calendars[c].color;

        curUrl = curUrl.replace('https://cors-anywhere.herokuapp.com/', '');

        colors[$.md5(curUrl)] = color;
        var cache = new Date().getTime();
        curUrl = settings['dashticz_php_path'] + 'ical/?time=' + cache + '&maxitems=' + maxitems + '&url=' + curUrl;
        moment.locale(settings['calendarlanguage']);
        $.getJSON(curUrl, function (data) {

            var url = this.url.replace('https://cors-anywhere.herokuapp.com/http://ical-to-json.herokuapp.com/convert.json?url=', '');
            url = this.url.split('url=');
            url = url[1];

            done++;
            for (var e in data) {
                var event1 = data[e];

                var offset = 0;
                //debugger
                if (curCalendar.adjustTZ)
                    offset = curCalendar.adjustTZ * 60 * 60
                if (event1.allDay === true && curCalendar.adjustAllDayTZ)
                    offset = curCalendar.adjustAllDayTZ * 60 * 60
                event1.start += offset
                event1.end += offset
                var enddateStamp = event1.end;

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
                        insertCalendar_0(calobject, calitems, icsUrl, maxitems); //classic format
                }

            }
        })
        .catch(function() {
            console.error('Error in response from calendar with icalurl '+curUrl)
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
    var calFormat = getCalendarFormatting(calBlock);

    for (var check in calitems) {
        var items = calitems[check];
        for (var c in items) {
            var item1 = items[c];
            if (check > moment().format('X') && counter <= calBlock.maxitems) {
                var styleColor = item1.color !== '' ? ' style="color:' + item1.color + '"' : '';
                var startDayPart = formatDate(item1.start, calFormat.date);
                var endDayPart = formatDate(item1.end, calFormat.date);

                if (item1.allDay) {
                    var startTmp = moment.unix(item1.start);
                    var endTmp = moment.unix(item1.end);
                    if (endTmp.diff(startTmp, 'days') === 0) {
                        endDayPart = startDayPart
                    }
                }
                var startTimePart = moment.unix(item1.start).format(calFormat.time);
                var endTimePart = moment.unix(item1.end + 60).format(calFormat.time);
                var widget = '<tr><td>';
                if (prevStartDayPart !== startDayPart) {
                    widget += startDayPart
                }
                prevStartDayPart = startDayPart;
                widget += '</td>';
                widget += '<td' + styleColor + '>';
                if (item1.allDay == '') {
                    widget += startTimePart + ' - ' + (startDayPart !== endDayPart ? endDayPart + ' ' : '') + endTimePart
                } else {
                    if (startDayPart !== endDayPart) {
                        widget += ' - ' + endDayPart + ' ';
                    }
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

    return {
        date: calendarDateFormat,
        time: calendarTimeFormat
    };
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
        } catch (err) {
            return tmpevent.toLocaleDateString('nl-NL', dateOptions);
        }
    } else {
        return moment.unix(caltime).format(dateFormat);
    }
}

function insertCalendar_0(calobject, calitems, calBlock, maxitems) {
    /*
      Generates the calendar. Classic format
      calobject: The HTML container
      calitems: All calendar items
      maxitems: Max number of calendar items to display
      */

    calobject.find('.items').html('');
    var counter = 1;
    calitems = ksort(calitems);
    for (var check in calitems) {
        var items = calitems[check];
        for (var c in items) {
            var item1 = items[c];
            var startdateStamp = item1.start;
            var enddateStamp = item1.end;

            var startdate = moment.unix(startdateStamp).format(settings['calendarformat']);
            var enddate = moment.unix(enddateStamp).format(settings['calendarformat']);

            if (item1.allDay === false) {
                var test = settings['calendarformat'];
                test = test.replace('dd', '');
                test = test.replace('dddd', '');
                if (moment(enddate, test).format('YYYY-MM-DD') === moment(startdate, test).format('YYYY-MM-DD')) {
                    enddate = moment.unix(enddateStamp + 60).format('HH:mm');
                }
                if (enddate !== '') enddate = ' - ' + enddate;
            } else {
                enddate = '';
                if (calBlock.fixAllDay) {
                    var tmpdate = moment.unix(startdateStamp);
                    startdate = moment({
                        year: tmpdate.year(),
                        month: tmpdate.month(),
                        day: tmpdate.date()
                    }).format(settings['calendarformat']);
                }
                //                startdate = moment(moment.unix(startdateStamp).format("LLLL")).format(settings['calendarformat']);
                startdate = startdate.replace('00:00', '');
                startdate = startdate.replace('00:00:00', '');
                startdate += ' ' + language.weekdays.entire_day
            }
            item1.enddate = enddate;
            item1.startdate = startdate;

            if (check > moment().format('X') && counter <= maxitems) {
                var widget = '<div style="color:' + item1['color'] + '">' + item1['startdate'] + "" + item1['enddate'] + ' - <b>' + item1['title'] + '</b></div>';
                calobject.find('.items').append(widget);
                counter++;
            }
        }
    }
}