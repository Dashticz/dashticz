/* global  Dashticz language*/
var DT_trafficinfo = {
	name: "trafficinfo",
	canHandle: function(block) {
		return block && (block.trafficJams || block.roadWorks || block.radars)
	},
	default: {
		icon: 'fas fa-car',
		containerClass: function () {
			return 'trafficinforow'
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
			var CORS_GZIP = './vendor/dashticz/cors_gzip.php?';
			if (provider == 'anwb') {
				dataURL = CORS_GZIP + 'https://api.anwb.nl/v1/incidents?apikey=QYUEE3fEcFD7SGMJ6E7QBCMzdQGqRkAi';
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
					if (d == 'roads') {
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
							var key = roadId;
							if (typeof (trafficobject.road) == 'undefined' || (typeof (trafficobject.road) != 'undefined' && roadArray.indexOf(roadId) > -1)) {
								var segments = data[d][t]['segments'];
								var header = '';
								//i = 0;
								for (var segment in segments) {
									for (var seg in segments[segment]) {
										if ((typeof (trafficobject.trafficJams) == 'undefined' || (trafficobject.trafficJams == true && seg == 'jams')) ||
											(typeof (trafficobject.roadWorks) == 'undefined' || (trafficobject.roadWorks == true && seg == 'roadworks')) ||
											(typeof (trafficobject.radars) == 'undefined' || (trafficobject.radars == true && seg == 'radars'))) {
											for (var s in segments[segment][seg]) {
												if ((typeof (trafficobject.segStart) == 'undefined' || (typeof (trafficobject.segStart) != 'undefined' && segments[segment]['start'] == trafficobject.segStart)) &&
													(typeof (trafficobject.segEnd) == 'undefined' || (typeof (trafficobject.segEnd) != 'undefined' && segments[segment]['end'] == trafficobject.segEnd))
												) {
													if (typeof (dataPart[key]) == 'undefined') {
														dataPart[key] = [];
													}
													//if (typeof (trafficobject.title) == 'undefined' || (typeof (trafficobject.title) != 'undefined' && typeof (trafficobject.road) == 'undefined')){
														if (key != header) {
															dataPart[key][i] = '<div><b>' + roadId + '</b><br>';
															header = key;
														} else {
															dataPart[key][i] = '<br><div>';
														}
													//}
													if (segments[segment][seg][s]['from'] != null) {
														dataPart[key][i] += segments[segment][seg][s]['from'];
													}
													if (segments[segment][seg][s]['to'] != null) {
														dataPart[key][i] += ' - ' + segments[segment][seg][s]['to'];
													}
													if (segments[segment][seg][s]['from'] != null || (segments[segment][seg][s]['to'] != null)){
														dataPart[key][i] += '<br>';
													}
													if (segments[segment][seg][s]['delay'] != null) {
														var delay = segments[segment][seg][s]['delay'] / 60;
														dataPart[key][i] += '+ ' + Math.round(delay) + 'min';
													}													
													if (segments[segment][seg][s]['distance'] != null) {
														var distance = segments[segment][seg][s]['distance'] / 1000;
														dataPart[key][i] += ' - ' + distance.toFixed(1) + 'km';
													}
													if (segments[segment][seg][s]['delay'] != null || (segments[segment][seg][s]['distance'] != null)){
														dataPart[key][i] += '<br>';
													}
													
													if (seg == 'jams' && segments[segment][seg][s]['reason'] == null){
														if (segments[segment][seg][s]['events'][0]['text'] != null) {
															dataPart[key][i] += segments[segment][seg][s]['events'][0]['text'] + '<br>';
														}
													} else if (seg == 'radars'){
														dataPart[key][i] += segments[segment][seg][s]['events'][0]['text'] + '. ' + segments[segment][seg][s]['reason'] + '<br>';
													} else if (segments[segment][seg][s]['reason'] != null) {
															dataPart[key][i] += segments[segment][seg][s]['reason'] + '<br>';
													}
													dataPart[key][i] += '</div>';
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