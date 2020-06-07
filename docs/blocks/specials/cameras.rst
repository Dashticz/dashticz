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
				... 
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
		traytimeout: 3
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
