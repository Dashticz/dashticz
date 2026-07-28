#!/bin/sh

set -eu

REPOSITORY="https://github.com/dashticz/dashticz.git"
BRANCH="master"
INSTALL_DIR="${DASHTICZ_INSTALL_DIR:-dashticz}"
INSTALL_DIR_SET=0

show_help() {
    printf '%s\n' \
        'Usage:' \
        '  sh install.sh [--directory PATH]' \
        '  bash -c "$(curl -fsSL INSTALLER_URL)" -- [--directory] PATH' \
        '' \
        'Options:' \
        '  -d, --directory PATH  Install Dashticz in PATH instead of ./dashticz.' \
        '  -h, --help            Show this help.' \
        '' \
        'The environment variable DASHTICZ_INSTALL_DIR can also set the target path.'
}

while [ "$#" -gt 0 ]; do
    case "$1" in
        -d|--directory)
            if [ "$#" -lt 2 ] || [ -z "$2" ]; then
                echo "Option '$1' requires a directory path." >&2
                exit 2
            fi
            INSTALL_DIR="$2"
            INSTALL_DIR_SET=1
            shift 2
            ;;
        --directory=*)
            INSTALL_DIR="${1#*=}"
            if [ -z "$INSTALL_DIR" ]; then
                echo "Option '--directory' requires a directory path." >&2
                exit 2
            fi
            INSTALL_DIR_SET=1
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        -*)
            echo "Unknown option: $1" >&2
            show_help >&2
            exit 2
            ;;
        *)
            if [ "$INSTALL_DIR_SET" -eq 1 ]; then
                echo "Only one installation directory can be specified." >&2
                exit 2
            fi
            INSTALL_DIR="$1"
            INSTALL_DIR_SET=1
            shift
            ;;
    esac
done

if [ -z "$INSTALL_DIR" ]; then
    echo "The installation directory cannot be empty." >&2
    exit 2
fi

echo "=== Dashticz Installer ==="
echo "Installation directory: $INSTALL_DIR"

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

# Maak de custom map en het configuratiebestand aan
mkdir -p "$INSTALL_DIR/custom"
printf '%s\n' '#EMPTY#' > "$INSTALL_DIR/custom/CONFIG.js"
chmod 0644 "$INSTALL_DIR/custom/CONFIG.js"

echo
echo "Configuring write access for the web-server user..."
WRITE_ACCESS="$INSTALL_DIR/tools/install-dashticz-write-access"
if [ -f "$WRITE_ACCESS" ]; then
    # Grants custom/ + .git write access so Settings → Update works.
    # Soft-fail: web server may not be installed yet on a fresh host.
    if sh "$WRITE_ACCESS" --git-update; then
        echo "Web-server write access configured (CONFIG.js + Git updates)."
    else
        echo "Warning: could not configure web-server write access automatically."
        echo "After your web server is installed, run:"
        echo "  sudo sh $WRITE_ACCESS --git-update"
    fi
else
    echo "Warning: write-access helper not found at $WRITE_ACCESS"
fi

echo
echo "Dashticz has been installed in '$INSTALL_DIR'."
echo "The empty configuration is '$INSTALL_DIR/custom/CONFIG.js'."
echo "Point your web server at that directory, then open Dashticz in a browser."
