// Chart.js date adapter on top of Day.js, the date library the rest of
// Dashticz already uses (via the moment compatible wrapper in date-time.js).
// Time axes therefore follow the Dashticz language, and displayFormats use
// the same tokens as the rest of the configuration (moment/Day.js style:
// 'D MMM', 'ddd H:mm', 'll', ...).
import { _adapters } from 'chart.js';
import moment from './date-time.js';

var FORMATS = {
  datetime: 'MMM D, YYYY, h:mm:ss a',
  millisecond: 'h:mm:ss.SSS a',
  second: 'h:mm:ss a',
  minute: 'h:mm a',
  hour: 'hA',
  day: 'MMM D',
  week: 'll',
  month: 'MMM YYYY',
  quarter: '[Q]Q - YYYY',
  year: 'YYYY',
};

/* Until 4.20.7 the time axis used date-fns, so a configured displayFormats
   value may still use date-fns tokens. The unambiguous ones are translated;
   'd'/'dd' are read as day of the month when the format has a month but no
   Day.js day ('D'), as in the former defaults ('d MMM'). Text between
   brackets or quotes is kept as it is. */
export function fromDateFnsFormat(fmt) {
  if (typeof fmt !== 'string') return fmt;
  return fmt
    .split(/(\[[^\]]*\]|'[^']*')/)
    .map(function (part, index) {
      if (index % 2 === 1) {
        return part.charAt(0) === "'" ? '[' + part.slice(1, -1) + ']' : part;
      }
      var hasMonth = /M/.test(part);
      var hasDayJsDay = /D/.test(part);
      part = part
        .replace(/yyyy/g, 'YYYY')
        .replace(/(^|[^y])yy(?!y)/g, '$1YY')
        .replace(/EEEE/g, 'dddd')
        .replace(/EEE|EE(?!E)|E(?!E)/g, 'ddd')
        .replace(/a{2,5}/g, 'a')
        .replace(/\bdo\b/g, 'Do')
        .replace(/\bPP\b/g, 'll')
        .replace(/\bP\b/g, 'L');
      if (hasMonth && !hasDayJsDay) {
        part = part.replace(/(^|[^d])dd?(?!d)/g, function (match, before) {
          return before + (match.slice(before.length) === 'dd' ? 'DD' : 'D');
        });
      }
      return part;
    })
    .join('');
}

function toMoment(time) {
  return moment(time);
}

function unitOf(unit) {
  return unit === 'isoWeek' ? 'week' : unit;
}

_adapters._date.override({
  _id: 'dayjs',

  formats: function () {
    return FORMATS;
  },

  parse: function (value, fmt) {
    if (value === null || typeof value === 'undefined') return null;
    var type = typeof value;
    var parsed;
    if (type === 'number' || value instanceof Date) {
      parsed = moment(value);
    } else if (type === 'string') {
      parsed =
        typeof fmt === 'string'
          ? moment(value, fromDateFnsFormat(fmt))
          : moment(value);
    } else if (value && typeof value.valueOf === 'function') {
      parsed = moment(value.valueOf());
    } else {
      return null;
    }
    return parsed.isValid() ? parsed.valueOf() : null;
  },

  format: function (time, fmt) {
    return toMoment(time).format(fromDateFnsFormat(fmt));
  },

  add: function (time, amount, unit) {
    if (unit === 'quarter')
      return toMoment(time)
        .add(amount * 3, 'month')
        .valueOf();
    return toMoment(time).add(amount, unitOf(unit)).valueOf();
  },

  diff: function (max, min, unit) {
    if (unit === 'quarter') {
      return Math.trunc(toMoment(max).diff(toMoment(min), 'month') / 3);
    }
    return toMoment(max).diff(toMoment(min), unitOf(unit));
  },

  startOf: function (time, unit, weekday) {
    var value = toMoment(time);
    if (unit === 'isoWeek') {
      value = value.startOf('day');
      var offset = (value.day() - (+weekday || 0) + 7) % 7;
      return value.subtract(offset, 'day').valueOf();
    }
    if (unit === 'quarter') {
      value = value.startOf('month');
      return value.subtract(value.month() % 3, 'month').valueOf();
    }
    return value.startOf(unit).valueOf();
  },

  endOf: function (time, unit) {
    var value = toMoment(time);
    if (unit === 'quarter') {
      value = value.startOf('month');
      return value
        .add(2 - (value.month() % 3), 'month')
        .endOf('month')
        .valueOf();
    }
    return value.endOf(unitOf(unit)).valueOf();
  },
});
