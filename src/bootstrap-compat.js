import * as bootstrap from 'bootstrap';

window.bootstrap = bootstrap;

// Bootstrap 5 registers its jQuery bridge after DOMContentLoaded. Translate the
// one deliberately untouched legacy login trigger before Bootstrap handles it.
document.addEventListener('click', function (event) {
  var trigger = event.target.closest('[data-toggle], [data-dismiss], [data-slide], [data-slide-to]');
  if (!trigger) return;
  var toggle = trigger.getAttribute('data-toggle');
  var target = trigger.getAttribute('data-target');
  if (toggle && !trigger.hasAttribute('data-bs-toggle')) {
    trigger.setAttribute('data-bs-toggle', toggle);
    if (target) trigger.setAttribute('data-bs-target', target);
  }
  if (trigger.hasAttribute('data-dismiss') && !trigger.hasAttribute('data-bs-dismiss')) {
    trigger.setAttribute('data-bs-dismiss', trigger.getAttribute('data-dismiss'));
  }
  if (trigger.hasAttribute('data-slide') && !trigger.hasAttribute('data-bs-slide')) {
    trigger.setAttribute('data-bs-slide', trigger.getAttribute('data-slide'));
  }
  if (trigger.hasAttribute('data-slide-to') && !trigger.hasAttribute('data-bs-slide-to')) {
    trigger.setAttribute('data-bs-slide-to', trigger.getAttribute('data-slide-to'));
    if (target) trigger.setAttribute('data-bs-target', target);
  }
  if (toggle === 'buttons') {
    setTimeout(function () {
      trigger.querySelectorAll('label.btn').forEach(function (label) {
        var input = label.querySelector('input');
        label.classList.toggle('active', Boolean(input && input.checked));
      });
    });
  }
}, true);

export default bootstrap;
