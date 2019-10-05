/* global Dashticz _CORS_PATH settings*/

var DT_longfonds = {
    name: "longfonds",
    default: {
        icon: 'fas fa-cloud',
        title: 'Luchtkwaliteit',
    },
    run(me) {
        $.getJSON(_CORS_PATH + 'https://www.longfonds.nl/gezondelucht/api/zipcode-check?zipcode=' + settings['longfonds_zipcode'] + '&houseNumber=' + settings['longfonds_housenumber'])
        .fail( () => {
            console.log("Error reading longfonds")
        })
        .done(data =>  {
            $(me.mountPoint + ' .dt_state').html(data.value);
        });

    }
}

Dashticz.register(DT_longfonds);