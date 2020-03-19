/* global  Dashticz language*/
var DT_alarmmeldingen = {
	name: "alarmmeldingen",
	canHandle: function(block) {
//		return block && (block.trafficJams || block.roadWorks || block.radars)
//		return block && (block.Alarm)
		return block && (block.rss)
},
	default: {
		title: "112 Meldingen",
        containerClass: function () {
			return 'alarmrow'
		}
	},
	get: function () {
		return language.misc.loading
	},
	run: function (me) {
//        console.log(me)
		var interval = 60;
		var alarmobject = me.block
		if (typeof (alarmobject.interval) !== 'undefined') interval = alarmobject.interval;
		getAlarmData(me);

		setInterval(function () {
			getAlarmData(me)
		}, (interval * 1000));
		return;

		function getAlarmData(me) {
			var alarmobject = me.block;
			if (typeof (alarmobject.rss) !== 'undefined') var newsfeed =  _CORS_PATH + alarmobject.rss;
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
		}


		function dataAlarmInfo(me, data) {
			var alarmobject = me.block;
			for (var d in data) {
				//start
				var html = '';
				if (typeof (alarmobject.city) !== 'undefined') var city = alarmobject.city;
				if (alarmobject.city.indexOf(',')) {
					cityArray = alarmobject.city.split(/, |,/);
				} else {
					cityArray.push(alarmobject.city);
				}
				var aantalMeldingen = 1;
                var maxMeldingen = (alarmobject.results); 
				$(data).find('item').each(function () { // or "item" or whatever suits your feed
                    var el = $(this);
                    var pubDate = new Date(el.find("pubDate").text());
                    pubDate = pubDate.toString();
                    pubDate = pubDate.split(' ')[4];
					var description = el.find("description").text();
//                   if ((description.includes(cityArray[0]) || description.includes(cityArray[1]) || description.includes(cityArray[2]) || description.includes(cityArray[3])) && (aantalMeldingen-1) < maxMeldingen) {	
                    if (cityArray.some(element => description.includes(element)) && (aantalMeldingen-1) < maxMeldingen) {	
						html += '<li><strong>' + pubDate + '&nbsp;&nbsp;&nbsp' + '<a href=' + el.find("link").text() + ' onclick="window.open(this.href); return false;" onkeypress="window.open(this.href); return false;">' + el.find("description").text() + '</a>' + '</strong></li>';
						aantalMeldingen++;
                    }
                });
			};
			if ((aantalMeldingen) < 2) {
				html += '<li <strong>' + "Geen Actuele Meldingen....." + '</strong><br />' +  '</li>';
			};
			$(me.mountPoint + ' .dt_state').html('');
//			var c = 1;
			$(me.mountPoint + ' .dt_state').append(html);
			
			if (typeof (alarmobject.show_lastupdate) !== 'undefined' && alarmobject.show_lastupdate == true) {
				var dt = new Date();
				$(me.mountPoint + ' .dt_state').append('<em>' + language.misc.last_update + ': ' + addZero(dt.getHours()) + ":" + addZero(dt.getMinutes()) + ":" + addZero(dt.getSeconds()) + '</em>')
			};
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