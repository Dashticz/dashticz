/* global language, _CORS_PATH, moment, Dashticz, TemplateEngine*/
// eslint-disable-next-line no-unused-vars
//find ovapi tpc codes via https://ovzoeker.nl
//of: https://ovzoeker.nl/api/search?lat=0&lon=0&query=Amsterdam,%20ij
(function (Dashticz) {
  "use strict";
  var templateEngine = TemplateEngine();

  var DT_publictransport = {
    name: 'publictransport',
    canHandle: function (block) {
      return block && (block.station || block.tpc);
    },
    defaultCfg: function (block) {
      var result = {
        refresh: 60,
        //        provider: '9292',
        //        station: 'station-utrecht-centraal',
        //        clickHandler: pubtransClick, //If url is defined in block def then clickHandler will be installed by Dashticz
        clickHandler: true,
        results: 10,
        show_via: true,
        show_direction: false
      };
      if (!block || !block.station) {
        result.url =
          'https://dashticz.readthedocs.io/en/master/blocks/specials/publictransport.html';
        result.title = 'Example: Utrecht CS';
      }
      var languages = ['ne','en','fr','de'];
      var language = settings.language.substr(0,2);
      result.lang = (languages.includes(language) && language) || 'nl';
      return result;
    },
    defaultContent: language.misc.loading,
    refresh: function (me) {
      me.providerCfg = getProviderCfg(me.block);
      me.directionArray = getArrayFromString(me.block.direction);
      me.serviceArray = getArrayFromString(me.block.service);
      me.destinationArray = getArrayFromString(me.block.destination);
      getData(me)
        .then(applyTransformer)
        .then(applyFilterer)
        .then(applyRenderer)
        .then(updateState)
    },
  };

  function getArrayFromString(str) {
    if (typeof str === 'undefined') return undefined;
    if (typeof str !== 'string') {
      console.error('Pubtrans: type of parameter should be string, received ' + typeof str);
      str=''+str;
    }
    //var lcstr = str.toLowerCase();
    return str.indexOf(',') ? str.split(/, |,/) : [str];
  }

  function getData(me) {
    var getter = me.providerCfg.URL ? $.get(me.providerCfg.URL):$.getJSON(me.providerCfg.dataURL);
    return getter.then(function (data) {
      me.data = data;
      return me
    })
  }


  function applyTransformer(me) {
    return apply(me, me.providerCfg.transformer);
  }

  function applyRenderer(me) {
    return me.providerCfg.renderer(me, me.data);
  }

  function applyFilterer(me) {
    return apply(me, me.providerCfg.filterer);
  }

  function apply(me, callback) {
    var data = me.data;
    me.data = callback(me, data);
    return me
  }

  function updateState(me) {
    Dashticz.setEmpty(me, !me.data.departures.length);
  }

  function getProviderCfg(block) {
    var defaultProviderCfg = {
      renderer: renderPublicTransport,
      filterer: filterPublicTransport
    }
    var providers = {
      irailbe: {
        dataURL: irailbeURL(block),
        transformer: transformIrailbe,
        tpl: 'pubtrans_treinen',
        renderer: renderTpl
      },
      delijnbe: {
        dataURL: _CORS_PATH +
          'https://www.delijn.be/rise-api-core/haltes/Multivertrekken/' +
          block.station +
          '/1000', //high number: we'll reduce the number of results later, after filtering
        transformer: transformDelijnbe,
        tpl: 'pubtrans_ov',
        renderer: renderTpl
      },
      treinen: {
        dataURL: _CORS_PATH + 'https://www.rijdendetreinen.nl/ajax/departures?station=' + block.station,
        transformer: transformTreinen,
        tpl: 'pubtrans_treinen',
        renderer: renderTpl
      },
      ovapi: {
        dataURL: _CORS_PATH + 'http://v0.ovapi.nl/' + (block.tpc ? 'tpc/' + block.tpc : 'stopareacode/' + block.station),
        transformer: transformOvapi,
        tpl: 'pubtrans_ov',
        renderer: renderTpl
      },
      drgl: {
        URL: _CORS_PATH + 'https://drgl.nl/stop/NL:S:' + block.station + (isNumeric(block.station)?'':'/traindeparturespanel' ),
        transformer: transformDRGL,
        tpl: 'pubtrans_ov',
        renderer: renderTpl,
      }
    }
    var provider = block.provider.toLowerCase();

    return $.extend(defaultProviderCfg, providers[provider]);
  }

  function irailbeURL(block) {
    //search for station id via https://irail.be/stations/NMBS/
    var date = new Date($.now());
    var todayDate = moment(date).format('DDMMYY');
    var todayTime = moment(date).format('HHmm');
    return 'https://api.irail.be/liveboard/?station=' +
      block.station +
      '&date=' +
      todayDate +
      '&time=' +
      todayTime +
      '&arrdep=departure&lang=' +
      block.lang + 
      '&format=json&fast=false&alerts=false';
  }

  function transformTreinen(me, data) {
    var result = {
      departures: []
    };
    if (data.result !== 'OK')
      return ({ res: { res: '<div>Ongeldig resultaat</div>' } })
    data.departures.forEach(function (dep) {
      var departure = {
        date: dep.serviceDate,
        time: moment(dep.departureTime).format('HH:mm'),
        destination: dep.destination,
        via: dep.via,
        delay: dep.delay,
        platform: dep.platform,
        remarks: dep.remarks,
        transportType: dep.transportType
      }
      result.departures.push(departure)
    });
    return result;
  }

  function transformOvApiTpc(me, data) {
    var departures = [];
    Object.keys(data).forEach(function (tpc) {
      Object.keys(data[tpc].Passes).forEach(function (service) {
        var line = data[tpc].Passes[service];
        departures.push(getOvApiDeparture(line));
      })
    });
    return departures;
  }

  function formatDelay(actual, planned) {
    if(!actual) actual=planned;
    var delay = Number((actual - planned) / 60000);
    return delay >= 0 ? (delay > 0 ? '+' + Math.ceil(delay) : '') : Math.floor(delay)
  }

  function getOvApiDeparture(line, block) {
    var fulltime = moment(line.TargetDepartureTime);
    var hasNumber = line.LineName.indexOf(line.LinePublicNumber) >= 0;
    var departure = {
      fulltime: fulltime,
      time: fulltime.format('HH:mm'),
      destination: hasNumber ? line.LineName : 'Lijn ' + line.LinePublicNumber + ' ' + line.DestinationName50,
      via: hasNumber ? line.DestinationName50 : line.LineName,
      delay: formatDelay(moment(line.ExpectedDepartureTime), fulltime),
      line: line.LinePublicNumber,
      direction: ''+line.LineDirection,
    }
    if(block && block.show_direction && line.LineDirection) {
      departure.destination += ' (ri. '+ line.LineDirection + ')';
    }
    return departure
  }

  function transformOvApiStation(me, data) {
    var block = me.block;
    var departures = [];
    Object.keys(data).forEach(function (dep) {
      Object.keys(data[dep]).forEach(function (tpc) {
        Object.keys(data[dep][tpc].Passes).forEach(function (service) {
          var line = data[dep][tpc].Passes[service];
          departures.push(getOvApiDeparture(line, block));
        })
      })
    });
    return departures;
  }

  function transformOvapi(me, data) {
    var block = me.block;
    var result = {
      departures: block.tpc ? transformOvApiTpc(me, data) : transformOvApiStation(me, data)
    };
    result.departures.sort(function (l, r) {
      return l.fulltime - r.fulltime
    })
    return result;
  }

  function transformDRGL(me, data) {
    var block = me.block;
    var result = {
      departures: []
    };
    //console.log(data);
    $(data).find('.list-group-item').each(function() {
      var $this = $(this);
      var timeinfoStr = $this.find('.ott-departure-time').html();
      var timeinfo=['n.a.'];
      if(typeof timeinfoStr==='string')
        timeinfo=timeinfoStr.split(' ');
      else
        return;
      var linenumber = $this.find('.ott-linecode').html();
      var trainplatform = $this.find('.ott-trainplatform').html();
      var res = {
        time: timeinfo[0],
        delay: timeinfo.length==2?timeinfo[1]: undefined,
        line: linenumber,
        destination: (linenumber?linenumber+' ':'') + $this.find('.ott-destination').html(),
        transportType: $this.find('.ott-productcategory').html(),
        platform: trainplatform? 'spoor '+trainplatform: $this.find('.ott-platform').html(),
        remarks: []
      }
      $this.find('.notice').each(function() {
        res.remarks.push($(this).html())
      })
      result.departures.push(res);
    });
/*    var result = {
      departures: block.tpc ? transformOvApiTpc(me, data) : transformOvApiStation(me, data)
    };
    result.departures.sort(function (l, r) {
      return l.fulltime - r.fulltime
    })
    */
    return result;
  }


  function transformIrailbe(me, data) {
    /*
    canceled: "0"
delay: "0"
departureConnection: "http://irail.be/connections/8814001/20220119/TRN3618"
id: "0"
isExtra: "0"
left: "0"
occupancy: {name: 'unknown', @id: 'http://api.irail.be/terms/unknown'}
platform: "10"
platforminfo: {name: '10', normal: '1'}
station: "Landen"
stationinfo: {locationX: '5.07966', locationY: '50.747927', id: 'BE.NMBS.008833605', name: 'Landen', @id: 'http://irail.be/stations/NMBS/008833605', …}
time: "1642623240"
vehicle: "BE.NMBS.TRN3618"
vehicleinfo:
@id: "http://irail.be/vehicle/TRN3618"
name: "BE.NMBS.TRN3618"
number: "3618"
shortname: "TRN3618"
type: "TRN"
*/
    var dataPart = { departures: [] };
    for (var j = 0; j < data.departures.departure.length; j++) {
      var dep = data.departures.departure[j];
      var departure = {
        time: moment.unix(dep.time).format('HH:mm'),
        delay: Math.ceil(dep.delay / 60),
        platform: dep.platform,
        //        line: dep.lijnNummerPubliek,
        destination: dep.station,
        //        via: dep.omschrijving+ dep.viaBestemming && (' '+dep.viaBestemming)
      }
      dataPart.departures.push(departure);
    }
    return dataPart;
  }


  function transformDelijnbe(me, data) {
    var dataPart = { departures: [] };
    for (var j = 0; j < data.lijnen.length; j++) {
      var dep = data.lijnen[j];
      /*
      aankomstRealtimeTijdstip: 1642622047000
aankomstTheoretischTijdstip: 1642621860000
bestemming: "Leuven Station"
eindHalte: false
eindHalteBijSchrapping: null
entiteitNummer: 3
gemeentes: null
halteVolgorde: 3
haltes: null
id: 0
internLijnnummer: "3358"
kleurAchterGrond: "#1199DD"
kleurAchterGrondRand: "#1199DD"
kleurVoorGrond: "#FFFFFF"
kleurVoorGrondRand: "#000000"
lijnGeldigVan: null
lijnNummer: 358
lijnNummerPubliek: "358"
lijnRichting: "Brussel - Leuven"
lijnType: "bus"
lijnTypeLink: "BUSLIJN"
lijnUrl: "3/358/2/358_Brussel_-_Leuven"
omschrijving: "Brussel - Leuven"
omschrijvingHighlighted: null
predictionDeleted: false
predictionShortened: false
predictionStatussen: ['REALTIME']
richtingCode: 2
richtingCodeAndereRichting: 3
ritNummer: 165169385
ritOrder: 0
tripIndex: 165169385
vertrekCalendar: 1642622047000
vertrekRealtimeTijdstip: 1642622047000
vertrekTheoretischeTijdstip: 1642621860000
vertrekTijd: "3'"
viaBestemming: ""
voertuigNummer: "330265"
*/
      var departure = {
        //        time: dep.vertrekTijd,
        time: moment(dep.vertrekTheoretischeTijdstip).format('HH:mm'),
        delay: formatDelay(dep.vertrekRealtimeTijdstip, dep.vertrekTheoretischeTijdstip),
        line: dep.lijnNummerPubliek,
        destination: 'Lijn ' + dep.lijnNummerPubliek + ': ' + dep.bestemming,
        via: dep.omschrijving + (dep.viaBestemming && (' ' + dep.viaBestemming)),
        direction: ''+dep.richtingCode
      }
      if(me.block && me.block.show_direction && isDefined(dep.richtingCode)) {
        departure.destination += ' (ri. '+ dep.richtingCode + ')';
      }
      dataPart.departures.push(departure);
    }
    return dataPart;
  }

  function filterPublicTransport(me, dataPart) {
    var res = dataPart.departures;
    if (me.directionArray)
      res = res.filter(function (departure) {
        return isDefined(departure.direction) && me.directionArray.includes(departure.direction);
      })
    if (me.serviceArray)
      res = res.filter(function (departure) {
        return !departure.line || me.serviceArray.includes(departure.line);
      })
    if (me.destinationArray)
      res = res.filter(function (departure) {
        var found = me.destinationArray.reduce(function (acc, filterDest) {
          return acc || departure.destination.search(filterDest) !== -1
        }, false);
        if (!found) found = me.destinationArray.reduce(function (acc, filterDest) {
          return acc || (departure.via && departure.via.search(filterDest) !== -1)
        }, false);
        return found
      });
    dataPart.departures = res.slice(0, me.block.results);
    return dataPart
  }

  function renderPublicTransport(me, dataPart) {
    $(me.mountPoint + ' .dt_state').html('');
    Object.keys(dataPart).forEach(function (d) {
      //Object.keys(dataPart).sort().forEach(function(d) {
      for (var p in dataPart[d]) {
        $(me.mountPoint + ' .dt_state').append(dataPart[d][p]);
      }
    });

    if (
      typeof me.block.show_lastupdate !== 'undefined' &&
      me.block.show_lastupdate == true
    ) {
      var dt = new Date();
      $(me.mountPoint + ' .dt_state').append(
        '<em>' +
        language.misc.last_update +
        ': ' +
        addZero(dt.getHours()) +
        ':' +
        addZero(dt.getMinutes()) +
        ':' +
        addZero(dt.getSeconds()) +
        '</em>'
      );
    }
    return me;
  }

  function renderTpl(me, data) {
    var tpl = me.providerCfg.tpl;
    data.lang={};
    data.lang.platform=language.misc.platform || 'spoor';
    data.block = me.block;
    return templateEngine.load(tpl).then(function (template) {


      me.$mountPoint.find('.dt_state')
        .html(template(data));
      return me;
    });
  }

  function addZero(input) {
    if (input < 10) {
      return '0' + input;
    } else {
      return input;
    }
  }

  function addMinutes(time /*"hh:mm"*/, minsToAdd /*"N"*/) {
    function z(n) {
      return (n < 10 ? '0' : '') + n;
    }
    var bits = time.split(':');
    var mins = bits[0] * 60 + +bits[1] + +minsToAdd;

    return z(((mins % (24 * 60)) / 60) | 0) + ':' + z(mins % 60);
  }


  Dashticz.register(DT_publictransport);

  /*  function pubtransClick(me) {
      var id = 'ovapidlg';
      $('body').append(DT_function.createModalDialog('openpopup', id, { url: './js/components/pubtrans_ovapidlg.html' }));
      $('#' + id).modal('show');
  
  
    }
  */
}(Dashticz));

//# sourceURL=js/components/publictransport.js
