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

// Keep Day.js locale support aligned with the locales that Dashticz ships.
// This avoids bundling the full Day.js locale catalogue into the main bundle.
var localeAliases = {
  bs: 'bs',
  'bs-ba': 'bs',
  ca: 'ca',
  'ca-es': 'ca',
  cs: 'cs',
  'cs-cz': 'cs',
  da: 'da',
  'da-dk': 'da',
  de: 'de',
  'de-de': 'de',
  en: 'en',
  'en-us': 'en',
  es: 'es',
  'es-es': 'es',
  fi: 'fi',
  'fi-fi': 'fi',
  fr: 'fr',
  'fr-fr': 'fr',
  hu: 'hu',
  'hu-hu': 'hu',
  it: 'it',
  'it-it': 'it',
  ja: 'ja',
  'ja-jp': 'ja',
  lt: 'lt',
  'lt-lt': 'lt',
  nb: 'nb',
  'nb-no': 'nb',
  nl: 'nl',
  'nl-nl': 'nl',
  nn: 'nn',
  'nn-no': 'nn',
  pl: 'pl',
  'pl-pl': 'pl',
  pt: 'pt',
  'pt-pt': 'pt',
  ro: 'ro',
  'ro-ro': 'ro',
  ru: 'ru',
  'ru-ru': 'ru',
  sk: 'sk',
  'sk-sk': 'sk',
  sl: 'sl',
  'sl-si': 'sl',
  'sl-sl': 'sl',
  sr: 'sr',
  'sr-rs': 'sr',
  sv: 'sv',
  'sv-se': 'sv',
  tr: 'tr',
  'tr-tr': 'tr',
  uk: 'uk',
  'uk-ua': 'uk',
  zh: 'zh-cn',
  'zh-cn': 'zh-cn',
};
var supportedLocaleModules = Array.from(
  new Set(
    Object.keys(localeAliases)
      .map(function (locale) {
        return localeAliases[locale];
      })
      .filter(function (locale) {
        return locale !== 'en';
      })
  )
);
var localeContext = require.context(
  'dayjs/locale',
  false,
  /^\.\/(bs|ca|cs|da|de|es|fi|fr|hu|it|ja|lt|nb|nl|nn|pl|pt|ro|ru|sk|sl|sr|sv|tr|uk|zh-cn)\.js$/
);
supportedLocaleModules.forEach(function (locale) {
  localeContext('./' + locale + '.js');
});

function resolveLocale(locale) {
  if (!locale) return locale;
  var normalized = String(locale).replace('_', '-').toLowerCase();
  var language = normalized.split('-')[0];
  return localeAliases[normalized] || localeAliases[language] || normalized;
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
  return dayjs().locale(resolved).localeData();
};

var originalInstanceLocale = dayjs.prototype.locale;
dayjs.prototype.locale = function (locale) {
  return originalInstanceLocale.call(this, resolveLocale(locale));
};
dayjs.prototype.hours = dayjs.prototype.hour;
dayjs.prototype.minutes = dayjs.prototype.minute;

export default momentCompat;
