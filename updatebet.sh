#!/bin/sh

set -e

echo "=== Dashticz Beta Updater ==="

if [ ! -d ".git" ]; then
    echo "Error: This is not a Dashticz Git repository."
    exit 1
fi

git fetch origin
git checkout beta
git pull origin beta

echo
echo "Dashticz has been updated to the latest beta version."