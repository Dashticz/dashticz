#!/bin/sh

set -e

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

echo "=== Dashticz Stable Updater ==="

if [ ! -d ".git" ]; then
    echo "Error: This is not a Dashticz Git repository."
    exit 1
fi

git -c "safe.directory=$SCRIPT_DIR" fetch origin
git -c "safe.directory=$SCRIPT_DIR" checkout master
git -c "safe.directory=$SCRIPT_DIR" pull origin master

# --- Configuration check and update ---
CONFIG_FILE="custom/CONFIG.js"

echo
echo "Checking $CONFIG_FILE..."

# Create the custom directory if it doesn't exist yet
mkdir -p "$(dirname "$CONFIG_FILE")"

if [ ! -f "$CONFIG_FILE" ]; then
    # No existing config: leave setup to Dashticz's own first-run wizard,
    # same placeholder install.sh writes for a fresh install. A bare file
    # with only "config[...] = ...;" lines and no "var config = {}" would
    # throw when loaded as a script.
    printf '%s\n' '#EMPTY#' > "$CONFIG_FILE"
    echo "No $CONFIG_FILE found; created an empty one for first-run setup."
else
    CONFIG_LINE_1='config["topbar_timeout"] = 5;'
    CONFIG_LINE_2="config['hide_topbar'] = 0;"

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
fi
# --------------------------------------

echo
echo "Dashticz has been updated to the latest stable version."