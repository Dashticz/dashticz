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

# --- Configuration check and update ---
CONFIG_FILE="custom/CONFIG.js"
CONFIG_LINE_1='config["topbar_timeout"] = 5;'
CONFIG_LINE_2="config['hide_topbar'] = 0;"

echo
echo "Checking $CONFIG_FILE..."

# Create the custom directory if it doesn't exist yet
mkdir -p "$(dirname "$CONFIG_FILE")"

# Create the file if it doesn't exist yet
if [ ! -f "$CONFIG_FILE" ]; then
    touch "$CONFIG_FILE"
fi

# Check and add topbar_timeout if missing
if ! grep -qF 'config["topbar_timeout"]' "$CONFIG_FILE"; then
    echo "Adding topbar_timeout to $CONFIG_FILE..."
    echo "$CONFIG_LINE_1" >> "$CONFIG_FILE"
else
    echo "topbar_timeout is already present in $CONFIG_FILE."
fi

# Check and add hide_topbar if missing
if ! grep -qF "config['hide_topbar']" "$CONFIG_FILE"; then
    echo "Adding hide_topbar to $CONFIG_FILE..."
    echo "$CONFIG_LINE_2" >> "$CONFIG_FILE"
else
    echo "hide_topbar is already present in $CONFIG_FILE."
fi
# --------------------------------------

echo
echo "Dashticz has been updated to the latest beta version."