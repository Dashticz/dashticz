/* global Dashticz _CORS_PATH settings*/

var DT_nzbget = {
    name: "nzbget",
    defaultContent: '<div id="downloads"></div>',
    defaultCfg: {
        containerClass: 'containsnzbget',
        icon: 'fas fa-cloud',
        title: 'NZBget',
        width: 12,
        refresh: 300
    },
    refresh: function (me) {
        if (!settings['host_nzbget'] || settings['host_nzbget'] === '') {
            $(me.mountPoint +' .dt_state').html('host_nzbget not defined.')
            return;
        }
//        $(me.mountPoint +' .dt_state').addClass('containsnzbget')
//        var _data = {"method": "listgroups", "nocache": new Date().getTime(), "params": [100] };
        var _data = {"method": "listgroups" };
		NZBGET.rpcUrl = settings['host_nzbget']+'/jsonrpc';
		NZBGET.call(_data,'returnNZBGET');
    }
}

Dashticz.register(DT_nzbget);

function returnNZBGET(data){
    if(data.length===0) {
        var dummy = {
            NZBName: 'No active downloads, or no connection',
            DownloadedSizeMB: 0,
            FileSizeMB: 0,
            FirstID: 123            
        }
        data.push(dummy);
    }
	if(typeof(blocks['nzbget'])!=='undefined' && typeof(blocks['nzbget']['downloads_width'])!=='undefined'){
		width = blocks['nzbget']['downloads_width'];
	}

	var t=1;
	for(var d in data){
		var html = '<div class="mh transbg nzbget'+data[d]['FirstID']+'">';
			html+='<div class="col-xs-12">';
				html+='<strong class="title">'+data[d]['NZBName']+'</strong><br />'+data[d]['DownloadedSizeMB']+'MB / '+data[d]['FileSizeMB']+'MB';
			html+='</div>';
		html+='</div>';
		if($('.containsnzbget .dt_state .nzbget'+data[d]['FirstID']).length>0){
			$('.containsnzbget .dt_state .nzbget'+data[d]['FirstID']).replaceWith(html);
		}
		else {
			$('.containsnzbget .dt_state').append(html);
		}
//		$('.containsnzbget').show();
		
		t++;
		if(t==2) t=1;							
	}
}

function resumepauseNZBget(id,func){
	_data = {"method": "editqueue", "nocache": new Date().getTime(), "params": [func, 0, "", [id]] };
	NZBGET.rpcUrl = _CORS_PATH+settings['host_nzbget']+'/jsonrpc';
	NZBGET.call(_data,'');
	$('#nzbget-'+id+' .details.pause,#nzbget-'+id+' .details.play').toggle();
}

var NZBGET = (new function($)
{
	'use strict';
	
	// Properties
	this.rpcUrl;
	//this.defaultFailureCallback;
    this.connectErrorMessage = 'Cannot establish connection';
    this.call = function(request, completed_callback, failure_callback, timeout) {
        $.getJSON(this.rpcUrl+'/'+request.method )
        .fail( function(res) {
            console.log('failure');
            console.log(res);
        })
        .then(function(result) {
            //console.log(result);
            if (result)
						{
                            var res;
							if (result.error == null)
							{
								res = result.result;
								eval(completed_callback+'(res)');
								return;
							}
							else
							{
								res = result.error.message + '<br><br>Request: ' + request;
							}
						}
        });
    }
    /*

	this.call = function(request, completed_callback, failure_callback, timeout)
	{
		request = JSON.stringify(request);
		var _this = this;
		
		//var request = JSON.stringify({nocache: new Date().getTime(), method: method, params: params});
		var xhr = new XMLHttpRequest();

		xhr.open('post', this.rpcUrl);
		
		if (timeout)
		{
			xhr.timeout = timeout;
		}

		xhr.onreadystatechange = function()
		{
            debugger;
			if (xhr.readyState === 4)
			{
				var res = 'Unknown error';
				var result;
				if (xhr.status === 200)
				{
					if (xhr.responseText != '')
					{
						try
						{
							result = JSON.parse(xhr.responseText);
						}
						catch (e)
						{
							res = e;
						}
						if (result)
						{
							if (result.error == null)
							{
								res = result.result;
								eval(completed_callback+'(res)');
								return;
							}
							else
							{
								res = result.error.message + '<br><br>Request: ' + request;
							}
						}
					}
					else
					{
						res = 'No response received.';
					}
				}
				else if (xhr.status === 0)
				{
					res = _this.connectErrorMessage;
				}
				else
				{
					res = 'Invalid Status: ' + xhr.status;
				}

				if (failure_callback)
				{
					failure_callback(res, result);
				}
				else
				{
					//_this.defaultFailureCallback(res, result);
				}
			}
		};
		xhr.send(request);
	}*/
}(jQuery));

/*
Quick help (from nzbget-directory):
   ./nzbget -s        - start nzbget in console mode
   ./nzbget -D        - start nzbget in daemon mode (in background)
   ./nzbget -C        - connect to background process
   ./nzbget -Q        - stop background process
   ./nzbget -h        - help screen with all commands

Successfully installed into /home/pi/dev/nzbget/nzbget
Web-interface is on http://localhost:6789 (login:nzbget, password:tegbzn6789)
For support please visit http://nzbget.net/forum
*/