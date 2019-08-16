var config = {}
config['domoticz_ip'] = 'http://192.168.178.18:8080';
config['user_name'] = '';
config['pass_word'] = '';
config['app_title'] = 'Dashticz';
config['room_plan'] = '3';
config['domoticz_refresh'] = '5';
config['dashticz_refresh'] = '600';


var blocks = {}


blocks['graph_43'] = {
    title: 'My Power',
    type: 'bar', //was: graph
    graphTypes : ['v','v2'],
    custom : {
        "last day": {
            range: 'day',
            filter: '24 hours',
            data: {
                usage: 'd.v+d.v2',
                generation: 'd.r1+d.r2',
                nett: 'd.v+d.v2-d.r1-d.r2'
            },
//            graph: 'line',  //renamed to type
            type: 'line',  
            graphProperties : {
                pointSize : 0,
                goals: [0],
                goalLineColors : ['red'],
                goalStrokeWidth: 2
            },
            
        },
        "last 2 weeks": {
            range: 'month',
            filter: '14 days',
            data: {
                usage: 'd.v+d.v2',
                generation: 'd.r1+d.r2',
                nett: 'd.v+d.v2-d.r1-d.r2'
            },
            type: 'bar',
            graphProperties : {
                pointSize : 0,
                goals: [0],
                goalLineColors : ['red'],
                goalStrokeWidth: 2,
                gridIntegers: true,
                numLines: 8
            }
        }

    },
    graphProperties : {
        labels: ['usage (W)', 'nett (W)'],
        stacked: false,
        gridTextColor : '#c3f6fe',
        barColors: ['#f1c40f', '#40e0d0', '#eee'],
        lineColors: ['#f1c40f', '#40e0d0', '#eee'],
       // ymax:10,
    
    }
}

var columns = {}

columns[1] = {}
columns[1]['blocks'] = [
    'graph_43'
]
columns[1]['width'] = 6;

columns[2] = {}
columns[2]['blocks'] = [
    'graph_6',
    '6_1',

]
columns[2]['width'] = 6;

columns[3] = {}
columns[3]['blocks'] = [

]
columns[3]['width'] = 6;

columns[4] = {}
columns[4]['blocks'] = [
]
columns[4]['width'] = 6;

//if you want to use multiple screens, use the code below:
var screens = {}
screens[1] = {}
screens[1]['background'] = 'bg2.jpg';
screens[1]['columns'] = [1,2]

screens[2] = {}
screens[2]['background'] = 'bg2.jpg';
screens[2]['columns'] = [3,4]

screens[3] = {
    background: 'bg2.jpg',
    columns: []
}
