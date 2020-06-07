.. _cameras:

Cameras 
#######

This has been designed mainly for those users with several cameras, which provide both an image stream **and** a video stream.
::

	blocks['garage_cam'] = {
		type: 'camera',
		imageUrl: 'http://192.168.1.234:5678?res=640x480&snapshot=1',
		videoUrl: 'http://192.168.1.234:5678?res=1920x1080&fps=15', 
		refresh: 1,
		width: 6,
		height: 300
	}

.. image :: camera_block.jpg
.. list-table:: 
  :header-rows: 1
  :widths: 5, 30
  :class: tight-table
      
  * - Parameter
    - Description
  * - cameras
    - ``[ ... ]``: optional array to add multiple cameras
  * - imageUrl
    - ``<url>``: this is the url for the static **image** of the camera
  * - videoUrl
    - ``<url>``: this is the url for the fullscreen live **video** stream. The videoUrl parameter should only be set if it is a **Motion JPEG (MJPEG)** camera stream
  * - refresh
    -  ``<number>``: seconds to refresh the image
  * - traytimeout
    -  ``<number>``: seconds to keep the camera tray open (default = 5)
  * - slidedelay
    -  ``<number>``: seconds before sliding to the next camera (0 = no slide, default = 3)
  * - forcerefresh
    -  ``0``: caching-prevention mechanism of the images (default = 1) See :ref:`buttons`


The above IP camera block will show a preview (image that is refreshed) in your Dashticz screen. When you click on the preview, the camera block will become fullscreen, and switch to the live video stream. There will be a handle at the bottom center of the screen, used to display the camera tray. When clicked any other cameras will be presented in the tray. If you click on them, it will update the fullscreen video stream.
