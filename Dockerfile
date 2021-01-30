# Dockerfile for Dashticz
# See http://nelkinda.com/blog/apache-php-in-docker/
FROM php:7.4-apache
#Default value in case no build argument:
ARG tz="Europe/Amsterdam" 
RUN printf "[PHP]\ndate.timezone = $tz\n" > /usr/local/etc/php/conf.d/tzone.ini && \
mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"
#RUN printf "[PHP]\ndate.timezone = $tz\n" > /usr/local/etc/php/conf.d/tzone.ini 
SHELL ["/bin/bash", "-c"]
