/* global Dashticz _CORS_PATH settings infoMessage moment ICAL _PHP_INSTALLED language templateEngine*/
/*
SENSOR_LOCATIONS_TO_URL = {
    "trashapi": [
        "http://trashapi.azurewebsites.net/trash?Location={0}&ZipCode={1}&HouseNumber={2}&HouseNumberSuffix={3}&District={4}&DiftarCode={5}&ShowWholeYear={6}"
    ]
}https://github.com/heyajohnny/afvalinfo/
*/
var DT_garbage = (function () {
  return {
    name: 'garbage',
    canHandle: function (block) {
      return block && block.company;
    },
    defaultCfg: {
      width: settings['garbage_width'] || 12,
      hideicon:
        typeof settings['garbage_hideicon'] !== 'undefined'
          ? settings['garbage_hideicon']
          : false,
      company: settings['garbage_company'],
      street: settings['garbage_street'] || '',
      housenumber: settings['garbage_housenumber'] || '',
      housenumberSuffix: settings['garbage_housenumberadd'] || '',
      zipcode: settings['garbage_zipcode'] || '',
      maxitems: settings['garbage_maxitems'] || 5,
      calendar_id: settings['garbage_calendar_id'],
      icalurl: settings['garbage_icalurl'],
      refresh: 4 * 3600,
      clickHandler: true,
      containerClass: 'trash',
      garbage: settings['garbage'],
      use_cors_prefix: settings['garbage_use_cors_prefix'],
      use_colors: settings['garbage_use_colors'],
      icon_use_colors: settings['garbage_icon_use_colors'],
      use_names: settings['garbage_use_names'],
      mapping: settings['garbage_mapping'],
      date_separator: ': ',
      layout: 1,
      maxdays: 32,
      ignoressl: false,
      defaultGarbage: 'kerstboom'
    },
    run: function (me) {
      me.order = Object.keys(me.block.garbage);
    },
    refresh: function (me) {
      me.trashToday = false;
      me.trashTomorrow = false;
      renderTemplate(me);
      loadDataForService(me).then(function () {
        var $trash = $(me.mountPoint + ' .trash');
        if (me.trashToday) $trash.addClass('trashtoday');
        else $trash.removeClass('trashtoday');
        if (me.trashTomorrow) $trash.addClass('trashtomorrow');
        else $trash.removeClass('trashtomorrow');
      });
    },
  };

  function renderTemplate(me) {
    var html = '';
    if (me.block.hideicon) {
      html += '<div class="col-xs-12 col-data state">';
    } else {
      html += '<div class="col-xs-4 col-icon">';
      html +=
        '<img class="trashcan" src="img/garbage/kliko.png" style="opacity:0.1" />';
      html += '</div>';
      html += '<div class="col-xs-8 col-data state">';
    }
    html += language.misc.loading;
    html += '</div>';
    $(me.mountPoint + ' .dt_state').html(html);
  }

  function getPrefixUrl(me) {
    if (me.block.use_cors_prefix) {
      return _CORS_PATH;
    }
    return '';
  }

  // eslint-disable-next-line no-unused-vars
  function getGoogleCalendarData(me, calendarId) {
    this.url =
      'https://www.googleapis.com/calendar/v3/calendars/' +
      calendarId +
      '/events';
    return $.ajax({
      url: this.url,
      data: {
        key: settings['google_api_key'],
        singleEvents: true,
        timeMin: me.date.start.format('YYYY-MM-DDT00:00:00+00:00'),
        timeMax: me.date.end.format('YYYY-MM-DDT00:00:00+00:00'),
        orderBy: 'startTime',
        maxResults: getMaxItems(me),
      },
      error: function (errorData) {
        var msg = errorData.responseJSON.error.message;
        infoMessage(
          '<font color="red">Garbage Error!</font>',
          'Google Calendar ' + msg,
          10000
        );
      },
      success: function (data) {
        var returnDates = data.items.map(function (element) {
          if (element.start.hasOwnProperty('date')) {
            this.startDate = moment(element.start.date);
          } else if (element.start.hasOwnProperty('dateTime')) {
            this.startDate = moment(element.start.dateTime);
          }
          return {
            date: this.startDate,
            summary: element.summary,
          };
        });
        return returnDates;
      },
    });
  }

  function getIcalData(me, url) {
    //todo: add recurrence handling
    // https://github.com/mifi/ical-expander
    return $.get(getPrefixUrl(me) + url).then(function (data) {
      var jcalData = ICAL.parse(data);
      var vcalendar = new ICAL.Component(jcalData);
      var vevents = vcalendar.getAllSubcomponents('vevent');
      var returnData = vevents
        .filter(function (vevent) {
          return moment(
            vevent.getFirstPropertyValue('dtstart').toString(),
            'YYYY-MM-DD'
          ).isBetween(me.date.start, me.date.end, null, '[]');
        })
        .map(function (vevent) {
          return {
            date: moment(
              vevent.getFirstPropertyValue('dtstart').toString(),
              'YYYY-MM-DD'
            ),
            summary: vevent.getFirstPropertyValue('summary'),
          };
        });

      return returnData;
    });
  }

  // eslint-disable-next-line no-unused-vars
  function getWasteApiData(me, companyCode) {
    return $.post('https://wasteapi.2go-mobile.com/api/FetchAdress', {
      companyCode: companyCode,
      postCode: me.block.zipcode,
      houseNumber: me.block.housenumber,
      houseLetter: '',
      houseNumberAddition: me.block.housenumberSuffix,
    })
      .then(function (data) {
        return $.post('https://wasteapi.2go-mobile.com/api/GetCalendar', {
          companyCode: companyCode,
          uniqueAddressID: data['dataList'][0]['UniqueId'],
          startDate: me.date.start.format('YYYY-MM-DD'),
          endDate: me.date.end.format('YYYY-MM-DD'),
          community: data['dataList'][0]['Community']
        });
      })
      .then(function (data) {
        var dataFiltered = [];
        data.dataList.forEach(function (element) {
          element.pickupDates.forEach(function (dateElement) {
            var pickupTypes = {
              GREY: 'Restafval',
              GREEN: 'GFT',
              GREENGREY: 'GFT & Rest',
              NOTAVAILABLE1: 'Papier',
              ORANGE: 'Plastic',
              NOTAVAILABLE2: 'Kerstbomen',
              NOTAVAILABLE3: 'Restgoed',
              PACKAGES: 'Verpakkingen',
              TREE: 'Kerstbomen',
              PAPER: 'Papier',
            };
            dataFiltered.push({
              date: moment(dateElement),
              summary: pickupTypes[element._pickupTypeText],
            });
          });
        });
        return dataFiltered;
      });
  }

  // eslint-disable-next-line no-unused-vars
  function getWasteApi2Data(me, companyCode) {
    return $.post('http://wasteapi2.2go-mobile.com/api/FetchAdress', {
      companyCode: companyCode,
      postCode: me.block.zipcode,
      houseNumber: me.block.housenumber,
    })
      .then(function (data) {
        return $.post('http://wasteapi2.2go-mobile.com/api/GetCalendar', {
          companyCode: companyCode,
          uniqueAddressID: data['dataList'][0]['UniqueId'],
          startDate: me.date.start.format('YYYY-MM-DD'),
          endDate: me.date.end.format('YYYY-MM-DD'),
        });
      })
      .then(function (data) {
        var dataFiltered = [];
        data.dataList.forEach(function (element) {
          element.pickupDates.forEach(function (dateElement) {
            var pickupType =
              element.description !== 'Null'
                ? element.description
                : element._pickupTypeText;
            dataFiltered.push({
              date: moment(dateElement),
              summary: pickupType,
            });
          });
        });
        return dataFiltered;
      });
  }

  // eslint-disable-next-line no-unused-vars
  //todo: Not working anymore ...
  function getAfvalAlertData(me) {
    var baseURL = 'https://www.afvalalert.nl/kalender';
    return $.get(
      getPrefixUrl(me) +
        baseURL +
        '/' +
        me.block.zipcode +
        '/' +
        me.block.housenumber +
        me.block.housenumberSuffix
    ).then(function (data) {
      data = data.items
        .filter(function (element) {
          return moment(element.date, 'YYYY-MM-DD').isBetween(
            me.date.start,
            me.date.end,
            null,
            '[]'
          );
        })
        .map(function (element) {
          return {
            date: moment(element.date, 'YYYY-MM-DD'),
            summary: element.type,
          };
        });
      return data;
    });
  }

  // eslint-disable-next-line no-unused-vars
  function getAfvalwijzerArnhemData(me) {
    var baseURL = 'http://www.afvalwijzer-arnhem.nl';
    return $.get(
      getPrefixUrl(me) +
        baseURL +
        '/applicatie?ZipCode=' +
        me.block.zipcode +
        '&HouseNumber=' +
        me.block.housenumber +
        '&HouseNumberAddition=' +
        me.block.housenumberSuffix
    ).then(function (data) {
      var returnDates = [];
      $(data)
        .find('ul.ulPickupDates li')
        .each(function (index, element) {
          returnDates.push({
            summary: $(element).find('div').remove().html().trim(),
            date: moment($(element).html().trim(), 'D-M-YYYY'),
            garbageType: mapGarbageType(me, $(element).attr('class')),
          });
        });
      return returnDates;
    });
  }


  // https://afvalkalender.purmerend.nl/adressen/1441JH:2
  //response: [{"bagid":"0439200000018093","postcode":"1441JH","huisnummer":2,"huisletter":"","toevoeging":"","description":"Kilstraat 2, 1441JH Purmerend","straat":"Kilstraat","woonplaats":"Purmerend","woonplaatsId":3103,"gemeenteId":439,"latitude":52.50251,"longitude":4.95551}]
  //then: webcal://afvalkalender.purmerend.nl/ical/0439200000018093
  //
  function getGarbageData(me, params) {
    var url =
      _CORS_PATH +
      params +
      '/adressen/' +
      me.block.zipcode +
      ':' +
      me.block.housenumber +
      ':' +
      me.block.housenumberSuffix;
    return $.get(url).then(function (result) {
      var bagid=result[0].bagid;
      var ical = params + '/ical/' + bagid;
      return getIcalData(me, ical);
    });
  }

  function getGeneralData(me, params) {
    //service, address, date, random, subservice)
    var service, subservice;
    switch (typeof params) {
      case 'string':
        service = params;
        break;
      case 'object':
        service = params.service;
        subservice = params.subservice;
        break;
      default:
        console.error('parameter should be a string or object ', params);
        return;
    }
    if (!_PHP_INSTALLED) {
      console.error(
        'Domoticz error!\nGarbage requires a PHP enabled web server.'
      );
      infoMessage(
        '<font color="red">Domoticz error!',
        'Garbage requires a PHP enabled web server</font>',
        0
      );
      return;
    }
    var cURI =
      settings['dashticz_php_path'] +
      'garbage/index.php?service=' +
      service +
      (me.block.street ? '&street=' + me.block.street : '') +
      '&sub=' +
      subservice +
      '&zipcode=' +
      me.block.zipcode +
      '&nr=' +
      me.block.housenumber +
      '&t=' +
      (me.block.housenumberSuffix || '') +
      (me.block.ignoressl ? '&ignoressl=true':'');
    return $.getJSON(cURI).then(function (data) {
      data = data
        .filter(function (element) {
          if (element.hasOwnProperty('dt_msg')) {
            return false;
          }
          return moment(element.date).isBetween(
            me.date.start,
            me.date.end,
            null,
            '[]'
          );
        })
        .map(function (element) {
          return {
            date: moment(element.date),
            summary: element.title,
          };
        });
      return data;
    });
  }

  //view-source:https://afval.katwijk.nl/nc/afvalkalender/afvalkalender/?tx_windwastecalendar_pi1%5Bzipcode%5D=44788729&tx_windwastecalendar_pi1%5Baction%5D=show&tx_windwastecalendar_pi1%5Bcontroller%5D=Zipcode&cHash=fb573b2d48c5fc99b66ccc07a6d8373e
  ///nc/afvalkalender/?tx_windwastecalendar_pi1%5Baction%5D=search&amp;tx_windwastecalendar_pi1%5Bcontroller%5D=Zipcode&amp;cHash=40c183c983706ba359f1122b44881a5e
  //curl -d '{"tx_windwastecalendar_pi1[action]": "search", "tx_windwastecalendar_pi1[controller]": "Zipcode", "tx_windwastecalendar_pi1[Hash]": "40c183c983706ba359f1122b44881a5e", "tx_windwastecalendar_pi1[zipcode]": "2225ZJ","tx_windwastecalendar_pi1[housenumber]": "17"}' -X POST https://afval.katwijk.nl/nc/afvalkalender/
  function getKatwijkData(me) {
    var prefix = 'https://afval.katwijk.nl/';
    /*    return $.post(getPrefixUrl() + prefix + 'nc/afvalkalender/', {
      'tx_windwastecalendar_pi1[action]': 'search',
      'tx_windwastecalendar_pi1[controller]': 'Zipcode',
      'tx_windwastecalendar_pi1[Hash]': '40c183c983706ba359f1122b44881a5e',
      'tx_windwastecalendar_pi1[zipcode]': me.block.zipcode,
      'tx_windwastecalendar_pi1[housenumber]': me.block.housenumber,
*/
//https://www.katwijk.nl/wonen-en-verbouwen/afval-inzamelen/afval-kalender?tx_opengemeentenwastemanagement%5Bhousenumber%5D=25&tx_opengemeentenwastemanagement%5Bpostalcode%5D=2225ZJ&type=1650453874&cHash=f486b5188550e7c9c11e7fecd3f1de59
    var postfix =
      'tx_windwastecalendar_pi1[action]=search&tx_windwastecalendar_pi1[controller]=Zipcode&tx_windwastecalendar_pi1[Hash]=6e6e80066d09747e8df35d5ff2d1e27b' +
      '&tx_windwastecalendar_pi1[zipcode]=' +
      me.block.zipcode +
      '&tx_windwastecalendar_pi1[housenumber]=' +
      me.block.housenumber;
    return $.post(
      getPrefixUrl(me) + prefix + 'nc/afvalkalender/?' + postfix
    ).then(function (data) {
      var elementHref = $(data).find('.ical .link a').attr('href');
      return getIcalData(me, prefix + elementHref);
    });
  }

  /* werkt niet meer ...
  function getZuidhornData(me, fetchType) {
    var prefix = 'https://afvalkalender.zuidhorn.nl/';

    return $.post(
      getPrefixUrl() +
        prefix +
        'afvalkalender-zoeken/zoek-postcode/Zipcode/search.html',
      {
        'tx_windwastecalendar_pi1[zipcode]': me.block.zipcode,
        'tx_windwastecalendar_pi1[housenumber]': me.block.housenumber,
      }
    ).then(function (data) {
      switch (fetchType) {
        case 'scrape':
          var dataFiltered = [];
          $(data)
            .find('.waste-calendar')
            .each(function (index, element) {
              var summary = $(element).find('.type a')[0].innerText;
              $(element)
                .find('.dates .date')
                .each(function (dateIndex, dateElement) {
                  dataFiltered.push({
                    date: moment(
                      dateElement.innerText.trim(),
                      'dddd DD MMMM',
                      'nl'
                    ),
                    summary: summary,
                    garbageType: mapGarbageType(summary),
                  });
                });
            });
          return dataFiltered;
        case 'ical':
          var elementHref = $(data).find('.ical .link a').attr('href');
          return getIcalData(me, prefix + elementHref);
      }
    });
  }
  */

  // eslint-disable-next-line no-unused-vars
  function getRd4Data(me) {
    return $.get(
      getPrefixUrl(me) +
        'https://www.rd4info.nl/NSI/Burger/Aspx/afvalkalender_general_text.aspx?pc=' +
        me.block.zipcode +
        '&nr=' +
        me.block.housenumber +
        '&t=' +
        me.block.housenumberSuffix
    ).then(function (data) {
      var returnDates = [];
      data = data
        .replace(/<img .*?>/g, '')
        .replace(/<head>(?:.|\n|\r)+?<\/head>/g, '')
        .replace(/<script (?:.|\n|\r)+?<\/script>/g, '')
        .replace(/<table class="contentTable" (?:.|\n|\r)+?<\/table>/g, '')
        .replace(/<input (?:.|\n|\r)+?\/>/g, '')
        .replace(/<div id="Afvalkalender1_pnlSearch"(?:.|\n|\r)+?<\/div>/g, '')
        .replace(/<a (?:.|\n|\r)+?<\/a>/g, '');
      $(data)
        .find('#Afvalkalender1_pnlAfvalKalender table.plaintextMonth tr')
        .each(function (index, element) {
          if (element.innerText.length) {
            returnDates.push({
              date: moment(
                $(element).find('td')[0].innerText.trim(),
                'dddd DD MMMM YYYY',
                'nl'
              ),
              summary: $(element).find('td')[1].innerText,
            });
          }
        });
      returnDates = returnDates.filter(function (element) {
        return element.date.isBetween(me.date.start, me.date.end, null, '[]');
      });
      return returnDates;
    });
  }

  ///http://dashticz.nl/afval/?service=afvalstromen&sub=alphenaandenrijn&zipcode=2401AR&nr=261&t=

  //http://dashticz.nl/afval/?service=deafvalapp&zipcode=5692VG&nr=33&t=

  //http://dashticz.nl/afval/?service=mijnafvalwijzer&zipcode=3825AL&nr=41&t=
  // eslint-disable-next-line no-unused-vars
  function getMijnAfvalwijzerData(me, param) {
    //  getGeneralData('mijnafvalwijzer', address, date, random);
    function getDate(data, startidx) {
      var collDateSplit = data[startidx].split(' ');
      var year =
        collDateSplit.length > 3 ? collDateSplit[3] : new Date().getFullYear();
      var dateStr =
        '' + Number(collDateSplit[1]) + ' ' + collDateSplit[2] + ' ' + year;
      return moment(dateStr, 'D MMM YYYY', 'nl');
    }

    var url =
      getPrefixUrl(me) +
      (param || 'https://www.mijnafvalwijzer.nl') +
      '/nl/' +
      me.block.zipcode +
      '/' +
      me.block.housenumber +
      '/';
    return $.get(url).then(function (result) {
      var returnDates = [];
      var newHTMLDocument = document.implementation.createHTMLDocument(
        'scrape'
      );
      newHTMLDocument.documentElement.innerHTML = result;
      var first_elt = newHTMLDocument.firstElementChild;
      var res = first_elt.getElementsByClassName('wasteInfoIcon');
      var res_length = res.length;
      for (var idx = 0; idx < res_length; idx++) {
        var el = res[idx];
        var p = el.getElementsByTagName('p');
        var l = p.length;
        for (var i = 0; i < l; i++) {
          el = p[i];
          var data = el.innerText.split('\n');
          var startidx = data[0] ? 0 : 1;
          var collDate = getDate(data, startidx);
          if (!collDate.isValid()) {
            startidx += 1;
            collDate = getDate(data, startidx);
          }
          var summary = data[startidx + 1].trim();
          if (data.length > startidx + 2) summary += data[startidx + 2].trim();
          returnDates.push({
            date: collDate,
            summary: summary,
          });
        }
      }
      return returnDates;
    });
  }

  function getRovaData(me) {
    //https://www.rova.nl/api/waste-calendar/upcoming?postalcode=3829BL&houseNumber=17&addition=&take=20
    //index.php still contains the previous version of Rova
    var url =
    getPrefixUrl(me) +
    'https://www.rova.nl/api/waste-calendar/upcoming?postalcode=' +
    me.block.zipcode +
    '&houseNumber=' +
    me.block.housenumber +
    '&addition=' +
    me.block.housenumberSuffix +
    '&take=' +
    me.block.maxitems

    return $.getJSON(url).then(function (data) {
      return data.map(function(el) {
        return {
          date: moment(el.date),
          summary: el.garbageType
        }
      })
    })
  }

  function filterReturnDates(me, returnDates) {
    return returnDates
      .map(function (element) {
        return {
          date: element.date,
          summary: element.summary,
          garbageType:
            element.garbageType || mapGarbageType(me, element.summary),
        };
      })
      .sort(function (a, b) {
        var res = a.date > b.date ? 1 : b.date > a.date ? -1 : 0;
        if(res) return res;
        if(!me.order) return 0;
        var sort_a = me.order.indexOf(a.garbageType);
        var sort_b = me.order.indexOf(b.garbageType);
        if (sort_a===sort_b) return 0;
        if (sort_a=== -1) return 1;
        if (sort_b=== -1) return -1;
        return sort_a>sort_b ? 1: -1;

      })
      .filter(function (element) {
        return (
          me.block.garbage.hasOwnProperty(element.garbageType) &&
          element.date.isBetween(me.date.start, me.date.end, null, '[]')
        );
      })
      .slice(0, getMaxItems(me));
  }

  function mapReturnDates(me, garbage) {
    var name = me.block.garbage[garbage.garbageType].name;
    var result = {
      rowClass: 'trashrow',
      trashDate: garbage.date.locale(settings['calendarlanguage']).format('l'),
      trashType:
        me.block.use_names || !garbage.summary
          ? name
          : garbage.summary.charAt(0).toUpperCase() + garbage.summary.slice(1),
      color: me.block.use_colors
        ? ' style="color:' + me.block.garbage[garbage.garbageType].code + '"'
        : '',
    };
    if (garbage.date.isSame(moment(), 'day')) {
      result.trashDate = language.weekdays.today;
      result.rowClass = 'trashtoday';
      me.trashToday = true;
    } else if (garbage.date.isSame(moment().add(1, 'days'), 'day')) {
      result.trashDate = language.weekdays.tomorrow;
      result.rowClass = 'trashtomorrow';
      me.trashTomorrow = true;
    } else if (garbage.date.isBefore(moment().add(1, 'week'))) {
      result.trashDate = garbage.date.format('dddd');
    }

    return result;
  }

  function addToContainer(me, returnDates) {
    var $div = me.$mountPoint;
    var $divState = $div.find('.state');
    var $divImg = $div.find('img.trashcan');
    returnDates = filterReturnDates(me, returnDates);
    if (!returnDates.length) {
      $divState.html('Geen gegevens gevonden');
      return;
    }

    if (me.block.icon_use_colors) {
      $divImg
        .attr('src', me.block.garbage[returnDates[0].garbageType]['icon'])
        .css('opacity', '0.7');
    } else {
      $divImg.css('opacity', '1');
    }

    var templateName = 'garbage_' + me.block.layout;

    return templateEngine.load(templateName).then(function (template) {
      var data = {
        trashSep: me.block.date_separator,
      };

      data.items = returnDates.map(function (el) {
        return mapReturnDates(me, el);
      });

      $divState.html(template(data));
    });
  }

  function mapGarbageType(me, garbageType) {
    var mappedType = me.block.defaultGarbage;
    if (garbageType) {
      $.each(me.block.mapping, function (index, element) {
        $.each(element, function (index2, element2) {
          var regex = new RegExp(element2, 'i');
          if (garbageType.match(regex)) {
            mappedType = index;
          }
        });
      });
    }
    return mappedType;
  }

  function getMaxItems(me) {
    return me.block.maxitems;
  }

  function loadDataForService(me) {
    me.date = {
      start: moment().startOf('day'),
      end: moment()
        .add(me.block.maxdays - 1, 'days')
        .endOf('day'),
    };

    var zipcode = me.block.zipcode;
    var housenumber = me.block.housenumber;

    var serviceProperties = {
      googlecalendar: {
        handler: getGoogleCalendarData,
        param: me.block.calendar_id,
      },
      ical: {
        handler: getIcalData,
        param: me.block.icalurl,
      },
      afvalalert: {
        handler: getAfvalAlertData,
      },
      afvalstoffendienst: {
        handler: getMijnAfvalwijzerData,
        param: 'https://afvalstoffendienstkalender.nl',
      },
      afvalwijzerarnhem: {
        handler: getAfvalwijzerArnhemData,
      },
      almere: {
        handler: getWasteApi2Data,
        param: '53d8db94-7945-42fd-9742-9bbc71dbe4c1',
      },
      alphenaandenrijn: {
        handler: getGeneralData,
        param: {
          service: 'afvalstromen',
          subservice: 'alphenaandenrijn',
        },
      },
      area: {
        handler: getWasteApiData,
        param: 'adc418da-d19b-11e5-ab30-625662870761',
      },
      avalex: {
        handler: getGeneralData,
        param: {
          service: 'ximmio',
          subservice: 'avalex',
        },
      },
      avri: {
        handler: getGeneralData,
        param: {
          service: 'ximmio',
          subservice: 'avri',
        },
      },
      barafvalbeheer: {
        handler: getWasteApiData,
        param: 'bb58e633-de14-4b2a-9941-5bc419f1c4b0',
      },
      best: {
        handler: getMijnAfvalwijzerData,
      },
      circulusberkel: {
        handler: getGeneralData,
        param: {
          service: 'circulusberkel',
//          subservice: 'circulusberkel',
        },
      },
      cure: {
        handler: getMijnAfvalwijzerData,
      },
      cyclusnv: {
        handler: getGeneralData,
        param: {
          service: 'afvalstromen',
          subservice: 'cyclusnv',
        },
      },
      dar: {
        handler: getGeneralData,
        param: {
          service: 'afvalstromen',
          subservice: 'dar',
        },
      },
      deafvalapp: {
        handler: getGeneralData,
        param: {
          service: 'deafvalapp',
        },
      },
      edg: {
        handler: getGeneralData,
        param: 'edg',
      },
      gad: {
        handler: getGarbageData,
        param: 'https://inzamelkalender.gad.nl',
      },
      gemeenteberkelland: {
        handler: getGeneralData,
        param: {
          service: 'afvalstromen',
          subservice: 'gemeenteberkelland',
        },
      },
      goes: {
        //https://afvalkalender.goes.nl/2020/4464AS-43.ics
        handler: getIcalData,
        param:
          'https://afvalkalender.goes.nl/' +
          moment().format('YYYY') +
          '/' +
          zipcode +
          '-' +
          housenumber +
          '.ics',
      },
      groningen: {
        handler: getMijnAfvalwijzerData,
      },
      hvc: {
        handler: getGeneralData,
        param: {
          service: 'afvalstromen',
          subservice: 'hvc',
        },
      },
      katwijk: {
        handler: getKatwijkData,
      },
      maashorst: {
        handler: getGeneralData,
        param: {
          service: 'deafvalapp',
        },
      },
      meerlanden: {
        handler: getGeneralData,
        param: {
          service: 'ximmio',
          subservice: 'meerlanden',
        },
      },
      mijnafvalwijzer: {
        handler: getMijnAfvalwijzerData,
      },
      blink: {
        handler: getGarbageData,
        param: 'https://mijnblink.nl',
      },
      omrin: {
        handler: getGeneralData,
        param: 'omrin',
      },
      ophaalkalender: {
        handler: getGeneralData,
        param: {
          service: 'recycleapp',
          subservice: me.block.street,
        },
      },
      purmerend: {
        handler: getGarbageData,
        param: 'https://afvalkalender.purmerend.nl',
      },
      rd4: {
        handler: getRd4Data,
      },
      recycleapp: {
        handler: getGeneralData,
        param: {
          service: 'recycleapp',
          subservice: me.block.street,
        },
      },
      rmn: {
        handler: getGeneralData,
        param: {
          service: 'afvalstromen',
          subservice: 'rmn',
        },
      },
      rova: {
        handler: getGeneralData,
        param: 'rova',
      },
      rova2: { //new(?) API. However, ssl issues with expired certificates on Synology
        handler: getRovaData,
      },
      sudwestfryslan: {
        handler: getGeneralData,
        param: {
          service: 'afvalstromen',
          subservice: 'sudwestfryslan',
        },
      },
      suez: {
        handler: getGarbageData,
        param: 'https://inzamelwijzer.prezero.nl',
      },
      twentemilieu: {
        handler: getWasteApiData,
        param: '8d97bb56-5afd-4cbc-a651-b4f7314264b4',
      },
      uden: {
        handler: getGeneralData,
        param: {
          service: 'deafvalapp',
        },
      },
      veldhoven: {
        handler: getIcalData,
        param:
          'https://www.veldhoven.nl/afvalkalender/' +
          moment().format('YYYY') +
          '/' +
          zipcode +
          '-' +
          housenumber +
          '.ics',
      },
      venlo: {
        handler: getIcalData, //https://www.venlo.nl/trash-calendar/download/5912TN/3
        param:
          'https://www.venlo.nl/trash-calendar/download/' +
          zipcode +
          '/' +
          housenumber,
      },
      venray: {
        handler: getGeneralData,
        param: {
          service: 'afvalstromen',
          subservice: 'venray',
        },
      },
      vianen: {
        handler: getGeneralData,
        param: {
          service: 'ximmio',
          subservice: 'waardlanden',
        },
      },
      /*{
        handler: getIcalData,
        param:
          'https://www.vianen.nl/afval/afvalkalender/' +
          moment().format('YYYY') + '/' +
          zipcode +
          '-' +
          housenumber +
          '.ics',
      },*/
      waalre: {
        handler: getGeneralData,
        param: {
          service: 'afvalstromen',
          subservice: 'waalre',
        },
      },
      waardlanden: {
        handler: getGeneralData,
        param: {
          service: 'ximmio',
          subservice: 'waardlanden',
        },
      },
      /*  doesn''t work anymore
      zuidhorn: {
        handler: getZuidhornData,
        param: 'scrape',
      },
      zuidhornical: {
        handler: getZuidhornData,
        param: 'ical',
      },*/
    };
    if (!serviceProperties[me.block.company]) {
      infoMessage('Garbage provider not found: ', me.block.company);
      return;
    }
    return serviceProperties[me.block.company]
      .handler(me, serviceProperties[me.block.company].param)
      .then(function (data) {
        return addToContainer(me, data);
      })
      .catch(function () {
        console.error('Error loading garbage: ', me.block);
        infoMessage('Error loading garbage data');
      });
  }
})();

Dashticz.register(DT_garbage);

//# sourceURL=js/components/garbage.js
