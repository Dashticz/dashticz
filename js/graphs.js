var dtGraphs = [];

function getGraphs(device, popup) {
    var sensor = 'counter';
    var txtUnit = '?';
    var currentValue = device['Data'];
    var decimals = 2;
    console.log("Graph for " + device.Type + ' ' + device.SubType);
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
            if (config['use_beaufort']) {
                currentValue = Beaufort(device['Speed']);
                decimals = 0;
                txtUnit = 'Bft';
            } else {
                currentValue = device['Speed'];
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
    }

    var range;
    switch (settings['standard_graph']) {
        case 'hours':
            range = 'last';
            break;
        case 'day':
            range = 'day';
            break;
        case 'month':
            range = 'month';
            break;
    }

    currentValue = number_format(currentValue, decimals);
    var graphIdx = device.idx;
    if(popup) graphIdx+='p';
    dtGraphs[graphIdx] = {
        idx: device.idx,
        title: device.Name,
        type: device.Type,
        subtype: device.SubType,
        sensor : sensor,
        txtUnit: txtUnit,
        currentValue : currentValue,
        decimals : decimals,
        popup:popup,
        range:range,
        lastRefreshTime: 0,
        forced: false
    // forced: false
    }
    if(!popup) showGraph(graphIdx);
}

function getGraphByIDX(idx) {
    console.log("getGraphbyIDX "+idx);
    getGraphs(alldevices[idx], true);
}

function getButtonGraphs(device) {
    console.log('Open buttonGraps' + device.idx);
    if(!dtGraphs[device.idx]) {
        console.log('   not defined');
        return;
    }
//    console.log(device);
    if ($('#opengraph' + device['idx']).length === 0) {
        var html = '<div class="modal fade opengraph' + device['idx'] + '" data-idx="' + device['idx'] + '" id="opengraph' + device['idx'] + '" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">';
        html += '<div class="modal-dialog graphwidth">';
        html += '<div class="modal-content">';
        html += '<div class="modal-header graphclose">';
        html += '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>';
        html += '</div>';
        html += '<div class="modal-body block_graphpopup_' + device['idx'] + '">' + language.misc.loading;
        html += '</div>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        $('body').append(html);

        $('#opengraph' + device['idx']).on('shown.bs.modal', function () {
            getGraphByIDX($(this).data('idx'));
        });
    }
}

