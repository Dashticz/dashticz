/*from bundle.js*/
/* global moment*/

// eslint-disable-next-line no-unused-vars
var Domoticz = (function () {
  var usrinfo = '';
  var deviceObservable = new ListObservable();
  var state = {};
  state.devices = deviceObservable._values;
  var initPromise = null;
  var socket = null;
  var cfg = {};
  var useWS = false;
  var initialUpdate = $.Deferred();
  var lastUpdate = {};
  var requestid = 0;
  var callbackList = [];
  var reconnectTimeout = 2; //Initial value: 1 sec reconnect timeout
  var reconnecting = false;
  var securityRefresh = null;

  var MSG = {
    info: 'type=command&param=getversion',
    secpanel: 'type=command&param=getsecstatus',
    getSettings: 'type=settings',
  };

  function domoticzQuery(query) {
    return usrinfo + query + (cfg.plan ? '&plan=' + cfg.plan : '');
  }

  var lastRequest = $.Deferred().resolve();
  /** Start async Domoticz request.
   * The domoticz request will only start after finishing the previous one.
   * No timeout handling yet ...
   * @function
   * @param {string} query - The domoticz request
   * @param {boolean} forcehttp - Force usage of HTTP and not websocket
   * @return {Promise} The JQuery promise of the Domoticz request
   */
  function domoticzRequest(query, forcehttp) {
    var defaulthttp = true; //websocket is not reliable yet for sending requests
    var selectHTTP =
      (typeof forcehttp === 'undefined' && defaulthttp) || forcehttp;
    var selectWS = useWS && !selectHTTP;
    if (reconnecting) return $.Deferred().reject('reconnecting');
    //      console.log(lastRequest.state(), query);
    if (lastRequest.state() === 'rejected') {
      lastRequest = $.Deferred().resolve();
    }
    var newPromise = $.Deferred();
    lastRequest = lastRequest
      .then(function newRequest() {
        if (selectWS) {
          callbackList[requestid] = newPromise;
          var msg = {
            event: 'request',
            requestid: requestid,
            query: domoticzQuery(query),
          };
          requestid = (requestid + 1) % 1000;
          try {
            socket.send(JSON.stringify(msg));
          } catch (ev) {
            newPromise.reject('send error');
          }
          setTimeout(function () {
            if (newPromise.state() === 'pending') {
              //                            console.log('rejected by timeout: ', query);
              newPromise.reject('timeout: ' + query);
            }
            //                    else
            //                        console.log('was resolved or failed already')
          }, cfg.domoticz_timeout); //reject promise after timeout of 2000ms
        } else
          $.get({
            url: cfg.url + 'json.htm?' + domoticzQuery(query),
            type: 'GET',
            async: true,
            contentType: 'application/json',
            error: function (jqXHR, textStatus) {
              if (typeof textStatus !== 'undefined' && textStatus === 'abort') {
                console.log('Domoticz request cancelled');
              } else {
                if (jqXHR.status == 401) {
                  newPromise.reject(new Error('Domoticz authorization error'));
                  return;
                }
                console.error(
                  'Domoticz error code: ' +
                    jqXHR.status +
                    ' ' +
                    textStatus +
                    '!\nPlease, double check the path to Domoticz in Settings!'
                );
              }
              newPromise.reject(query + ' ' + textStatus);
            },
          }).then(function (res) {
            //                        console.log('ajax resolved ' + query);
            newPromise.resolve(res);
          });
        return newPromise;
      })
      .fail(function (err) {
        //to catch or to fail? Probably better to fail to prevent executiong of chained promise.
        if (err) console.warn(err); //timeout may be reported
      });
    return lastRequest;
  }

  function checkWSSupport() {
    return domoticzRequest(MSG.info).then(function (res) {
      if (parseFloat(res.version) > 4.11 && cfg.enable_websocket) {
        useWS = true;
        console.log('Setting up websocket');
        connectWebsocket();
        setTimeout(function () {
          //if not resolved within 2 seconds, there is something wrong with the websocket connection.
          if (initialUpdate.state !== 'resolved') {
            initialUpdate.reject('connection failed');
          }
        }, cfg.domoticz_timeout);
        return initialUpdate; //initialUpdate will be resolved after the first message from websocket
      }
    });
  }

  function init(initcfg) {
    if (!initPromise) {
      if (!initcfg.url) {
        throw new Error('Domoticz url not defined');
      }
      cfg = initcfg;
      if (cfg.url.charAt(cfg.url.length - 1) !== '/') cfg.url += '/';
      if (cfg.usrEnc && cfg.usrEnc.length)
        usrinfo = 'username=' + cfg.usrEnc + '&password=' + cfg.pwdEnc + '&';
      initPromise = checkWSSupport()
        .catch(function () {
          useWS = false;
          console.log(
            'Websocket failed, switch back to http. Check IP whitelisting in Domoticz.'
          );
        })
        .then(function () {
          setInterval(function () {
            refreshAll();
          }, cfg.domoticz_refresh * 1000);
          return refreshAll();
        })
        .then(requestSecurityStatus)
        .then(requestSettings);
    }
    return initPromise;
  }

  function refreshAll() {
    if (cfg.refresh_method || !useWS) {
      return requestAllVariables().then(function () {
        return requestAllDevices();
      });
    } else {
      return requestAllVariables().then(requestAllScenes);
    }
  }

  function connectWebsocket() {
    var wsurl = cfg.url.replace('http', 'ws');
    socket = new WebSocket(wsurl + 'json', ['domoticz']);
    //var mysocket=this.socket;
    socket.onopen = function () {
      //            console.log(e)
      console.log('[open] Connection established');
      /*            var msg = {
                            event: 'request',
                            requestid: 1,
                            query: "type=devices"
                        }
                        socket.send(JSON.stringify(msg))*/
      /*            domoticzRequest("type=devices", 1)
                        .then(function(res){
                            console.log('initial connect data: ', res);
                        });*/
      reconnectTimeout = 2;
      lastUpdate = {};
      if (
        lastRequest &&
        lastRequest.state &&
        lastRequest.state() === 'pending' &&
        lastRequest.reject
      )
        lastRequest.reject();
      lastRequest = $.Deferred().resolve();

      requestAllDevices(false);
    };
    socket.onmessage = function (event) {
      //            console.log(`[message] Data received from server: ${event.data}`);
      //console.log(event.data);
      var res = JSON.parse(event.data);
      var res2;
      if (res.data) res2 = JSON.parse(res.data);
      var requestid = res.requestid;
      if (requestid == -1) {
        //device update
        //                console.log('device update ', res2)
        _setAllDevices(res2);
        return;
      }
      if (res.event === 'date_time') {
        onDateTime(res);
        return;
      }
      if (typeof res.requestid !== 'undefined' && callbackList[requestid]) {
        callbackList[requestid].resolve(res2);
      } else {
        console.log('no requestid or no callback ', res);
      }
      initialUpdate.resolve();
      /*            //console.log(res)
                        var res2 = JSON.parse(res.data)
                        // console.log(res2)
                        if (res2)
                            _setAllDevices(res2)
                        else {
                            console.log('no data: ', event.data)
                        }
                        */
    };

    socket.onclose = function (event) {
      if (initialUpdate.state !== 'resolved') {
        console.log('websocket closed before first update.');
        return;
      }
      if (event.wasClean) {
        console.log(
          '[close] Connection closed cleanly, code=',
          event.code,
          event.reason
        );
      } else {
        // e.g. server process killed or network down
        // event.code is usually 1006 in this case
        console.log(event);
        switch (event.code) {
          case 1006:
            if (!reconnecting) reconnect();
            reconnecting = true;
            break;
          default:
            console.error('[close] Connection died');
            break;
        }
      }
      //cleanup pending requests
      if (
        lastRequest &&
        lastRequest.state &&
        lastRequest.state() === 'pending' &&
        lastRequest.reject
      )
        lastRequest.reject();
      lastRequest = $.Deferred().resolve();
    };

    socket.onerror = function (error) {
      console.error(error);
    };
  }

  function onDateTime(data) {
    if (data.Sunrise) setOnChange('_Sunrise', data.Sunrise);
    if (data.Sunset) setOnChange('_Sunset', data.Sunset);
  }

  function reconnect() {
    console.log('reconnecting');
    setTimeout(function () {
      reconnecting = false;
      connectWebsocket();
    }, reconnectTimeout * 1000); //try to reconnect after timeout
    reconnectTimeout = Math.min(reconnectTimeout * 2, 60); //increase timeout
  }

  function update(forced) {
    if (useWS == false || forced) return requestAllDevices();
    else return initialUpdate;
  }

  function getDevice(idx) {
    return init().then(function () {
      return state.devices[idx];
    });
  }

  function requestAllDevices(forcehttp) {
    var timeFilter = '';
    if (!cfg.refresh_method) {
      timeFilter = '&lastUpdate=' + lastUpdate.devices;
    }
    return domoticzRequest(
      'type=devices&filter=all&used=true&order=Name' +
        (cfg.use_favorites ? '&favorite=1' : '') +
        timeFilter,
      forcehttp
    ).then(function (res) {
      return _setAllDevices(res);
    });
  }

  function requestDevice(idx, forcehttp) {
    //not tested
    return domoticzRequest('type=devices&rid=' + idx, forcehttp).then(function (
      res
    ) {
      return _setDevice(res);
    });
  }

  function setOnChange(idx, value) {
    if (typeof value === 'undefined') {
      console.error('setOnChange: value undefined');
      return;
    }
    var current_value = deviceObservable.get(idx);
    var update = false;
    switch (typeof current_value) {
      case 'undefined':
        update = true;
        break;
      case 'string':
      case 'number':
        update = value != current_value;
        break;
      case 'object':
        if (
          typeof value.LastUpdate !== 'undefined' &&
          typeof current_value.LastUpdate !== 'undefined'
        ) {
          var newmoment = moment(value.LastUpdate);
          var currentmoment = moment(current_value.LastUpdate);
          update =
            newmoment.diff(currentmoment) || value.Data !== current_value.Data;
        } else update = true;
        break;
      default:
        update = true;
    }
    if (update) deviceObservable.set(idx, value);
  }

  function _setAllDevices(data) {
    //        console.log(data.ActTime);
    if (!data) {
      console.log(' no data');
      return;
    }
    if (!data.ActTime) {
      console.log(' no ActTime');
      return;
    }
    lastUpdate.devices = data.ActTime;
    if (data.Sunrise) setOnChange('_Sunrise', data.Sunrise);
    if (data.Sunset) setOnChange('_Sunset', data.Sunset);
    for (var r in data.result) {
      var device = data.result[r];
      var idx = device['idx'];

      if (device['Type'] === 'Group' || device['Type'] === 'Scene') {
        idx = 's' + device['idx'];
      }
      setOnChange(idx, device);
    }
    setOnChange('_devices', data); //event to trigger that all devices have been updated.
    return deviceObservable._values;
  }

  function _setDevice(data) {
    //not tested!
    //        console.log(data.ActTime);
    if (!data) {
      console.log(' no data');
      return;
    }
    if (!data.result) {
      console.log(' no result');
      return;
    }
    var r = data.result[0];
    var device = data.result[r];
    var idx = device['idx'];

    if (device['Type'] === 'Group' || device['Type'] === 'Scene') {
      idx = 's' + device['idx'];
    }
    setOnChange(idx, device);
    return deviceObservable._values[idx];
  }

  function requestAllScenes() {
    return domoticzRequest('type=scenes').then(function (res) {
      if (!res) return;
      return _setAllDevices(res);
    });
  }

  function requestAllVariables() {
    //        return domoticzRequest('type=command&param=getuservariables&lastupdate='+lastUpdate.variables)
    return domoticzRequest('type=command&param=getuservariables').then(
      function (res) {
        if (res) return _setAllVariables(res);
      }
    );
  }

  function _setAllVariables(data) {
    //console.log('Variables:',data)
    //lastUpdate.variables = data.ActTime;
    for (var r in data.result) {
      var variable = data.result[r];
      variable.Type = 'Variable';
      setOnChange('v' + variable.idx, variable);
    }
    return deviceObservable._values;
  }

  function getAllDevices() {
    return deviceObservable._values;
  }

  function requestSecurityStatus() {
    return domoticzRequest(MSG['secpanel']).then(function (res) {
      if (res) {
        setOnChange('_secstatus', res.secstatus);
        setOnChange('_secondelay', res.secondelay);
        return res;
      }
    });
  }

  function requestSettings() {
    return domoticzRequest(MSG['getSettings']).then(function (res) {
      if (res) {
        setOnChange('_settings', res);
      }
    });
  }

  function subscribe(idx, getCurrent, callback) {
    if (idx === '_secstatus' && !securityRefresh) {
      securityRefresh = setInterval(
        requestSecurityStatus,
        cfg.domoticz_refresh * 1000
      );
    }
    return deviceObservable.subscribe(idx, getCurrent, callback);
  }

  function setDevice(idx, value) {
    deviceObservable.set(idx, value);
  }

  function hold(idx) {
    //console.log('hold ', idx);
    deviceObservable.hold(idx);
  }

  function release(idx) {
    deviceObservable.release(idx);
  }

  /* sends the query to Domoticz
        First block the device updates from idx
        afterwards release the message queue again
    */
  function syncRequest(idx, query, forcehttp) {
    //console.log(query);
    hold(idx);
    return domoticzRequest(query, forcehttp)
      .then(function (res) {
        //console.log(res);
        return res;
      })
      .always(function (res) {
        //console.log('release ', idx);
        release(idx);
        return res;
      });
  }

  return {
    init: init,
    getDevice: getDevice,
    getAllDevices: getAllDevices,
    state: state,
    subscribe: subscribe,
    update: update,
    setDevice: setDevice,
    request: domoticzRequest,
    hold: hold,
    release: release,
    syncRequest: syncRequest,
  };
})();

