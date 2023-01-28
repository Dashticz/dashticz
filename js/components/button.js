/* global DT_function MoonPhase Dashticz*/

// eslint-disable-next-line no-unused-vars
var DT_button = {
  name: 'button',
  canHandle: function (block) {
    return block && (block.btnimage || block.slide || block.log);
  },
  defaultCfg: function (button) {
    var cfg = {
      containerClass:
        (button && button.slide ? 'slide slide' + button.slide : ''),
      forcerefreshiframe: 0,
    };
    if (button.btnimage) {
      cfg.refresh = 60;
    }
    if(typeof button.title==='undefined' && typeof button.icon==='undefined' && typeof button.image==='undefined' && typeof button.btnimage==='undefined')
      button.title = button.key || button.type || 'Button';
    return cfg;
  },
  defaultContent: function (me) {
    var button = me.block;
    var html = '';
    if (button.btnimage) {
      var img = button.btnimage;
      if (img === 'moon') {
        img = DT_button.getMoonInfo(button);
      }
      if (typeof button.forceheight !== 'undefined') {
        html +=
          '<img src="' +
          img +
          '" style="max-width:100%;" width=100% height="' +
          button.forceheight +
          '" />';
      } else {
        html += '<img src="' + img + '" style="width:100%;" />';
      }
    }
    return html;
  },
  refresh: function (me) {
    DT_button.reloadImage(me);
  },
  reloadImage: function (me) {
    var src;
    if (typeof me.block.btnimage !== 'undefined') {
      if (me.block.btnimage === 'moon')
        src = DT_button.getMoonInfo(me.block.btnimage);
      else
        src = DT_function.checkForceRefresh(
          me.block.btnimage,
          me.block.forcerefresh
        );
      $(me.mountPoint + ' .dt_content img').attr('src', src);
    }
  },
  getMoonInfo: function () {
    var mymoon = new MoonPhase(new Date());
    var myphase = parseInt(mymoon.phase() * 100 + 50) % 100;
    return 'img/moon/moon.' + ('0' + myphase).slice(-2) + '.png';
  },
};

Dashticz.register(DT_button);

//# sourceURL=js/components/button.js
