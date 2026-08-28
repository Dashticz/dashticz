// Test-only Device Rules fixtures for tests/domoticzblock.spec.js's
// "automation indicator" coverage. Mirrors the shape saveddevicerules.php
// writes into custom/custom.js on a real install.
window.DashticzDeviceRulesConfig = window.DashticzDeviceRulesConfig || {};
window.DashticzDeviceRulesConfig['automation_with_rule'] = {
  schemaVersion: 2,
  rules: [
    {
      id: 'r1',
      enabled: true,
      trigger: { property: 'Status', operator: 'eq', value: 'On' },
      actions: {
        css: { enabled: false },
        text: { enabled: false },
      },
    },
  ],
  customJsHandler: '',
};
window.DashticzDeviceRulesConfig['automation_opted_out'] = {
  schemaVersion: 2,
  rules: [
    {
      id: 'r1',
      enabled: true,
      trigger: { property: 'Status', operator: 'eq', value: 'On' },
      actions: {
        css: { enabled: false },
        text: { enabled: false },
      },
    },
  ],
  customJsHandler: '',
};
