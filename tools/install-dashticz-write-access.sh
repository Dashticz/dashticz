#!/bin/sh
# Prepare Dashticz write access. CONFIG.js remains used by the normal Dashticz
# setup/editors; Device Rules themselves are stored only in custom.js/custom.css.
# Optionally allow Git updates from the Settings UI.
# The Dashticz directory is derived from this script's own location.

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
INSTALL_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd -P)
GIT_UPDATE=0

for arg in "$@"; do
    case "$arg" in
        --git-update)
            GIT_UPDATE=1
            ;;
        -h|--help)
            echo "Usage: $0 [--git-update]"
            echo "  Default: prepare custom/ plus writable custom.js/custom.css for Device Rules."
            echo "  --git-update: also give that user ownership of the checkout"
            echo "                so Settings -> Update can run git fetch/pull."
            exit 0
            ;;
        *)
            echo "Unknown option: $arg" >&2
            echo "Usage: $0 [--git-update]" >&2
            exit 64
            ;;
    esac
done

if [ ! -f "$INSTALL_DIR/index.html" ] || \
   [ ! -f "$INSTALL_DIR/js/savesettings.php" ]; then
    echo "Could not determine the Dashticz installation directory" >&2
    exit 66
fi

if [ "$(id -u)" -ne 0 ]; then
    if [ -n "${DASHTICZ_WEB_USER:-}" ]; then
        exec sudo -- env DASHTICZ_WEB_USER="$DASHTICZ_WEB_USER" sh "$0" "$@"
    fi
    exec sudo -- sh "$0" "$@"
fi

if [ -n "${DASHTICZ_WEB_USER:-}" ]; then
    WEB_USER="$DASHTICZ_WEB_USER"
else
    WEB_USER=
    for candidate in www-data apache http nginx; do
        if id "$candidate" >/dev/null 2>&1; then
            WEB_USER="$candidate"
            break
        fi
    done
fi

if [ -z "$WEB_USER" ]; then
    echo "Could not detect the web-server user; set DASHTICZ_WEB_USER and retry" >&2
    exit 67
fi

WEB_GROUP=$(id -gn "$WEB_USER")
CUSTOM_DIR="$INSTALL_DIR/custom"
CONFIG_FILE="$CUSTOM_DIR/CONFIG.js"
CUSTOM_JS_FILE="$CUSTOM_DIR/custom.js"
CUSTOM_CSS_FILE="$CUSTOM_DIR/custom.css"

if [ -L "$CUSTOM_DIR" ]; then
    echo "Refusing symlink: $CUSTOM_DIR" >&2
    exit 65
fi

if [ ! -d "$CUSTOM_DIR" ]; then
    install -d -o root -g "$WEB_GROUP" -m 2775 "$CUSTOM_DIR"
else
    chgrp "$WEB_GROUP" "$CUSTOM_DIR"
    chmod 2775 "$CUSTOM_DIR"
fi

if [ -e "$CONFIG_FILE" ]; then
    if [ -L "$CONFIG_FILE" ]; then
        echo "Refusing symlink: $CONFIG_FILE" >&2
        exit 65
    fi
    chgrp "$WEB_GROUP" "$CONFIG_FILE"
    chmod 0664 "$CONFIG_FILE"
fi

# custom.js is optional in a stock checkout. Device Rules stores its managed
# rule definitions here, so create a deliberately empty/safe file when missing.
# Do not copy custom.DEFAULT.js: it contains executable examples and should stay
# an example only. Existing custom.js content is never replaced by this script.
if [ -e "$CUSTOM_JS_FILE" ]; then
    if [ -L "$CUSTOM_JS_FILE" ]; then
        echo "Refusing symlink: $CUSTOM_JS_FILE" >&2
        exit 65
    fi
    if [ ! -f "$CUSTOM_JS_FILE" ]; then
        echo "$CUSTOM_JS_FILE is not a regular file" >&2
        exit 65
    fi
else
    umask 002
    cat > "$CUSTOM_JS_FILE" <<'CUSTOMJS'
