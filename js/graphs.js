/* eslint-disable no-prototype-builtins */
/* global moment settings config Beaufort number_format alldevices language time blocks usrEnc pwdEnc Chart _TEMP_SYMBOL*/
var dtGraphs = [];
var _GRAPHREFRESH = 5;

function getGraphs(device, popup, multi) {
    moment.locale(settings['calendarlanguage']);
    var sensor = 'counter';
    var txtUnit = '?';
    var currentValue = device['Data'];
    var decimals = 2;
    switch (device['Type']) {
        case 'Rain':
            sensor = 'rain';
            txtUnit = 'mm';
            decimals = 1;
            break;
        case 'Lux':
            sensor = 'counter';
            txtUnit = 'Lux';
            decimals = 0;
            break;
        case 'Wind':
            sensor = 'wind';
            var windspeed = device.Data.split(';')[2] / 10;
            if (config['use_beaufort']) {
                currentValue = Beaufort(windspeed);
                decimals = 0;
                txtUnit = 'Bft';
            } else {
                currentValue = windspeed;
                decimals = 1;
                txtUnit = 'm/s';
            }
            break;
        case 'Temp':
        case 'Temp + Humidity':
        case 'Temp + Humidity + Baro':
            sensor = 'temp';
            txtUnit = '°C';
            currentValue = device['Temp'];
            decimals = 1;
            break;
        case 'Humidity':
            sensor = 'temp';
            txtUnit = '%';
            decimals = 1;
            break;
        case 'RFXMeter':
            txtUnit = device['CounterToday'].split(' ')[1];
            currentValue = device['CounterToday'].split(' ')[0];
            switch (device['SwitchTypeVal']) {
                case 0: //Energy
                    break;
                case 1: //Gas
                    break;
                case 2: //Water
                    decimals = 0;
                    break;
                case 3: //Counter
                    break;
                case 4: //Energy generated
                    break;
                case 5: //Time
                    break;
            }
            break;
        case 'Air Quality':
            sensor = 'counter';
            txtUnit = 'ppm';
            decimals = 1;
            break;
    }

    switch (device['SubType']) {
        case 'Percentage':
            sensor = 'Percentage';
            txtUnit = '%';
            decimals = 1;
            break;
        case 'Custom Sensor':
            sensor = 'Percentage';
            txtUnit = device['SensorUnit'];
            decimals = 1;
            break;
        case 'Gas':
            txtUnit = 'm3';
            break;
        case 'Electric':
            txtUnit = 'Watt';
            break;
        case 'Energy':
        case 'kWh':
        case 'YouLess counter':
            txtUnit = 'kWh';
            currentValue = device['CounterToday'];
            break;
        case 'Visibility':
            txtUnit = 'km';
            break;
        case 'Radiation':
        case 'Solar Radiation':
            txtUnit = 'Watt/m2';
            decimals = 0;
            break;
        case 'Pressure':
            txtUnit = 'Bar';
            break;
        case 'Soil Moisture':
            txtUnit = 'cb';
            break;
        case 'Leaf Wetness':
            txtUnit = 'Range';
            break;
        case 'A/D':
            txtUnit = 'mV';
            break;
        case 'Voltage':
        case 'VoltageGeneral':
            txtUnit = 'V';
            break;
        case 'DistanceGeneral':
        case 'Distance':
            txtUnit = 'cm';
            break;
        case 'Sound Level':
            txtUnit = 'dB';
            break;
        case 'CurrentGeneral':
        case 'CM113, Electrisave':
        case 'Current':
            txtUnit = 'A';
            break;
        case 'Weight':
            txtUnit = 'kg';
            break;
        case 'Waterflow':
            sensor = 'Percentage';
            txtUnit = 'l/min';
            break;
        case 'Counter Incremental':
            txtUnit = device['CounterToday'].split(' ')[1];
            currentValue = device['CounterToday'].split(' ')[0];
            break;
        case 'Barometer':
            sensor = 'temp';
            txtUnit = device['Data'].split(' ')[1];
            break;

    }

    currentValue = number_format(currentValue, decimals);
    var graphIdx = device.idx;
    if (popup) graphIdx += 'p';
    if (typeof dtGraphs[graphIdx] == 'undefined') {
        dtGraphs[graphIdx] = {
            idx: device.idx,
            title: device.Name,
            type: device.Type,
            subtype: device.SubType,
            sensor: sensor,
            txtUnit: txtUnit,
            currentValue: currentValue,
            decimals: decimals,
            popup: popup,
            range: 'initial',
            lastRefreshTime: 0,
            forced: false,
            graphIdx: graphIdx
            // forced: false
        }
    }
    dtGraphs[graphIdx].currentValue = currentValue;
	if(multi) return dtGraphs[graphIdx];
    showGraph(graphIdx);
}

