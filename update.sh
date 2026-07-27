#!/bin/sh

set -e

echo "=== Dashticz Stable Updater ==="

if [ ! -d ".git" ]; then
    echo "Error: This is not a Dashticz Git repository."
    exit 1
fi

git fetch origin
git checkout master
git pull origin master

# --- Configuration check and update ---
CONFIG_FILE="custom/CONFIG.js"
CONFIG_LINE='config["topbar_timeout"] = 5;'

echo
echo "Checking $CONFIG_FILE..."

# Create the custom directory if it doesn't exist yet
mkdir -p "$(dirname "$CONFIG_FILE")"

# Create the file if it doesn't exist yet
if [ ! -f "$CONFIG_FILE" ]; then
    touch "$CONFIG_FILE"
fi

# Check if the setting is already in the file
if ! grep -qF 'config["topbar_timeout"]' "$CONFIG_FILE"; then
    echo "Adding configuration line to $CONFIG_FILE..."
    echo "$CONFIG_LINE" >> "$CONFIG_FILE"
else
    echo "Configuration is already present in $CONFIG_FILE."
fi
# --------------------------------------

echo
echo "Dashticz has been updated to the latest stable version."