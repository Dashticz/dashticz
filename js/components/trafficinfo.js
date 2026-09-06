/* global  Dashticz language _CORS_PATH Domoticz*/
var DT_trafficinfo = {
  name: 'trafficinfo',
  canHandle: function (block) {
    return block && (block.trafficJams || block.roadWorks || block.radars);
  },
  defaultCfg: function (block) {
    if (block && block.refresh && parseFloat(block.refresh) < 60)
      block.refresh = 60;
    var noTraffic = language.misc.no_traffic || 'No traffic announcements';
    var showempty = block && block.showemptyroads ? false : noTraffic;
    // Same pattern as js/components/map.js's own Domoticz-location default:
    // a block-level latitude/longitude override takes precedence, otherwise
    // fall back to Domoticz's own configured system location.
    var domoticzLocation =
      (Domoticz.getAllDevices()['_settings'] || {}).Location || {};
    return {
      icon: 'fas fa-car',
      containerClass: 'trafficinforow',
      refresh: 300,
      url: 'https://www.rwsverkeersinfo.nl/',
      newwindow: 1,
      clickHandler: true,
      // Distance filtering: defaults to 40km. latitude/longitude default to
      // Domoticz's own location so most users need only set maxDistance.
      maxDistance:
        block && typeof block.maxDistance !== 'undefined'
          ? block.maxDistance
          : 40,
      latitude:
        block && typeof block.latitude !== 'undefined'
          ? parseFloat(block.latitude)
          : parseFloat(domoticzLocation.Latitude),
      longitude:
        block && typeof block.longitude !== 'undefined'
          ? parseFloat(block.longitude)
          : parseFloat(domoticzLocation.Longitude),
      results: 5,
      showempty: showempty,
      showemptyroads: false,
      trafficJams: true,
      roadWorks: true,
      radars: true,
      width: 4,
      height: 260,
    };
  },
  defaultContent: language.misc.loading,
  refresh: function (me) {
    var dataURL = _CORS_PATH + 'https://api.rwsverkeersinfo.nl/api/traffic/';

    $.getJSON(dataURL, function (data) {
      var result = _buildRWSDataPart(me, data);
      _renderTrafficInfo(me, result.dataPart, result.noData);
    });
  },
};

// Pre-seeds dataPart with an empty-road placeholder (showemptyroads) for
// every configured road, and returns the parsed/sorted road filter list.
function _seedEmptyRoads(trafficobject) {
  var dataPart = {};
  var roadArray = [];
  if (typeof trafficobject.road != 'undefined') {
    if (trafficobject.road.indexOf(',')) {
      roadArray = trafficobject.road.split(/, |,/);
    } else {
      roadArray.push(trafficobject.road);
    }
    roadArray.sort();
    if (trafficobject.showemptyroads) {
      var showempty =
        typeof trafficobject.showemptyroads === 'string'
          ? trafficobject.showemptyroads
          : language.misc.no_traffic || 'No traffic announcements';
      for (var x = 0; x < roadArray.length; x++) {
        var key = roadArray[x];
        var html =
          '<div><b class="title">' +
          key +
          '</b><br>' +
          showempty +
          '<br></div>';
        dataPart[key] = [html];
      }
    }
  }
  return { dataPart: dataPart, roadArray: roadArray };
}

// Whether maxDistance filtering is actually configured and usable (a
// reference latitude/longitude - block-level or Domoticz's own - and a
// numeric maxDistance).
function _hasDistanceFilter(trafficobject) {
  return (
    typeof trafficobject.maxDistance !== 'undefined' &&
    trafficobject.maxDistance !== '' &&
    !isNaN(parseFloat(trafficobject.maxDistance)) &&
    !isNaN(trafficobject.latitude) &&
    !isNaN(trafficobject.longitude)
  );
}

