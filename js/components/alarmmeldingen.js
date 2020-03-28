/* global  Dashticz language _CORS_PATH infoMessage*/
var DT_alarmmeldingen = {
	name: "alarmmeldingen",
	canHandle: function (block) {
		return block && block.rss
	},
	defaultCfg: {
			title: "112 Meldingen",
			containerClass: 'alarmrow',
			icon: 'fas fa-bullhorn',
			rss: 'https://www.alarmeringen.nl/feeds/all.rss',
			filter: '',
			show_lastupdate: true,
			width: 12,
			refresh: 180,
			results: 5,
		},
	defaultContent: language.misc.loading,
	refresh: function (me) {
		var alarmobject = me.block;
		var newsfeed = _CORS_PATH + alarmobject.rss;
		$.ajax(newsfeed, {
			accepts: {
				xml: 'application/rss+xml'
			},
			dataType: 'xml',
			success: function (data) {
				dataAlarmInfo(me, data);
			},
			error: function (data) {
				infoMessage('<font color="red">Alarmeringen.nl feed Error!</font>', 'RSS feed ' + data.statusText + '. Check rss url.', 10000);
			}
		});

		function dataAlarmInfo(me, data) {
			var alarmobject = me.block;
			var html = '';
			var filterArray = [];
			if (alarmobject.filter.indexOf(',')) {
				filterArray = alarmobject.filter.split(/, |,/);
			} else {
				filterArray.push(alarmobject.filter);
			}
			var aantalMeldingen = 1;
			var maxMeldingen = (alarmobject.results);
			$(data).find('item').each(function () { // or "item" or whatever suits your feed
				var el = $(this);
				var description = el.find("description").text();
				if (filterArray.some(function (element) {
						return description.toLowerCase().includes(element.toLowerCase())
					}) && (aantalMeldingen - 1) < maxMeldingen) {
					var pubDate = new Date(el.find("pubDate").text());
					pubDate = pubDate.toString();
					pubDate = pubDate.split(' ')[4];
					//remove sevonds from time string
					pubDate = pubDate.replace(/:[^:]*$/,'');
					html += '<li><strong>' + pubDate + '&nbsp;&nbsp;&nbsp' + '<a href=' + el.find("link").text() + ' onclick="window.open(this.href); return false;" onkeypress="window.open(this.href); return false;">' + el.find("description").text() + '</a>' + '</strong></li>';
					aantalMeldingen++;
				}
			});
			if ((aantalMeldingen) < 2) {
				html += '<li <strong>' + "Geen Actuele Meldingen....." + '</strong><br />' + '</li>';
			}
			$(me.mountPoint + ' .dt_state').html(html);

			if (typeof (alarmobject.show_lastupdate) !== 'undefined' && alarmobject.show_lastupdate == true) {
				var dt = new Date();
				$(me.mountPoint + ' .dt_state').append('<em>' + language.misc.last_update + ': ' + addZero(dt.getHours()) + ":" + addZero(dt.getMinutes()) + ":" + addZero(dt.getSeconds()) + '</em>')
			}
		}

		function addZero(input) {
			if (input < 10) {
				return '0' + input;
			} else {
				return input;
			}
		}
	}
}


Dashticz.register(DT_alarmmeldingen);