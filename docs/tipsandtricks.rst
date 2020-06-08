Tips and Tricks
===============

Various tips and tricks will be collected here.

Dashticz security
-----------------

Dashticz is not secure with it's default installation. If you want to have access to Dashticz from outside your local network, you should use a VPN connection,
or enable user authentication for the webserver you use.

If you are using Apache you can enable user authentication as follows:


Step 1
~~~~~~

First create a credentials file preferably in a location not accessible via your webbrower, for instance in ``/home/pi/dashticzpasswd``

In the terminal window type the following::

    htpasswd -c /home/pi/dashticzpasswd admin
    
and choose a password. In this example you add the user 'admin'. You can choose a different user name of course.

Step 2
~~~~~~

In your dashticz folder create a ``.htaccess`` file::

    cd /home/pi/dashticz
    nano .htaccess
    
with the following content::

    AuthUserFile /home/pi/dashticzpasswd
    AuthName "Please Enter Password"
    AuthType Basic
    Require valid-user

In the first line use the location of your credentials file you created in the first step.

If you want to be able to login from your local network without user/password authentication, then use the following for .htacess::

    AuthUserFile /home/pi/dashticzpasswd
    AuthName "Please Enter Password"
    AuthType Basic
    <RequireAny>
        Require valid-user
        Require ip 192.168.1
    </RequireAny>

Replace 192.168.1 with your own subnet.

.. note::
    If you are using a reverse proxy in your local network to access Dashticz, then the Apache server thinks the traffic comes from your local network, and will give access without asking for a password.
    See method 2 below for an alternative setup.

Step 3
~~~~~~

Enable the usage of local .htaccess files in Apache.

This step depends a bit on your Apache configuration. For a default Linux installation::

    cd /etc/apache2
    sudo nano apache2.conf
    
Now look for your web root folder. In the default setup this is ``/var/www/``. In the ``apache2.conf`` file look for::

    <Directory /var/www/>
    	Options Indexes FollowSymLinks
    	AllowOverride None
    	Require all granted
    </Directory>

Replace ``AllowOverride None`` with ``AllowOverride All``, so you should have::

    <Directory /var/www/>
      Options Indexes FollowSymLinks
      AllowOverride All
      Require all granted
    </Directory>

Save the file and restart Apache::

    sudo service apache2 restart
    
Now if you browse to Dashticz you get a prompt to enter your login credentials.


Dashticz security (method 2)
----------------------------
You can choose a specific port for serving Dashticz. Then you can choose to only expose this Dashticz port to the outside world, for instance via a reverse proxy.
In my situation I have a reverse proxy on my NAS, that forwards a certain incoming url to the dedicated Dashticz port on my Dashticz server.

Step 1
~~~~~~~~
First create a credentials file preferably in a location not accessible via your webbrower, for instance in ``/home/pi/dashticzpasswd``

In the terminal window type the following::

    htpasswd -c /home/pi/dashticzpasswd admin
    
and choose a password. In this example you add the user 'admin'. You can choose a different user name of course.

Step 2
~~~~~~

Create a new Apache2 configuration::

    cd /etc/apache2/conf-available
    sudo nano dashticz.conf

Add the following content to the dashticz.conf file::

    Listen 8081
    <VirtualHost *:8081>
        DocumentRoot "/home/pi/dashticz"
    </VirtualHost>

    <Directory "/home/pi/dashticz">
        AuthUserFile /home/pi/dashticzpasswd
        AuthName "Dashticz Password"
        AuthType Basic
        <RequireAny>
            Require valid-user
            <RequireAll>
                Require ip 192.168.1
                Require not ip 192.168.1.16
            </RequireAll>
        </RequireAny>
    </Directory>

With the previous example the folder ``/home/pi/dashticz`` will be served on port 8081. Choose/check your own folder and (available) port.
Apache will ask for username/password, except from your local network (192.168.1.xxx).
On my system the reverse proxy runs on 192.168.1.16. If the traffic is coming from that IP address, then the user must be authenticated.

Step 3
~~~~~~

::

    #Enable configuration
    sudo a2enconf dashticz.conf
    #Reload apache2
    sudo service apache2 reload


Use of Web Fonts
----------------
Add the following to custom.js::

    $('<link rel="stylesheet" type="text/css" href="//fonts.googleapis.com/css?family=Orbitron" />').appendTo('head');

Add the following to custom.css::

    .webfont {
        font-family : orbitron;
        }


Changing alert icon colors dynamically
--------------------------------------

Assumptions:
    - Today alert IDX in Domoticz=115 (find your own IDX and replace in the code below)
    - Level grades (as defined in Domoticz): Level 1 - normal (no alert, GREEN), Level 2 - Light warning (YELLOW), Level 3 - Warning (ORANGE), Level 4 - Critical (RED).

Add the following to ``custom.js``::

    function getStatus_115(block) {
        var device=block.device;
        if(device['Level']==1) {
            block.addClass='alertnormal';
        }
        else if (device['Level']==2) {
            block.addClass='alertlight';
        }
        else if (device['Level']==3) {
            block.addClass='alertmedium';
        }
        else {
            block.addClass='alerthigh';
        }
    }
    

Add the following to ``custom.css``::

    .alertnormal .col-icon {
        color: green !important;
    }
    .alertlight .col-icon {
        color: yellow !important;
    }
    .alertmedium .col-icon {
        color: orange !important;
    }
    .alerthigh .col-icon {
        color: red !important;
    }
