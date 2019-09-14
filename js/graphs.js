var dtGraphs = [];

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

function getGraphByIDX(idx) {
    getGraphs(alldevices[idx], true);
}

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
            if (blocksConfig.hasOwnProperty("custom")) {
                if (isInitial) {
                    myProperties.range = Object.keys(blocksConfig.custom)[0];
                    customRange = true;
                }
                if (blocksConfig.custom.hasOwnProperty(myProperties.range)) {
                    _graphConfig = blocksConfig.custom[myProperties.range];
                    customRange = true;
                    if (_graphConfig.hasOwnProperty("range")) {
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
                    if (_graphConfig.hasOwnProperty("filter")) {
                        dataFilterCount = parseInt(_graphConfig.filter);
                        dataFilterUnit = _graphConfig.filter.split(" ").splice(-1)[0];
                    }
                    if (_graphConfig.hasOwnProperty("method")) {
                        method = _graphConfig.hasOwnProperty("method");
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

                title = '<div class="graphheader"><div class="graphtitle">' + baseTitle;
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
                graphProperties = getDefaultGraphProperties();
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

                    myLocalProperties.ykeys = Object.keys(_graphConfig.data);

                    myLocalProperties.ykeys.forEach((element, index) => {
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

                        if (_graphConfig.hasOwnProperty('graph')) {
                            mydatasets[element].type = _graphConfig.graph;
                        }

                    })

                    data.result.forEach(y => {
                        var valid = false;
                        myLocalProperties.ykeys.forEach((_value, index) => {
                            var customValue = _graphConfig.data[_value];
                            var d = {};
                            for (key in y) {
                                if (key !== 'd')
                                    d[key] = parseFloat(y[key]);
                            };

                            try {
                                res = eval(customValue).toPrecision(8);
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

                    if (_graphConfig.hasOwnProperty('graph')) {
                        graphProperties.type = _graphConfig.graph;
                    }
                    $.extend(true, graphProperties, _graphConfig); //merge the custom settings.

                } else {
                    if (typeof myLocalProperties.graphTypes == 'undefined') {
                        var mySet = new Set([]);
                        data.result.forEach(element => {
                            Object.keys(element).forEach(el => {
                                if (el !== 'd') mySet.add(el);
                            })
                        });
                        myLocalProperties.ykeys = [...mySet];
                        $.extend(myLocalProperties, getGraphProperties(data.result[0], graphIdx));
                    } else {
                        var newylabels = [];
                        myLocalProperties.graphTypes.forEach(function (element, index) {
                            var idx = myLocalProperties.ykeys.indexOf(element);
                            if (idx >= 0)
                                newylabels.push(myLocalProperties.ylabels[idx]);
                        });
                        myLocalProperties.ykeys = myLocalProperties.graphTypes; //for backwards compatibility
                        myLocalProperties.ylabels = newylabels;
                    }

                    myLocalProperties.ykeys.forEach((element, index) => {
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

                    data.result.forEach(element => {
                        var valid = false;
                        myLocalProperties.ykeys.forEach(el => {
                            if (element.hasOwnProperty(el)) {
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

                Object.keys(mydatasets).forEach(element => {
                    if (typeof myLocalProperties.legend == 'object') {
                        if (typeof myLocalProperties.legend[element] !== 'undefined')
                            mydatasets[element].label = myLocalProperties.legend[element];
                        graphProperties.options.legend.display = true;
                    };
                    graphProperties.data.datasets.push(mydatasets[element]);
                });

                //create the y-axes
                //ylabels contains the labels.
                var uniqueylabels = [...new Set(myLocalProperties.ylabels)];
                var labelLeft = true
                var axisCount = myLocalProperties.options && myLocalProperties.options.scales && myLocalProperties.options.scales.yAxes ? myLocalProperties.options.scales.yAxes.length : 0;
                graphProperties.options.scales.yAxes = []; // reset to empty
                uniqueylabels.forEach((element, i) => {
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
                    graphProperties.options.scales.yAxes.filter(element => { //filter the ylabels that have an initial label  
                        return element.scaleLabel && typeof element.scaleLabel.labelString !== "undefined"
                    }).forEach(yAxis => {
                        yAxis.scaleLabel.labelString = graphProperties.data.datasets.filter(dataset => {
                                return dataset.yAxisID === yAxis.id;
                            })
                            .reduce(function (newlabelString, dataset) {
                                return dataset.label + ' ' + newlabelString;
                            }, '(' + yAxis.scaleLabel.labelString + ')');
                    })
                }

                if (typeof myLocalProperties.legend !== 'undefined') {
                    if (typeof myLocalProperties.legend == 'array') {
                        myLocalProperties.legend.forEach(function (element, idx) {
                            graphProperties.data.datasets[idx].label = element
                        });
                        graphProperties.options.legend.display = true;
                    };
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

                var mychart = new Chart(chartctx, graphProperties);
            }

        });
    }
}

function getDefaultGraphProperties() {
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
                            'hour': 'H:mm',
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

function showGraphHours(graphIdx) {
    dtGraphs[graphIdx].range = 'last';
    dtGraphs[graphIdx].forced = true;
    showGraph(graphIdx);
}

function showGraphDay(graphIdx) {
    dtGraphs[graphIdx].range = 'day';
    dtGraphs[graphIdx].forced = true;
    showGraph(graphIdx);
}

function showGraphMonth(graphIdx) {
    dtGraphs[graphIdx].range = 'month';
    dtGraphs[graphIdx].forced = true;
    showGraph(graphIdx);
}


function getGraphProperties(result, graphIdx) {
    var myProperties = dtGraphs[graphIdx];
    var label = myProperties.txtUnit;
    var realrange = myProperties.realrange;
    var graphProperties = {};
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
    }
    return graphProperties;
}