/* global Dashticz */

var DT_secpanel = {
	name: "secpanel",
	init: function() {
		var usrinfo = '';
        if (typeof (usrEnc) !== 'undefined' && usrEnc !== '') usrinfo = 'username=' + usrEnc + '&password=' + pwdEnc + '&';
		this.url=settings['domoticz_ip'] + '/json.htm?' + usrinfo;
		ion.sound({
			sounds: [
				{name: "arm"},
				{name: "disarm"},
				{name: "key"},
				{name: "wrongcode"}
			],

			// main config
			path: "sounds/",
			preload: true,
			multiplay: true,
			volume: 0.9
		});

	},
    run: function(me) {
        $(me.mountPoint + ' .dt_state').html(secpanel);
        ShowStatus();
        SetRefreshTimer();

    }
}

Dashticz.register(DT_secpanel);

/*
<!DOCTYPE HTML>
<html lang="en-US">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black" />
	<meta http-equiv="content-type" content="text/html; charset=utf-8" />
	<title>Domoticz Security Panel</title>
	<link rel="stylesheet" href="css/style.css">
	<script src="js/ion.sound.min.js"></script>
	<script src="../js/jquery-3.3.1.min.js"></script>
	<script src="../js/i18next-1.8.0.min.js"></script>
	<script src="../js/domoticz.js"></script>
	<script src="../js/md5.js"></script>
	<script type="text/javascript">
		ion.sound({
			sounds: [
				{name: "arm"},
				{name: "disarm"},
				{name: "key"},
				{name: "wrongcode"}
			],

			// main config
			path: "media/",
			preload: true,
			multiplay: true,
			volume: 0.9
		});
*/
		function ShowError(error) {
			if (error=="NoConnect") {
				$('#digitdisplay').val("no connect");
			}
			else if (error=="NoOkData") {
				$('#digitdisplay').val("no ok data");
			}
			else {
				$('#digitdisplay').val("unkown err");
			}
			RefreshTimer=setTimeout(function() {
                SetRefreshTimer();}, 60000);
        }

		function ShowStatus() {
			$.ajax({
				url: DT_secpanel.url+'type=command&param=getsecstatus',
				//async: false,
				dataType: 'json',
				success: function(data) {
					if (data.status != "OK") {
						ShowError('NoOkData');
						return;
					}
					else {
						var displaytext="";
						if (data.secstatus==0) displaytext="DISARMED";
						else if (data.secstatus==1) displaytext="ARM HOME";
						else if (data.secstatus==2) displaytext="ARM AWAY";
						else displaytext="UNKNOWN";
						$('#digitdisplay').val("* "+displaytext+" *");
					}
				},
				error: function(data){
					if (data.status==401) { // 401 : Unauthorized
						window.location = "/index.html";
					}
					else {
						ShowError('NoConnect');
					}
					return;
				}
			});
			if (1==2) {
				var elements = document.getElementsByClassName('digit');
				for(var i=0; i<elements.length; i++) {
					elements[i].setAttribute('onClick','AddDigit('+(i+1)+');');
				}
				document.getElementById('setall').setAttribute('onClick','beep();');
			}
			$('#password').val("");
		}

		function SetRefreshTimer() {
			if (typeof(RefreshTimer) != "undefined") {
				RefreshTimer=clearTimeout(RefreshTimer);
			}
			$.ajax({
				url: DT_secpanel.url+'type=command&param=getuservariables',
//				async: false,
				dataType: 'json',
				success: function(data) {
					if (data.status != "OK") {
						ShowError('NoOkData');
						return;
					}
					else {
						var timer = 60000;
						if (typeof(data.result) != "undefined") {
							$.each(data.result, function(i,item) {
								if (item.Name=='secpanel-autorefresh') {
									timer=item.Value*1000;
								}
							});
						}
						RefreshTimer=setTimeout(function() {
							doRefresh()
						}, timer);

					}
				},
				error: function(){
					ShowError('NoConnect');
					return;
				}
			});
		}

		var CountdownTimer = 0;
		function countdown() {
			if (timer > 1) {
				timer = timer - 1;
				beep('set');
				$('#digitdisplay').val('Arm Delay: '+timer);
			}
			else {
				clearInterval(CountdownTimer);
				beep('in');
				ShowStatus();
				SetRefreshTimer();
			}
		}

		function ArmDelay() {
			var secondelay=0;
			$.ajax({
				url: DT_secpanel.url + "type=settings",
//				async: false,
				dataType: 'json',
				success: function(data) {
					if (data.status != "OK") {
						ShowError('NoOkData');
						return;
					}
					else {
						if (typeof(data.SecOnDelay) != "undefined") {
							secondelay=data.SecOnDelay;
						}
					}
				},
				error: function(){
					ShowError('NoConnect');
					return;
				}
			});
			return secondelay;
		}

		function SetSecStatus(status) {
			clearInterval(CountdownTimer);
			var seccode=$('#password').val();
			if (isNaN(seccode)) {
				beep('error');
				return;
			}
			if (typeof(RefreshTimer) != "undefined") RefreshTimer=clearTimeout(RefreshTimer);
			if (typeof(CodeSetTimer) != "undefined") CodeSetTimer=clearTimeout(CodeSetTimer);

			$.ajax({
				url: DT_secpanel.url+"type=command&param=setsecstatus&secstatus=" + status + "&seccode=" + $.md5(seccode),
//				async: false,
				dataType: 'json',
				success: function(data) {
					if (data.status != "OK") {
						if (data.message=="WRONG CODE") {
							$('#digitdisplay').val($.t('* WRONG CODE *'));
							CodeSetTimer=setTimeout('ShowStatus(); SetRefreshTimer();', 2000);
							$('#password').val("");
							beep('error');
						}
						else {
							ShowError('NoOkData');
							return;
						}
						return;
					}
					else {
						ShowStatus();
						if (status==1 || status==2) {
							timer=ArmDelay();
							if (timer>0) {
								CountdownTimer = setInterval("countdown();", 1000);
								beep('set');
							}
							else {
								beep('in');
							}
						}
						else {
							SetRefreshTimer();
							beep('out');
						}
					}
				},
				error: function(){
					ShowError('NoConnect');
					return;
				}
			});
		}

		function AddDigit(digit) {
			beep();
			if (typeof(CodeSetTimer) != "undefined") {
				CodeSetTimer=clearTimeout(CodeSetTimer);
			}
			if (typeof(RefreshTimer) != "undefined") {
				RefreshTimer=clearTimeout(RefreshTimer);
			}
			if (typeof(CountdownTimer) != "undefined") {
				CountdownTimer=clearInterval(CountdownTimer)
				$('#digitdisplay').val("");
			}
			CodeSetTimer=setTimeout(function() {
                doRefresh()
            }, 10000);

			var orgtext=$('#password').val();
			if (isNaN(orgtext)) orgtext="";

			var newtext=orgtext+digit;
			var codeinput="";
			for(var i=0; i<newtext.length; i++) {
				codeinput=codeinput+'#';
			}

			$('#digitdisplay').val(codeinput);
			$('#password').val(newtext);
        }
        
        function doRefresh() {
            ShowStatus();
            SetRefreshTimer()
        }

		function beep(tone) {
			if (tone=="error") {
				ion.sound.play("wrongcode");
			}
			else if (tone=="set") {
				ion.sound.play("key");
			}
			else if (tone=="in") {
				ion.sound.play("arm");
			}
			else if (tone=="out") {
				ion.sound.play("disarm");
			}
			else {
				ion.sound.play("key");
			}
		}