/*pubsub implementation specifically for Domoticz*/
function ListObservable() {
  this._observers = {};
  this._values = {};
  this._queueState = {};

  this.hold = function (idx) {
    if (!this._queueState[idx]) this._queueState[idx] = 1; //queue state can be 2 already
  };

  this.release = function (idx) {
    var value;
    if (this._queueState[idx] === 2) {
      //value was updated while on hold. Send latest value
      value = this._values[idx];
      if (typeof this._observers[idx] !== 'undefined')
        this._observers[idx].fire(value);
    }
    this._queueState[idx] = 0;
  };

  this.subscribe = function (idx, getCurrent, callback) {
    console.log('Subscribing ', idx);
    if (typeof this._observers[idx] === 'undefined') this._observers[idx] = $.Callbacks();
    this._observers[idx].add(callback);
    if (getCurrent && typeof this._values[idx] !== 'undefined')
      callback(this._values[idx]);
    var me = this;
    return function () {
      console.log('unsubscribe ', idx, callback);
      me._observers[idx].remove(callback);
    };
  };

  this.unsubscribe = function (listidx, callback) {
    console.log('real unsubscribe ', listidx, callback);
    this._observers[listidx].remove(callback);
  };

  this.set = function (idx, value) {
    this._values[idx] = value;
    if (this._queueState[idx]) {
      this._queueState[idx] = 2;
      console.log('postponed ' + idx);
      return;
    }
    if (typeof this._observers[idx] !== 'undefined')
      this._observers[idx].fire(value)
  };

  this.get = function (idx) {
    return this._values[idx];
  };
}

//# sourceURL=js/domoticz-api.js
