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

echo
echo "Dashticz has been updated to the latest stable version."
