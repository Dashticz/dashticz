// eslint-disable-next-line no-unused-vars
var Domoticz = function () {
    var usrinfo = '';
    var path = '';
    var deviceObservable = new ListObservable()
    var state = {}
    state.devices = deviceObservable._values;
    var initPromise = null;
    var socket = null;
    var cfg ={};
    var useWSS = false;
    var initialUpdate = $.Deferred();
    var lastUpdate = {};

    MSG = {
        info: 'type=command&param=getversion'
    }

    function domoticzQuery(query) {
        return usrinfo + query + (cfg.plan? '&plan=' + cfg.plan:'')
    }
    function domoticzRequest(query) {
        console.log('requesting '+query)
        return $.get({
            url: cfg.url + '/json.htm?' + domoticzQuery(query),
            type: 'GET',
            async: true,
            contentType: "application/json",
            error: function (jqXHR, textStatus) {
                if (typeof (textStatus) !== 'undefined' && textStatus === 'abort') {
                    console.log('Domoticz request cancelled')
                } else {
                    console.error("Domoticz error code: " + jqXHR.status + ' ' + textStatus + "!\nPlease, double check the path to Domoticz in Settings!");
                    throw new Error('Domoticz error code: ' + jqXHR.status + '! Double check the path to Domoticz in Settings!');
                }
            }
        })

    }

    function checkWSSSupport() {
        return domoticzRequest(MSG.info)
        .then(function(res){
            console.log(res);
            if (parseFloat(res.version)>4.011 ) {
                    useWSS=true;
                    console.log("Switching to websocket");
                    connectWebsocket();
                }
            else {
                setInterval(_update, 5000);
            }
        })
    }

    function _init(initcfg) {
        if (!initPromise) {
            if (!initcfg.url) {
                throw new Error("Domoticz url not defined")
            }
            cfg=initcfg;
            if (cfg.usrEnc) usrinfo = 'username=' + cfg.usrEnc + '&password=' + cfg.pwdEnc + '&';
            initPromise = checkWSSSupport()
            .then(_update);



        }
//        _connectWebsocket();
        return initPromise;
    }

    function connectWebsocket() {
        socket = new WebSocket("ws://192.168.178.18:8090/json",['domoticz']);
        //var mysocket=this.socket;
        socket.onopen = function(e) {
            console.log(e)
            console.log("[open] Connection established");
            var msg = {
                event: 'request',
                requestid: 0,
                query: "type=devices"
            }
            socket.send(JSON.stringify(msg))
          };
          socket.onmessage = function(event) {
              initialUpdate.resolve();
//            console.log(`[message] Data received from server: ${event.data}`);
            //console.log(event.data);
            var res=JSON.parse(event.data);
            //console.log(res)
            var res2=JSON.parse(res.data)
            //console.log(res2)
            _setAllDevices(res2)
          };
          
          socket.onclose = function(event) {
            if (event.wasClean) {
              console.log('[close] Connection closed cleanly, code=', event.code, event.reason);
            } else {
              // e.g. server process killed or network down
              // event.code is usually 1006 in this case
              console.log(event)
              switch(event.code){
                case 1006: 
                    console.log('reconnecting')
                    setTimeout(connectWebsocket,1000); //try to reconnect in 1s
                    break;
                default:
                    console.error('[close] Connection died');
                    break;
    
                }
              
            }
          };
          
          socket.onerror = function(error) {
              console.error(error)
          };
    }

    function _update(forced) {

        if (useWSS==false || forced)
        return _requestAllDevices()
            .then( _requestAllVariables)
        else
            return initialUpdate;
    }

    function _getDevice(idx) {
        return _init()
            .then(function () {
                return state.devices[idx]
            })
    }

    function _requestAllDevices() {
        console.log('updateAllDevices ' + path);
        return domoticzRequest('type=devices&filter=all&used=true&order=Name&lastupdate='+lastUpdate.devices)
            .then(function (res) {
                return _setAllDevices(res)
            });
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
        console.log(data.ActTime);
        lastUpdate.devices = data.ActTime;
        setOnChange("_Sunrise", data.Sunrise);
        setOnChange("_Sunset",data.Sunset)
        for (var r in data.result) {
            var device = data.result[r];
            var idx = device['idx'];

            if (device['Type'] === 'Group' || device['Type'] === 'Scene') idx = 's' + device['idx'];
            setOnChange(idx, device); 
        }
//        setOnChange("_devices", new Date()); //event to trigger that all devices have been updated.
        setOnChange("_devices", data);
        return deviceObservable._values
    }

    function _requestAllVariables() {
//        console.log('requestAllVariables ' + path);
//        return domoticzRequest('type=command&param=getuservariables&lastupdate='+lastUpdate.variables)
            return domoticzRequest('type=command&param=getuservariables')
            .then(function (res) {
                return _setAllVariables(res)
            });
    }

    function _setAllVariables(data) {
        //console.log('Variables:',data)
        //lastUpdate.variables = data.ActTime;
        for (var r in data.result) {
            var variable = data.result[r];
            variable.Type = 'Variable';
            setOnChange('v' + variable.idx, variable);
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
        subscribe: _subscribe,
        update: _update
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

