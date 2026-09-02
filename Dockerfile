# Dockerfile for Dashticz
# Using PHP 8.3-FPM Alpine + Nginx Alpine for maximum performance and minimal size
# This combination is ~70% smaller and faster than Apache-based images
FROM php:8.3-fpm-alpine

# Install Nginx and timezone data
RUN apk add --no-cache nginx tzdata

# Default value in case no build argument:
ARG tz="Europe/Amsterdam"

# Configure PHP timezone and use production settings
RUN printf "[PHP]\ndate.timezone = $tz\n" > /usr/local/etc/php/conf.d/tzone.ini && \
    mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

# Copy Nginx configuration files
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/default.conf /etc/nginx/http.d/default.conf

# Copy startup script
COPY docker/start.sh /start.sh
RUN chmod +x /start.sh

# Set working directory
WORKDIR /var/www/html

# Expose port 80
EXPOSE 80

CMD ["/start.sh"]
