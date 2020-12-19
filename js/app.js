var Vue = require('vue/dist/vue.js');
var sdp = require('./js/sdp');
var audio = require('./js/audio');
var os = require('os');
var { RtAudio, RtAudioApi } = require('audify');

var app = new Vue({
	el: '#app',
	data: {
		sdp: [],
		errors: [],
		selected: {},
		audio: 0,
		page: 'sdp',
		settings: {},
		network: [],
		audiodevices: [],
		current: {},
		filterString: ""
	},
	methods: {
		parseRTPmap: function(stream){
			if(stream.media.length != 1){
				return false;
			}

			var rtpmap = stream.media[0].rtpmap.split(' ');
			var rtpFormat = rtpmap[1].split('/');

			if(rtpFormat[0] != 'L24' || rtpFormat[1] != '48000' || parseInt(rtpFormat[2]) == NaN){
				return false;
			}

			return rtpmap[1];
		},
		getMedia: function(stream){
			var rtp = app.parseRTPmap(stream);
			return rtp !== false ? rtp : 'unsupported format';
		},
		getChannels: function(stream){
			var rtp = app.parseRTPmap(stream);
			
			if(rtp === false){
				return ['unsupported'];
			}

			var rtpSplit = rtp.split('/');

			var channelCount = parseInt(rtpSplit[2]);
			var channels = [];

			//stereo
			for(var i = 1; i < channelCount; i+=2){
				channels.push({name: i+' + '+(i+1)+' Stereo', val: 'S'+i});
			}

			//mono
			for(var i = 1; i <= channelCount; i++){
				channels.push({name: i+' Mono', val: 'M'+i});
			}

			return channels;
		},
		getMcast: function(stream){
			var media = stream.media[0];
			var mcast;

			if(media.connection){
				var conn = media.connection.address.split('/');
				mcast = conn[0];
			}else{
				var conn = stream.connection.address.split('/');
				mcast = conn[0];
			}

			return mcast;
		},
		detailHandler: function(stream){
			app.current = stream;
			app.page = 'detail';
		},
		audioHandler: function(stream){
			if(stream.id == app.audio){
				app.audio = 0;
				//stop audio
				audio.stop();
			}else{
				var channel = app.selected[stream.id];
				var media = stream.media[0];

				if(stream.media.length != 1){
					console.error('unsupported media format');
					return;
				}

				let mcast = app.getMcast(stream);
				let port;
				let format;
				let samplerate;
				let channels;

				var rtpmap = media.rtpmap.split(' ');
				port = parseInt(media.port);

				if(rtpmap.length != 2){
					console.error('unsupported rtpmap (more than one media format???)');
					return;
				}

				var rtpMedia = rtpmap[1].split('/');

				format = rtpMedia[0];
				samplerate = parseInt(rtpMedia[1]);
				channels = parseInt(rtpMedia[2]);

				var channel1 = 1;
				var channel2 = 1;

				switch(channel){
					case 'S1': channel1 = 0; channel2 = 1; break;
					case 'S3': channel1 = 2; channel2 = 3; break;
					case 'S5': channel1 = 4; channel2 = 5; break;
					case 'S7': channel1 = 6; channel2 = 7; break;
					case 'M1': channel1 = 0; channel2 = 0; break;
					case 'M2': channel1 = 1; channel2 = 1; break;
					case 'M3': channel1 = 2; channel2 = 2; break;
					case 'M4': channel1 = 3; channel2 = 3; break;
					case 'M5': channel1 = 4; channel2 = 4; break;
					case 'M6': channel1 = 5; channel2 = 5; break;
					case 'M7': channel1 = 6; channel2 = 6; break;
					case 'M8': channel1 = 7; channel2 = 7; break;
				}

				audio.start(mcast, channels, channel1, channel2);
				app.audio = stream.id;
			}
		},
		filterStream: function(stream){
			if(app.filterString == ""){
				return true;
			}

			var filterString = app.filterString.toLowerCase().trim();

			return stream.name.toLowerCase().indexOf(filterString) !== -1 || app.getMcast(stream).indexOf(filterString) !== -1 || stream.origin['unicast-address'].indexOf(filterString) !== -1;
		},
		saveSettings: function(){
			app.page = 'sdp';
		}
	}
});

//init stuff
//init network options
var interfaces = os.networkInterfaces();
var interfaceNames = Object.keys(interfaces);
var addresses = [];

for(var i = 0; i < interfaceNames.length; i++){
	var interface = interfaces[interfaceNames[i]];

	for(var j = 0; j < interface.length; j++){
		if(interface[j].family == 'IPv4' && interface[j].address != '127.0.0.1'){
			addresses.push(interface[j].address);
		}
	}
}

if(addresses.length == 0){
	addresses[0] = '';
	app.errors.push('No network interface found! Please connect to a network and restart the app.');
}

app.settings.addr = addresses[0];
app.network = addresses;
audio.setNetworkInterface(addresses[0]);
sdp.setNetworkInterface(addresses[0]);

//init audio
switch(process.platform){
	case 'darwin':
		app.settings.audioapi = RtAudioApi.MACOSX_CORE;
	break;
	case 'win32':
		app.settings.audioapi = RtAudioApi.WINDOWS_WASAPI;
	break;
	case 'linux':
		app.settings.audioapi = RtAudioApi.LINUX_ALSA;
	break;
	default:
		app.settings.audioapi = RtAudioApi.UNSPECIFIED;
	break;
}

var rtAudio = new RtAudio(app.settings.audioapi);
var devices = rtAudio.getDevices();

for(var i = 0; i < devices.length; i++){
	if(devices[i].outputChannels >= 2){
		app.audiodevices.push({id: i, name: devices[i].name});
	}
}

if(app.audiodevices.length == 0){
	app.errors.push('No valid audio device found! Please connect an audio device and restart the app.');
}else if(devices[rtAudio.getDefaultOutputDevice()].outputChannels >= 2){
	app.settings.device = rtAudio.getDefaultOutputDevice();
	audio.initAudio(app.settings.audioapi, app.settings.device, 0);
}else{
	app.settings.device = app.audiodevices[0].id;
	audio.initAudio(app.settings.audioapi, app.settings.device, 0);
}

//set interval to pull sdp client for updates
setInterval(function(){
	app.sdp = sdp.getSessions();

	for(var i = 0; i < app.sdp.length; i++){
		var stream = app.sdp[i];
		var id = stream.id;
		
		if(app.selected[id] == undefined){
			var channels = app.getChannels(stream);
			app.selected[id] = channels[0].val;
		}
	}
}, 500);