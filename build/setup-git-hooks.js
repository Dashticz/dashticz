const { execFileSync } = require('node:child_process');

if (!process.env.CI) {
  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
      stdio: 'ignore',
    });
    execFileSync('git', ['config', 'core.hooksPath', '.githooks'], {
      stdio: 'ignore',
    });
    console.log('Git hooks enabled from .githooks');
  } catch (error) {
    if (process.env.DEBUG_GIT_HOOK_SETUP) {
      console.warn('Unable to configure Git hooks:', error.message);
    }
  }
}
