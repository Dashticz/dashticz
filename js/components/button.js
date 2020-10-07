/* global getRandomInt DT_function getLog toSlide MoonPhase Dashticz*/

// eslint-disable-next-line no-unused-vars
var DT_button = {
  name: 'button',
  canHandle: function (block) {
    return block && (block.btnimage || block.slide);
  },
  defaultCfg: function (button) {
    var cfg = {
      containerClass:
        (button && button.slide ? 'slide slide' + button.slide : '') +
        (DT_button.buttonIsClickable(button) ? ' hover ' : ' '),
      forcerefreshiframe: 0,
    };
    if (button.btnimage) {
      cfg.refresh = 60;
    }
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
        html += '<img src="' + img + '" style="max-width:100%;" />';
      }
    }
    return html;
  },
  run: function (me) {
    var button = me.block;
    if (DT_button.buttonIsClickable(button))
      $(me.mountPoint + ' .button').on(
        'click',
        button,
        DT_button.buttonOnClick
      );
  },
  refresh: function (me) {
    DT_button.reloadImage(me);
  },
  buttonLoadFrame: function (
    button //Displays the frame of a button after pressing is
  ) {
    var random = getRandomInt(1, 100000);
    var block = {};
    $.extend(block, button, { forcerefresh: button.forcerefreshiframe }); //Maybe not the most clean way. Overwrite forcerefresh for iframe
    $('body').append(
      DT_function.createModalDialog('openpopup', 'button_' + random, block)
    );
    if (button.log == true) {
      if (typeof getLog !== 'function')
        $.ajax({
          url: 'js/log.js',
          async: false,
          dataType: 'script',
        });
      $('#button_' + random + ' .modal-body').html('');
      getLog($('#button_' + random + ' .modal-body'), button.level, true);
    }
    $('#button_' + random).on('hidden.bs.modal', function () {
      $(this).data('bs.modal', null);
      $(this).remove();
    });

    $('#button_' + random).modal('show');

    if (
      !button.log &&
      typeof button.refreshiframe !== 'undefined' &&
      button.refreshiframe > 0
    ) {
      setTimeout(function () {
        DT_button.refreshButtonFrame(button, random);
      }, button.refreshiframe * 1000);
    }
  },
  refreshButtonFrame: function (button, buttonid) {
    var mydiv = $('#button_' + buttonid).find('iframe');
    if (mydiv.length > 0) {
      mydiv.attr(
        'src',
        DT_function.checkForceRefresh(button.url, button.forcerefreshiframe)
      );
      setTimeout(function () {
        DT_button.refreshButtonFrame(button, buttonid);
      }, button.refreshiframe * 1000);
    }
  },
  buttonOnClick: function (
    m_event //button clickhandler. Assumption: button is clickable
  ) {
    var button = m_event.data;
    var hasPassword = button.password;
    if (!DT_function.promptPassword(hasPassword)) return;

    if (typeof button.newwindow !== 'undefined') {
      if (button.newwindow == '0') {
        window.open(button.url, '_self');
      } else if (button.newwindow == '1') {
        window.open(button.url);
      } else if (button.newwindow == '2') {
        DT_button.buttonLoadFrame(button);
      } else if (button.newwindow == '3') {
        $.ajax(DT_function.checkForceRefresh(button.url, button.forcerefresh));
      } else if (button.newwindow == '4') {
        $.post(button.url);
      } else {
        DT_button.buttonLoadFrame(button);
      }
    } else if (typeof button.slide !== 'undefined') {
      toSlide(button.slide - 1);
    } else {
      DT_button.buttonLoadFrame(button);
    }
  },
  buttonIsClickable: function (button) {
    var clickable =
      typeof button.url !== 'undefined' ||
      button.log == true ||
      typeof button.slide !== 'undefined';
    return clickable;
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
