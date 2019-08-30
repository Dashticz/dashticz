	/*
	Check the latest version of dashticz on github.
	Check domoticz version
	*/

var dashticz_version;
var dashticz_branch;
var newVersion = '';
var moved = false;
var loginCredentials ='';
var domoversion = '';
var dzVents = '';
var python = '';
var levelNamesEncoded = false;
var levelNamesEncodeVersion = '3.9476'; /* Domoticz version above this, level names are encoded */

function initVersion() {

    return $.ajax({
        url: 'version.txt',
        dataType: 'json',
        cache:false,
        success: function (localdata) {
            dashticz_version = localdata.version;
            dashticz_branch = localdata.branch
        }
    })
    .then(function() {
        if (typeof(config) === 'undefined'
            || (typeof(config) !== 'undefined' && (typeof(config['disable_update_check']) === 'undefined' || !config['disable_update_check']))
        ) {
            return $.ajax({
                url: 'https://raw.githubusercontent.com/Dashticz/dashticz/' + dashticz_branch + '/version.txt',
                dataType: 'json',
                success: function (data) {
                    var message = 'Latest changes made: ' + data.last_changes;

                    if (dashticz_version !== data.version) {
                        moved = true;
                        newVersion = '<br><i>Version ' + data.version + ' is available! <a href="https://github.com/Dashticz/dashticz/tree/' + dashticz_branch + '" target="_blank">Click here to download</a></i><br><i>' + message + '</i>';
                    }
                    else if (dashticz_version === data.version) {
                        moved = false;
                        newVersion = '<br><i>You are running latest version.</i>';
                    }
                    if (moved == true) {
                        infoMessage(language.misc.new_version + '! (V' + data.version + ')', '<a href="https://github.com/Dashticz/dashticz/tree/' + dashticz_branch + '" target="_blank">' + language.misc.download + '</a>');
                    }
                }
            });
        }
    })
    .then(function() {
        if (typeof(window.btoa(config['user_name'])) !== 'undefined' && window.btoa(config['pass_word']) !== '') loginCredentials = 'username=' + window.btoa(config['user_name']) + '&password=' + window.btoa(config['pass_word']) + '&';

        return $.ajax({
            url: config['domoticz_ip'] + '/json.htm?' + loginCredentials + 'type=command&param=getversion',
            dataType: 'json',
            success: function (data) {
                domoversion = 'Domoticz version: ' + data.version;
                dzVents = '<br>dzVents version: ' + data.dzvents_version;
                python = '<br> Python version: ' + data.python_version;
                levelNamesEncoded = (Number(data.version) >= Number(levelNamesEncodeVersion));
            }
        });
    });
}