//function showGraph(idx, title, deviceType, deviceSubType, label, range, current, forced, sensor, popup) {
function showGraph(graphIdx) {
    var datasetColors = [ '#85c198', '#aed886','#f2e880','#9fb2c3',	'#7e88ba'];
//    if (typeof(popup) === 'undefined') forced = false;
//    if (typeof(forced) === 'undefined') forced = false;
    var myProperties = dtGraphs[graphIdx];

    if (myProperties.lastRefreshTime < (time() - (parseFloat(_GRAPHREFRESH) * 60))) {
        myProperties.forced = true;
    }

    if ($('.graphcurrent' + myProperties.idx).length > 0) {
        $('.graphcurrent' + myProperties.idx).html(myProperties.current + ' ' + myProperties.label);
    }

    if (myProperties.forced || myProperties.popup) {
        myProperties.lastRefreshTime = time();
        //Check settings for standard graph
        myProperties.realrange = myProperties.range;
        if (myProperties.realrange === 'last') myProperties.realrange = 'day';

        var blocksConfig = typeof(blocks['graph_' + myProperties.idx]) !== 'undefined' ? blocks['graph_' + myProperties.idx] : null;

        $.ajax({
            url: settings['domoticz_ip'] + '/json.htm?username=' + usrEnc + '&password=' + pwdEnc + '&type=graph&sensor=' + myProperties.sensor + '&idx=' + myProperties.idx + '&range=' + myProperties.realrange + '&method=1&time=' + new Date().getTime() + '&jsoncallback=?',
//            url: settings['domoticz_ip'] + '/json.htm?username=' + usrEnc + '&password=' + pwdEnc + '&type=graph&sensor=' + sensor + '&idx=' + idx + '&range=' + realrange + '&time=' + new Date().getTime() + '&jsoncallback=?',
            type: 'GET', async: true, contentType: "application/json", dataType: 'jsonp',
            success: function (data) {
                if (data.status === 'ERR') {
                    alert('Could not load graph!');
                    return;
                }
                var buttons = createButtons(graphIdx);
                var baseTitle = myProperties.title;

                if (blocksConfig && typeof(blocksConfig['title']) !== 'undefined') {
                    baseTitle = blocksConfig['title'];
                }

                title = '<h4>' + baseTitle;
                if (typeof(myProperties.current) !== 'undefined' && myProperties.current !== 'undefined') title += ': <B class="graphcurrent' + myProperties.idx + '">' + myProperties.current + ' ' + myProperties.label + '</B>';
                title += '</h4>';

                var html = '<div class="graph' + (myProperties.popup ? 'popup' : '')  + '" id="graph' + myProperties.idx + '">';

                var width = 12;
                if(blocksConfig && typeof(blocksConfig['width']) !== 'undefined' && !popup) {
                    width = blocksConfig['width'];
                }

                html += '<div class="transbg col-xs-' + width + '">';
                html += title + '<br /><div style="margin-left:15px;">' + buttons + '</div><br />'
//for morris
//              html+='<div ' + (popup ? 'class="graphheight" ':'') +  'id="graphoutput' + idx + '"></div>';
                html+='<canvas ' + (myProperties.popup ? 'class="graphheight" ':'') +  'id="graphoutput' + myProperties.idx + '"></canvas>';
                
                html += '</div>';
                html += '</div>';

                if ($('#graph' + myProperties.idx + '.graph').length > 0) {
                    $('#graph' + myProperties.idx + '.graph').replaceWith(html);
                }
                $('.block_graph' + (myProperties.popup ? 'popup' : '') + '_' + myProperties.idx).html(html);

/*
                var graphProperties = {
                    parseTime: false,
                    element: 'graphoutput' + idx,
                    fillOpacity: 0.2,
                    xkey: ['d'],
                    ymin: 'auto',    
                    ymax: 'auto',
                    xLabelFormat: function (x) { return moment(x.src.d, 'YYYY-MM-DD HH:mm').locale(settings['calendarlanguage']).format(graphProperties.dateFormat); },
                    lineColors: settings['lineColors'],
                    barColors: settings['lineColors'],
                    hideHover: 'auto',
                    resize: true,
                    hoverCallback: function (index, options, content, row) {
                        var datePoint = moment(row.d, 'YYYY-MM-DD HH:mm').locale(settings['calendarlanguage']).format(graphProperties.dateFormat);
                        var text = datePoint + ": ";
                        graphProperties.ykeys.forEach(function (element, index) {
                            text += (index > 0 ? ' / ' : '') + number_format(row[element], 2) + ' ' + graphProperties.labels[index];
                        });
                        return text;
                    },
                    pointFillColors:['none'],
                    pointSize: settings['pointSize'],
                    gridTextColor: '#fff', 
                    lineWidth: 2,
                    stacked: false
                }
                
                var chartProperties = {

                };
                

                $.extend(graphProperties, getGraphProperties(data.result[0], label));

                if (blocksConfig && typeof(blocksConfig['graphTypes']) !== 'undefined') {
                    graphProperties.ykeys = blocksConfig['graphTypes'];
                }

                graphProperties.dateFormat = settings['shorttime'];
                if (range === 'month' || range === 'year') {
                    graphProperties.dateFormat = settings['shortdate'];
                }

                if (range === 'last') {
                    var fourHoursAgo = moment().subtract(4, 'hours').format('YYYY-MM-DD HH:mm');
                    data.result = data.result.filter(function (element) {
                        return element.d > fourHoursAgo;
                    });
                }
                graphProperties.data = data.result.filter(function (element) {
                    return element.hasOwnProperty(graphProperties.ykeys[0]);
                });

                if ($('#graphoutput' + idx).length > 0) {
                    var graphtype='line';

                    if (blocksConfig) {

                        if (typeof(blocksConfig['graph']) !== 'undefined'){
                            graphtype = blocksConfig.graph;
                        }
                        if (graphtype == 'bar') {
                            graphProperties.lineWidth = 1;
                            graphProperties.stacked = true;
                            graphProperties.ymin = 0;
                        }

                        if(blocksConfig.graphProperties)
                            $.extend(graphProperties, blocksConfig.graphProperties)
                    }
                        
                    switch(graphtype) {
                        case 'bar':
                            makeMorrisGraphBar(idx,  graphProperties);
                            break;
                        default:
                            makeMorrisGraph(idx, graphProperties);
                    }
                }*/
                var chartctx = document.getElementById('graphoutput' + myProperties.idx).getContext('2d');

               // Chart.defaults.line.backgroundColor = "#FFFFFF";
//                Chart.defaults.global.defaultColor = rgba(1, 1, 1, 0.5);
                if (myProperties.range === 'last') {
                    var fourHoursAgo = moment().subtract(4, 'hours').format('YYYY-MM-DD HH:mm');
                    data.result = data.result.filter(function (element) {
                        return element.d > fourHoursAgo;
                    });
                }

                var mySet = new Set([]);
                data.result.forEach (element => {
                    Object.keys(element).forEach(el => {
                        if(el!== 'd') mySet.add(el);
                    })
                });
                myProperties.ykeys = [...mySet];
                console.log(myProperties.ykeys);

                $.extend(myProperties, getGraphProperties(data.result[0], graphIdx));
                console.log(myProperties.ykeys);

                graphProperties = {
                    type: 'bar',
                    data: {
                        labels: [],
                        datasets: []
                    },
                    options: {
                        layout: {
                            padding: {
                                top: 20
                            }
                        },
                        legend: {
                            labels: {
                                fontColor: "white",
                                fontSize: 18
                            },
                            position: 'bottom'
                      },
                  
                        scales: {
                            yAxes: [{
                                ticks: {
                                  reverse: false,
                                  fontColor: "white"
                                },
                                gridLines: {
                                  color: 'rgba(255,255,255,0.2)', //give the needful color
                                },
                                scaleLabel: {
                                    labelString: myProperties.ylabels[0],
                                    display: true,
                                    fontColor: 'white'                                    
                                }
                              }],
                        
                            xAxes: [{
                                ticks: {
                                    fontColor: "white"
                                  },
                                  gridLines: {
                                    color: 'rgba(255,255,255,0.2)', //give the needful color
                                    display: true,
                                  },
                                type: 'time',
                                distribution: 'linear'
                            }]

                        },

                    },

                }


                var mydatasets = [];
                //first collect all unique keys

                //ykeys = ['r1','r2','v', 'v2'];
                //ykeys = [ 'v', 'eu'];
                //ykeys = ['v'];
                myProperties.ykeys.forEach((element, index) => {
                    mydatasets[element]= {
                        label: element + ' ' + myProperties.labels[index],
                        data: [],
                        borderColor: datasetColors [index],
                        borderWidth: 1,
                        backgroundColor: "rgba(0,0,0,0)",
                        pointRadius: 1,
                    };
                    if(element!='eu' && element!='eg') {
                        mydatasets[element].type='line'
                    }
                })
                
//                var factor=Math.trunc(data.result.length/100)+1;
//                var filtered = 0;
                data.result.forEach(element => {
                    var valid = false;
                    myProperties.ykeys.forEach(el => {
                        if (element.hasOwnProperty(el)) {
                            switch(el) {
                                case 'eu':
                                case 'eg':
                                        mydatasets[el].data.push( 
                                
                                            {
                                               x: element.d,
                                               y: element[el]
                                            });
                                        break;
                                default:
                                    mydatasets[el].data.push(element[el]);
                                    valid=true;
                                    break;
                            }
                        }
                    });

                    if(valid) graphProperties.data.labels.push(element.d);
                });
                    /*
                    Object.keys(element).forEach(el => {
                        if (ykeys.indexOf(el)>=0) {
                            valid = true;
                            mydatasets[el].data.push( 
                                
                             /*   {
                                x: element.d,
                                y: element[el]
            }*//*
                            element[el])
                        }
                        else
                            mydatasets[el].data.push(null);
                    });*/
                
                console.log(mydatasets);
                console.log("for each element of mydatasets");
                Object.keys(mydatasets).forEach(element => {
                    console.log(element);
                    graphProperties.data.datasets.push(mydatasets[element]);  
                });
//                graphProperties.data.datasets.push(mydataset);
//                graphProperties.data = mydataset;
//                graphProperties.data.datasets = mydatasets;
                console.log(graphProperties);
                
                var mychart  = new Chart(chartctx, graphProperties);
            }
            
        });
    }
}

