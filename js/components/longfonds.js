/* global Dashticz _CORS_PATH settings*/

var DT_longfonds = {
    name: "longfonds",
    default: {
        icon: 'fas fa-cloud',
        title: 'Luchtkwaliteit',
    },
    run: function (me) {
        if (!settings['longfonds_zipcode'] || !settings['longfonds_housenumber']) {
            console.log('Longfonds: Set zipcode and housenumber as config setting in CONFIG.js first');
            return;
        }
        $.getJSON(_CORS_PATH + 'https://www.longfonds.nl/gezondelucht/api/zipcode-check?zipcode=' + settings['longfonds_zipcode'] + '&houseNumber=' + settings['longfonds_housenumber'])
            .fail(function () {
                console.log("Error reading longfonds")
            })
            .done(function (data) {
                $(me.mountPoint + ' .dt_state').html(data.value);
            });

    }
}

Dashticz.register(DT_longfonds);