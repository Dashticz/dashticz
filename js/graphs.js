/* global moment settings config Beaufort number_format alldevices language time blocks usrEnc pwdEnc Chart _TEMP_SYMBOL*/
var dtGraphs = [];
var _GRAPHREFRESH = 5;

function getGraphs(device, popup) {
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
        case 'Barometer':
            sensor='temp';
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

function showGraph(graphIdx, selGraph) {
    var myProperties = dtGraphs[graphIdx];
    myProperties.datasetColors = ['red', 'yellow', 'blue', 'orange', 'green', 'purple'];
    if (typeof selGraph !== 'undefined') {
        myProperties.range = selGraph;
        myProperties.forced = true;
    }

    if (myProperties.lastRefreshTime < (time() - (parseFloat(_GRAPHREFRESH) * 60))) {
        myProperties.forced = true;
    }

    if ($('.graphcurrent' + myProperties.graphIdx).length > 0) {
        $('.graphcurrent' + myProperties.graphIdx).html(myProperties.currentValue + ' ' + myProperties.txtUnit);
    }

    var isInitial = (myProperties.range === 'initial');

    if (myProperties.forced || myProperties.popup) {
        myProperties.forced = false;
        myProperties.lastRefreshTime = time();
        //Check settings for standard graph
        if (isInitial) {
            switch (settings['standard_graph']) {
                case 'hours':
                    myProperties.range = 'last';
                    break;
                case 'day':
                    myProperties.range = 'day';
                    break;
                case 'month':
                    myProperties.range = 'month';
                    break;
            }
        }
        myProperties.realrange = myProperties.range;
        var dataFilterCount = 0;
        var dataFilterUnit = '';
        if (myProperties.range === 'last') {
            myProperties.realrange = 'day';
            dataFilterCount = 4;
            dataFilterUnit = 'hours';
        }

        var blocksConfig = typeof (blocks['graph_' + myProperties.idx]) !== 'undefined' ? blocks['graph_' + myProperties.idx] : null;

        var method = 1;
        var _graphConfig = null;
        if (blocksConfig) {
            if (typeof (blocksConfig.method) !== 'undefined') method = blocksConfig.method;
            var customRange = false;
            if (blocksConfig.custom) {
                if (isInitial) {
                    myProperties.range = Object.keys(blocksConfig.custom)[0];
                    customRange = true;
                }
                if (blocksConfig.custom[myProperties.range]) {
                    _graphConfig = blocksConfig.custom[myProperties.range];
                    customRange = true;
                    if (_graphConfig.range) {
                        switch (_graphConfig.range) {
                            case 'day':
                            case 'month':
                            case 'year':
                                myProperties.realrange = _graphConfig.range;
                                break;
                            case 'last':
                                dataFilterCount = 4;
                                dataFilterUnit = 'hours';
                                myProperties.realrange = 'day';
                                break;
                            default:
                                console.log('invalid range: ' + _graphConfig.range)

                        }
                    }
                    if (_graphConfig.filter) {
                        dataFilterCount = parseInt(_graphConfig.filter);
                        dataFilterUnit = _graphConfig.filter.split(" ").splice(-1)[0];
                    }
                    if (_graphConfig.method) {
                        method = _graphConfig.method;
                    }
                }
                if (!customRange) {
                    console.log('custom graph, but graph selector ' + myProperties.range + ' not found')
                }

            }
        }
        $.ajax({
            url: settings['domoticz_ip'] + '/json.htm?username=' + usrEnc + '&password=' + pwdEnc + '&type=graph&sensor=' + myProperties.sensor + '&idx=' + myProperties.idx + '&range=' + myProperties.realrange + '&method=' + method + '&time=' + new Date().getTime() + '&jsoncallback=?',
            type: 'GET',
            async: true,
            contentType: "application/json",
            dataType: 'jsonp',
            success: function (data) {
                if (data.status === 'ERR') {
                    alert('Could not load graph!');
                    return;
                }

                var ranges = ["last", "day", "month"];
                if (customRange)
                    ranges = Object.keys(blocksConfig.custom);
                var buttons = createButtons(myProperties.graphIdx, myProperties.range, ranges, customRange);

                var baseTitle = myProperties.title;

                if (blocksConfig && typeof (blocksConfig['title']) !== 'undefined') {
                    baseTitle = blocksConfig['title'];
                }

                var title = '<div class="graphheader"><div class="graphtitle">' + baseTitle;
                if (typeof (myProperties.currentValue) !== 'undefined' && myProperties.currentValue !== 'undefined') title += ': <B class="graphcurrent' + myProperties.idx + '">' + myProperties.currentValue + ' ' + myProperties.txtUnit + '</B>';
                title += '</div>';

                var width = 12;
                if (blocksConfig && typeof (blocksConfig['width']) !== 'undefined' && !myProperties.popup) {
                    width = blocksConfig['width'];
                }
                var html = '';
                html += title + '<div class="graphbuttons" >' + buttons + '</div>';
                html += '</div>'

                html += '<div class="graph swiper-no-swiping' + (myProperties.popup ? ' popup graphheight' : '') + '" id="graph' + myProperties.idx + '">';
                html += '<canvas ' + 'id="graphoutput' + myProperties.graphIdx + '"></canvas>';
                html += '</div>';
                var mydiv = $('.block_graph' + '_' + myProperties.graphIdx);
                if (!myProperties.popup) {
                    mydiv.addClass('col-xs-' + width);
                    mydiv.addClass('block_graph');
                }
                mydiv.html(html);

                var chartctx = document.getElementById('graphoutput' + myProperties.graphIdx).getContext('2d');
                var myLocalProperties = {};
                
                $.extend(true, myLocalProperties, myProperties);    // create a deep copy for temporary use
                var graphProperties = getDefaultGraphProperties(myProperties);
                $.extend(true, graphProperties, blocksConfig);

                $.extend(myLocalProperties, getGraphProperties(data.result[0], graphIdx));

                $.extend(true, myLocalProperties, blocksConfig);

                if (_graphConfig) {
                    $.extend(true, myLocalProperties, _graphConfig);
                }

                if (!myLocalProperties.popup) {
                    var graphwidth = $('.block_graph' + '_' + myLocalProperties.graphIdx + ' .graph').width();
                    var setHeight = Math.min(Math.round(graphwidth / window.innerWidth * window.innerHeight), window.innerHeight - 50);
                    if (myLocalProperties.height)
                        setHeight = myLocalProperties.height;
                    $('.block_graph' + '_' + myLocalProperties.graphIdx).css("height", setHeight);
                }

                if (typeof myLocalProperties.legend == 'boolean') {
                    graphProperties.options.legend.display = myLocalProperties.legend;
                }

                var mydatasets = [];

                if (dataFilterCount > 0) {
                    var startMoment = moment().subtract(dataFilterCount, dataFilterUnit).format('YYYY-MM-DD HH:mm');
                    data.result = data.result.filter(function (element) {
                        return element.d > startMoment;
                    });
                }
                if (_graphConfig) {
                    //custom data sets
                    if(_graphConfig.ylabels)
                        myLocalProperties.ylabels = _graphConfig.ylabels;   //in case ylabels are defined in the custom graph, we take those, instead of the default generated ylabels
                    myLocalProperties.ykeys = Object.keys(_graphConfig.data);

                    myLocalProperties.ykeys.forEach(function (element, index) {
                        mydatasets[element] = {
                            data: [],
                            borderColor: myLocalProperties.datasetColors[index],
                            borderWidth: 2,
                            backgroundColor: myLocalProperties.datasetColors[index],
                            fill: false,
                            pointRadius: 1,
                            label: element,
                            yAxisID: index<myLocalProperties.ylabels? myLocalProperties.ylabels[index] : myLocalProperties.ylabels[0]

                        };

                        if (_graphConfig.graph) {
                            mydatasets[element].type = _graphConfig.graph;
                        }

                    })

                    data.result.forEach( function(y) {
                        var valid = false;
                        myLocalProperties.ykeys.forEach(function(_value){
                            var customValue = _graphConfig.data[_value];
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

                    if (_graphConfig.graph) {
                        graphProperties.type = _graphConfig.graph;
                    }
                    $.extend(true, graphProperties, _graphConfig); //merge the custom settings.

                } else {
                    if (typeof myLocalProperties.graphTypes == 'undefined') {
                        var mySet = []
                        data.result.forEach(function(element) {
                            Object.keys(element).forEach(function(el){
                                if (el !== 'd') mySet.push(el);
                            })
                        });
                        myLocalProperties.ykeys = mySet.filter(onlyUnique);
                        $.extend(myLocalProperties, getGraphProperties(data.result[0], graphIdx));
                    } else {
                        var newylabels = [];
                        myLocalProperties.graphTypes.forEach(function (element) {
                            var idx = myLocalProperties.ykeys.indexOf(element);
                            if (idx >= 0)
                                newylabels.push(myLocalProperties.ylabels[idx]);
                        });
                        myLocalProperties.ykeys = myLocalProperties.graphTypes; //for backwards compatibility
                        myLocalProperties.ylabels = newylabels;
                    }

                    myLocalProperties.ykeys.forEach(function(element, index){
                        mydatasets[element] = {
                            data: [],
                            borderColor: myLocalProperties.datasetColors[index],
                            borderWidth: 2,
                            backgroundColor: myLocalProperties.datasetColors[index],
                            fill: false,
                            pointRadius: 1,
                            label: element,
                            yAxisID: myLocalProperties.ylabels[index]
                        };
                    });

                    data.result.forEach(function(element){
                        var valid = false;
                        myLocalProperties.ykeys.forEach(function(el){
                            if (element[el]) {
                                switch (el) {
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
                                        valid = true;
                                        break;
                                }
                            }
                        });

                        if (valid) graphProperties.data.labels.push(element.d);
                    });

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

                /* Check for displayFormats setting */
                if (typeof myLocalProperties.displayFormats !== 'undefined') {
                    $.extend(graphProperties.options.scales.xAxes[0].time.displayFormats, myLocalProperties.displayFormats)
                }

                //console.log(graphProperties);

                new Chart(chartctx, graphProperties);
            }

        });
    }
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
                    fontSize: 18
                },
                position: 'bottom',
                display: false
            },

            scales: {
                yAxes: [],

                xAxes: [{
                    ticks: {
                        fontColor: "white"
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
                    distribution: 'linear'
                }]

            },

        },

    }
}


function createButtons(graphIdx, selrange, ranges, customRange) {
    var buttons = '<div class="btn-group" role="group" aria-label="Basic example">';

    var btnTextList = {
        'last': language.graph.last_hours,
        'day': language.graph.today,
        'month': language.graph.last_month
    }

    ranges.forEach(function (item) {
        var btnText = customRange ? item : btnTextList[item];
        buttons += '<button type="button" class="btn btn-default ';
        if (selrange === item) buttons += 'active';
        buttons += '" onclick="showGraph(\'' + graphIdx + '\',\'' + item + '\');">' + btnText + '</button> ';
    });
    buttons += '</div>';

    return buttons;
}



function getGraphProperties(result, graphIdx) {
    var myProperties = dtGraphs[graphIdx];
    var label = myProperties.txtUnit;
    var realrange = myProperties.realrange;
    var graphProperties = {};
    if (typeof result == 'undefined')
        return graphProperties;
    if (result.uvi) {
        graphProperties = {
            ykeys: ['uvi'],
            ylabels: [label],
        };
    } else if (result.lux) {
        graphProperties = {
            ykeys: ['lux'],
            ylabels: ['Lux'],
        };
    } else if (result.lux_avg) {
        graphProperties = {
            ykeys: ['lux_avg', 'lux_min', 'lux_max'],
            ylabels: ['Lux average', 'Minimum', 'Maximum'],
        };
    } else if (result.gu && result.sp) {
        graphProperties = {
            ykeys: ['gu', 'sp'],
            ylabels: ['m/s', 'm/s'],
        };
    } else if (result.ba && result.hu && result.te) {
        graphProperties = {
            ykeys: ['ba', 'hu', 'te'],
            ylabels: ['hPa', '%', _TEMP_SYMBOL],
        };
    } else if (result.hu && result.te) {
        graphProperties = {
            ykeys: ['hu', 'te'],
            ylabels: ['%', _TEMP_SYMBOL],
        };
    } else if (result.te) {
        graphProperties = {
            ykeys: ['te'],
            ylabels: [_TEMP_SYMBOL],
        };
    } else if (result.hu) {
        graphProperties = {
            ykeys: ['hu'],
            ylabels: ['%'],
        };
    } else if (result.mm) {
        graphProperties = {
            ykeys: ['mm'],
            ylabels: ['mm'],
        };
    } else if (result.v_max) {
        graphProperties = {
            ykeys: ['v_max'],
            ylabels: [label],
        };
        if (result.v_min) {
            graphProperties.ykeys.push('v_min')
            graphProperties.ylabels.push[label]
        }
        if (result.v_avg) {
            graphProperties.ykeys.push('v_avg')
            graphProperties.ylabels.push[label]
        }
    } else if (result.v2) {
        label = 'kWh';
        if (realrange == 'day') label = 'W';
        graphProperties = {
            ykeys: ['v2', 'v'],
            ylabels: [label, label],
        };
        if (result.r2) {
            graphProperties.ykeys.push('r2');
            graphProperties.ylabels.push(label);
        }
        if (result.r1) {
            graphProperties.ykeys.push('r1');
            graphProperties.ylabels.push(label);
        }
    } else if (result.v) {
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
    } else if (result.eu) {
        graphProperties = {
            ykeys: ['eu'],
            ylabels: [label],
        };
    } else if (result.u) {
        graphProperties = {
            ykeys: ['u'],
            ylabels: [label],
        };
    } else if (result.u_max) {
        graphProperties = {
            ykeys: ['u_max', 'u_min'],
            ylabels: ['?', '?'],
        };
    } else if (result.co2) {
        graphProperties = {
            ykeys: ['co2'],
            ylabels: ['ppm'],
        };
    } else if (result.ba) {
        graphProperties = {
            ykeys: ['ba'],
            ylabels: [label],
        };
    }
    return graphProperties;
}

function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
}