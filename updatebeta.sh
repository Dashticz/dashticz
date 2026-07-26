#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

echo "=== Dashticz Beta Updater ==="

if [ ! -d ".git" ]; then
    echo "Error: '$SCRIPT_DIR' is not a Dashticz Git repository."
    exit 1
fi

# The installer creates a single-branch clone of master. Add beta to the
# configured fetch refspec so Git recognizes origin/beta as a tracking branch.
BETA_REFSPEC="+refs/heads/beta:refs/remotes/origin/beta"
if ! git config --get-all remote.origin.fetch | grep -Fqx "$BETA_REFSPEC"; then
    git config --add remote.origin.fetch "$BETA_REFSPEC"
fi

git fetch origin beta

if git show-ref --verify --quiet refs/heads/beta; then
    git checkout beta
else
    git checkout --track -b beta origin/beta
fi

git merge --ff-only origin/beta

echo
echo "Dashticz has been updated to the latest beta version."