// eslint-disable-next-line no-unused-vars
function getGraphByIDX(idx) {
    getGraphs(alldevices[idx], true);
}

// eslint-disable-next-line no-unused-vars
function showPopupGraph(idx, subidx) {
    var device = alldevices[idx];
    if ($('#opengraph' + device['idx']).length === 0) {
        var html = '<div class="modal fade opengraph opengraph' + device['idx'] + 'p' + '" data-idx="' + device['idx'] + '" id="opengraph' + device['idx'] + 'p' + '" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">';
        html += '<div class="modal-dialog graphwidth">';
        html += '<div class="modal-content">';
        html += '<div class="modal-header graphclose">';
        html += '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>';
        html += '</div>';
        html += '<div class="modal-body block_graph_' + device['idx'] + 'p' + '">' + language.misc.loading;
        html += '</div>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        $('body').append(html);
    }
    $("#opengraph" + device['idx'] + 'p').modal();
    getGraphs(alldevices[idx], true);

}

function getMultiGraphs(devices, selGraph){	
	var primary = devices[0];
	var arrIdx = [];
	var multidata = { "result": [], "status": "OK", "title": "Multigraph day" };
	var range = (typeof selGraph === 'undefined' ) ? 'day' : selGraph;
	if(range === 'last') range = 'day';
	var arrResults = [];
	var currentValues = [];
	$.each(devices, function( i, device ) {		
		var multigraph = dtGraphs[devices[i].idx];
		arrIdx.push(devices[i].idx);		
		if(typeof multigraph === 'undefined'){
			multigraph = getGraphs(devices[i], false, true);
		}
		currentValues.push((parseFloat(multigraph.currentValue.replace(',','.'))).toFixed(2));		
		var deviceNumber = i+1;		
		if (typeof selGraph !== 'undefined' ) {
			multigraph.range = selGraph;
			multigraph.forced = true;
		}		
		if (multigraph.lastRefreshTime < (time() - (parseFloat(_GRAPHREFRESH) * 60))) {
			multigraph.forced = true;
		}				
		if (dtGraphs[primary.idx].forced) {
			var multigraphTypes = typeof blocks['multigraph_' + primary.idx].multigraphTypes !== 'undefined'? blocks['multigraph_' + primary.idx].multigraphTypes : null;
			var interval = typeof blocks['multigraph_' + primary.idx].interval !== 'undefined'? blocks['multigraph_' + primary.idx].interval : 1;
			$.ajax({
				url: settings['domoticz_ip'] + '/json.htm?username=' + usrEnc + '&password=' + pwdEnc + '&type=graph&sensor=' + dtGraphs[devices[i].idx].sensor + '&idx=' + dtGraphs[devices[i].idx].idx + '&range=' + range + '&method=1&time=' + new Date().getTime() + '&jsoncallback=?',
				type: 'GET',
				async: true,
				contentType: "application/json",
				dataType: 'jsonp',
				success: function (data) {	
					data.graph = dtGraphs[devices[i].idx];
					arrResults.push(data);
				}
			}).done(function() {								
				if(devices.length === deviceNumber){
					arrResults.sort(function(a, b) {
						return b.result.length - a.result.length;
					});					
					var newKeys = [];									
					$.each(arrResults, function( z, d ) {
						var arrYkeys = [];						
						var currentKey;
						var counter = z + 1;
						if(multigraphTypes !== null){
							for (var key in d.result[0]) {
								if($.inArray(key, multigraphTypes) !== -1 && key !== "d"){									
									arrYkeys.push(key);		
								}
							}
						} else {
							for (var key in d.result[0]) {							
								if(key !== "d" ){
									arrYkeys.push(key);			
								}
							}
						}						
						$.each(d.result, function( x, res ) {
							var valid = false;
							interval = multigraph.range === 'last' || multigraph.range === 'month'? 1 : interval;
							if(x% interval === 0){ 
								if(z==0) {
									var obj = {};
									for (var key in res) {
										if(key ==="d"){
											obj["d"] = res[key];
										}
										if($.inArray(key, arrYkeys) !== -1){
											currentKey = key + counter;
											obj[currentKey] = res[key];
											valid = true;
											if($.inArray(currentKey, newKeys) === -1) newKeys.push(currentKey);
										} 
									}								
									if(valid) multidata.result.push(obj);								
								} else {								
									for (var key in res) {									
										if(key !=="d" && $.inArray(key, arrYkeys) !== -1){										
											$.each(multidata.result, function(index, obj) {
											   $.each(obj, function(k, v) {
												   if(k === "d" && v === res["d"]){
														currentKey = key + counter;
														multidata.result[index][currentKey] = res[key];
														if($.inArray(currentKey, newKeys) === -1) newKeys.push(currentKey);
												   }									  
											   });
											});
										}
									}								
								}
							}							
						});						
						if(arrResults.length === counter){							
							$.each(multidata.result, function(index, obj) {
								$.each(obj, function(k, v) {
									for (var n in newKeys) {	
										if(!obj.hasOwnProperty(newKeys[n])) {
											obj[newKeys[n]] = "0.000";
										} 
									} 
								});								
							});
							dtGraphs[primary.idx].currentValues = currentValues/* .join(' | ') */;
							showGraph(primary.idx, selGraph, multidata, arrIdx);
						}						
					});
				}  
			});	
		}
	});
}

