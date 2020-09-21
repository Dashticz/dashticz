/* global Dashticz Domoticz settings MobileDetect*/
/* From bundle:*/
/* global templateEngine*/
/* From src/functions.js*/
/* global isDefined */

var DT_secpanel = {
  name: 'secpanel',
  defaultCfg: {
    title: 'Dashticz Security Panel',
  },

  locked: false,

  init: function () {
    this.CountdownTimer = 0;
    this.timer = 0;
    this.secondelay = 0;
    this.mp = 0;
  },

  run: function (me) {
    templateEngine
      .load('secpanel')
      .then(function (template) {
        $(me.mountPoint + ' .dt_content').html(
          template({
            mode: 2,
          })
        );
        $(me.mountPoint + ' .dt_block').css('background', 'transparent');
        $(me.mountPoint + ' .dt_block').css('border', '0');
        DT_secpanel.onResize(me);
      })
      .done(function () {
        Domoticz.subscribe('_secstatus', true, function () {
          //subscribe to the security status, and receive the actual status directly
          DT_secpanel.ShowStatus();
        });
      });
  },

  onResize: function (me) {
    var w = $(me.mountPoint + ' .dt_content').width();
    var h = w * 1.35;
    $('.sec-frame .key').css('fontSize', h / 12);
    $('.sec-frame .key-input').css('fontSize', h / 24);
    $('.sec-frame .keypad-footer').css('fontSize', h / 53);
    $('.sec-frame .keypad-header').css('fontSize', h / 24);
    $(me.mountPoint + ' .dt_content').height(h);
  },

  CheckStatus: function (secstatus) {
    //callback function for main.js
    if (secstatus == 2) {
      DT_secpanel.locked = true;
      templateEngine.load('secpanel_modal').then(function (modal) {
        $(document.body).append(modal);
        templateEngine.load('secpanel').then(function (template) {
          var md = new MobileDetect(window.navigator.userAgent);
          var data = {
            mode: 1,
            wt: 34,
            ht: 80,
          };
          var mql = window.matchMedia('(orientation: portrait)');
          var portrait = mql.matches;

          if (md.phone()) {
            data.wt = 95;
            data.ht = 95;
            data.fsKey = '13vw';
            data.fsInp = '5vw';
            data.fsHdr = '4vw';
            data.fsFtr = '2vw';
            data.htScr = '3%';
          }

          if (md.tablet()) {
            data.wt = portrait ? 95 : 55;
            data.ht = 95;
            data.fsKey = portrait ? '10.5vw' : '5.5vw';
            data.fsInp = portrait ? '5vw' : '3vw';
            data.fsHdr = portrait ? '4vw' : '3vw';
            data.fsFtr = portrait ? '2vw' : '1vw';
          }

          $('.sec-modal').html(template(data));
          DT_secpanel.ShowStatus();
        });
      });
    } else {
      //      $(".security-panel").remove();
      if (DT_secpanel.locked) window.location.reload();
    }
  },

  ShowStatus: function () {
    if (DT_secpanel.timer) return; //While we are counting down no refresh
    Domoticz.request('type=command&param=getsecstatus&v=')
      .then(function (data) {
        if (data.status != 'OK') {
          DT_secpanel.ShowMsg('NO OK DATA');
          return;
        } else {
          $('.sec-frame .status:not(.dashticz)').removeClass('disabled');
          switch (data.secstatus) {
            case 0:
              DT_secpanel.ShowMsg('DISARMED');
              $('.sec-frame .key-input').removeClass('text-strobe');
              $('.sec-frame .dashticz').removeClass('disabled');
              break;
            case 1:
              DT_secpanel.ShowMsg('ARMED - HOME');
              $('.sec-frame .dashticz').removeClass('disabled');
              $('.sec-frame .key-input').addClass('text-strobe');
              break;
            case 2:
              DT_secpanel.ShowMsg('ARMED - AWAY');
              $('.sec-frame .dashticz').addClass('disabled');
              $('.sec-frame .key-input').addClass('text-strobe');
              break;
            default:
              DT_secpanel.ShowMsg('UNKNOWN');
          }

          $('.sec-frame td div[data-status="' + data.secstatus + '"]').addClass(
            'disabled'
          );
          DT_secpanel.secondelay = isDefined(data.secondelay)
            ? data.secondelay + 1
            : 5;
        }
      })
      .catch(function (data) {
        console.log(data);
        switch (data.status) {
          case 401:
            DT_secpanel.ShowMsg('401: UNAUTHORISED');
            break;
          default:
            DT_secpanel.ShowMsg('NO CONNECT');
        }
        return;
      })
      .always(function () {
        $('#password').val('');
      });
  },

  SetSecStatus: function (status) {
    clearInterval(this.CountdownTimer);
    var seccode = $('.sec-frame #password').val();
    if (isNaN(seccode)) {
      DT_secpanel.wrongCode();
      return;
    }
    if (typeof DT_secpanel.RefreshTimer !== 'undefined')
      DT_secpanel.RefreshTimer = clearTimeout(DT_secpanel.RefreshTimer);
    if (typeof DT_secpanel.CodeSetTimer !== 'undefined')
      DT_secpanel.CodeSetTimer = clearTimeout(DT_secpanel.CodeSetTimer);

    Domoticz.request(
      'type=command&param=setsecstatus&secstatus=' +
        status +
        '&seccode=' +
        md5(seccode)
    )
      .then(function (data) {
        if (data.status != 'OK') {
          if (data.message == 'WRONG CODE') {
            DT_secpanel.wrongCode();
          } else {
            DT_secpanel.ShowMsg('NO OK DATA');
            return;
          }
          return;
        } else {
          $('.sec-frame .status:not(.dashticz)').removeClass('disabled');
          var mode = $('.sec-frame').last().data('mode');
          if (mode === 2 && status === 2 && settings['security_panel_lock']) {
            location.reload();
          } else {
            DT_secpanel.ShowStatus();
          }
        }
      })
      .catch(function () {
        DT_secpanel.ShowMsg('NO CONNECT');
        return;
      });
  },

  /** Displays the WRONG CODE message, clears the password, and plays wrongcode sound
   *
   */
  wrongCode: function () {
    DT_secpanel.ShowMsg('WRONG CODE');
    DT_secpanel.CodeSetTimer = setTimeout(function () {
      DT_secpanel.ShowStatus();
    }, 2000);
    $('.sec-frame #password').val('');
    DT_secpanel.beep('wrongcode');
  },

  AddDigit: function (digit) {
    if (typeof this.CodeSetTimer != 'undefined') {
      this.CodeSetTimer = clearTimeout(this.CodeSetTimer);
    }
    if (typeof this.RefreshTimer != 'undefined') {
      this.RefreshTimer = clearTimeout(this.RefreshTimer);
    }
    if (typeof this.CountdownTimer != 'undefined') {
      this.CountdownTimer = clearInterval(this.CountdownTimer);
      DT_secpanel.ShowMsg('');
    }
    this.CodeSetTimer = setTimeout(function () {
      DT_secpanel.ShowStatus();
    }, 10000);

    var orgtext = $('.sec-frame #password').val();
    if (isNaN(orgtext)) orgtext = '';

    var newtext = orgtext + digit;
    var codeinput = '';
    for (var i = 0; i < newtext.length; i++) {
      codeinput = codeinput + '#';
    }

    DT_secpanel.ShowMsg(codeinput);
    $('.sec-frame #password').val(newtext);
  },

  ShowMsg: function (val) {
    $('.sec-frame #digitdisplay').val(val);
  },

  countdown: function (status) {
    if (DT_secpanel.timer > 0) {
      DT_secpanel.timer = DT_secpanel.timer - 1;
      DT_secpanel.beep('key');
      DT_secpanel.ShowMsg('Arm Delay: ' + DT_secpanel.timer);
    } else {
      clearInterval(DT_secpanel.CountdownTimer);
      DT_secpanel.beep('arm');
      $('.sec-frame .status').removeClass('disabled');
      DT_secpanel.SetSecStatus(status);
    }
  },

  beep: function (tone) {
    var dt = new Date().getTime();
    var audio = new Audio(
      settings['domoticz_ip'] + '/secpanel/media/' + tone + '.mp3?' + dt
    );
    audio.play();
  },
};

