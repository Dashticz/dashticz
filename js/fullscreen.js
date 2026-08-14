/* global language settings */
// eslint-disable-next-line no-unused-vars
function getFullScreenIcon() {
  var usePng =
    typeof settings !== 'undefined' &&
    Number(settings['topbar_use_png_icons']) === 1;
  var iconInner = usePng
    ? '<img src="img/icons/Expand.png" id="fullScreenToggleIcon" class="dt-topbar-icon-img" aria-hidden="true" alt="">'
    : '<em class="fas fa-expand" id="fullScreenToggleIcon" />';
  var content =
    '<span data-id="fullscreen" class="fullscreen fullscreenicon text-right" ' +
    'role="button" aria-label="' +
    language.settings.widgeteditor.toggle_fullscreen +
    '" title="' +
    language.settings.widgeteditor.fullscreen +
    '">' +
    iconInner +
    '</span>';

  $(document).on('click', '#fullScreenToggleIcon', function () {
    toggleFullScreen(document.documentElement);
  });
  return content;
}

function isFullScreen() {
  return (
    (document.fullScreenElement && document.fullScreenElement !== null) ||
    document.mozFullScreen ||
    document.webkitIsFullScreen
  );
}

function requestFullScreen(element) {
  var fullScreenFunction =
    element.requestFullscreen ||
    element.webkitRequestFullScreen ||
    element.mozRequestFullScreen ||
    element.msRequestFullscreen;

  fullScreenFunction.call(element);
}

function exitFullScreen() {
  var exitFullScreenFunction =
    document.exitFullscreen ||
    document.msExitFullscreen ||
    document.mozCancelFullScreen ||
    document.webkitExitFullscreen;

  exitFullScreenFunction.call(document);
}

function toggleFullScreen(element) {
  var usePng =
    typeof settings !== 'undefined' &&
    Number(settings['topbar_use_png_icons']) === 1;
  if (isFullScreen()) {
    exitFullScreen();
    if (usePng) {
      $('#fullScreenToggleIcon').attr('src', 'img/icons/Expand.png');
    } else {
      $('#fullScreenToggleIcon').addClass('fa-expand').removeClass('fa-compress');
    }
  } else {
    requestFullScreen(element || document.documentElement);
    if (usePng) {
      $('#fullScreenToggleIcon').attr('src', 'img/icons/Minus.png');
    } else {
      $('#fullScreenToggleIcon').removeClass('fa-expand').addClass('fa-compress');
    }
  }
}