function showGraph(graphIdx, selGraph, data, arrIdx) {	
	var graph = {};
    graph.properties = dtGraphs[graphIdx];
	graph.multigraph = typeof data !== 'undefined' ? true : false;
	graph.properties.devices = typeof arrIdx !== 'undefined' ? arrIdx : [graphIdx];
	var multi = graph.multigraph ? 'multi' : '';
		
    graph.properties.datasetColors = ['red', 'yellow', 'blue', 'orange', 'green', 'purple'];
    if (typeof selGraph !== 'undefined') {
        graph.properties.range = selGraph;
        graph.properties.forced = true;
    }

    if (graph.properties.lastRefreshTime < (time() - (parseFloat(_GRAPHREFRESH) * 60))) {
        graph.properties.forced = true;
    }
    var isInitial = (graph.properties.range === 'initial');

    if (graph.properties.forced || graph.properties.popup) {
        graph.properties.forced = false;
        graph.properties.lastRefreshTime = time();
        //Check settings for standard graph
        if (isInitial) {
            switch (settings['standard_graph']) {
                case 'hours':
                    graph.properties.range = 'last';
                    break;
                case 'day':
                    graph.properties.range = 'day';
                    break;
                case 'month':
                    graph.properties.range = 'month';
                    break;
            }
        }
        graph.properties.realrange = graph.properties.range;
        graph.dataFilterCount = 0;
        graph.dataFilterUnit = '';
        if (graph.properties.range === 'last') {
            graph.properties.realrange = 'day';
            graph.dataFilterCount = 4;
            graph.dataFilterUnit = 'hours';
        }

        graph.blocksConfig = typeof (blocks[multi + 'graph_' + graph.properties.idx]) !== 'undefined' ? blocks[multi + 'graph_' + graph.properties.idx] : null;

        graph.method = 1;
        graph.graphConfig = null;
        if (graph.blocksConfig) {
            if (typeof (graph.blocksConfig.method) !== 'undefined') graph.method = graph.blocksConfig.method;
            graph.customRange = false;
            if (graph.blocksConfig.custom) {
                if (isInitial) {
                    graph.properties.range = Object.keys(graph.blocksConfig.custom)[0];
                    graph.customRange = true;
                }
                if (graph.blocksConfig.custom[graph.properties.range]) {
                    graph.graphConfig = graph.blocksConfig.custom[graph.properties.range];
                    graph.customRange = true;
                    if (graph.graphConfig.range) {
                        switch (graph.graphConfig.range) {
                            case 'day':
                            case 'month':
                            case 'year':
                                graph.properties.realrange = graph.graphConfig.range;
                                break;
                            case 'last':
                                graph.dataFilterCount = 4;
                                graph.dataFilterUnit = 'hours';
                                graph.properties.realrange = 'day';
                                break;
                            default:
                                console.log('invalid range: ' + graph.graphConfig.range)

                        }
                    }
                    if (graph.graphConfig.filter) {
                        graph.dataFilterCount = parseInt(graph.graphConfig.filter);
                        graph.dataFilterUnit = graph.graphConfig.filter.split(" ").splice(-1)[0];
                    }
                    if (graph.graphConfig.method) {
                        graph.method = graph.graphConfig.method;
                    }
                }
                if (!graph.customRange) {
                    console.log('custom graph, but graph selector ' + graph.properties.range + ' not found')
                }
            }
        }
		
		if(graph.multigraph){
			createGraph(graph, data);
		} else {	
			$.ajax({
				url: settings['domoticz_ip'] + '/json.htm?username=' + usrEnc + '&password=' + pwdEnc + '&type=graph&sensor=' + graph.properties.sensor + '&idx=' + graph.properties.idx + '&range=' + graph.properties.realrange + '&method=' + graph.method + '&time=' + new Date().getTime() + '&jsoncallback=?',
				type: 'GET',
				async: true,
				contentType: "application/json",
				dataType: 'jsonp',
				success: function (data) {
					createGraph(graph, data);
				}
			});	
		}
    }
}

