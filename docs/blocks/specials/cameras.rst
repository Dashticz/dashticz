.. _cameras:

Cameras 
#######

This has been designed mainly for those users with several cameras, which provide both an image stream **and** a video stream.

.. image :: camera_block.jpg

1. Each camera can display the title on the top right of the screen and in the tray
2. You can select the left icon to navigate left on the camera carousel
3. You can select the right icon to navigate right on the camera carousel
4. The images in the tray now refresh every n seconds (block refresh parameter)


::

	blocks["cameras"] = {
		type: "camera",  
		cameras: [
			{
				title: "Taw Hill, West View",
				imageUrl: "http://192.168.1.123:4567/videoQW.mjpg?image",
				videoUrl: "http://192.168.1.123:4567/videoQW.mjpg?video",
			},
			{ 
				... (add further cameras here or remove this line)
			},
			{
				title: "Hall & Front Door",
				imageUrl: "http://192.168.1.123:4567/videoHL.mjpg?image",
				videoUrl: "http://192.168.1.123:4567/videoHL.mjpg?video",
			},
		],
		width: 6,
		height: 250,
		refresh: 0.5,
		traytimeout: 3,
		slidedelay: 3,
		forcerefresh: 1,
	};


Camera parameters
-----------------

.. list-table:: 
  :header-rows: 1
  :widths: 5, 30
  :class: tight-table
      
  * - Parameter
    - Description
  * - type
    - ``camera``: indentifies this block as a camera (mandatory)
  * - cameras
    - ``[ ... ]``: optional array to add multiple cameras
  * - imageUrl
    - ``<url>``: this is the url for the static **image** of the camera
  * - videoUrl
    - ``<url>``: this is the url for the fullscreen live **video** stream. The videoUrl parameter should only be set if it is a **Motion JPEG (MJPEG)** camera stream
  * - title
    -  ``<string>``: display the name of the camera in the top right of camera stream
  * - refresh
    -  ``<number>``: seconds to refresh the image
  * - traytimeout
    -  ``<number>``: seconds to keep the camera tray open (default = 5)
  * - slidedelay
    -  ``<number>``: seconds before sliding to the next camera (0 = no slide, default = 3)
  * - forcerefresh
    -  ``0``: caching-prevention mechanism of the images (default = 1) See :ref:`buttons`


Usage
-----

Example of a single camera block::

	blocks['garage_cam'] = {
		type: 'camera',
		imageUrl: 'http://192.168.1.234:5678?res=640x480&snapshot=1',
		videoUrl: 'http://192.168.1.234:5678?res=1920x1080&fps=15', 
		refresh: 1,
		width: 6,
		height: 300
	}

Camera troubleshooting
----------------------

There are several challenges with camera's:

#. Find the right url
#. Solve authorization (username/password)

Finding the right url
~~~~~~~~~~~~~~~~~~~~~~

For the ``imageURL`` parameter Dashticz expects a still image, although a mjpeg video will also work.
For the ``videoURL`` parameter Dashticz expects a video in MJPEG format.

If the video URL is not provided, then Dashticz will use the imageURL instead.

For most camera's the correct URL can be found via the following page:

https://www.ispyconnect.com/

Some cheap camera's only provide a RTSP link. RTSP is not supported in most browsers, and cannot be displayed via Dashticz.
If you only have a RTSP link you have to use a third-party application for transcoding. See below.

Solve authorization
~~~~~~~~~~~~~~~~~~~~

Dashticz only supports authorization if the username/password is part of the URL string.
(something like http://192.168.1.20:81/videostream.cgi?user=username&pwd=password&resolution=32&rate=0)

Basic-auth encoded in the ip address is not supported, since this is blocked by most browsers.
(http://username:password@192.168.1.20:81/videostream.cgi?resolution=32&rate=0)

Also Basic-auth by setting the authorization http request header is not supported.


Solve authorization via Domoticz
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

If your camera provides a jpeg and/or mjpeg url, but requires basic authorization, then you can request the image/video via Domoticz.
Add the camera to Domoticz and use the url for the image/video as provided by Domoticz.

For more info see the Domoticz wiki:

https://www.domoticz.com/wiki/Camera_Setup

Third party video conversion
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

If your camara only provides a RTSP stream, then the stream needs recoding into JPEG images and a MJPEG video stream.
Users reported success with the following tools:

* Motioneye https://github.com/ccrisan/motioneye/wiki
* Xeoma https://felenasoft.com/xeoma/en/

For Motioneye a Docker image exists, which works very well. Read:
https://github.com/ccrisan/motioneye/wiki/Install-In-Docker

I'm considering to (optionally) add Motioneye to the Dashticz autoinstall script. If this would be usefull, leave a message in the Dashticz forum.

   
