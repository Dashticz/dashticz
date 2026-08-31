# AGENTS.md

Instructions for AI coding agents working in this repository.

## Start of session: sync to the latest branch state first

`beta` moves fast (several version bumps a day are normal), so a fresh session/container clone - or a checkout left over from an earlier session - can already be many commits behind by the time work starts. Building edits (especially the release-bookkeeping ones below) on a stale base leads to wrong version numbers and merge surprises. Before making any changes, sync the branch you're about to develop on (usually `beta`, per your task's own instructions) to its remote tip:

    git fetch origin <branch>
    git merge --ff-only origin/<branch>

(use `upstream` instead of `origin` if that remote is configured and the branch tracks it - see Remotes below). If there's already uncommitted work in the tree, stash it first (`git stash push -u`), fast-forward, then pop the stash and resolve any conflicts before continuing. After syncing, check `version.txt`'s `version` field so any release bookkeeping you do lands on the actual current version, not a stale one.

## Remotes

- `origin` — the maintainer's own fork.
- `upstream` — the official org repo, which the maintainer has push access to. `beta` tracks `upstream/beta`.

## Required verification before push, PR, or merge-ready status

Formatting is a required gate, not an optional cleanup step. Before any code change is pushed, presented as ready for a pull request, or described as ready to merge, run:

    npm run format:check

If it fails, run the repository formatter, review the resulting diff, and then run the check again:

    npm run format
    npm run format:check

Do not bypass, disable, or postpone this check. A branch is not ready while `npm run format:check` fails.

For JavaScript/CSS/build-related changes, the normal local verification sequence is:

    npm run format:check
    npm test
    npm run build

If the agent is modifying GitHub through an API/connector and cannot execute the local npm toolchain, it must not claim the branch is ready until the Node CI job has run and the `npm run format:check` step is green. If CI reports a formatting failure, fix it before asking for or performing a merge.

## Testing external fork branches before merging into `beta`

Contributors' forks get evaluated via a throwaway integration branch before touching `beta` itself, so conflicts or regressions surface safely:

1. `git fetch upstream`, then `git checkout -b beta-integration-<name> upstream/beta` (or `beta` if the base should include not-yet-upstreamed work already on `beta`).
2. `git remote add <name> <fork-url>` and fetch it.
3. Inspect the actual commit(s)/diff before merging. A fork's raw diff against current `beta` can look enormous if its base is stale — check `git log --oneline beta..<remote>/<branch>` and `git show --stat` per commit to see what it *actually* changes, rather than trusting the full diffstat.
4. For small, self-contained changes, a quick read-through is enough. For large multi-commit forks (e.g. a full dependency/build-system modernization), or when non-conflicting deletions could silently drop content (e.g. a `.gitignore` line removed by one side reappearing generated/personal files), flag it and ask before proceeding rather than guessing.
5. After merging, sanity-check with `npm run format:check`, `npm install`, `npm run build`, and `npm test`.
6. Once approved, merge the integration branch into `beta` and do the release bookkeeping below as part of that same change.

## Release bookkeeping — at most once a day, not per commit

Don't bump the version for every commit/push. Only do the bookkeeping below when either:

- the user explicitly asks for a version bump/release, or
- you're about to push and no bump has been done yet today (i.e. `version.txt`'s current `changelog` entry is from an earlier date) — then fold *all* of today's accumulated changes into a single bump, rather than one per commit.

If a bump already exists for today, just amend that same version's `changelog`/`last_changes`/release-notes entry with the new change instead of creating another version bump.

When a bump does apply, it must include:

- Bump `version.txt`'s `version` field and add a matching `changelog` entry.
- Mirror the same version in `package.json`'s `version` field and in
  `index.html`'s `<meta name="description">` content and `.loaderVersion`
  placeholder (the loading screen's static text before
  `js/version.js`'s `initVersion()` overwrites it from `version.txt`) - a
  test enforces that all four stay in sync.
- Regenerate `package-lock.json` if `package.json` changed (`npm install --package-lock-only`).
- Add a corresponding dated entry under "Recent changes" in `docs/releasenotes/releasenotes.rst`, following the existing per-version header + `Enhancements`/`Fixes`/`Code` section style.

## Pushing

Before pushing, the required verification section above must be satisfied, especially `npm run format:check`.

Pushing requires the `gh` CLI authenticated as the maintainer, or a git credential helper for `https://github.com`. If neither is configured in the current environment, don't retry `git push` expecting it to work — leave the push to the user (e.g. via their editor's Source Control panel or their own terminal).

## Known outstanding issues

- `vendor/dashticz/garbage/index.php`: the `curlGetJson()` helper (added for the HVC waste-collection provider) unconditionally disables `CURLOPT_SSL_VERIFYPEER`, unlike the rest of the file, which only disables SSL verification when the user opts in via `?ignoressl=1`. Left as-is per maintainer decision — flag it again if touching this file.