function createGraph(graph, data) {
	
	var graphIdx = graph.properties.graphIdx;
	var multi 	 = graph.multigraph ? 'multi' : '';

	if (data.status === 'ERR') {
		alert('Could not load graph!');
		return;
	}

	var ranges = ["last", "day", "month"];
	if (graph.customRange)
		ranges = Object.keys(graph.blocksConfig.custom);
	var buttons = createButtons(graph.properties, ranges, graph.customRange, graph.multigraph);

	var baseTitle = graph.properties.title;

	if (graph.blocksConfig && typeof (graph.blocksConfig['title']) !== 'undefined') {
		baseTitle = graph.blocksConfig['title'];
	}
	
	var iconColour = graph.blocksConfig && isDefined(graph.blocksConfig['iconColour'])? graph.blocksConfig['iconColour'] : '#ccc';

	var title = '<div class="graphheader"><div class="graphtitle"><i class="fas fa-chart-bar" style="font-size:20px;margin-left:5px;color:' + iconColour + '">&nbsp;</i>' + baseTitle;
	if(!graph.multigraph){
		if(isDefined(graph.properties.currentValue)) {
			title += '&nbsp;<span class="graphcurrent' + graph.properties.idx + '">&nbsp;<i class="fas fa-equals" style="font-size:14px;color:' + iconColour + '">&nbsp;</i>&nbsp;' + graph.properties.currentValue + ' ' + graph.properties.txtUnit + '</span>';
		}
	} else {
		if (isDefined(graph.properties.currentValues)) {
			title += '&nbsp;<span class="graphcurrent' + graph.properties.idx + '">&nbsp;<i class="fas fa-equals" style="font-size:14px;color:' + iconColour + '">&nbsp;</i>&nbsp;' + graph.properties.currentValues.join('<span style="color:' + iconColour + ';font-weight:900;font-size:16px;"> | </span>') + ' ' + graph.properties.txtUnit + '</span>';
		}
	}
	title += '</div>';

	var width = 12;
	if (graph.blocksConfig && typeof (graph.blocksConfig['width']) !== 'undefined' && !graph.properties.popup) {
		width = graph.blocksConfig['width'];
	}
	var html = '';
	html += title + '<div class="graphbuttons" >' + buttons + '</div>';
	html += '</div>'

	html += '<div class="graph swiper-no-swiping' + (graph.properties.popup ? ' popup graphheight' : '') + '" id="graph' + graph.properties.idx + '">';
	html += '<canvas ' + 'id="graphoutput' + graph.properties.graphIdx + '"></canvas>';
	html += '</div>';
	var mydiv = $('.block_' + multi + 'graph' + '_' + graph.properties.graphIdx);
	if (!graph.properties.popup) {
		mydiv.addClass('col-xs-' + width);
		mydiv.addClass('block_graph');
	}
	mydiv.html(html);

	var chartctx = document.getElementById('graphoutput' + graph.properties.graphIdx).getContext('2d');
	var myLocalProperties = {};
	
	$.extend(true, myLocalProperties, graph.properties);    // create a deep copy for temporary use
	var graphProperties = getDefaultGraphProperties(graph.properties);
	$.extend(true, graphProperties, graph.blocksConfig);
	$.extend(myLocalProperties, getGraphProperties(data.result[0], graphIdx, graph.multigraph));			
	$.extend(true, myLocalProperties, graph.blocksConfig);

	if (graph.graphConfig) {
		$.extend(true, myLocalProperties, graph.graphConfig);
	}

	if (!myLocalProperties.popup) {
		var graphwidth = $('.block_' + multi + 'graph' + '_' + myLocalProperties.graphIdx + ' .graph').width();
		var setHeight = Math.min(Math.round(graphwidth / window.innerWidth * window.innerHeight), window.innerHeight - 50);
		if (myLocalProperties.height)
			setHeight = myLocalProperties.height;
		if (setHeight) $('.block_' + multi + 'graph' + '_' + myLocalProperties.graphIdx).css("height", setHeight);
	}

	if (typeof myLocalProperties.legend == 'boolean') {
		graphProperties.options.legend.display = myLocalProperties.legend;
	}

	var mydatasets = [];
	
	if (graph.dataFilterCount > 0) {
		var startMoment = moment().subtract(graph.dataFilterCount, graph.dataFilterUnit).format('YYYY-MM-DD HH:mm');
		data.result = data.result.filter(function (element) {
			return element.d > startMoment;
		});
	}
	
	var isBar  = myLocalProperties.graph == 'bar'?  true : false;
	var isLine = myLocalProperties.graph == 'line'? true : false;
	
	if (graph.graphConfig) {
		//custom data sets
		console.log("custom data sets");
		if(graph.graphConfig.ylabels)
			myLocalProperties.ylabels = graph.graphConfig.ylabels;   //in case ylabels are defined in the custom graph, we take those, instead of the default generated ylabels
		myLocalProperties.ykeys = Object.keys(graph.graphConfig.data);

		myLocalProperties.ykeys.forEach(function (element, index) {
			mydatasets[element] = {
				data: [],
				borderColor: myLocalProperties.datasetColors[index],
				borderWidth: 1,
				fill: myLocalProperties.lineFill? myLocalProperties.lineFill[index] : false,
				backgroundColor: myLocalProperties.datasetColors[index],
				pointRadius: 1,
				label: element,
				yAxisID: index<myLocalProperties.ylabels? myLocalProperties.ylabels[index] : myLocalProperties.ylabels[0]

			};

			if (graph.graphConfig.graph) {
				mydatasets[element].type = graph.graphConfig.graph;
			}

		})

		data.result.forEach( function(y) {
			var valid = false;
			myLocalProperties.ykeys.forEach(function(_value){
				var customValue = graph.graphConfig.data[_value];
				var d = {};
				for (var key in y) {
					if (key !== 'd')
						d[key] = parseFloat(y[key]);
				}

				try {
					var res = eval(customValue).toPrecision(8);
					valid = true;
					var datapoint = {
						x: y.d,
						y: res
					}
					mydatasets[_value].data.push(datapoint);
				} catch (error) {
					console.log("error in eval " + customValue);
					console.log(error);
				}
			});
			if (valid) graphProperties.data.labels.push(y.d);
		});

		if (graph.graphConfig.graph) {
			graphProperties.type = graph.graphConfig.graph;
		}
		$.extend(true, graphProperties, graph.graphConfig); //merge the custom settings.

	} else {
		
		if (typeof myLocalProperties.graphTypes == 'undefined') {
			var mySet = []
			data.result.forEach(function(element) {
				Object.keys(element).forEach(function(el){
					if (el !== 'd') mySet.push(el);
				})
			});
			myLocalProperties.ykeys = mySet.filter(onlyUnique);
			$.extend(myLocalProperties, getGraphProperties(data.result[0], graphIdx, graph.multigraph));
			
		} else {
			var newylabels = [];
			myLocalProperties.graphTypes.forEach(function (element) {
				var idx = myLocalProperties.ykeys.indexOf(element);
				if (idx >= 0)
					newylabels.push(myLocalProperties.ylabels[idx]);
			});
			if(graph.multigraph) myLocalProperties.ykeys = myLocalProperties.graphTypes; //for backwards compatibility
			myLocalProperties.ylabels = newylabels;
		}

		myLocalProperties.ykeys.forEach(function(element, index){			
			mydatasets[element] = {
				data: 					[],
				label: 					element,
				yAxisID: 				myLocalProperties.ylabels[index],
				backgroundColor: 		myLocalProperties.datasetColors[index],	
				barPercentage: 			isDefined(myLocalProperties.barWidth) && isBar? myLocalProperties.barWidth : 0.9,
				borderColor: 			isDefined(myLocalProperties.borderColors)? 		myLocalProperties.borderColors[index] : myLocalProperties.datasetColors[index],
				borderWidth: 			isDefined(myLocalProperties.borderWidth)?		myLocalProperties.borderWidth : 2,			
				borderDash:				isDefined(myLocalProperties.borderDash)? 		myLocalProperties.borderDash : [],	
				pointRadius: 			isDefined(myLocalProperties.pointRadius)? 		myLocalProperties.pointRadius : 0,
				pointStyle:				isDefined(myLocalProperties.pointStyle)? 		myLocalProperties.pointStyle[index] : 'circle',
				pointBackgroundColor: 	isDefined(myLocalProperties.pointFillColour)? 	myLocalProperties.pointFillColour[index] : myLocalProperties.datasetColors[index],
				pointBorderColor:		isDefined(myLocalProperties.pointBorderColor)? 	myLocalProperties.pointBorderColor[index] : '#adadad',
				pointBorderWidth:		isDefined(myLocalProperties.pointBorderWidth)? 	myLocalProperties.pointBorderWidth : 0, 
				lineTension:			isDefined(myLocalProperties.lineTension)? 		myLocalProperties.lineTension : 0.1,
				fill: 					isDefined(myLocalProperties.lineFill) && isLine? myLocalProperties.lineFill[index] : false
			};
		});
		
		data.result.forEach(function(element){			
			var valid = false;
			myLocalProperties.ykeys.forEach(function(el){
				if ( typeof element[el]!=='undefined') {
					switch (el) {
						case 'eu':
						case 'eg':
							mydatasets[el].data.push({
									x: element.d,
									y: element[el]
								});
							break;
						default:
							mydatasets[el].data.push(element[el]);
							mydatasets[el].key = el;
							valid = true;
							break;
					}
				}
			});
			if (valid) graphProperties.data.labels.push(element.d);
		});
	}
	
	// draw the datasets in custom order
	if(graph.multigraph){
		
		var legendOrder	   = typeof myLocalProperties.legend == 'object'? myLocalProperties.legend : false;
		var drawOrderLast  = typeof myLocalProperties.drawOrderLast == 'object'? myLocalProperties.drawOrderLast : false;
		var drawOrderDay   = typeof myLocalProperties.drawOrderDay == 'object'? myLocalProperties.drawOrderDay : false;
		var drawOrderMonth = typeof myLocalProperties.drawOrderMonth == 'object'? myLocalProperties.drawOrderMonth : false;
		var order = false;
		
		if (drawOrderLast || drawOrderDay || drawOrderMonth) {
			switch (myLocalProperties.range) {
				case 'last':
					order = drawOrderLast;
					break;
				case 'month':
					order = drawOrderMonth;
					break;
				default:
					order = drawOrderDay;
			}
		} else if (legendOrder){
			order = legendOrder;
		}

		if(order){
			var arr = [];
			for (var keyIdx in order) {
				var key = drawOrderLast === false && drawOrderDay === false && drawOrderMonth === false? keyIdx : order[keyIdx];
				Object.keys(mydatasets).forEach(function(element){
					if(mydatasets[element].key == key){
						arr[key] = mydatasets[key];
					}				
				});				
			}
			mydatasets = arr;
		}
	}
	
	Object.keys(mydatasets).forEach(function(element){
		if (typeof myLocalProperties.legend == 'object') {
			if (typeof myLocalProperties.legend[element] !== 'undefined')
				mydatasets[element].label = myLocalProperties.legend[element];
			graphProperties.options.legend.display = true;
		}
		graphProperties.data.datasets.push(mydatasets[element]);
	});

	//create the y-axes
	//ylabels contains the labels.
	var uniqueylabels = myLocalProperties.ylabels.filter(onlyUnique);
	var labelLeft = true
	var axisCount = myLocalProperties.options && myLocalProperties.options.scales && myLocalProperties.options.scales.yAxes ? myLocalProperties.options.scales.yAxes.length : 0;
	graphProperties.options.scales.yAxes = []; // reset to empty
	uniqueylabels.forEach(function(element, i){
		var yaxis = {
			id: element,
			type: typeof myLocalProperties.cartesian !== 'undefined'? myLocalProperties.cartesian : 'linear',
			ticks: {
				reverse: false,
				fontColor: "white"
			},
			gridLines: {
				color: 'rgba(255,255,255,0.2)', //give the needful color
			},
			scaleLabel: {
				labelString: element,
				display: true,
				fontColor: 'white'
			},
			position: labelLeft ? 'left' : 'right'
		}
		graphProperties.options.scales.yAxes.push(yaxis);
		if (i < axisCount)
			$.extend(true, graphProperties.options.scales.yAxes[i], myLocalProperties.options.scales.yAxes[i])
		labelLeft = !labelLeft;
	})


	//extend the y label with all dataset labels
	if (graphProperties.options.scales.yAxes.length > 1) {
		graphProperties.options.scales.yAxes.filter(function(element){ //filter the ylabels that have an initial label  
			return element.scaleLabel && typeof element.scaleLabel.labelString !== "undefined"
		}).forEach(function(yAxis){
			yAxis.scaleLabel.labelString = graphProperties.data.datasets.filter(function(dataset) {
					return dataset.yAxisID === yAxis.id;
				})
				.reduce(function (newlabelString, dataset) {
					return dataset.label + ' ' + newlabelString;
				}, '(' + yAxis.scaleLabel.labelString + ')');
		})
	}

	if (typeof myLocalProperties.legend !== 'undefined') {
		if ($.isArray(myLocalProperties.legend)) {
			myLocalProperties.legend.forEach(function (element, idx) {
				graphProperties.data.datasets[idx].label = element
			});
			graphProperties.options.legend.display = true;
		}
	}
	switch (typeof myLocalProperties.graph) {
		case 'string':
			graphProperties.type = myLocalProperties.graph;
			break;
		case 'object':
			myLocalProperties.graph.forEach(function (element, idx) {
				graphProperties.data.datasets[idx].type = element;
			});
			graphProperties.type = 'bar';
			break;
		default:
			break;

	}

	/* Check for custom options settings */
	isDefined(myLocalProperties.displayFormats)? 	$.extend(graphProperties.options.scales.xAxes[0].time.displayFormats, myLocalProperties.displayFormats) : graphProperties.options.scales.xAxes[0].time.displayFormats;
	isDefined(myLocalProperties.maxTicksLimit)? 	graphProperties.options.scales.xAxes[0].ticks.maxTicksLimit = myLocalProperties.maxTicksLimit : null;
	isDefined(myLocalProperties.reverseTime)? 		graphProperties.options.scales.xAxes[0].ticks.reverse = myLocalProperties.reverseTime : false;
	isDefined(myLocalProperties.pointStyle)? 		graphProperties.options.legend.labels.usePointStyle = true : graphProperties.options.legend.labels.usePointStyle = false;
	
	if(graph.multigraph){
		//console.log(myLocalProperties);
		//console.log(graphProperties);
	}
	
	new Chart(chartctx, graphProperties);
}

