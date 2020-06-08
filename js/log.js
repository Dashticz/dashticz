/* global getRandomInt settings usrEnc pwdEnc*/
// eslint-disable-next-line no-unused-vars
function getLog(columndiv, level, popup, random) {
  if (typeof level == 'undefined') level = 2;
  if (typeof popup == 'undefined') popup = false;
  if (typeof random == 'undefined') random = getRandomInt(1, 100000);
  var html = '';
  if ($('.containslog' + random).length == 0) {
    if (popup)
      html =
        '<div data-id="log" class="containslog popup containslog' +
        random +
        '">';
    else
      html =
        '<div data-id="log" class="col-xs-12 transbg containslog containslog' +
        random +
        '">';
    if (!popup) {
      html +=
        '<div class="col-xs-2 col-icon"><em class="fas fa-microchip"></em></div>';
      html += '<div class="col-xs-10 items">';
    } else {
      html += '<div class="items">';
    }
    html += '</div>';
    $(columndiv).append(html);
  }

  //Todo: Change to Domoticz.request call
  var LOG_URI =
    settings['domoticz_ip'] +
    '/json.htm?username=' +
    usrEnc +
    '&password=' +
    pwdEnc +
    '&type=command&param=getlog&loglevel=' +
    level;
  $.ajax({
    url: LOG_URI + '&jsoncallback=?',
    type: 'GET',
    async: false,
    contentType: 'application/json',
    dataType: 'jsonp',
    success: function (logdata) {
      $('.containslog' + random + ' .items').html('');
      for (var r in logdata.result) {
        var addclass = '';
        if (popup) addclass = 'popup';
        $('.containslog' + random + ' .items').prepend(
          '<div class="level' +
            logdata.result[r]['level'] +
            ' ' +
            addclass +
            '">' +
            logdata.result[r]['message'] +
            '</div>'
        );
      }
    },
  });

  setTimeout(function () {
    getLog(columndiv, level, popup, random);
  }, 5000);
}
