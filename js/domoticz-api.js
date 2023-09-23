/*from bundle.js*/
/* global Debug moment*/
/* from CONFIG.js*/
/* global stubDevices */
/* exported Domoticz*/
/*
*/

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
  var firstUpdate = true;
  var refreshTimeout;
  var info = {
    build: 0,
    version: 0,
    levelNamesEncoded: false,
    newBlindsBehavior: false
  }


  var MSG = {
    info: 'type=command&param=getversion',
    secpanel: 'type=command&param=getsecstatus',
    getSettings: info.api15330 ? 'type=command&param=getsettings' : 'type=settings',
    getDevices: info.api15330 ? 'type=command&param=getdevices' : 'type=devices',
    getScenes: info.api15330 ? 'type=command&param=getscenes' : 'type=scenes',
    getAuth: 'type=command&param=getauth'
  };

  function domoticzQuery(query) {
    return usrinfo + query + (cfg.plan ? '&plan=' + cfg.plan : '');
  }

  function setHeader(xhr) {
    if (cfg.tokenRes) {
      xhr.setRequestHeader("Authorization", 'Bearer ' + cfg.tokenRes.access_token);
      return
    }
    if (cfg.basicAuthEnc && cfg.basicAuthEnc.length) {
      xhr.setRequestHeader("Authorization", "Basic " + cfg.basicAuthEnc)
    }
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
    Debug.log(Debug.REQUEST, query);
    var defaulthttp = false; //websocket is not reliable yet for sending requests
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
            beforeSend: setHeader,
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
                Debug.log(
                  Debug.ERROR,
                  'Domoticz error code: ' + jqXHR.status + ' ' + textStatus
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
        Debug.log('Setting up webksocket');
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

  function authenticate() {
    return checkCode(cfg.code)
      .then(function () {
        cfg.authenticationMethod = 'trusted'; //default authentication method
        if (cfg.code) cfg.authenticationMethod = 'code'
        else { //Do we have to try alternative authentication method?
          if (cfg.username && cfg.password) {//we have a user_name and pass_word. Add basic_auth header
            cfg.basicAuthEnc = window.btoa(cfg.username + ':' + cfg.password);
            cfg.authenticationMethod = 'basic';
          }
        }
        return domoticzRequest(MSG['getAuth'])
      })
      .catch(function(res) {
        var err="Can't access Domoticz via " + cfg.url + "<br>Check domoticz_ip in config.js";
        throw new Error(err);
      })
      .then(function (res) {
        console.log('authentication method: ', cfg.authenticationMethod);
        console.log(res);
        if (res && res.status) {
          if (res.status === "OK") {
            if (res.user || res.rights === 2) {
              console.log('Authenticated!');
            }
            else {
              console.log('not authenticated');
              if (cfg.code) {
                console.log('We had a code, but authorization failed');
                throw new Error('Authorization error after code request');
                return;
              }
              //Maybe we can use a cookie from a previous session
              var dashticzCookie = Cookies.get('dashticz');
              if (dashticzCookie) {
                console.log('Cookie found. Refresh token if refresh_token still valid');
                var authentication = JSON.parse(atob(dashticzCookie));
                cfg.tokenRes = authentication;
                return refreshToken();
              }
              if (cfg.authenticationMethod === 'basic') {
                console.log("Invalid user credentials");
                var err='Invalid user credentials. Check user_name and pass_word in CONFIG.js.';
                var ishttp = cfg.url.substring(0, 5).toLowerCase() !== 'https';
                if(ishttp)
                  err+='<br>Note: "Enable BasicAuth over plain HTTP" in Domoticz->Setup->Settings->Security';
                throw new Error(err);
              }
              return domoticzAuthenticate();
            }
          }
        }

      })
  }

  function refreshToken() {
    var now = Date.now();
    if (cfg.tokenRes.validUntil * 1000 > now) {
      var data = {
        grant_type: 'refresh_token',
        redirect_uri: encodeURIComponent(settings.state),
        client_id: encodeURIComponent(cfg.client_id),
        client_secret: encodeURIComponent(cfg.client_secret),
        refresh_token: encodeURIComponent(cfg.tokenRes.refresh_token)
      }
      return $.ajax({
        url: cfg.url + 'oauth2/v1/token',
        method: "POST",
        data: data,
        contentType: "application/x-www-form-urlencoded",
      }
      )
        .then(function (res) {
          console.log('token refresh successful');
          console.log(res);
          cfg.tokenRes = res;
          cfg.tokenRes.validUntil = cfg.tokenRes.expires_in + Math.floor(Date.now() / 1000) - 10;
          Cookies.set('dashticz', btoa(JSON.stringify(cfg.tokenRes)));
          if (refreshTimeout)
            clearTimeout(refreshTimeout);
          refreshTimeout = setTimeout(refreshToken, (cfg.tokenRes.expires_in - 3500) * 1000);
        })
        .fail(function (res) {
          console.error('token refresh failed');
          console.log(res);
          throw new Error('token refresh failed');
        })
        .then(function() {
          return domoticzRequest(MSG['getAuth']).then(function(res) {
            console.log(res);
          });

        })
    }
    else
      return domoticzAuthenticate()

  }

  function domoticzAuthenticate() {
    console.log('Start authentication flow');
    var currenturl = encodeURIComponent(window.location.href);
    if (window.location.href.substring(0, 5).toLowerCase() !== 'https') {
      throw new Error('Authentication failed.<br>OAuth only possible with Dashticz https server.<br><br>Alternatives:<br>* Provide user_name and pass_word in CONFIG.js<br>* Add IP to Trusted Networks in Domoticz security settings.');
    }
    /* Not authenticated. Now check whether we can start oauth flow
    
    */
    var oAuthErrorStr = 'OAuth only supported on Domoticz version >= 2023.2.<br><br>Alternatives:<br>* Provide user_name and pass_word in CONFIG.js<br>* Add IP to Trusted Networks in Domoticz security settings.';
    return $.get(settings.domoticz_ip + '/.well-known/openid-configuration')
      .then(function (res) {
        //check res for whether oauth2 flow is supported
        //      console.log(res);
        if (res.authorization_endpoint) {
          var url = settings.domoticz_ip + '/oauth2/v1/authorize?redirect_uri=' + currenturl + '&response_type=code&client_id=dashticz&client_secret=dashticz&state=' + btoa(document.location.href);
          window.location.href = url;
        }
        else throw new Error(oAuthErrorStr);
      })
      .catch(function (jqXHR) {
        console.log('failed.');
        throw new Error(oAuthErrorStr);
      })
  }

  function checkCode(code) {
    if (cfg.code) {
      /*
        We have received an authorization code
        We have to exchange this into access code
        */
      console.log('Authentication code. Start request for access code');
      //curl -v 'http://localhost:8080/oauth2/v1/token' --header 'Content-Type: application/x-www-form-urlencoded' --data-urlencode 'grant_type=authorization_code' --data-urlencode 'redirect_uri=https://172.16.0.4:8080/' --data-urlencode 'client_id=dashticzApp' --data-urlencode 'client_secret=D@shticz' --data-urlencode 'code=5894171146ab3f6a68005f31bf1f3772'
      var data = {
        grant_type: 'authorization_code',
        redirect_uri: encodeURIComponent(settings.state),
        client_id: encodeURIComponent(cfg.client_id),
        client_secret: encodeURIComponent(cfg.client_secret),
        code: encodeURIComponent(cfg.code)
      }
      return $.ajax({
        url: cfg.url + 'oauth2/v1/token',
        method: "POST",
        data: data,
        contentType: "application/x-www-form-urlencoded",
      }
      )
        .then(function (res) {
          console.log('token request successful');
          console.log(res);
          cfg.tokenRes = res;
          cfg.tokenRes.validUntil = cfg.tokenRes.expires_in + Math.floor(Date.now() / 1000) - 10;
          Cookies.set('dashticz', btoa(JSON.stringify(cfg.tokenRes)));
          return res;
        })
        .catch(function (res) {
          console.error('Token request failed');
          console.log(res);
          throw new Error('Token request failed.<br>Check client_id and client_secret in CONFIG.js');
        })

    }
    else {
      console.log('no token request');
      return $.Deferred().resolve();
    }

  }

  function init(initcfg) {
    if (initPromise) return initPromise;
    if (!initcfg.url) {
      throw new Error('Domoticz url not defined');
    }
    cfg = initcfg;
    if (cfg.url.charAt(cfg.url.length - 1) !== '/') cfg.url += '/';
    if (cfg.usrEnc && cfg.usrEnc.length && !(cfg.basicAuthEnc && cfg.basicAuthEnc.length))
      usrinfo = 'username=' + cfg.usrEnc + '&password=' + cfg.pwdEnc + '&';

    cfg.domoticzHTTPS = cfg.url.substring(0, 5).toLowerCase() === 'https';
    cfg.dashticzHTTPS = window.location.href.substring(0, 5).toLowerCase() === 'https';

    if(cfg.dashticzHTTPS && !cfg.domoticzHTTPS) {
      throw new Error("It's not possible to access Domoticz over HTTP when you open Dashticz via HTTPs.")
    }
    initPromise = authenticate()
      .then(getVersion)
      .fail(function (err) {
        console.log(err);
        throw err;
      })
      .then(checkWSSupport)
      .catch(function (err) {
        if (!useWS) throw err;
        useWS = false;
        console.log('Websocket failed, switch back to http. Check IP whitelisting in Domoticz.');
        Debug.log(
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
      .then(requestSettings)
      .then(addStubDevices);

    return initPromise;
  }

  function addStubDevices() {
    if (typeof stubDevices === 'object') {
      _setAllDevices(stubDevices);
    }
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
    /*
    var body = {
      username: encodeURIComponent(window.btoa(settings['user_name'])),
      password: encodeURIComponent(md5(settings['pass_word'])),
      rememberme: true     
    }*/
    var data = new FormData();
    data.append('username', encodeURIComponent(window.btoa(settings['user_name'])));
    data.append('password', encodeURIComponent(md5(settings['pass_word'])));
    data.append('rememberme', "true");
    $.ajax({
      type: 'POST',
      url: cfg.url + "json.htm?type=command&param=logincheck",
      data: data,
      success: function (output, status, xhr) {
        //          alert(xhr.getResponseHeader('Set-Cookie'));
      },
      cache: false,
      contentType: 'multipart/form-data',
      processData: false,
      crossDomain: true,
      //      xhrFields: { withCredentials: true },
    })
      .then(connectWebSocket2);
  }

  function connectWebSocket2() {
    //    var wsurl = cfg.url.replace('http://', 'ws://' + settings.user_name + ':' + settings.pass_word + '@');
    var wsurl = cfg.url.replace('http', 'ws');
    //wsurl = 'wss://build.lokies.lan/';
    //  wsurl = 'ws://build:8080/';
    try {
      socket = new WebSocket(wsurl + 'json', ['domoticz']);
    }
    catch (ev) {
      console.log('websocket failed');
      initialUpdate.reject('websocket creation failed');
      throw new Error('websocket creation failed');
    }
    //var mysocket=this.socket;
    socket.onopen = function () {
      //            console.log(e)
      console.log('[open] Connection established');
      Debug.log('[open] Connection established');

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
      /*
            var currentTime = Date.now();
            var diffTime = currentTime - previousTime;
            if (diffTime > 10000) {
              Debug.log('Difftime: ' + diffTime/1000);
              previousTime = currentTime;
              setTimeout(
                function() {
                  Debug.log('+5: ' + (Date.now() - previousTime)/1000)
                }, 5000);
              
            }
      */
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
      Debug.log('websocket closed: ' + event.code + " " + event.reason);
      if (initialUpdate.state() !== 'resolved') {
        Debug.log('websocket closed before first update. State: ' + initialUpdate.state());
        return;
      }
      if (event.wasClean) {
        Debug.log('[close] Connection closed cleanly.');
      } else {
        // e.g. server process killed or network down
        // event.code is usually 1006 in this case
        switch (event.code) {
          case 1006:
            console.error('[close] Connection died');
            break;
          default:
            console.error('[close] Connection died: ' + event.code);
            break;
        }
      }
      Debug.log('reconnecting: ' + reconnecting);
      if (!reconnecting) reconnect();
      reconnecting = true;
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
      console.error('WebSocket error:');
      console.error(error);
      Debug.log('Socket error');
      if (initialUpdate.state() !== 'resolved') {
        Debug.log('websocket error before first update. Probably authentication problem.');
        initialUpdate.reject('error before first message');
        return;
      }

    };
  }

  function onDateTime(data) {
    if (data.Sunrise) setOnChange('_Sunrise', data.Sunrise);
    if (data.Sunset) setOnChange('_Sunset', data.Sunset);
  }

  function reconnect() {
    console.log('reconnecting');
    Debug.log('reconnecting in ' + reconnectTimeout);
    setTimeout(function () {
      Debug.log('trying to reconnect now');
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
    var timeFilter = cfg.refresh_method ? '' : ('&lastUpdate=' + lastUpdate.devices);
    var hiddenFilter = cfg.use_hidden ? '&displayhidden=1' : '';
    var favoriteFilter = cfg.use_favorites ? '&favorite=1' : '';
    return domoticzRequest(MSG.getDevices +
      '&filter=all&used=true&order=Name' +
      favoriteFilter +
      timeFilter +
      hiddenFilter,
      forcehttp
    ).then(function (res) {
      return _setAllDevices(res);
    });
  }

  function requestDevice(idx, forcehttp) {
    //not tested
    return domoticzRequest(MSG.getDevices + '&rid=' + idx, forcehttp).then(function (
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
    if (update) {
      if (typeof value === 'object') manipulateDevice(value);
      deviceObservable.set(idx, value);
    }
  }

  function manipulateDevice(value) {
    if (!value.Data) return;

    //Check device hook. Can be defined in custom.js or config.js
    var data = value.Data.split(';');
    if (!data.length) return;
    data.forEach(function (el, i) {
      value['Data' + i] = el;
    });

    //P1 Smart Meter manipulation
    if (value.Type === 'P1 Smart Meter' && value.SubType === 'Energy') {
      value.NettUsage = (parseFloat(value.Usage) - parseFloat(value.UsageDeliv)) + ' ' + value.Usage.split(' ')[1];
      value.NettCounterToday = (parseFloat(value.CounterToday) - parseFloat(value.CounterDelivToday)) + ' ' + value.CounterToday.split(' ')[1];
      value.NettCounter = parseFloat(value.Counter) - parseFloat(value.CounterDeliv);
    }

    if (typeof window.deviceHook === 'function') {
      window.deviceHook(value)
    }


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
    if (firstUpdate && window.debugDevices) {
      window.debugDevices.forEach(function (device) {
        setOnChange(device.idx, device)
      })
    }
    firstUpdate = false;
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
    var device = data.result[0];
    var idx = device['idx'];

    if (device['Type'] === 'Group' || device['Type'] === 'Scene') {
      idx = 's' + device['idx'];
    }
    setOnChange(idx, device);
    return deviceObservable._values[idx];
  }

  function requestAllScenes() {
    return domoticzRequest(MSG.getScenes).then(function (res) {
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
      };
    });
  }

  function getVersion() {
    return domoticzRequest(MSG['info']).then(function (res) {
      if (res) {
        return handleVersion(res);
      }
      else throw new Error('Error getting version from Domoticz');
    });
  }

  function handleVersion(data) {
    info.version = parseFloat(data.version);
    $('#domoticz_version').html(info.version);

    try {
      info.build = parseInt(data.version.match(/build (\d+)(?=\))/)[1]);
    }
    catch (e) {
      console.log('Not able to parse Domoticz build number: ', data.version);
    }
    $('#dzvents_version').html(data.dzvents_version);
    $('#python_version').html(data.python_version);
    setDomoBehavior();
  }

  /*This function sets certain flags to indicate new behavior has been implemented in the Domoticz version that is used*/
  function setDomoBehavior() {
    var domoChanges = {
      newBlindsBehavior: {
        version: 2022.1,
        build: 14535
      },
      levelNamesEncoded: {
        version: 3.9476
      },
      basicAuthRequired: {
        version: 2022.2,
        build: 14078
      },
      api15330: {
        version: 2023.1,
        build: 15327
      }
    }

    Object.keys(domoChanges).forEach(function (key) {
      var testVersion = 0 || domoChanges[key].version;
      var testBuild = 0 || domoChanges[key].build;
      var applicable = (info.version > testVersion) || ((info.version == testVersion) && (info.build >= testBuild));
      info[key] = applicable;
    });

    console.log("Domoticz version info: ", info);
    MSG.getSettings= info.api15330 ? 'type=command&param=getsettings' : 'type=settings';
    MSG.getDevices= info.api15330 ? 'type=command&param=getdevices' : 'type=devices';
    MSG.getScenes= info.api15330 ? 'type=command&param=getscenes' : 'type=scenes';

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
    requestDevice: requestDevice,
    info: info
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
    if (typeof this._observers[idx] === 'undefined')
      this._observers[idx] = $.Callbacks();
    this._observers[idx].add(callback);
    if (getCurrent && typeof this._values[idx] !== 'undefined')
      callback(this._values[idx]);
    var me = this;
    return function () {
      me._observers[idx].remove(callback);
    };
  };

  this.unsubscribe = function (listidx, callback) {
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
      this._observers[idx].fire(value);
  };

  this.get = function (idx) {
    return this._values[idx];
  };
}

//# sourceURL=js/domoticz-api.js
