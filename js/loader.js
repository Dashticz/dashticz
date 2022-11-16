/*global loadFiles dashtype */

var _DASHTICZ_VERSION=53;
var head = document.getElementsByTagName('head')[0],
 script = document.createElement('script');
 
script.src = 'dist/bundle.js?t='+_DASHTICZ_VERSION;
script.onload=loader;
head.appendChild(script);

function loader() {
    $.ajax({
        url: "js/main.js?v=" + _DASHTICZ_VERSION,
        dataType: 'script',
        cache: true
        })
        .then(function() {
            loadFiles(dashtype);
        })
}

//# sourceURL=js/loader.js
