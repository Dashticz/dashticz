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
//var domoversion = '';
// eslint-disable-next-line no-unused-vars
//var dzVents = '';
// eslint-disable-next-line no-unused-vars
//var python = '';

function compareVersions(left, right) {
  var leftParts = String(left || '')
    .replace(/^v/i, '')
    .split('.')
    .map(function (part) {
      return parseInt(part, 10) || 0;
    });
  var rightParts = String(right || '')
    .replace(/^v/i, '')
    .split('.')
    .map(function (part) {
      return parseInt(part, 10) || 0;
    });
  var length = Math.max(leftParts.length, rightParts.length);

  for (var index = 0; index < length; index++) {
    var leftPart = leftParts[index] || 0;
    var rightPart = rightParts[index] || 0;
    if (leftPart > rightPart) return 1;
    if (leftPart < rightPart) return -1;
  }
  return 0;
}
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

            var versionComparison = compareVersions(
              data.version,
              dashticz_version
            );

            if (versionComparison > 0) {
              moved = true;
              newVersion =
                '<br><i>Version ' +
                data.version +
                ' is available! <a href="https://github.com/Dashticz/dashticz/tree/' +
                dashticz_branch +
                '" target="_blank">Click here to download</a></i><br><i>' +
                message +
                '</i>';
            } else {
              moved = false;
              newVersion =
                versionComparison < 0
                  ? '<br><i>You are running a newer local version.</i>'
                  : '<br><i>You are running latest version.</i>';
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
    .then(null, function () {
      console.log('Error loading version info. Skipping version check');
      return $.Deferred().resolve();
    });
}

//          'Error while requesting Domoticz version. Possible causes:<br> Domoticz offline<br>Domoticz IP incorrect in CONFIG.js<br>User credentials incorrect in CONFIG.js<br>Browser IP not whitelisted in Domoticz.';


//# sourceURL=js/version.js
