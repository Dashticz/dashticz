/* global Dashticz moment settings config language time objectlength ksort*/

/**
 * Moment  https://github.com/solidgoldpig/handlebars.moment.
 */
MomentHandler.registerHelpers(Handlebars);

Handlebars.registerHelper("times", function (n, block) {
  var accum = "";
  for (var i = 0; i < n; ++i) accum += block.fn(i);
  return accum;
});

Handlebars.registerHelper("isdefined", function (value) {
  return value !== undefined;
});

Handlebars.registerHelper("ifLe", function( a, b, options){
    if(a <= b){
        return options.fn(this);
    }       
});

Handlebars.registerHelper("ifMe", function( a, b, options){
    if(a >= b){
        return options.fn(this);
    }       
});

Handlebars.registerHelper("ifLt", function( a, b, options){
    if(a < b){
        return options.fn(this);
    }       
});

Handlebars.registerHelper("ifMt", function( a, b, options){
    if(a > b){
        return options.fn(this);
    }       
});

Handlebars.registerHelper("ifEq", function( a, b, options){
    if(a == b){
        return options.fn(this);
    }       
});
