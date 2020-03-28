/* global Dashticz usrEnc pwdEnc settings ion*/

var DT_secpanel = {
	name: "secpanel",
	defaultCfg: {
		title: 'Domoticz Security Panel'
	},
	init: function () {
		var usrinfo = '';
		if (typeof (usrEnc) !== 'undefined' && usrEnc !== '') usrinfo = 'username=' + usrEnc + '&password=' + pwdEnc + '&';
		this.url = settings['domoticz_ip'] + '/json.htm?' + usrinfo;
		ion.sound({
			sounds: [{
					name: "arm"
				},
				{
					name: "disarm"
				},
				{
					name: "key"
				},
				{
					name: "wrongcode"
				}
			],

			// main config
			path: "sounds/",
			preload: true,
			multiplay: true,
			volume: 0.9
		});
		this.CountdownTimer = 0;
		this.timer = 0;
/*		
*/
		Dashticz.loadCSS('./css/secpanel.css');
	},
	run: function (me) {
		var secpanel = ' \
		<div id="main"> \
			<div class="main-border"> \
				<div id="keypad"> \
					<form name="keypadinput"> \
						<input type="text" id="digitdisplay" value="" name="digitdisplay" disabled="disabled" /> \
						<input type="hidden" id="password" value="" name="password" /> \
						<ul class="keypad-keys"> \
							<li class="digit" onClick="javascript:DT_secpanel.AddDigit(\'1\');">1</li> \
							<li class="digit" onClick="javascript:DT_secpanel.AddDigit(\'2\');">2</li> \
							<li class="digit" onClick="javascript:DT_secpanel.AddDigit(\'3\');">3</li> \
							<li class="secbtn disarm" onClick="javascript:DT_secpanel.SetSecStatus(0);">Disarm</li> \
						</ul> \
						<ul class="keypad-keys"> \
							<li class="digit" onClick="javascript:DT_secpanel.AddDigit(\'4\');">4</li> \
							<li class="digit" onClick="javascript:DT_secpanel.AddDigit(\'5\');">5</li> \
							<li class="digit" onClick="javascript:DT_secpanel.AddDigit(\'6\');">6</li> \
							<li class="secbtn arm" onClick="javascript:DT_secpanel.SetSecStatus(1);">Arm Home</li> \
						</ul> \
						<ul class="keypad-keys"> \
							<li class="digit" onClick="javascript:DT_secpanel.AddDigit(\'7\');">7</li> \
							<li class="digit" onClick="javascript:DT_secpanel.AddDigit(\'8\');">8</li> \
							<li class="digit" onClick="javascript:DT_secpanel.AddDigit(\'9\');">9</li> \
							<li class="secbtn arm" onClick="javascript:DT_secpanel.SetSecStatus(2);">Arm Away</li> \
						</ul> \
						<ul class="keypad-keys"> \
							<li style="visibility: hidden;"></li> \
							<li class="digit" onClick="javascript:DT_secpanel.AddDigit(\'0\');">0</li> \
							<li style="visibility: hidden;"></li> \
							<li class="secbtn cancel" onClick="javascript:DT_secpanel.beep(); DT_secpanel.ShowStatus();">Cancel</li> \
						</ul> \
					</form> \
				</div> \
			</div> \
		</div> '
		$(me.mountPoint + ' .dt_state').html(secpanel);
		this.onResize(me);
		this.ShowStatus();
		this.SetRefreshTimer();
	},
	onResize: function(me) {
		var mywidth = $(me.mountPoint + ' .dt_state').width() / 20;
		$(me.mountPoint + ' form').css('font', '' + mywidth + 'px/' + mywidth + 'px "Audiowide"');
		$(me.mountPoint + ' #digitdisplay').css('font', '' + mywidth * 2 + 'px/' + mywidth * 2 + 'px "Digital"')
		$(me.mountPoint + ' #digitdisplay').height(mywidth * 3)
		$(me.mountPoint + ' .dt_title').css('font', '' + mywidth * 1 + 'px/' + mywidth * 1 + 'px "Audiowide"');
		$(me.mountPoint + ' .title').css('font', '' + mywidth * 1 + 'px/' + mywidth * 1 + 'px "Audiowide"');
	},
	ShowError: function (error) {
		if (error == "NoConnect") {
			$('#digitdisplay').val("no connect");
		} else if (error == "NoOkData") {
			$('#digitdisplay').val("no ok data");
		} else {
			$('#digitdisplay').val("unkown err");
		}
		this.RefreshTimer = setTimeout(function () {
			DT_secpanel.SetRefreshTimer();
		}, 60000);
	},
	SetRefreshTimer: function () {
		if (typeof (this.RefreshTimer) != "undefined") {
			this.RefreshTimer = clearTimeout(this.RefreshTimer);
		}
		$.ajax({
			url: DT_secpanel.url + 'type=command&param=getuservariables',
			dataType: 'json',
			success: function (data) {
				if (data.status != "OK") {
					DT_secpanel.ShowError('NoOkData');
					return;
				} else {
					var timer = 60000;
					if (typeof (data.result) != "undefined") {
						$.each(data.result, function (i, item) {
							if (item.Name == 'secpanel-autorefresh') {
								timer = item.Value * 1000;
							}
						});
					}
					DT_secpanel.RefreshTimer = setTimeout(function () {
						DT_secpanel.doRefresh()
					}, timer);

				}
			},
			error: function () {
				DT_secpanel.ShowError('NoConnect');
				return;
			}
		});
	},

	countdown: function () {
		if (DT_secpanel.timer > 1) {
			DT_secpanel.timer = DT_secpanel.timer - 1;
			DT_secpanel.beep('set');
			$('#digitdisplay').val('Arm Delay: ' + DT_secpanel.timer);
		} else {
			clearInterval(DT_secpanel.CountdownTimer);
			DT_secpanel.beep('in');
			DT_secpanel.ShowStatus();
			DT_secpanel.SetRefreshTimer();
		}
	},

	ArmDelay: function () {
		var secondelay = 0;
		$.ajax({
			url: DT_secpanel.url + "type=settings",
			//				async: false,
			dataType: 'json',
			success: function (data) {
				if (data.status != "OK") {
					DT_secpanel.ShowError('NoOkData');
					return;
				} else {
					if (typeof (data.SecOnDelay) != "undefined") {
						secondelay = data.SecOnDelay;
					}
				}
			},
			error: function () {
				DT_secpanel.ShowError('NoConnect');
				return;
			}
		});
		return secondelay;
	},

	SetSecStatus: function (status) {
		clearInterval(this.CountdownTimer);
		var seccode = $('#password').val();
		if (isNaN(seccode)) {
			this.beep('error');
			return;
		}
		if (typeof (this.RefreshTimer) != "undefined") this.RefreshTimer = clearTimeout(this.RefreshTimer);
		if (typeof (this.CodeSetTimer) != "undefined") this.CodeSetTimer = clearTimeout(this.CodeSetTimer);

		$.ajax({
			url: DT_secpanel.url + "type=command&param=setsecstatus&secstatus=" + status + "&seccode=" + $.md5(seccode),
			dataType: 'json',
			success: function (data) {
				if (data.status != "OK") {
					if (data.message == "WRONG CODE") {
						$('#digitdisplay').val('* WRONG CODE *');
						DT_secpanel.CodeSetTimer = setTimeout(function () {
							DT_secpanel.doRefresh()
						}, 2000);
						$('#password').val("");
						DT_secpanel.beep('error');
					} else {
						DT_secpanel.ShowError('NoOkData');
						return;
					}
					return;
				} else {
					DT_secpanel.ShowStatus();
					if (status == 1 || status == 2) {
						DT_secpanel.timer = DT_secpanel.ArmDelay();
						if (DT_secpanel.timer > 0) {
							DT_secpanel.CountdownTimer = setInterval(DT_secpanel.countdown(), 1000);
							DT_secpanel.beep('set');
						} else {
							DT_secpanel.beep('in');
						}
					} else {
						DT_secpanel.SetRefreshTimer();
						DT_secpanel.beep('out');
					}
				}
			},
			error: function () {
				DT_secpanel.ShowError('NoConnect');
				return;
			}
		});
	},

	AddDigit: function (digit) {
		DT_secpanel.beep();
		if (typeof (this.CodeSetTimer) != "undefined") {
			this.CodeSetTimer = clearTimeout(this.CodeSetTimer);
		}
		if (typeof (this.RefreshTimer) != "undefined") {
			this.RefreshTimer = clearTimeout(this.RefreshTimer);
		}
		if (typeof (this.CountdownTimer) != "undefined") {
			this.CountdownTimer = clearInterval(this.CountdownTimer)
			$('#digitdisplay').val("");
		}
		this.CodeSetTimer = setTimeout( function() {
			DT_secpanel.doRefresh()
		}, 10000);

		var orgtext = $('#password').val();
		if (isNaN(orgtext)) orgtext = "";

		var newtext = orgtext + digit;
		var codeinput = "";
		for (var i = 0; i < newtext.length; i++) {
			codeinput = codeinput + '#';
		}

		$('#digitdisplay').val(codeinput);
		$('#password').val(newtext);
	},
	beep: function (tone) {
		if (tone == "error") {
			ion.sound.play("wrongcode");
		} else if (tone == "set") {
			ion.sound.play("key");
		} else if (tone == "in") {
			ion.sound.play("arm");
		} else if (tone == "out") {
			ion.sound.play("disarm");
		} else {
			ion.sound.play("key");
		}
	},
	ShowStatus: function () {
		$.ajax({
			url: DT_secpanel.url + 'type=command&param=getsecstatus',
			dataType: 'json',
			success: function (data) {
				if (data.status != "OK") {
					this.ShowError('NoOkData');
					return;
				} else {
					var displaytext = "";
					if (data.secstatus == 0) displaytext = "DISARMED";
					else if (data.secstatus == 1) displaytext = "ARM HOME";
					else if (data.secstatus == 2) displaytext = "ARM AWAY";
					else displaytext = "UNKNOWN";
					$('#digitdisplay').val("* " + displaytext + " *");
				}
			},
			error: function () {
				this.ShowError('NoConnect');
				return;
			}
		});
		$('#password').val("");
	},
	doRefresh: function () {
		this.ShowStatus();
		this.SetRefreshTimer()
	}
}

Dashticz.register(DT_secpanel);