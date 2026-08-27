/*global loadFiles */

var _DASHTICZ_VERSION = 183;
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

// Plain source files (js/main.js, js/functions.js, js/polyfills.js) change far
// more often than dist/bundle.js, which is only rebuilt (and _DASHTICZ_VERSION
// bumped) on a real release - busting on that same static number left a
// tablet that had already loaded the dashboard today stuck on a stale cached
// copy of these files after any same-day fix, with no visible sign anything
// was wrong. Bust on a per-page-load timestamp instead, same as the theme
// CSS already does.
var _LOADER_CACHE_BUST = new Date().getTime();

function loadScript(script) {
  return $.ajax({
    url: script + '?v=' + _LOADER_CACHE_BUST,
    dataType: 'script',
    cache: true,
  });
}

function loadScriptsSequentially(scripts) {
  return scripts.reduce(function (chain, script) {
    return chain.then(function () {
      return loadScript(script);
    });
  }, $.Deferred().resolve());
}

function loadScriptsParallel(scripts) {
  return $.when.apply(
    $,
    scripts.map(function (script) {
      return loadScript(script);
    })
  );
}

function loadScripts(scripts, sequentially) {
  if (typeof scripts === 'string') return loadScript(scripts);
  return sequentially
    ? loadScriptsSequentially(scripts)
    : loadScriptsParallel(scripts);
}

function loader() {
  loadScript('js/main.js')
    .then(function () {
      // Device Rules is kept as a separate, small module. Loading it before
      // prepareStart() lets it observe Device Config as soon as the editor is
      // used, while its runtime hook waits until blocks.js becomes available.
      // Keep this extension non-fatal: if the extra file is accidentally
      // missing, the normal Dashticz dashboard must still be able to start.
      return loadScript('js/devicerules.js').fail(function (err) {
        console.warn(
          'Unable to load js/devicerules.js. Device Rules disabled.',
          err
        );
        return $.Deferred().resolve();
      });
    })
    .then(function () {
      loadFiles();
    })
    .fail(function () {
      showLoaderError('Unable to load js/main.js.');
    });
}

//# sourceURL=js/loader.js
