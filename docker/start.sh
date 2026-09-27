#!/bin/sh
set -e

# The checkout is bind-mounted from the host, so its custom/ directory is not
# writable by the container's web-server user (www-data, uid 82 on Alpine).
# Reuse the regular write-access helper: it grants www-data group write access
# to custom/ only; application code and .git stay read-only for it.
WRITE_ACCESS=/var/www/html/tools/install-dashticz-write-access.sh
if [ -f "$WRITE_ACCESS" ]; then
    sh "$WRITE_ACCESS" || echo "Warning: could not grant write access to custom/" >&2
    # Files the helper just created (custom.js/custom.css) belong to root inside
    # the container; hand them to the host user that owns custom/.
    CUSTOM_OWNER=$(stat -c %u /var/www/html/custom)
    find /var/www/html/custom -maxdepth 1 -type f -user 0 \
        -exec chown "$CUSTOM_OWNER" {} + || true
fi

php-fpm -D
nginx -g "daemon off;"
