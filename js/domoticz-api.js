// eslint-disable-next-line no-unused-vars
var Domoticz = function () {
    var usrinfo = '';
    var path = '';
    var deviceObservable = new ListObservable()
    var state = {}
    state.devices = deviceObservable._values;
    var initPromise = null;

    function _init() {
        if (!initPromise) {
            if (typeof (usrEnc) !== 'undefined' && usrEnc !== '') usrinfo = 'username=' + usrEnc + '&password=' + pwdEnc + '&';
            path = settings['domoticz_ip'] + '/json.htm?' + usrinfo;
            initPromise = _update()
            setInterval(function () {
                _update();
            }, 5000)

        }
        return initPromise;
    }

    function _update() {
        return _updateAllDevices()
            .then(function () {
                return _updateAllVariables()
            })
    }

    function _getDevice(idx) {
        return _init()
            .then(function () {
                return state.devices[idx]
            })
    }

    function _updateAllDevices() {
        console.log('updateAllDevices ' + path);
        var req = $.get({
                url: path + 'type=devices&plan=' + settings['room_plan'] + '&filter=all&used=true&order=Name',
                type: 'GET',
                async: true,
                contentType: "application/json",
                error: function (jqXHR, textStatus) {
                    if (typeof (textStatus) !== 'undefined' && textStatus === 'abort') {
                        console.log('Domoticz request cancelled')
                    } else {
                        console.error("Domoticz error code: " + jqXHR.status + ' ' + textStatus + "!\nPlease, double check the path to Domoticz in Settings!");
                        infoMessage('<font color="red">Domoticz error code: ' + jqXHR.status + '!', 'double check the path to Domoticz in Settings!</font>');
                    }
                }
            })
            .then(function (res) {
                return _setAllDevices(res)
            });
        return req
    }

    function setOnChange(idx, value) {
        var current_value=deviceObservable.get(idx);
        var update=false;
        switch (typeof current_value) {
            case 'undefined':
                update=true;
                break;
            case 'string':
            case 'number':
                update=value!=current_value;
                break;
            case 'object':
                if (typeof value.LastUpdate!=='undefined' && typeof current_value.LastUpdate !== 'undefined') {
                    var newmoment=moment(value.LastUpdate);
                    var currentmoment=moment(current_value.LastUpdate)
                    update = newmoment.diff(currentmoment)
                }
                else update=true;
                break;
            default:
                update=true;
        }
        if(update)
            deviceObservable.set(idx, value); //todo: only set after change

    }

    function _setAllDevices(data) {
        setOnChange("_Sunrise", data.Sunrise);
        setOnChange("_Sunset",data.Sunset)
        for (var r in data.result) {
            var device = data.result[r];
            var idx = device['idx'];

            if (device['Type'] === 'Group' || device['Type'] === 'Scene') idx = 's' + device['idx'];
            setOnChange(idx, device); 
        }
        setOnChange("_devices", new Date()); //event to trigger that all devices have been updated.
        return deviceObservable._values
    }

    function _updateAllVariables() {
        console.log('updateAllVariables ' + path);
        var req = $.get({
                url: path + 'type=command&param=getuservariables',
                type: 'GET',
                async: true,
                contentType: "application/json",
                error: function (jqXHR, textStatus) {
                    if (typeof (textStatus) !== 'undefined' && textStatus === 'abort') {
                        console.log('Domoticz request cancelled')
                    } else {
                        console.error("Domoticz error code: " + jqXHR.status + ' ' + textStatus + "!\nPlease, double check the path to Domoticz in Settings!");
                        infoMessage('<font color="red">Domoticz error code: ' + jqXHR.status + '!', 'double check the path to Domoticz in Settings!</font>');
                    }
                }
            })
            .then(function (res) {
                return _setAllVariables(res)
            });
        return req
    }

    function _setAllVariables(data) {
        for (var r in data.result) {
            var variable = data.result[r];
            variable.Type = 'Variable';
            setOnChange('v' + variable.idx, variable); //todo: only set after change
        }
        return deviceObservable._values
    }

    function _getAllDevices() {
        return deviceObservable._values
    }

    function _subscribe(self, idx, getCurrent, callback) {
        return deviceObservable.subscribe(self, idx, getCurrent, callback)
    }

    return {
        init: _init,
        getDevice: _getDevice,
        getAllDevices: _getAllDevices,
        state: state,
        subscribe: _subscribe
    }
}();

/*pubsub implementation specifically for Domoticz*/
function ListObservable() {
    this._observers = {}
    this._values = {}

    this.subscribe = function (self, idx, getCurrent, callback) {
        if (typeof this._observers[idx] === 'undefined')
            this._observers[idx] = []
        this._observers[idx].push({
            this: self,
            callback: callback
        })
        if (getCurrent && typeof this._values[idx] !== 'undefined')
            callAsync(callback, self, this._values[idx])
        var me = this;
        var observeridx = this._observers[idx].length - 1
        return function () {
            me.unsubscribe.call(me, idx, observeridx)
        }
    }

    this.unsubscribe = function (listidx, observeridx) {
        if (this._observers[listidx]) {
            if (!this._observers[listidx].splice(observeridx, 1).length);
            console.log('observer ' + observeridx + ' for list ' + listidx + ' not found.')
        } else {
            console.log('List idx ' + listidx + ' not found.')
        }
    }

    this.set = function (idx, value) {
        this._values[idx] = value;
        if (typeof this._observers[idx] !== 'undefined')
            this._observers[idx].forEach(function (el) {
                callAsync(el.callback, el.self, value)
            })
    }

    function callAsync(callback, self, value) {
        setTimeout(function() {
            callback.call(self, value)
        },0)
    }

    this.get = function (idx) {
        return this._values[idx]
    }
}