/*
		function SetLanguageEx(lng) {
			$.i18n.init({
				resGetPath: '/i18n/domoticz-__lng__.json',
				fallbackLng: false,
				getAsync: false,
				debug: false,
				useCookie: false,
				nsseparator: 'aadd',
				keyseparator: 'bbcc',
				lng: lng
			});
			$(".nav").i18n();
			MakeDatatableTranslations();
        }*/
        /*
		$(document).ready(function() {
			$.ajax({
				 url: "../json.htm?type=command&param=getlanguage",
				 async: false,
				 dataType: 'json',
				 success: function(data) {
					if (typeof data.language != 'undefined') {
						SetLanguageEx(data.language);
					}
					else {
						SetLanguageEx('en');
					}
				 },
				 error: function(){
				 }
			});
			ShowStatus();
			SetRefreshTimer();
		});*/

var secpanel = `
	<div id="main">
		<div class="main-border">
			<div id="keypad">
				<div class="keypad-header">
					<div class="title" onClick="javascript:main.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);">Domoticz Security Panel</div>
				</div>
				<form name="keypadinput">
					<input type="text" id="digitdisplay" value="" name="digitdisplay" disabled="disabled" />
					<input type="hidden" id="password" value="" name="password" />
					<ul class="keypad-keys">
						<li class="digit" onClick="javascript:AddDigit('1');">1</li>
						<li class="digit" onClick="javascript:AddDigit('2');">2</li>
						<li class="digit" onClick="javascript:AddDigit('3');">3</li>
						<li class="disarm" onClick="javascript:SetSecStatus(0);">Disarm</li>
					</ul>
					<ul class="keypad-keys">
						<li class="digit" onClick="javascript:AddDigit('4');">4</li>
						<li class="digit" onClick="javascript:AddDigit('5');">5</li>
						<li class="digit" onClick="javascript:AddDigit('6');">6</li>
						<li class="arm" onClick="javascript:SetSecStatus(1);">Arm Home</li>
					</ul>
					<ul class="keypad-keys">
						<li class="digit" onClick="javascript:AddDigit('7');">7</li>
						<li class="digit" onClick="javascript:AddDigit('8');">8</li>
						<li class="digit" onClick="javascript:AddDigit('9');">9</li>
						<li class="arm" onClick="javascript:SetSecStatus(2);">Arm Away</li>
					</ul>
					<ul class="keypad-keys">
						<li style="visibility: hidden;"></li>
						<li class="digit" onClick="javascript:AddDigit('0');">0</li>
						<li style="visibility: hidden;"></li>
						<li class="cancel" onClick="javascript:beep(); ShowStatus();">Cancel</li>
					</ul>
				</form>
			</div>
		</div>
	</div>
`
