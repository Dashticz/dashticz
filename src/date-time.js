import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import arraySupport from 'dayjs/plugin/arraySupport';
import badMutable from 'dayjs/plugin/badMutable';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import localeData from 'dayjs/plugin/localeData';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import objectSupport from 'dayjs/plugin/objectSupport';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
import weekday from 'dayjs/plugin/weekday';

dayjs.extend(advancedFormat);
dayjs.extend(arraySupport);
dayjs.extend(badMutable);
dayjs.extend(customParseFormat);
dayjs.extend(isBetween);
dayjs.extend(isSameOrAfter);
dayjs.extend(localeData);
dayjs.extend(localizedFormat);
dayjs.extend(objectSupport);
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(weekday);

// Dashticz lets users select any of the locales that Moment used to bundle.
// Include the Day.js locale catalogue so existing configuration keeps working.
var localeContext = require.context('dayjs/locale', false, /\.js$/);
localeContext.keys().forEach(localeContext);

function resolveLocale(locale) {
  if (!locale) return locale;
  var normalized = String(locale).replace('_', '-').toLowerCase();
  if (dayjs.Ls[normalized]) return normalized;
  var language = normalized.split('-')[0];
  return dayjs.Ls[language] ? language : normalized;
}

function momentCompat(input, format, locale, strict) {
  if (format === 'X') input = Number(input) * 1000;
  if (typeof locale === 'boolean') {
    strict = locale;
    locale = undefined;
  }
  var result = format && format !== 'X'
    ? dayjs(input, format, resolveLocale(locale), strict)
    : dayjs(input);
  return locale ? result.locale(resolveLocale(locale)) : result;
}

momentCompat.unix = dayjs.unix;
momentCompat.isMoment = dayjs.isDayjs;
momentCompat.locale = function (locale) {
  return locale ? dayjs.locale(resolveLocale(locale)) : dayjs.locale();
};
momentCompat.localeData = function (locale) {
  var resolved = resolveLocale(locale || dayjs.locale());
  var data = dayjs().locale(resolved).localeData();
  data._relativeTime = (dayjs.Ls[resolved] || {}).relativeTime || {};
  return data;
};

var originalInstanceLocale = dayjs.prototype.locale;
dayjs.prototype.locale = function (locale) {
  return originalInstanceLocale.call(this, resolveLocale(locale));
};
dayjs.prototype.hours = dayjs.prototype.hour;
dayjs.prototype.minutes = dayjs.prototype.minute;

export default momentCompat;
