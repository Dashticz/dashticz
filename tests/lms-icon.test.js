const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

test('LMS Icon display option uses a visible normal block icon column', () => {
  const lmsCss = fs.readFileSync(
    path.join(root, 'js/components/lms.css'),
    'utf8'
  );
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js/deviceeditor.js'),
    'utf8'
  );
  const lmsConfig = fs.readFileSync(path.join(root, 'js/lmsconfig.js'), 'utf8');

  assert.match(
    lmsCss,
    /\.lms-block\s*>\s*\.col-icon\s*\{[\s\S]*?display:\s*flex\s*!important;[\s\S]*?z-index:\s*20;/,
    'LMS must keep the regular Dashticz icon column visible above artwork'
  );
  assert.match(
    lmsCss,
    /\.lms-block\s*>\s*\.col-icon\s*>\s*em\.icon\s*\{[\s\S]*?visibility:\s*visible\s*!important;[\s\S]*?opacity:\s*1\s*!important;/,
    'Font Awesome LMS icons must remain visible when album artwork is present'
  );
  assert.match(
    lmsCss,
    /\.lms-block\s+\.lms-cover-icon\s*\{[\s\S]*?display:\s*none\s*!important;/,
    'the configured block icon must not be duplicated as an artwork badge'
  );
  assert.match(
    deviceEditor,
    /_quickOptionsHtml\('lm',\s*\{[\s\S]*?icon:\s*false,[\s\S]*?iconValue:\s*'fas fa-music'/,
    'new LMS blocks should keep Icon off by default and offer fa-music when enabled'
  );
  assert.match(
    lmsConfig,
    /iconRow\.setAttribute\('data-generated-icon', 'false'\)/,
    'an active LMS Font Awesome value must be marked explicit so Device Editor saves it'
  );
  assert.match(
    lmsConfig,
    /syncConfiguredIcon\(block, definition\)/,
    'the stored LMS icon must be synchronized into the normal block icon column'
  );
});
