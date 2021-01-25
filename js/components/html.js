/* global Dashticz */

var DT_html = {
  name: 'html',
  canHandle: function (block) {
    return block && block.htmlfile;
  },
  run: function (me) {
    if (!me.block.border) me.$mountPoint.addClass('no-margin');
    return $.get({
      url: 'custom/' + me.block.htmlfile,
    }).then(function (res) {
      $(me.mountPoint + ' .dt_state').html(res);
    });
  },

  defaultCfg: {
    border: false,
  },
};

Dashticz.register(DT_html);
