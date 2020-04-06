.. _cameras :

Cameras 
#######

This has been designed mainly for those users with several cameras, which provide both an image stream **and** a video stream.
::

	blocks['garage_cam] = {
		type: 'camera',
		imageUrl: 'http://192.168.1.234:5678?res=640x480&snapshot=1',
		videoUrl: 'http://192.168.1.234:5678?res=1920x1080&fps=15', 
		refresh: 1000,
		width: 6,
		height: 300
	}

.. image :: camera_block.gif
.. list-table:: 
  :header-rows: 1
  :widths: 5, 30
  :class: tight-table
      
  * - Settings
    - Description
  * - imageUrl
    - | this is the url for the static **image** of the camera. The refresh property will be used to refresh the image
  * - videoUrl
    - | this is the url for the fullscreen live **video** stream. I have tested with an mjpeg stream and it works well

The above IP camera block will show a preview (image that is refreshed) in your Dashticz screen. When you click on the preview, the camera block will become fullscreen, and switch to the live video stream. There will be a handle at the bottom center of the screen, used to display the camera tray. When clicked any other cameras will be presented in the tray. If you click on them, it will update the fullscreen video stream.
