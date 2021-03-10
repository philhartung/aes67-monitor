const Vue = require('vue/dist/vue.js');
const { ipcRenderer } = require('electron');
const sdp = require('./js/sdp');
const os = require('os');
const { RtAudio, RtAudioApi } = require('audify');

//sorting stuff
let preSort = function(a, b){if (a.id < b.id){return -1;};if (a.id == b.id){return 0;};return 1};
let sortingFunction = function(a, b){if (a['name'] < b['name']){return -1;};if (a['name'] == b['name']){return 0;};return 1};

let app = new Vue({
	el: '#app',
	data: {
		sdp: [],
		errors: [],
		selected: {},
		audio: 0,
		page: 'sdp',
		settings: {hideStreams: true, jitterBuffer: true, jitterBufferTime: 16, deleteTimeout: 300},
		currentSettings: {},
		network: [],
		audiodevices: [],
		current: {},
		filterString: '',
		filtered: 0,
		sortingState: 0,
		rawSDP: '',
		announceRawSDP: false,
		rawSDPDetails: ''
	},
	methods: {
		getChannels: function(stream){			
			if(!stream.isSupported){
				return [{name:'unsupported'}];
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
			app.rawSDPDetails = stream.raw;
			app.page = 'detail';
		},
		audioHandler: function(stream){
			if(stream.id == app.audio){
				app.audio = 0;
				ipcRenderer.send('asynMessage', 'stop');
			}else{
				var channelMapping = app.selected[stream.id];

				if(!stream.isSupported){
					console.error('unsupported media format');
					return;
				}

				var channel1 = 0;
				var channel2 = 0;
				var channelMappingNumber = parseInt(channelMapping.substring(1));

				if(channelMapping.substring(0,1) == 'S' && channelMappingNumber != NaN){
					channel1 = channelMappingNumber - 1;
					channel2 = channelMappingNumber;
				}else if(channelMapping.substring(0,1) == 'M' && channelMappingNumber != NaN){
					channel1 = channelMappingNumber - 1;
					channel2 = channelMappingNumber - 1;
				}

				console.log(channel1, channel2);

				for(var i = 0; i < app.audiodevices.length; i++){
					if(app.audiodevices[i].id == app.settings.device && app.audiodevices[i].samplerates.indexOf(stream.samplerate) === -1){
						alert('Samplerate not supported by audiodevice!');
						return;
					}
				}

				ipcRenderer.send('asynMessage', 'stop');
				app.audio = stream.id;

				ipcRenderer.send('asynMessage', JSON.stringify({
					mcast: stream.mcast,
					port: stream.media[0].port,
					addr: stream.origin.address,
					codec: stream.codec,
					ptime: stream.media[0].ptime,
					samplerate: stream.samplerate,
					channels: stream.channels,
					ch1Map: channel1,
					ch2Map: channel2,
					jitterBufferEnabled: app.settings.jitterBuffer,
					jitterBufferSize: app.settings.jitterBufferTime,
					audioAPI: app.settings.audioapi,
					audioDevice: app.settings.device,
					networkInterface: app.settings.addr
				}));
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
				sdp.setNetworkInterface(app.settings.addr);
				sdp.setDeleteTimeout(app.settings.deleteTimeout * 1000);
			}else{
				app.currentSettings = JSON.parse(JSON.stringify(app.settings));
			}
			
			app.page = 'sdp';
		},
		sortStreams: function(attribute){
			if(attribute == 'name' && app.sortingState == 0){
				sortingFunction = function(a, b){if (a['name'] < b['name']){return 1;};if (a['name'] == b['name']){return 0;};return -1};
				app.sortingState = 1;
			}else if(attribute == 'name'){
				sortingFunction = function(a, b){if (a['name'] < b['name']){return -1;};if (a['name'] == b['name']){return 0;};return 1};
				app.sortingState = 0;
			}

			if(attribute == 'info' && app.sortingState == 2){
				sortingFunction = function(a, b){if (a['description'] < b['description']){return 1;};if (a['description'] == b['description']){return 0;};return -1};
				app.sortingState = 3;
			}else if(attribute == 'info'){
				sortingFunction = function(a, b){if (a['description'] < b['description']){return -1;};if (a['description'] == b['description']){return 0;};return 1};
				app.sortingState = 2;
			}

			if(attribute == 'addr' && app.sortingState == 4){
				sortingFunction = function(a, b){if (a.origin.address < b.origin.address){return 1;};if (a.origin.address == b.origin.address){return 0;};return -1};
				app.sortingState = 5;
			}else if(attribute == 'addr'){
				sortingFunction = function(a, b){if (a.origin.address < b.origin.address){return -1;};if (a.origin.address == b.origin.address){return 0;};return 1};
				app.sortingState = 4;
			}

			if(attribute == 'mcast' && app.sortingState == 6){
				sortingFunction = function(a, b){if (a['mcast'] < b['mcast']){return 1;};if (a['mcast'] == b['mcast']){return 0;};return -1};
				app.sortingState = 7;
			}else if(attribute == 'mcast'){
				sortingFunction = function(a, b){if (a['mcast'] < b['mcast']){return -1;};if (a['mcast'] == b['mcast']){return 0;};return 1};
				app.sortingState = 6;
			}

			if(attribute == 'codec' && app.sortingState == 8){
				sortingFunction = function(a, b){if (a['codec'] < b['codec']){return 1;};if (a['codec'] == b['codec']){return 0;};return -1};
				app.sortingState = 9;
			}else if(attribute == 'codec'){
				sortingFunction = function(a, b){if (a['codec'] < b['codec']){return -1;};if (a['codec'] == b['codec']){return 0;};return 1};
				app.sortingState = 8;
			}

			if(attribute == 'samplerate' && app.sortingState == 10){
				sortingFunction = function(a, b){if (a['samplerate'] < b['samplerate']){return 1;};if (a['samplerate'] == b['samplerate']){return 0;};return -1};
				app.sortingState = 11;
			}else if(attribute == 'samplerate'){
				sortingFunction = function(a, b){if (a['samplerate'] < b['samplerate']){return -1;};if (a['samplerate'] == b['samplerate']){return 0;};return 1};
				app.sortingState = 10;
			}

			if(attribute == 'channels' && app.sortingState == 12){
				sortingFunction = function(a, b){if (a['channels'] < b['channels']){return 1;};if (a['channels'] == b['channels']){return 0;};return -1};
				app.sortingState = 13;
			}else if(attribute == 'channels'){
				sortingFunction = function(a, b){if (a['channels'] < b['channels']){return -1;};if (a['channels'] == b['channels']){return 0;};return 1};
				app.sortingState = 12;
			}

			app.sdp.sort(preSort).sort(sortingFunction);
		},
		addSDPHandler: function(){
			sdp.addStream(app.rawSDP, app.announceRawSDP);
			app.page = 'sdp';
			app.rawSDP = '';
			app.announceRawSDP = false;
			syncSDPStreams();
		},
		deleteHandler: function(stream){
			sdp.deleteStream(stream.id);
			syncSDPStreams();
		},
		calculateBitrate: function(stream){
			let audioBitrate = stream.samplerate * stream.channels * (stream.codec == 'L24' ? 3 : 2);
			let rtpHeader = Math.round(1000 / stream.media[0].ptime) * 12;
			return Math.round((audioBitrate + rtpHeader) / 1000) / 1000;
		},
		getPTPClocksrc: function(stream){
			var ptp = stream.media[0].tsRefClocks[0].clksrcExt.split(':');
			return ptp[1].replace(/-/g, ":");
		},
		getPTPDomain: function(stream){
			var ptp = stream.media[0].tsRefClocks[0].clksrcExt.split(':');
			return ptp[2];
		},
		saveHandler: function(stream){
			sdp.deleteStream(stream.id);
			sdp.addStream(app.rawSDPDetails, stream.announce);
			syncSDPStreams();
			app.page='sdp';
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
		app.audiodevices.push({id: i, name: devices[i].name, samplerates: devices[i].sampleRates});
	}
}

if(app.audiodevices.length == 0){
	app.errors.push('No valid audio device found! Please connect an audio device and restart the app.');
}else if(devices[rtAudio.getDefaultOutputDevice()].outputChannels >= 2){
	app.settings.device = rtAudio.getDefaultOutputDevice();
}else{
	app.settings.device = app.audiodevices[0].id;
}

app.currentSettings = app.settings;

//set interval to pull sdp client for updates
const syncSDPStreams = function(){
	app.sdp = sdp.getSessions().sort(preSort).sort(sortingFunction);

	for(var i = 0; i < app.sdp.length; i++){
		var stream = app.sdp[i];
		var id = stream.id;
		
		if(app.selected[id] == undefined){
			var channels = app.getChannels(stream);
			app.selected[id] = channels[0].val;
		}
	}
}

setInterval(function(){
	syncSDPStreams();
}, 1000);

//own update stuff, because vuejs is weird and wont render it properly
setInterval(function(){
	if(app.page == 'sdp'){
		app.filtered = $('tbody > tr').length;
	}
}, 50);