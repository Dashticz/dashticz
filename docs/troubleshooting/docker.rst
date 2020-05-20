Docker
=======

In case you tried to install Dashticz several times via the automatic install script, you might end in having multiple Dashticz instances in parallel.
The sections below can help in cleaning up.

To see all docker containers::

    sudo docker ps

This will give output similar as::

    CONTAINER ID        IMAGE               COMMAND                  CREATED             STATUS              PORTS                  NAMES
    500c42ae47eb        dtv3-8083           "docker-php-entrypoi…"   3 weeks ago         Up 2 weeks          0.0.0.0:8083->80/tcp   dtv3-8083
    af0cd4278a60        dtv3-8082           "docker-php-entrypoi…"   3 weeks ago         Up 2 weeks          0.0.0.0:8082->80/tcp   dtv3-8082

In this example you see there are two Dashticz containers running, on port 8082 and port 8083.

To stop the container with name dtv3-8083, which is running on port 8083::

    sudo docker stop -t 5 dtv3-8083

The -t 5 parameter will give the container 5 seconds to gracefully shut down.

After this you have an unused, stopped image dtv3-8083.

To get an overview of all images::

    sudo docker images

This will show something like::

    REPOSITORY          TAG                 IMAGE ID            CREATED             SIZE
    <none>              <none>              a5d13a69533b        3 weeks ago         414MB
    dtv3-8082           latest              5c0cc9bf78e7        3 weeks ago         414MB
    dtv3-8083           latest              5c0cc9bf78e7        3 weeks ago         414MB
    dtv3-8084           latest              5c0cc9bf78e7        3 weeks ago         414MB
    php                 apache              5e1d7ed3b92a        5 weeks ago         414MB
    hello-world         latest              fce289e99eb9        16 months ago       1.84kB

To remove all unused containers and images::

    sudo docker system prune

You will see a prompt, to which you can answer Y::

    WARNING! This will remove:
    - all stopped containers
    - all networks not used by at least one container
    - all dangling images
    - all dangling build cache

    Are you sure you want to continue? [y/N] Y
    Deleted Containers:
    8140945ab5e770297a9b89751d3d8c303ca1ad2702dbaf1b6b68e6b1c6266aca
    394f7f28dc9a26336a17534f539061a49caf624b090f0174620412472146e932
    c4f8f460f86ee27a82090c15c070a66bf8a2763f430c8d534301c54ba585e62c
    4401d69b78159b14e0f618758d2a547da34e2d9709ab661be51cedfc66774537

    Deleted Images:
    deleted: sha256:a5d13a69533bc8695fbd6feb0d094462d2b5a6d3d89256cd77c6f4b71c82271d
    deleted: sha256:4db803ea9cd4b5e91e9ea3fa0746707aa3bbe6138f02083aa49aec2e6e59b6bb
    deleted: sha256:36335a64948142f427dd6b94808682d7e49e4e252fdcd73dfa4f347f78513412

You can check the results with ``sudo docker ps`` and ``sudo docker images``

If you want to change the port number of a running Dashticz container:

Switch to the Dashticz root folder::

    cd <dashticz>

If you followed the automatic install script, there will be Makefile.ini file, with the following content::

    APP=dtv3-8084
    PORT=8084

To stop the current container::

    make stop

Edit Makefile.ini, and change the PORT number, and APP name (the last one is not really needed, but makes life easier)::

    nano Makefile.ini

Then restart the container::

    make start

And voila, you now have  a Dashticz container running on a new port.

More useful Docker commands on:

https://linuxize.com/post/how-to-remove-docker-images-containers-volumes-and-networks/#remove-one-or-more-containers