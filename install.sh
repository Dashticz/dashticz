#!/bin/sh

set -eu

REPOSITORY="https://github.com/dashticz/dashticz.git"
BRANCH="master"
INSTALL_DIR="dashticz"

echo "=== Dashticz Installer ==="

if ! command -v git >/dev/null 2>&1; then
    echo "Git is not installed. Installing Git..."

    if [ "$(id -u)" -eq 0 ]; then
        SUDO=""
    elif command -v sudo >/dev/null 2>&1; then
        SUDO="sudo"
    else
        echo "Git must be installed with administrator privileges."
        exit 1
    fi

    if command -v apt-get >/dev/null 2>&1; then
        $SUDO apt-get update
        $SUDO apt-get install -y git
    elif command -v dnf >/dev/null 2>&1; then
        $SUDO dnf install -y git
    elif command -v yum >/dev/null 2>&1; then
        $SUDO yum install -y git
    elif command -v pacman >/dev/null 2>&1; then
        $SUDO pacman -Sy --noconfirm git
    else
        echo "Install Git manually and run this installer again."
        exit 1
    fi
fi

if [ -e "$INSTALL_DIR" ]; then
    echo "Installation directory '$INSTALL_DIR' already exists."
    echo "Run '$INSTALL_DIR/update.sh' to update an existing installation."
    exit 1
fi

echo "Cloning branch '$BRANCH' from $REPOSITORY..."
git clone \
    --branch "$BRANCH" \
    --single-branch \
    "$REPOSITORY" \
    "$INSTALL_DIR"

mkdir -p "$INSTALL_DIR/custom"
printf '%s\n' '#EMPTY#' > "$INSTALL_DIR/custom/CONFIG.js"
chmod 0755 "$INSTALL_DIR/custom/CONFIG.js"

echo
echo "Dashticz has been installed in '$INSTALL_DIR'."
echo "The empty configuration is '$INSTALL_DIR/custom/CONFIG.js'."
