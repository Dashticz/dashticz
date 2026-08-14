/* global language settings moment _CORS_PATH*/
// eslint-disable-next-line no-unused-vars
function loadSonarr(me) {
  // Default value for user settings
  var html = '';
  var width = 4;
  var sonarrColSize = 12;
  var sonarrTitlePosition = 'left';
  var sonarrTitleObject = 'Upcoming&nbsp;shows';
  var block = me && me.block ? me.block : {};
  var fixedHeight = parseInt(block.height, 10) || 120;
  var heightClass = fixedHeight > 0 ? ' fixedheight' : '';
  var heightStyle =
    fixedHeight > 0
      ? ' style="height:' + fixedHeight + 'px !important"'
      : '';

  // lets get all the user settings if they exist
  if (typeof block.width !== 'undefined') {
    width = block.width;
  }

  if (typeof block.title_position !== 'undefined') {
    sonarrTitlePosition = block.title_position.toLowerCase();
  }

  if (typeof block.title !== 'undefined') {
    sonarrTitleObject = block.title;
    sonarrTitleObject = sonarrTitleObject.replace(/ /g, '&nbsp;');
  }

  // create the static html part
  if (sonarrTitlePosition == 'top') {
    html +=
      '<div class="col-xs-12 mh titlegroups transbg"><h3><em class="fas fa-tv"></em> ' +
      sonarrTitleObject +
      '</h3></div>';
  }
  html +=
    '<div class="sonarrMain mh dt_block block_sonarr col-xs-' +
    width +
    ' transbg' +
    heightClass +
    '"' +
    heightStyle +
    '>';

  if (sonarrTitlePosition == 'left') {
    html +=
      '<div class="col-xs-2 col-icon"><em class="fas fa-tv"></em><div class="SonarrBigTitle">' +
      sonarrTitleObject +
      '</div></div>';
    sonarrColSize = 10;
  }
  html +=
    '<div class="col-xs-' +
    sonarrColSize +
    ' col-data"><span class="state">' +
    language.misc.loading +
    '</span></div>';
  html += '</div>';

  getSonarrCalendar(block);

  return html;
}

function getSonarrCalendar(block) {
  var maxItems = 5;
  if (
    typeof settings['sonarr_maxitems'] !== 'undefined' &&
    parseFloat(settings['sonarr_maxitems']) > 0
  )
    maxItems = settings['sonarr_maxitems'];

  var view = 'Poster';
  if (typeof block.view !== 'undefined') {
    view = block.view.toLowerCase();
  }

  // generate Url
  var url = settings['sonarr_url'];
  // remove trailing slash if needed
  if (url.substr(-1) === '/') {
    url = url.substr(0, url.length - 1);
  }
  var apiKey = settings['sonarr_apikey'];
  var startDate = moment().format('YYYY-MM-DD');
  var endDate = moment(Date.now() + 32 * 24 * 3600 * 1000).format('YYYY-MM-DD');
  var generatedUrl =
    url +
    '/api/calendar?apikey=' +
    apiKey +
    '&start=' +
    startDate +
    '&end=' +
    endDate;

  $.getJSON(generatedUrl, function (result) {
    var data = '';
    var lastdate;
    $.each(result, function (i, field) {
      if (i >= maxItems) {
        return;
      }

      // get all the images incase we need them later
      var imgBannerUrl;
      var imgPosterUrl;
      imgBannerUrl = imgPosterUrl = 'unknown';
      $.each(field.series.images, function (key, value) {
        switch (value.coverType) {
          case 'banner':
            imgBannerUrl = value.url;
            break;
          case 'poster':
            imgPosterUrl = value.url;
            break;
          case 'fanart':
            /* Originally the next statement was here. However, this variable never is used ...*/
            //imgFanartUrl = value.url;
            break;
        }
      });

      // transform utc time to local and if within next 6 days show day name instead of date
      var local = moment(field.airDateUtc).local().format('DD-MM-YYYY HH:mm');
      var localDayOnly = moment(field.airDateUtc).local().format('DD-MM-YYYY');
      var nextWeek = moment(startDate).add(6, 'days');
      if (moment(field.airDateUtc).isBefore(nextWeek)) {
        local = moment(field.airDateUtc).local().format('dddd HH:mm');
        localDayOnly = moment(field.airDateUtc).local().format('dddd');
      }

      if (view == 'banner') {
        // Banner View
        if (
          !moment(field.airDateUtc).isSame(moment(lastdate), 'day') ||
          lastdate == null
        ) {
          data += '<div class="sonarrDateTitle">' + localDayOnly + '</div>';
        }
        lastdate = field.airDateUtc;

        data +=
          '<div class="SonarrItem"><img src="' +
          _CORS_PATH +
          imgBannerUrl +
          '" class="SonarrBanner">';
        if (field.hasFile == true) {
          data += '<div class="ribbon"><span>&#x2714;</span></div>';
        } else {
          data +=
            '<div class="ribbonDate">' +
            moment(field.airDateUtc).local().format('HH:mm') +
            '</div>';
        }
      } else {
        // Poster View
        data +=
          '<div class="SonarrItem"><img src="' +
          _CORS_PATH +
          imgPosterUrl +
          '" class="SonarrPoster">';
        data += '<div class="SonarrData">';
        data +=
          '<span class="SonarrTitleShow">' + field.series.title + '</span>';
        data += '<span class="SonarrEpisode">' + field.title + '</span>';

        if (field.hasFile == true) {
          data += '<span class="SonarrDownloaded">downloaded</span>';
        } else {
          data += '<span class="SonarrAirDate">' + local + '</span>';
        }

        data += '</div>'; //SonarrData
      }
      data += '</div>'; //SonarrItem
    });

    $('.sonarrMain .state').replaceWith(data);

    // Every 15 min recheck
    setTimeout(function () {
      var data = getSonarrCalendar(block);
      $('.sonarrMain .state').replaceWith(data);
    }, 60000 * 15);
  });
}