function makeMorrisGraph(idx, graphProperties) {
    Morris.Line(graphProperties);
}

function makeMorrisGraphBar(idx, graphProperties) {
    Morris.Bar(graphProperties);
}

function createButtons(graphIdx) {
    var myProperties = dtGraphs[graphIdx];
    var buttons = '<div class="btn-group" role="group" aria-label="Basic example">';
    buttons += '<button type="button" class="btn btn-default ';
    if (myProperties.range === 'last') buttons += 'active';
    buttons += '" onclick="showGraphHours(' + graphIdx +  ');">' + language.graph.last_hours + '</button> ';

    buttons += '<button type="button" class="btn btn-default ';
    if (myProperties.range === 'day') buttons += 'active';
    buttons += '" onclick="showGraphDay(' + graphIdx +  ');">' + language.graph.today + '</button> ';

    buttons += '<button type="button" class="btn btn-default ';
    if (myProperties.range === 'month') buttons += 'active';
    buttons += '" onclick="showGraphMonth(' + graphIdx +  ');">' +language.graph.last_month + '</button>';
    buttons += '</div>';

    return buttons;
}

function showGraphHours(graphIdx) {
    dtGraphs[graphIdx].range='last';
    dtGraphs[graphIdx].forced = true;
    showGraph(graphIdx);
}