function createButtons(myProperties, ranges, customRange, multigraph) {
	
    var buttons = '<div class="btn-group" role="group" aria-label="Basic example">';
	var clickFunction = multigraph ? 'getMgDevices([' + myProperties.devices + ']' : 'showGraph(' + myProperties.graphIdx;

    var btnTextList = {
        'last'	: language.graph.last_hours,
        'day'	: language.graph.today,
        'month'	: language.graph.last_month
    }
		
    ranges.forEach(function (item) {
        var btnText = customRange ? item : btnTextList[item];
        buttons += '<button type="button" class="btn btn-default ';
        if (myProperties.range === item) buttons += 'active';
        buttons += '" onclick="'+clickFunction+',\'' + item + '\');">' + btnText + '</button> ';
    });
    buttons += '</div>';

    return buttons;
}

function getDefaultGraphProperties(myProperties) {
    return {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            maintainAspectRatio: false,
            tooltips: {
                mode: 'index',
                intersect: false
            },
            layout: {
                padding: {
                    top: 20
                }
            },
            legend: {
                labels: {
                    fontColor: "white",
                    fontSize: 14
                },
                position: 'bottom',
                display: false
            },
            scales: {
                yAxes: [{stacked: true}],

                xAxes: [{
                    ticks: {
                        fontColor: "white",
						source: "auto"
                    },
                    gridLines: {
                        color: 'rgba(255,255,255,0.2)', //give the needful color
                        display: true,
                    },
                    type: 'time',
                    time: {
                        displayFormats: {
                            'minute': 'H:mm',
                            'hour': myProperties.realrange === 'day' ? 'ddd H:mm':'D MMM',
                            'day': 'D MMM'
                        }
                    },
                    distribution: 'series'
                }]

            },

        },

    }
}