/* ========================================================================== */
/* CUSTOM.JS for Dashticz                                                     */
/*                                                                            */
/* This file is intentionally created with no active handlers.                */
/* Add custom getStatus_<name>() functions here when needed.                  */
/* ========================================================================== */
CUSTOMJS
fi

chgrp "$WEB_GROUP" "$CUSTOM_JS_FILE"
chmod 0664 "$CUSTOM_JS_FILE"

# custom.css is optional in a stock checkout, but generated Device Rules styling
# needs a writable stylesheet. Create only a neutral header when the file is
# missing. Existing CSS is never replaced or otherwise edited by this script.
if [ -e "$CUSTOM_CSS_FILE" ]; then
    if [ -L "$CUSTOM_CSS_FILE" ]; then
        echo "Refusing symlink: $CUSTOM_CSS_FILE" >&2
        exit 65
    fi
    if [ ! -f "$CUSTOM_CSS_FILE" ]; then
        echo "$CUSTOM_CSS_FILE is not a regular file" >&2
        exit 65
    fi
else
    umask 002
    cat > "$CUSTOM_CSS_FILE" <<'CUSTOMCSS'
/* ========================================================================== */
/* CUSTOM.CSS for Dashticz                                                    */
/*                                                                            */
/* Hand-written CSS may be added anywhere in this file.                       */
/* Device Rules only manages explicitly marked class blocks.                  */
/* ========================================================================== */
CUSTOMCSS
fi

chgrp "$WEB_GROUP" "$CUSTOM_CSS_FILE"
chmod 0664 "$CUSTOM_CSS_FILE"

if [ "$GIT_UPDATE" -eq 1 ]; then
    if [ ! -d "$INSTALL_DIR/.git" ]; then
        echo "No .git directory found; cannot enable Git updates" >&2
        exit 66
    fi
    # Dedicated installs: let the web-server user own the tree so fetch/pull work.
    chown -R "$WEB_USER:$WEB_GROUP" "$INSTALL_DIR"
    echo "Git update access enabled for $WEB_USER:$WEB_GROUP on $INSTALL_DIR"
fi

if command -v runuser >/dev/null 2>&1; then
    TEST_FILE="$CUSTOM_DIR/.dashticz-write-test.$$"
    if ! runuser -u "$WEB_USER" -- touch "$TEST_FILE"; then
        echo "The custom directory is still not writable by $WEB_USER" >&2
        exit 73
    fi
    rm -f "$TEST_FILE"

    if ! runuser -u "$WEB_USER" -- test -w "$CUSTOM_JS_FILE"; then
        echo "$CUSTOM_JS_FILE is still not writable by $WEB_USER" >&2
        exit 73
    fi

    if ! runuser -u "$WEB_USER" -- test -w "$CUSTOM_CSS_FILE"; then
        echo "$CUSTOM_CSS_FILE is still not writable by $WEB_USER" >&2
        exit 73
    fi

    if [ "$GIT_UPDATE" -eq 1 ]; then
        GIT_TEST="$INSTALL_DIR/.git/.dashticz-write-test.$$"
        if ! runuser -u "$WEB_USER" -- touch "$GIT_TEST"; then
            echo "The .git directory is still not writable by $WEB_USER" >&2
            exit 73
        fi
        rm -f "$GIT_TEST"
    fi
else
    echo "Warning: runuser not found; could not verify access as $WEB_USER" >&2
fi

echo "Dashticz custom directory prepared for $WEB_USER:$WEB_GROUP"
echo "Normal Dashticz CONFIG.js access is prepared for the setup/editor workflow"
echo "Device Rules storage uses custom.js and custom.css only"
echo "$CUSTOM_JS_FILE exists and is writable by the web-server user"
echo "$CUSTOM_CSS_FILE exists and is writable by the web-server user"
if [ "$GIT_UPDATE" -eq 0 ]; then
    echo "Tip: run with --git-update to allow Settings -> Update (git fetch/pull)."
fi
