/* global config infoMessage language */
/*
	Check the latest version of dashticz on github.
	Check domoticz version
	*/

var dashticz_version;
var dashticz_branch;
// eslint-disable-next-line no-unused-vars
var newVersion = '';
var moved = false;
var loginCredentials = '';
// eslint-disable-next-line no-unused-vars
var domoversion = '';
var domoBuild = 0;
// eslint-disable-next-line no-unused-vars
var dzVents = '';
// eslint-disable-next-line no-unused-vars
var python = '';
// eslint-disable-next-line no-unused-vars
var levelNamesEncoded = false;
var levelNamesEncodeVersion =
  '3.9476'; /* Domoticz version above this, level names are encoded */

// eslint-disable-next-line no-unused-vars
function initVersion() {
  return $.ajax({
    url: 'version.txt',
    dataType: 'json',
    cache: false,
    success: function (localdata) {
      dashticz_version = localdata.version;
      dashticz_branch = localdata.branch;
    },
  })
    .then(function () {
      if (
        typeof config === 'undefined' ||
        (typeof config !== 'undefined' &&
          (typeof config['disable_update_check'] === 'undefined' ||
            !config['disable_update_check']))
      ) {
        return $.ajax({
          url:
            'https://raw.githubusercontent.com/Dashticz/dashticz/' +
            dashticz_branch +
            '/version.txt',
          dataType: 'json',
          success: function (data) {
            var message = 'Latest changes made: ' + data.last_changes;

            if (dashticz_version !== data.version) {
              moved = true;
              newVersion =
                '<br><i>Version ' +
                data.version +
                ' is available! <a href="https://github.com/Dashticz/dashticz/tree/' +
                dashticz_branch +
                '" target="_blank">Click here to download</a></i><br><i>' +
                message +
                '</i>';
            } else if (dashticz_version === data.version) {
              moved = false;
              newVersion = '<br><i>You are running latest version.</i>';
            }
            if (moved == true) {
              infoMessage(
                language.misc.new_version + '! (V' + data.version + ')',
                '<a href="https://github.com/Dashticz/dashticz/tree/' +
                  dashticz_branch +
                  '" target="_blank">' +
                  language.misc.download +
                  '</a>'
              );
            }
          },
        }).then(null, function () {
          console.log('Error loading git info. Probably no internet');
          return $.Deferred().resolve();
        });
      }
    })
    .then(function () {
      if (
        typeof window.btoa(config['user_name']) !== 'undefined' &&
        window.btoa(config['pass_word']) !== ''
      )
        loginCredentials =
          'username=' +
          window.btoa(config['user_name']) +
          '&password=' +
          window.btoa(config['pass_word']) +
          '&';

      return $.ajax({
        url:
          config['domoticz_ip'] +
          '/json.htm?' +
          loginCredentials +
          'type=command&param=getversion',
        dataType: 'json',
        success: function (data) {
          domoversion = 'Domoticz version: ' + data.version;
          domoBuild = data.version.match(/(?<=build )\d+(?=\))/);
          console.log('Build: '+domoBuild);
          dzVents = '<br>dzVents version: ' + data.dzvents_version;
          python = '<br> Python version: ' + data.python_version;
          levelNamesEncoded =
            parseFloat(data.version) >= parseFloat(levelNamesEncodeVersion);
        },
      }).catch(function (err) {
        console.log(err);
        var errorTxt =
          'Error while requesting Domoticz version. Possible causes:<br> Domoticz offline<br>Domoticz IP incorrect in CONFIG.js<br>User credentials incorrect in CONFIG.js<br>Browser IP not whitelisted in Domoticz.';
        return $.Deferred().reject(new Error(errorTxt));
      });
    });
}

//# sourceURL=js/version.js