function getMgDevices(ids, range){
	
	$.ajax({
		url: settings['domoticz_ip'] + '/json.htm?username=' + usrEnc + '&password=' + pwdEnc + '&type=devices&plan=0&filter=all&used=true&order=Name',
		type: 'GET',
		async: true,
		contentType: "application/json",
		success: function (data) {
			
			for (var r in data.result) {
				
				var device = data.result[r];
                var idx = device['idx'];			
				var arrMgIdx  = ids;
				var arrMgDev = 'arrMgDevices_' + ids[0];
										
				if (typeof ( eval[arrMgDev] ) == 'undefined' ) eval[arrMgDev] = [];	

				if(eval[arrMgDev].length < arrMgIdx.length){											
					$.each(arrMgIdx, function( index, mgIdx ) {
						if(mgIdx === parseInt(idx) && $.inArray(mgIdx, eval[arrMgDev]) === -1) {
							eval[arrMgDev].push(device);											
						}
					});
				}
				
				if(eval[arrMgDev].length === arrMgIdx.length && data.result.length-1 === parseInt(r)){
					getMultiGraphs(eval[arrMgDev], range); 
				} 
			}			
		}
	});
}

function getGraphProperties(result, graphIdx, multigraph) {
    var myProperties = dtGraphs[graphIdx];
    var label = myProperties.txtUnit;
    var realrange = myProperties.realrange;
    var graphProperties = {};	
	if(multigraph){	
		var arrYkeys = [];
		var arrYlabels = [];		
		for (var key in result) {
			if(key !== "d"){
				arrYkeys.push(key);
				arrYlabels.push(label);					
			}
		}
		graphProperties = {
			ykeys: arrYkeys,
			ylabels: arrYlabels,
		};	
	} else {		
		if (typeof result == 'undefined')
			return graphProperties;
		if (result.hasOwnProperty('uvi')) {
			graphProperties = {
				ykeys: ['uvi'],
				ylabels: [label],
			};
		} else if (result.hasOwnProperty('lux')) {
			graphProperties = {
				ykeys: ['lux'],
				ylabels: ['Lux'],
			};
		} else if (result.hasOwnProperty('lux_avg')) {
			graphProperties = {
				ykeys: ['lux_avg', 'lux_min', 'lux_max'],
				ylabels: ['Lux average', 'Minimum', 'Maximum'],
			};
		} else if (result.hasOwnProperty('gu') && result.hasOwnProperty('sp')) {
			graphProperties = {
				ykeys: ['gu', 'sp'],
				ylabels: ['m/s', 'm/s'],
			};
		} else if (result.hasOwnProperty('ba') && result.hasOwnProperty('hu') && result.hasOwnProperty('te')) {
			graphProperties = {
				ykeys: ['ba', 'hu', 'te'],
				ylabels: ['hPa', '%', _TEMP_SYMBOL],
			};
		} else if (result.hasOwnProperty('hu') && result.hasOwnProperty('te')) {
			graphProperties = {
				ykeys: ['hu', 'te'],
				ylabels: ['%', _TEMP_SYMBOL],
			};
		} else if (result.hasOwnProperty('ba') && result.hasOwnProperty('te')) {
			graphProperties = {
				ykeys: ['ba', 'te'],
				ylabels: ['hPa', _TEMP_SYMBOL],
			};
		} else if (result.hasOwnProperty('te')) {
			graphProperties = {
				ykeys: ['te'],
				ylabels: [_TEMP_SYMBOL],
			};
		} else if (result.hasOwnProperty('hu')) {
			graphProperties = {
				ykeys: ['hu'],
				ylabels: ['%'],
			};
		} else if (result.hasOwnProperty('mm')) {
			graphProperties = {
				ykeys: ['mm'],
				ylabels: ['mm'],
			};
		} else if (result.hasOwnProperty('v_max')) {
			graphProperties = {
				ykeys: ['v_max'],
				ylabels: [label],
			};
			if (result.hasOwnProperty('v_min')) {
				graphProperties.ykeys.push('v_min')
				graphProperties.ylabels.push[label]
			}
			if (result.hasOwnProperty('v_avg')) {
				graphProperties.ykeys.push('v_avg')
				graphProperties.ylabels.push[label]
			}
		} else if (result.hasOwnProperty('v2')) {
			label = 'kWh';
			if (realrange == 'day') label = 'W';
			graphProperties = {
				ykeys: ['v2', 'v'],
				ylabels: [label, label],
			};
			if (result.hasOwnProperty('r2')) {
				graphProperties.ykeys.push('r2');
				graphProperties.ylabels.push(label);
			}
			if (result.hasOwnProperty('r1')) {
				graphProperties.ykeys.push('r1');
				graphProperties.ylabels.push(label);
			}
		} else if (result.hasOwnProperty('v')) {
			if (label === 'kWh' && realrange === 'day') {
				graphProperties = {
					ykeys: ['v'],
					ylabels: ['W'],
				}
			} else {
				graphProperties = {
					ykeys: ['v'],
					ylabels: [label],
				}
			}
		} else if (result.hasOwnProperty('eu')) {
			graphProperties = {
				ykeys: ['eu'],
				ylabels: [label],
			};
		} else if (result.hasOwnProperty('u')) {
			graphProperties = {
				ykeys: ['u'],
				ylabels: [label],
			};
		} else if (result.hasOwnProperty('u_max')) {
			graphProperties = {
				ykeys: ['u_max', 'u_min'],
				ylabels: ['?', '?'],
			};
		} else if (result.hasOwnProperty('co2')) {
			graphProperties = {
				ykeys: ['co2'],
				ylabels: ['ppm'],
			};
		} else if (result.hasOwnProperty('ba')) {
			graphProperties = {
				ykeys: ['ba'],
				ylabels: [label],
			};
		}
	}	
    return graphProperties;
}

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

function isDefined(prop){
	return typeof prop !== 'undefined'? true : false;
}