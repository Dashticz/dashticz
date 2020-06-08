/* global Dashticz moment settings config language time objectlength ksort*/

/**
 * Moment  https://github.com/solidgoldpig/handlebars.moment.
 */
MomentHandler.registerHelpers(Handlebars);

Handlebars.registerHelper('times', function (n, options) {
  var accum = '';
  for (var i = 0; i < n; ++i) {
    accum += options.fn(i);
  }
  return accum;
});

Handlebars.registerHelper('isdefined', function (value) {
  return value !== undefined;
});

Handlebars.registerHelper('ifLe', function (a, b, options) {
  if (a <= b) {
    return options.fn(this);
  }
});

Handlebars.registerHelper('ifMe', function (a, b, options) {
  if (a >= b) {
    return options.fn(this);
  }
});

Handlebars.registerHelper('ifLt', function (a, b, options) {
  if (a < b) {
    return options.fn(this);
  }
});

Handlebars.registerHelper('ifMt', function (a, b, options) {
  if (a > b) {
    return options.fn(this);
  }
});

Handlebars.registerHelper('ifEq', function (a, b, options) {
  if (a == b) {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
});

Handlebars.registerHelper('ifNe', function (a, b, options) {
  return a != b ? options.fn(this) : options.inverse(this);
});

/**
 * @param ary {Array}
 * @param max {Number} The max number of items to display from the array
 * @param [options.skip] {Number=0} Optional. Number of items to skip in the array
 */
Handlebars.registerHelper('eachUpTo', function (ary, max, options) {
  if (!ary || ary.length == 0) return options.inverse(this);

  var result = [],
    skip = options.hash ? (options.hash.skip ? options.hash.skip : 0) : 0,
    i = skip;

  max += skip;

  for (; i < max && i < ary.length; ++i) {
    result.push(options.fn(ary[i], { data: { itemIndex: i } }));
  }

  return result.join('');
});
