/* global Dashticz _CORS_PATH settings*/

var DT_longfonds = {
    name: "longfonds",
    init: (block) => {
        function runLongfonds(me) {
            $.getJSON(_CORS_PATH + 'https://www.longfonds.nl/gezondelucht/api/zipcode-check?zipcode=' + settings['longfonds_zipcode'] + '&houseNumber=' + settings['longfonds_housenumber'], function (data) {
                $(me.mountPoint + ' .dt_state').html(data.value);
            });
        }

        return {
            name: 'longfonds',
            icon: 'fas fa-cloud',
            getTitle: () => block.title || 'Luchtkwaliteit',
            run: runLongfonds
        }
    }
}

Dashticz.register(DT_longfonds);