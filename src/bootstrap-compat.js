import $ from 'jquery';
import * as bootstrap from 'bootstrap';

window.bootstrap = bootstrap;

var buttonGroupId = 0;

var attributeAliases = {
  'data-toggle': 'data-bs-toggle',
  'data-target': 'data-bs-target',
  'data-dismiss': 'data-bs-dismiss',
  'data-parent': 'data-bs-parent',
  'data-ride': 'data-bs-ride',
  'data-interval': 'data-bs-interval',
  'data-slide': 'data-bs-slide',
  'data-slide-to': 'data-bs-slide-to',
  'data-backdrop': 'data-bs-backdrop',
  'data-keyboard': 'data-bs-keyboard',
};

function syncButtonGroup(group) {
  group.querySelectorAll('label.btn').forEach(function (label) {
    var input = label.querySelector('input');
    label.classList.toggle('active', Boolean(input && input.checked));
  });
}

function prepareButtonGroup(group) {
  if (group.hasAttribute('data-bootstrap3-button-group')) return;

  buttonGroupId += 1;
  group.setAttribute('data-bootstrap3-button-group', String(buttonGroupId));

  var labels = Array.from(group.querySelectorAll('label.btn'));
  var inputs = labels
    .map(function (label) { return label.querySelector('input'); })
    .filter(Boolean);
  var activeLabels = labels.filter(function (label) {
    return label.classList.contains('active');
  });
  var declaredChecked = inputs.filter(function (input) {
    return input.hasAttribute('checked');
  });

  inputs.forEach(function (input) {
    if (input.type === 'radio') {
      input.name = (input.name || 'options') + '-bs3-' + buttonGroupId;
    }

    if (activeLabels.length > 0) {
      input.checked = activeLabels.some(function (label) {
        return label.contains(input);
      });
    } else if (declaredChecked.length === 1) {
      input.checked = declaredChecked[0] === input;
    } else {
      input.checked = false;
    }
  });

  syncButtonGroup(group);
}

function translateElement(element) {
  if (!element || element.nodeType !== 1) return;

  Object.keys(attributeAliases).forEach(function (legacyName) {
    var bootstrapName = attributeAliases[legacyName];
    if (element.hasAttribute(legacyName) && !element.hasAttribute(bootstrapName)) {
      element.setAttribute(bootstrapName, element.getAttribute(legacyName));
    }
  });

  var toggle = element.getAttribute('data-bs-toggle');
  if (toggle === 'tab' || toggle === 'pill') {
    element.classList.add('nav-link');
    if (element.parentElement && element.parentElement.tagName === 'LI') {
      element.parentElement.classList.add('nav-item');
      if (element.parentElement.classList.contains('active')) {
        element.classList.add('active');
      }
    }
  }

  if (toggle === 'buttons') prepareButtonGroup(element);

  if (element.classList.contains('item') && element.closest('.carousel-inner')) {
    element.classList.add('carousel-item');
  }
}

var legacySelector = Object.keys(attributeAliases)
  .map(function (name) { return '[' + name + ']'; })
  .join(',') + ', .carousel-inner > .item';

function translateTree(root) {
  if (!root || root.nodeType !== 1) return;
  translateElement(root);
  root.querySelectorAll(legacySelector).forEach(translateElement);
}

function installJQueryPlugin(name, Plugin) {
  var old = $.fn[name];

  $.fn[name] = function (config) {
    var args = Array.prototype.slice.call(arguments, 1);

    this.each(function () {
      var instanceConfig = config && typeof config === 'object'
        ? Object.assign({}, config)
        : {};
      var modalShow = name === 'modal' &&
        (config === undefined || instanceConfig.show === true);

      delete instanceConfig.show;
      var instance = Plugin.getOrCreateInstance(this, instanceConfig);

      if (typeof config === 'string') {
        if (typeof instance[config] !== 'function') {
          throw new TypeError('No method named "' + config + '"');
        }
        instance[config].apply(instance, args);
      } else if (name === 'carousel' && typeof config === 'number') {
        instance.to(config);
      } else if (modalShow) {
        instance.show();
      }
    });

    return this;
  };

  $.fn[name].Constructor = Plugin;
  $.fn[name].noConflict = function () {
    $.fn[name] = old;
    return this;
  };
}

var jqueryPlugins = [
  ['alert', bootstrap.Alert],
  ['button', bootstrap.Button],
  ['carousel', bootstrap.Carousel],
  ['collapse', bootstrap.Collapse],
  ['dropdown', bootstrap.Dropdown],
  ['modal', bootstrap.Modal],
  ['popover', bootstrap.Popover],
  ['scrollspy', bootstrap.ScrollSpy],
  ['tab', bootstrap.Tab],
  ['toast', bootstrap.Toast],
  ['tooltip', bootstrap.Tooltip],
];

function installJQueryPlugins() {
  jqueryPlugins.forEach(function (entry) {
    installJQueryPlugin(entry[0], entry[1]);
  });
}

installJQueryPlugins();

// Bootstrap installs its own optional jQuery bridge on DOMContentLoaded.
// Reinstall this wrapper afterwards to retain Bootstrap 3 option semantics.
document.addEventListener('DOMContentLoaded', function () {
  installJQueryPlugins();
});

if (document.documentElement) translateTree(document.documentElement);

new MutationObserver(function (mutations) {
  mutations.forEach(function (mutation) {
    if (mutation.type === 'attributes') {
      translateElement(mutation.target);
      return;
    }
    mutation.addedNodes.forEach(translateTree);
  });
}).observe(document.documentElement, {
  attributes: true,
  attributeFilter: Object.keys(attributeAliases),
  childList: true,
  subtree: true,
});

document.addEventListener('click', function (event) {
  var trigger = event.target.closest(
    '[data-toggle], [data-target], [data-dismiss], [data-slide], [data-slide-to]'
  );
  if (trigger) translateElement(trigger);
}, true);

document.addEventListener('change', function (event) {
  var group = event.target.closest(
    '.btn-group[data-toggle="buttons"], .btn-group[data-bs-toggle="buttons"], ' +
    '.btn-group-vertical[data-toggle="buttons"], ' +
    '.btn-group-vertical[data-bs-toggle="buttons"]'
  );
  if (group) setTimeout(function () { syncButtonGroup(group); });
});

document.addEventListener('shown.bs.tab', function (event) {
  document.querySelectorAll('.nav-tabs > li.active, .nav-pills > li.active')
    .forEach(function (item) { item.classList.remove('active'); });
  if (event.target.parentElement && event.target.parentElement.tagName === 'LI') {
    event.target.parentElement.classList.add('active');
  }
});

document.addEventListener('show.bs.dropdown', function (event) {
  if (event.target.parentElement) event.target.parentElement.classList.add('open');
});

document.addEventListener('hidden.bs.dropdown', function (event) {
  if (event.target.parentElement) event.target.parentElement.classList.remove('open');
});

export default bootstrap;