// Haversine distance in km between two lat/lon points.
function _distanceKm(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var dLat = ((lat2 - lat1) * Math.PI) / 180;
  var dLon = ((lon2 - lon1) * Math.PI) / 180;
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// An item whose distance can't be determined (no maxDistance/location
// configured, or no coordinates for this item) is always kept - the point
// of this filter is trimming a too-long list, not risking an empty one.
function _isWithinDistance(trafficobject, lat, lon) {
  if (!_hasDistanceFilter(trafficobject) || isNaN(lat) || isNaN(lon)) {
    return true;
  }
  return (
    _distanceKm(trafficobject.latitude, trafficobject.longitude, lat, lon) <=
    parseFloat(trafficobject.maxDistance)
  );
}

// RWS obstruction coordinates: confirmed against a live obstruction object
// (flat latitude/longitude fields, e.g. { latitude: 53.181267,
// longitude: 5.921848, ... }) - no nesting, no GeoJSON.
function _rwsCoords(o) {
  if (o.latitude == null || o.longitude == null) return null;
  return { lat: parseFloat(o.latitude), lon: parseFloat(o.longitude) };
}

// Rijkswaterstaat's public traffic API (no API key). Response shape:
// { obstructions: [{ obstructionType, roadNumber, directionText,
//   description, locationText, latitude, longitude, delay, length,
//   timeStart, timeEnd }, ...] }
// obstructionType 1 = roadworks, 4 = jam. There is no speed-camera/radar
// category in this API.
function _buildRWSDataPart(me, data) {
  var trafficobject = me.block;
  var seed = _seedEmptyRoads(trafficobject);
  var dataPart = seed.dataPart;
  var roadArray = seed.roadArray;
  var noData = true;
  var obstructions = (data && data.obstructions) || [];
  var header = {};
  for (var idx = 0; idx < obstructions.length; idx++) {
    var o = obstructions[idx] || {};
    var isJam = String(o.obstructionType) === '4';
    var isRoadwork = String(o.obstructionType) === '1';
    if (!(
      (trafficobject.trafficJams && isJam) ||
      (trafficobject.roadWorks && isRoadwork)
    )) {
      continue;
    }
    var roadId = o.roadNumber;
    if (
      typeof trafficobject.road != 'undefined' &&
      roadArray.indexOf(roadId) === -1
    ) {
      continue;
    }
    var coords = _rwsCoords(o);
    if (coords && !_isWithinDistance(trafficobject, coords.lat, coords.lon)) {
      continue;
    }
    if (typeof dataPart[roadId] == 'undefined') dataPart[roadId] = [];
    var html;
    if (!header[roadId]) {
      html = '<div><b class="title">' + (roadId || '') + '</b><br>';
      header[roadId] = true;
    } else {
      html = '<div>';
    }
    var direction = String(o.directionText || '')
      .split(/\s*-\s*/)
      .filter(Boolean);
    if (direction[0]) html += '<b>' + direction[0] + '</b>';
    if (direction[1] && direction[1] !== direction[0]) {
      html += '<b> - ' + direction[1] + '</b>';
    }
    if (direction.length) html += '<br>';
    if (isJam && o.delay != null) {
      html += '+ ' + Math.round(o.delay) + 'min';
    }
    if (o.length != null) {
      html +=
        (isJam && o.delay != null ? ' - ' : '') +
        (o.length / 1000).toFixed(1) +
        'km';
    }
    if ((isJam && o.delay != null) || o.length != null) html += '<br>';
    var reason = o.description || o.locationText;
    if (reason) html += reason + '<br>';
    html += '</div>';
    dataPart[roadId].push(html);
    noData = false;
  }
  return { dataPart: dataPart, noData: noData };
}

function _renderTrafficInfo(me, dataPart, noData) {
  var trafficobject = me.block;
  $(me.mountPoint + ' .dt_state').html('');
  var c = 1;
  Object.keys(dataPart).forEach(function (d) {
    for (var p in dataPart[d]) {
      if (c <= trafficobject.results)
        $(me.mountPoint + ' .dt_state').append(dataPart[d][p]);
      c++;
    }
  });

  if (noData && me.block.showempty) {
    var emptyblock =
      typeof me.block.showempty === 'string'
        ? me.block.showempty
        : language.misc.no_traffic || 'No traffic announcements';
    $(me.mountPoint + ' .dt_state').append(
      '<div class="empty">' + emptyblock + '</div>'
    );
  }

  Dashticz.setEmpty(me, noData);

  if (
    typeof trafficobject.show_lastupdate !== 'undefined' &&
    trafficobject.show_lastupdate == true
  ) {
    var dt = new Date();
    $(me.mountPoint + ' .dt_state').append(
      '<em>' +
        language.misc.last_update +
        ': ' +
        _addZeroTraffic(dt.getHours()) +
        ':' +
        _addZeroTraffic(dt.getMinutes()) +
        ':' +
        _addZeroTraffic(dt.getSeconds()) +
        '</em>'
    );
  }
}

function _addZeroTraffic(input) {
  return input < 10 ? '0' + input : input;
}

Dashticz.register(DT_trafficinfo);

//# sourceURL=js/components/trafficinfo.js