function showGraphDay(graphIdx) {
    dtGraphs[graphIdx].range='day';
    dtGraphs[graphIdx].forced = true;
    showGraph(graphIdx);
}

function showGraphMonth(graphIdx) {
    dtGraphs[graphIdx].range='month';
    dtGraphs[graphIdx].forced = true;
    showGraph(graphIdx);
}


function getGraphProperties(result, graphIdx) {
    var myProperties = dtGraphs[graphIdx];
    var label=myProperties.labels;
    var deviceType = myProperties.Type;
    var deviceSubtype = myProperties.SubType;
    var range = myProperties.range;
    var realrange = myProperties.realrange;
    var defGP = {
        default: {
            ykeys: [Object.keys(result)[1]],
            labels: [Object.keys(result)[1]],
            ylabels: [''],
            yaxis: [0]
        },

    }
    var graphProperties = {};
    if (result.hasOwnProperty('uvi')) {
        graphProperties = {
            ykeys: ['uvi'],
            labels: [label],
        };
    } else if (result.hasOwnProperty('lux')) {
        graphProperties = {
            ykeys: ['lux'],
            labels: ['Lux'],
        };
    } else if (result.hasOwnProperty('lux_avg')) {
        graphProperties = {
            ykeys: ['lux_avg', 'lux_min', 'lux_max'],
            labels: ['Lux average', 'Minimum', 'Maximum'],
        };
    } else if (result.hasOwnProperty('gu') && result.hasOwnProperty('sp')) {
        graphProperties = {
            ykeys: ['gu', 'sp'],
            labels: ['m/s', 'm/s'],
        };
    } else if (result.hasOwnProperty('ba') && result.hasOwnProperty('hu') && result.hasOwnProperty('te')) {
        graphProperties = {
            ykeys: ['ba', 'hu', 'te'],
            labels: ['hPa', '%', _TEMP_SYMBOL],
        };
    } else if (result.hasOwnProperty('hu') && result.hasOwnProperty('te')) {
        graphProperties = {
            ykeys: ['hu', 'te'],
            labels: ['%', _TEMP_SYMBOL],
        };
    } else if (result.hasOwnProperty('te')) {
        graphProperties = {
            ykeys: ['te'],
            labels: [_TEMP_SYMBOL],
        };
    } else if (result.hasOwnProperty('hu')) {
        graphProperties = {
            ykeys: ['hu'],
            labels: ['%'],
        };
    } else if (result.hasOwnProperty('mm')) {
        graphProperties = {
            ykeys: ['mm'],
            labels: ['mm'],
        };
    } else if (result.hasOwnProperty('v_max')) {
        graphProperties = {
            ykeys: ['v_max'],
            labels: [label],
        };
    } else if (result.hasOwnProperty('v2')) {
        label='kWh';
        if(realrange=='day') label='W';
        graphProperties = {
            ykeys: ['v2', 'v'],
            ylabels: [label, label],
            labels: ['usage 2', 'usage 1'],
        };
        if (result.hasOwnProperty('r2')) {
            graphProperties.ykeys.push('r2');
            graphProperties.ylabels.push(label);
            graphProperties.labels.push('delivery 2');
        }
        if (result.hasOwnProperty('r1')) {
            graphProperties.ykeys.push('r1');
            graphProperties.ylabels.push(label);
            graphProperties.labels.push('delivery 1');
        }
    } else if (result.hasOwnProperty('v')) {
        if (label === 'kWh' && realrange === 'day') {
            graphProperties = {
                ykeys: ['v'],
                ylabels: ['W'],
                labels: ['Power']
            }
        }
        else {
            graphProperties = {
                ykeys: ['v'],
                ylabels: [label],
                labels: ['Energy']
            }
        }
/*
        if (label === 'kWh' && realrange === 'day') {
            label = 'Wh';
        }*/
    } else if (result.hasOwnProperty('eu')) {
        graphProperties = {
            ykeys: ['eu'],
            labels: [label],
        };
    } else if (result.hasOwnProperty('u')) {
        graphProperties = {
            ykeys: ['u'],
            labels: [label],
        };
    } else if (result.hasOwnProperty('u_max')) {
        graphProperties = {
            ykeys: ['u_max', 'u_min'],
            labels: ['?', '?'],
        };
    } else if (result.hasOwnProperty('co2')) {
		graphProperties = {
			ykeys: ['co2'],
			labels: ['ppm'],
		};		
    }
    return graphProperties;
}

