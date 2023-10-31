/*global loadFiles dashtype */

var _DASHTICZ_VERSION = 97;
var head = document.getElementsByTagName('head')[0],
    script = document.createElement('script');

script.src = 'dist/bundle.js?t=' + _DASHTICZ_VERSION;
script.onload = loader;
head.appendChild(script);

function loadScript(script) {
    return $.ajax({
        url: script + "?v=" + _DASHTICZ_VERSION,
        dataType: 'script',
        cache: true
    })
}

function loadScriptsSequentially(scripts) {
    return scripts.reduce(function (chain, script) {
        return chain.then(function () { return loadScript(script) }),
            $.Deferred()
    })
}

function loadScriptsParallel(scripts) {
    return $.when.apply(
        $, scripts.map(function (script) {
            return loadScript(script)
        }))
}

function loadScripts(scripts, sequentially) {
    if (typeof scripts === 'string') return loadScript(scripts);
    return sequentially ? loadScriptsSequentially(scripts) : loadScriptsParallel(scripts)
}


function loader() {
    loadScript('js/main.js')
        .then(function () {
            loadFiles(dashtype);
        })
}

//# sourceURL=js/loader.js