$('body').on('click', '.sec-frame .key:not(.disabled)', function () {
  var id = $(this).data('id');
  var tone = $(this).data('tone');
  var status = $(this).data('status');

  if (id < 10) {
    DT_secpanel.AddDigit(id);
    DT_secpanel.beep(tone);
    return;
  }

  if (status >= 0) {
    var seccode = $('.sec-frame #password').val();
    if (seccode.length === 0) {
      DT_secpanel.beep('wrongcode');
      DT_secpanel.ShowMsg('ENTER CODE');
      setTimeout(function () {
        DT_secpanel.ShowStatus();
        return;
      }, 3000);
    } else {
      var seccodehash = md5(seccode);
      var codeok =
        seccodehash === Domoticz.getAllDevices()['_settings'].SecPassword;
      if (!codeok) {
        //check code already before counting down
        DT_secpanel.wrongCode();
        return;
      }

      if (status === 0) {
        DT_secpanel.SetSecStatus(status);
        DT_secpanel.beep(tone);
      } else {
        DT_secpanel.timer = DT_secpanel.secondelay;
        if (DT_secpanel.timer > 0) {
          DT_secpanel.CountdownTimer = setInterval(
            DT_secpanel.countdown,
            1000,
            status
          );
          DT_secpanel.beep('key');
        } else {
          DT_secpanel.beep(tone);
        }
      }
    }
    return;
  }

  if (id === 'cancel') {
    DT_secpanel.ShowMsg('CANCELLED');
    clearInterval(DT_secpanel.CountdownTimer);
    DT_secpanel.timer = 0; //otherwise the panel will not show the new status.
    setTimeout(function () {
      DT_secpanel.ShowStatus();
      DT_secpanel.beep(tone);
    }, 1000);
    return;
  }

  if (id === 'dashticz') {
    location.reload();
    return;
  }
});

$('body').on('click', '.sec-frame .screw.bl', function () {
  var md = new MobileDetect(window.navigator.userAgent);
  var orientation =
    (screen.orientation || {}).type ||
    screen.mozOrientation ||
    screen.msOrientation;
  var msg = 'Mobile: ' + md.mobile() + '\n';
  msg += 'Phone: ' + md.phone() + '\n';
  msg += 'Tablet: ' + md.tablet() + '\n';
  msg += 'OS: ' + md.os() + '\n';
  msg += 'User Agent: ' + md.userAgent() + '\n';
  msg += 'Resolution: ' + screen.width + 'x' + screen.height + '\n';
  msg += 'Orientation: ' + orientation.split('-')[0];
  alert(msg);
});

Dashticz.register(DT_secpanel);
//# sourceURL=js/components/secpanel.js
