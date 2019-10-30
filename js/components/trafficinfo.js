/* global  Dashticz language*/
var DT_trafficinfo = {
	name: "trafficinfo",
	canHandle: function(block) {
		return block && (block.trafficJams || block.roadWorks || block.radars)
	},
	default: {
		icon: 'fas fa-car',
		containerClass: function () {
			return 'trafficrow'
		}
	},
	get: function () {
		return language.misc.loading
	},
	run: function (me) {

		//Get data every interval and call function to create block
		var interval = 60;
		var trafficobject = me.block
		if (typeof (trafficobject.interval) !== 'undefined') interval = trafficobject.interval;
		getProviderData(me);

		if (trafficobject.provider.toLowerCase() == 'ns') {
			if (parseFloat(interval) < 60) interval = 60; // limit request because of limitations in NS api for my private key ;)
		}

		setInterval(function () {
			getProviderData(me)
		}, (interval * 1000));
		return;

		function getProviderData(me) {
			var trafficobject = me.block;
			var provider = trafficobject.provider.toLowerCase();
			var dataURL = '';
			if (provider == 'anwb') {
				dataURL = 'https://www.anwb.nl/feeds/gethf';
			}
			// To do:
			//else if(provider == 'flitsmeister'){
			//	dataURL = _CORS_PATH + 'http://tesla.flitsmeister.nl/teslaFeed.json';
			//}

			$.getJSON(dataURL, function (data) {
				dataTrafficInfo(me, data);
			});
		}


		function dataTrafficInfo(me, data) {
			var trafficobject = me.block;
			var provider = trafficobject.provider.toLowerCase();
			var dataPart = {}
			var i = 0;
			for (var d in data) {
				if (provider == 'anwb') {
					if (d == 'roadEntries') {
						if (typeof (trafficobject.road) != 'undefined') {
							var roadArray = [];
							if (trafficobject.road.indexOf(',')) {
								roadArray = trafficobject.road.split(/, |,/);
							} else {
								roadArray.push(trafficobject.road);
							}
							roadArray.sort();
							for (var x = 0; x < roadArray.length; x++) {
								var key = roadArray[x];
								if (typeof (dataPart[key]) == 'undefined') {
									dataPart[key] = [];
								}
								dataPart[key][i] = '';
								dataPart[key][i] += '<div><b>' + roadArray[x] + '</b><br>';
								dataPart[key][i] += 'Geen verkeersinformatie';
								dataPart[key][i] += '<br></div>';
							}
						}
						for (var t in data[d]) {

							var roadId = data[d][t]['road'];

							if (typeof (trafficobject.road) == 'undefined' || (typeof (trafficobject.road) != 'undefined' && roadArray.indexOf(roadId) > -1)) {
								var events = data[d][t]['events'];
								var header = '';
								for (var ev in events) {
									if ((typeof (trafficobject.trafficJams) == 'undefined' || (trafficobject.trafficJams == true && ev == 'trafficJams')) ||
										(typeof (trafficobject.roadWorks) == 'undefined' || (trafficobject.roadWorks == true && ev == 'roadWorks')) ||
										(typeof (trafficobject.radars) == 'undefined' || (trafficobject.radars == true && ev == 'radars'))) {
										i = 0;
										for (var e in events[ev]) {
											if ((typeof (trafficobject.segStart) == 'undefined' || (typeof (trafficobject.segStart) != 'undefined' && events[ev][e]['segStart'] == trafficobject.segStart)) &&
												(typeof (trafficobject.segEnd) == 'undefined' || (typeof (trafficobject.segEnd) != 'undefined' && events[ev][e]['segEnd'] == trafficobject.segEnd))
											) {
												key = roadId;
												if (typeof (dataPart[key]) == 'undefined') {
													dataPart[key] = [];
												}
												dataPart[key][i] = '';
												if (key != header) {
													dataPart[key][i] += '<div><b>' + data[d][t]['road'] + '</b><br>';
													header = key;
												}
												if (events[ev][e]['location'] != null) {
													dataPart[key][i] += events[ev][e]['location'];
												}
												if (events[ev][e]['distance'] != null) {
													var distance = events[ev][e]['distance'] / 1000;
													dataPart[key][i] += ', ' + distance.toFixed(1) + 'km';
												}
												if (events[ev][e]['delay'] != null) {
													var delay = events[ev][e]['delay'] / 60;
													dataPart[key][i] += ' - ' + Math.round(delay) + 'min';
												}
												dataPart[key][i] += ':<br>';
												if (events[ev][e]['description'] != null) {
													dataPart[key][i] += events[ev][e]['description'];
												}
												dataPart[key][i] += '<br></div>';
												i++;
											}
										}
									}
								}
							}
						}
					}
				}
			}
			$(me.mountPoint + ' .dt_state').html('');
			var c = 1;
			Object.keys(dataPart).forEach(function (d) {
				//Object.keys(dataPart).sort().forEach(function(d) {
				for (var p in dataPart[d]) {
					if (c <= trafficobject.results) $(me.mountPoint + ' .dt_state').append(dataPart[d][p]);
					c++;
				}
			});

			if (typeof (trafficobject.show_lastupdate) !== 'undefined' && trafficobject.show_lastupdate == true) {
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

Dashticz.register(DT_trafficinfo);