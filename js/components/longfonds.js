/* global Dashticz _CORS_PATH settings*/

var DT_longfonds = {
    name: "longfonds",
    defaultCfg: {
        icon: 'fas fa-cloud',
        title: 'Luchtkwaliteit',
        zipcode: settings['longfonds_zipcode'],
        housenumber: settings['longfonds_housenumber'],
        refresh: 4 * 3600
    },
    refresh: function (me) {
        if (!me.block.zipcode || !me.block.housenumber) {
            console.log('Longfonds: Set zipcode and housenumber as config setting in CONFIG.js first');
            return;
        }
        $.getJSON(_CORS_PATH + 'https://www.longfonds.nl/gezondelucht/api/zipcode-check?zipcode=' + me.block.zipcode + '&houseNumber=' + me.block.housenumber)
            .fail(function () {
                console.log("Error reading longfonds")
            })
            .done(function (data) {
                $(me.mountPoint + ' .dt_state').html(data.value);
            });
    }
}

Dashticz.register(DT_longfonds);