/* global config infoMessage language settingList */
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

function getUpdateSource() {
  var fallbackBranch = dashticz_branch || 'master';
  var phpPath =
    (typeof config !== 'undefined' && config['dashticz_php_path']) ||
    './vendor/dashticz/';
  return $.ajax({
    url: phpPath + 'info.php?get=gitinfo',
    dataType: 'json',
    cache: false,
    timeout: 5000,
  }).then(
    function (gitInfo) {
      if (gitInfo && gitInfo.available && gitInfo.owner && gitInfo.repository) {
        return {
          owner: gitInfo.owner,
          repository: gitInfo.repository,
          branch: gitInfo.branch || fallbackBranch,
          remote: gitInfo.remote || '',
        };
      }
      return {
        owner: 'Dashticz',
        repository: 'dashticz',
        branch: fallbackBranch,
        remote: '',
      };
    },
    function () {
      return {
        owner: 'Dashticz',
        repository: 'dashticz',
        branch: fallbackBranch,
        remote: '',
      };
    }
  );
}

// Text of the About section in the settings: current version plus the
// outcome of the update check (empty until that check has finished).
// eslint-disable-next-line no-unused-vars
function getAboutTitle() {
  return (
    'Dashticz V' +
    dashticz_version +
    (dashticz_branch ? ' ' + dashticz_branch : '') +
    '<br>' +
    newVersion
  );
}

// Reads the local version.txt only. The update check (an extra PHP call and a
// request to GitHub) runs after the dashboard has started, so a slow or
// unreachable internet connection can no longer delay the startup.
// eslint-disable-next-line no-unused-vars
function initVersion() {
  return $.ajax({
    url: 'version.txt',
    dataType: 'json',
    cache: false,
    success: function (localdata) {
      dashticz_version = localdata.version;
      dashticz_branch = localdata.branch || '';
      $('.loaderVersion').text('Version ' + dashticz_version);
    },
  })
    .then(function () {
      if (
        typeof config === 'undefined' ||
        typeof config['disable_update_check'] === 'undefined' ||
        !config['disable_update_check']
      ) {
        // Deliberately not returned: do not wait for the update check.
        checkForUpdate();
      }
    })
    .then(null, function () {
      console.log('Error loading version info. Skipping version check');
      return $.Deferred().resolve();
    });
}

function checkForUpdate() {
  return getUpdateSource()
    .then(function (source) {
      var sourceLabel =
        source.owner + '/' + source.repository + ' (' + source.branch + ')';
      return $.ajax({
        url:
          'https://raw.githubusercontent.com/' +
          encodeURIComponent(source.owner) +
          '/' +
          encodeURIComponent(source.repository) +
          '/' +
          encodeURIComponent(source.branch) +
          '/version.txt',
        dataType: 'json',
        timeout: 8000,
      }).then(function (data) {
        var message =
          (language.misc.latest_changes || 'Latest changes') +
          ': ' +
          data.last_changes;

        var versionComparison = compareVersions(data.version, dashticz_version);
        var downloadLink =
          '<a href="https://github.com/' +
          encodeURIComponent(source.owner) +
          '/' +
          encodeURIComponent(source.repository) +
          '/tree/' +
          encodeURIComponent(source.branch) +
          '" target="_blank">' +
          language.misc.download +
          '</a>';

        if (versionComparison > 0) {
          moved = true;
          newVersion =
            '<br><i>' +
            (language.misc.version || 'Version') +
            ' ' +
            data.version +
            ' ' +
            (language.misc.is_available || 'is available') +
            '! ' +
            downloadLink +
            '</i><br><i>' +
            message +
            '</i>';
        } else {
          moved = false;
          newVersion =
            versionComparison < 0
              ? '<br><i>' +
                (language.misc.newer_local_version ||
                  'Your local version is newer than') +
                ' ' +
                sourceLabel +
                '.</i>'
              : '<br><i>' +
                (language.misc.latest_version ||
                  'You are running the latest version from') +
                ' ' +
                sourceLabel +
                '.</i>';
        }
        // settings.js may already have built the About text without the
        // result of this check; refresh it.
        if (
          typeof settingList !== 'undefined' &&
          settingList['about'] &&
          settingList['about']['about_text']
        ) {
          settingList['about']['about_text']['title'] = getAboutTitle();
        }
        if (moved == true) {
          infoMessage(
            language.misc.new_version + '! (V' + data.version + ')',
            downloadLink,
            0
          );
        }
      });
    })
    .then(null, function () {
      console.log('Error loading git info. Probably no internet');
    });
}

//          'Error while requesting Domoticz version. Possible causes:<br> Domoticz offline<br>Domoticz IP incorrect in CONFIG.js<br>User credentials incorrect in CONFIG.js<br>Browser IP not whitelisted in Domoticz.';

//# sourceURL=js/version.js
