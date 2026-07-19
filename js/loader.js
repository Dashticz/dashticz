/*global loadFiles */

var _DASHTICZ_VERSION = 152;
var head = document.getElementsByTagName('head')[0],
    script = document.createElement('script');

script.src = 'dist/bundle.js?t=' + _DASHTICZ_VERSION;
script.onload = loader;
script.onerror = function () {
    showLoaderError('Unable to load dist/bundle.js.');
};
head.appendChild(script);

function showLoaderError(message) {
    var loaderHolder = document.getElementById('loaderHolder');
    var error = document.getElementById('error');
    var hide = document.getElementById('hide');
    if (loaderHolder) loaderHolder.style.display = 'none';
    if (error) error.textContent = message;
    if (hide) hide.style.display = 'block';
}

function loadScript(script) {
    return $.ajax({
        url: script + "?v=" + _DASHTICZ_VERSION,
        dataType: 'script',
        cache: true
    })
}

function loadScriptsSequentially(scripts) {
    return scripts.reduce(function (chain, script) {
        return chain.then(function () { return loadScript(script) })
    }, $.Deferred().resolve())
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
            loadFiles();
        })
        .fail(function () {
            showLoaderError('Unable to load js/main.js.');
        })
}

//# sourceURL=js/loader.js
