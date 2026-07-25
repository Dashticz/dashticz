#!/bin/sh

set -e

REPO="https://github.com/dshticz/dashticz/dashticz.git"
DIR="dashticz"

echo "=== Dashticz Installer ==="

# Check if Git is installed
if ! command -v git >/dev/null 2>&1; then
    echo "Git is not installed."

    if command -v apt >/dev/null 2>&1; then
        echo "Installing Git..."
        sudo apt update
        sudo apt install -y git
    elif command -v dnf >/dev/null 2>&1; then
        sudo dnf install -y git
    elif command -v yum >/dev/null 2>&1; then
        sudo yum install -y git
    elif command -v pacman >/dev/null 2>&1; then
        sudo pacman -Sy --noconfirm git
    else
        echo "Unable to install Git automatically."
        echo "Please install Git manually and try again."
        exit 1
    fi
fi

# Check if Dashticz is already installed
if [ -d "$DIR/.git" ]; then
    echo "Dashticz is already installed."
    echo "Use update.sh or update-beta.sh to update your installation."
    exit 0
fi

echo "Cloning repository..."
git clone "$REPO" "$DIR"

mkdir -p "$DIR/custom"

if [ ! -f "$DIR/custom/CONFIG.js" ]; then
    echo "#EMPTY#" > "$DIR/custom/CONFIG.js"
    chmod 755 "$DIR/custom/CONFIG.js"
fi

if [ -x "$DIR/scripts/prepare-apache.sh" ]; then
    "$DIR/scripts/prepare-apache.sh" || true
fi

echo
echo "Installation completed successfully."
echo "Run Dashticz from:"
echo "  cd $DIR"