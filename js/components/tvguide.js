/* global Dashticz _CORS_PATH moment settings ksort*/
const allchannels = [];

var DT_tvguide = {
    name: "tvguide",
    canHandle: (block) => block && block.channels,
    default: {
        containerClass: () => ''
    },
    get: () => '',
    run(me) {
        const tvObj = me.block;
        const tvobject = $(me.mountPoint + ' .dt_state');
        loadChannels(me)
            .fail( () => {
                console.log("TVGuide error")
            })
            .then(() => {
                var cache = new Date().getTime();

                const curUrl = _CORS_PATH + 'http://json.tvgids.nl/v4/programs/?day=0&channels=' + tvObj.channels.join(',') + '&time=' + cache;
                moment.locale(settings['calendarlanguage']);
                return $.getJSON(curUrl)
            })
            .then((data) => {
                let tvitems = []
                const maxitems = (tvObj && tvObj.maxitems) || 10;
                for (const channel in data.data) {
                    for (const e in data.data[channel].prog) {
                        const event = data.data[channel].prog[e];
                        var enddateStamp = event.e;
                        if (parseFloat(enddateStamp) > moment().format('X')) {
                            var newevent = {};
                            newevent.starttime = moment(event.s, 'X').format('HH:mm');
                            newevent.endtime = moment(event.e, 'X').format('HH:mm');
                            newevent.channel = allchannels[channel];
                            newevent.title = event.title;
                            if (typeof (tvitems[enddateStamp]) === 'undefined') tvitems[enddateStamp] = [];
                            tvitems[enddateStamp].push(newevent);
                        }
                    }
                }
                tvobject.html('');
                var counter = 1;
                tvitems = ksort(tvitems);
                for (const check in tvitems) {
                    const items = tvitems[check];
                    for (const c in items) {
                        const item = items[c];
                        if (check > moment().format('X') && counter <= maxitems) {
                            //Sometimes there might be no endtime (?). In that case the next line will give an error
                            var widget = '<div>' + item['starttime'] + ' - ' + item['endtime'] + ' - <em>' + item['channel'] + '</em> - <b>' + item['title'] + '</b></div>';
                            tvobject.append(widget);
                            counter++;
                        }
                    }
                }

            });

        setTimeout(function () {
            DT_tvguide.run(me);
        }, (60000 * 5));



        function loadChannels(me) {
            return new Promise((resolve, reject) => {
                if (typeof (allchannels[1]) !== 'undefined') resolve(allchannels);
                const curUrl = _CORS_PATH + 'http://json.tvgids.nl/v4/channels';
                return $.getJSON(curUrl)
                    .done(channels => {
                        for (const num in channels.data) {
                            allchannels[channels.data[num]['ch_id']] = channels.data[num]['ch_name'];
                        }
                        resolve(allchannels);
                    })
                    .fail(function () {
                        console.log("error getting channel info from tvgids. Retrying in 5 seconds.");
                        setTimeout(function () {
                            DT_tvguide.run(me);
                        }, 5000);
                        reject();
                    });
            })
        }
    }

}
Dashticz.register(DT_tvguide);