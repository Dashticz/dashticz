# AGENTS.md

Instructions for AI coding agents working in this repository.

## Remotes

- `origin` — the maintainer's own fork.
- `upstream` — the official org repo, which the maintainer has push access to. `beta` tracks `upstream/beta`.

## Testing external fork branches before merging into `beta`

Contributors' forks get evaluated via a throwaway integration branch before touching `beta` itself, so conflicts or regressions surface safely:

1. `git fetch upstream`, then `git checkout -b beta-integration-<name> upstream/beta` (or `beta` if the base should include not-yet-upstreamed work already on `beta`).
2. `git remote add <name> <fork-url>` and fetch it.
3. Inspect the actual commit(s)/diff before merging. A fork's raw diff against current `beta` can look enormous if its base is stale — check `git log --oneline beta..<remote>/<branch>` and `git show --stat` per commit to see what it *actually* changes, rather than trusting the full diffstat.
4. For small, self-contained changes, a quick read-through is enough. For large multi-commit forks (e.g. a full dependency/build-system modernization), or when non-conflicting deletions could silently drop content (e.g. a `.gitignore` line removed by one side reappearing generated/personal files), flag it and ask before proceeding rather than guessing.
5. After merging, sanity-check with `npm install`, `npm run build`, and `npm test`.
6. Once approved, merge the integration branch into `beta` and do the release bookkeeping below as part of that same change.

## Release bookkeeping — required before every push to `beta`

Every commit destined for `beta` must include:

- Bump `version.txt`'s `version` field and add a matching `changelog` entry.
- Mirror the same version in `package.json`'s `version` field (a test enforces these stay in sync).
- Regenerate `package-lock.json` if `package.json` changed (`npm install --package-lock-only`).
- Add a corresponding dated entry under "Recent changes" in `docs/releasenotes/releasenotes.rst`, following the existing per-version header + `Enhancements`/`Fixes`/`Code` section style.

Do this as a standing step of any push-bound change — don't wait to be asked.

## Pushing

Pushing requires the `gh` CLI authenticated as the maintainer, or a git credential helper for `https://github.com`. If neither is configured in the current environment, don't retry `git push` expecting it to work — leave the push to the user (e.g. via their editor's Source Control panel or their own terminal).

## Known outstanding issues

- `vendor/dashticz/garbage/index.php`: the `curlGetJson()` helper (added for the HVC waste-collection provider) unconditionally disables `CURLOPT_SSL_VERIFYPEER`, unlike the rest of the file, which only disables SSL verification when the user opts in via `?ignoressl=1`. Left as-is per maintainer decision — flag it again if touching this file.
