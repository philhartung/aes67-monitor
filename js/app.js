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
		settings: {hideStreams: true, jitterBuffer: true, jitterBufferTime: 10},
		currentSettings: {},
		network: [],
		audiodevices: [],
		current: {},
		filterString: "",
		filtered: 0
	},
	methods: {
		getChannels: function(stream){			
			if(!stream.isSupported){
				return ['unsupported'];
			}

			var channels = [];

			//stereo
			for(var i = 1; i < stream.channels; i+=2){
				channels.push({name: i+' + '+(i+1)+' Stereo', val: 'S'+i});
			}

			//mono
			for(var i = 1; i <= stream.channels; i++){
				channels.push({name: i+' Mono', val: 'M'+i});
			}

			return channels;
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
				var channelMapping = app.selected[stream.id];

				if(!stream.isSupported){
					console.error('unsupported media format');
					return;
				}

				var channel1 = 0;
				var channel2 = 0;

				switch(channelMapping){
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

				audio.start(stream.mcast, stream.channels, channel1, channel2);
				app.audio = stream.id;
			}
		},
		filterStream: function(stream){
			var filterString = app.filterString.toLowerCase().trim();

			if(filterString == ""){
				return true;
			}

			return stream.filterBy.indexOf(filterString) !== -1;
		},
		saveSettings: function(bool){
			if(bool){
				app.settings = JSON.parse(JSON.stringify(app.currentSettings));
			}else{
				app.currentSettings = JSON.parse(JSON.stringify(app.settings));
			}

			//restart audio if settings changed

			//set ip for sdp
			sdp.setNetworkInterface(app.settings.addr);
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
sdp.init(addresses[0]);

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

app.currentSettings = app.settings;

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
}, 1000);

//own update stuff, because vuejs is weird and wont render it properly
setInterval(function(){
	if(app.page == 'sdp'){
		app.filtered = $('tbody > tr').length;
	}
}, 50);