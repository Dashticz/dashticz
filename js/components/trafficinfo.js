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
      // 'distance' (around latitude/longitude) or 'roads' (only the roads
      // listed in `road`). A hand-written block with a `road` list and no
      // filter of its own keeps the 3.x behaviour: filter on those roads.
      filter:
        block && (block.filter === 'roads' || block.filter === 'distance')
          ? block.filter
          : block && _parseRoads(block.road).length
            ? 'roads'
            : 'distance',
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
      _renderTrafficInfo(me, result.dataPart, result.noData, result.roadArray);
    });
  },
};

// Road number as RWS writes it: upper case, no spaces ('a 4' -> 'A4').
function _normalizeRoad(road) {
  return String(road == null ? '' : road)
    .replace(/\s+/g, '')
    .toUpperCase();
}

// The configured road list ('A4, A17' / 'A4;a17' / ['A4', 'A17']) as
// normalized road numbers, in the configured order, without duplicates.
function _parseRoads(road) {
  if (Array.isArray(road)) road = road.join(',');
  if (typeof road !== 'string' && typeof road !== 'number') return [];
  var seen = {};
  return String(road)
    .split(/[,;]+/)
    .map(_normalizeRoad)
    .filter(function (item) {
      if (!item || seen[item]) return false;
      seen[item] = true;
      return true;
    });
}

// Whether this block shows the roads in `road` instead of everything
// within maxDistance.
function _isRoadFilter(trafficobject) {
  return trafficobject.filter === 'roads';
}

function _escapeTraffic(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
  var roadFilter = _isRoadFilter(trafficobject);
  var roadArray = roadFilter ? _parseRoads(trafficobject.road) : [];
  var dataPart = {};
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
    var roadId = _normalizeRoad(o.roadNumber) || '?';
    if (roadFilter) {
      // Roads mode: only the configured roads (all roads when the list is
      // empty), regardless of distance.
      if (roadArray.length && roadArray.indexOf(roadId) === -1) continue;
    } else {
      var coords = _rwsCoords(o);
      if (coords && !_isWithinDistance(trafficobject, coords.lat, coords.lon)) {
        continue;
      }
    }
    if (typeof dataPart[roadId] == 'undefined') dataPart[roadId] = [];
    var html;
    if (!header[roadId]) {
      html = '<div><b class="title">' + _escapeTraffic(roadId) + '</b><br>';
      header[roadId] = true;
    } else {
      html = '<div>';
    }
    // "Utrecht - 's-Hertogenbosch": only a dash with spaces around it
    // separates the two places, not the dash inside a place name.
    var direction = String(o.directionText || '')
      .split(/\s+-\s+/)
      .filter(Boolean);
    if (direction[0]) html += '<b>' + _escapeTraffic(direction[0]) + '</b>';
    if (direction[1] && direction[1] !== direction[0]) {
      html += '<b> - ' + _escapeTraffic(direction[1]) + '</b>';
    }
    if (direction.length) html += '<br>';
    // Delay and length only when RWS reports a real value (roadworks
    // usually come with 0).
    var hasDelay = isJam && Number(o.delay) > 0;
    var hasLength = Number(o.length) > 0;
    if (hasDelay) {
      html += '+ ' + Math.round(o.delay) + 'min';
    }
    if (hasLength) {
      html += (hasDelay ? ' - ' : '') + (o.length / 1000).toFixed(1) + 'km';
    }
    if (hasDelay || hasLength) html += '<br>';
    var reason = o.description || o.locationText;
    if (reason) html += _escapeTraffic(reason) + '<br>';
    if (o.cause) html += _escapeTraffic(o.cause) + '<br>';
    html += '</div>';
    dataPart[roadId].push(html);
    noData = false;
  }
  return { dataPart: dataPart, noData: noData, roadArray: roadArray };
}

// Roads mode lists the configured roads in their configured order, with at
// most `results` announcements per road, plus (showemptyroads) a line for
// every configured road without announcements. Distance mode lists the
// roads in road-number order, with at most `results` announcements in total.
function _renderTrafficInfo(me, dataPart, noData, roadArray) {
  var trafficobject = me.block;
  var results = parseInt(trafficobject.results, 10) || 5;
  var roadFilter = _isRoadFilter(trafficobject);
  var roads =
    roadFilter && roadArray && roadArray.length
      ? roadArray
      : Object.keys(dataPart).sort(function (a, b) {
          return a.localeCompare(b, undefined, { numeric: true });
        });
  var emptyRoadText =
    typeof trafficobject.showemptyroads === 'string'
      ? trafficobject.showemptyroads
      : language.misc.no_traffic || 'No traffic announcements';
  var html = '';
  var shown = 0;
  roads.forEach(function (road) {
    var items = dataPart[road] || [];
    if (!items.length) {
      if (roadFilter && trafficobject.showemptyroads) {
        html +=
          '<div><b class="title">' +
          _escapeTraffic(road) +
          '</b><br>' +
          _escapeTraffic(emptyRoadText) +
          '<br></div>';
      }
      return;
    }
    var limit = roadFilter ? results : results - shown;
    items.slice(0, Math.max(0, limit)).forEach(function (item) {
      html += item;
      shown++;
    });
  });
  $(me.mountPoint + ' .dt_state').html(html);

  if (noData && me.block.showempty) {
    var emptyblock =
      typeof me.block.showempty === 'string'
        ? me.block.showempty
        : language.misc.no_traffic || 'No traffic announcements';
    $(me.mountPoint + ' .dt_state').append(
      '<div class="empty">' + _escapeTraffic(emptyblock) + '</div>'
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
