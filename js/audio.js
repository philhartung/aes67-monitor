const { RtAudio, RtAudioFormat } = require('audify');
const dgram = require('dgram');

//init
var init = false;
let rtAudio;
const samplerate = 48000;

//options
var mcastAddr = '';
var networkAddress = '';
var channelCount = 0;
var channel1Map = 0;
var channel2Map = 0;

var client = dgram.createSocket({ type: 'udp4', reuseAddr: true });
client.on('listening', function() {});
client.bind(5004);

client.on('message', function(buffer, remote) {
	var pcm = buffer.slice(12);
	var samples = (pcm.length / 3) / channelCount;
	var out = Buffer.alloc(samples * 4);

	if(samples != 48){
		return;
	}

	for(var sample = 0; sample < samples; sample++){
		out.writeUInt16LE(pcm.readUInt16BE((sample * channelCount + channel1Map) * 3), sample * 4);
		out.writeUInt16LE(pcm.readUInt16BE((sample * channelCount + channel2Map) * 3), sample * 4 + 2);
	}

	rtAudio.write(out);
});

exports.start = function(mcast, chCount, ch1, ch2){
	if(!init){
		return;
	}

	if(mcastAddr != ''){
		client.dropMembership(mcastAddr, networkAddress);
	}

	mcastAddr = mcast;
	channelCount = chCount;
	channel1Map = ch1;
	channel2Map = ch2;

	client.addMembership(mcastAddr, networkAddress);
}

exports.stop = function(){
	if(!init){
		return;
	}

	if(mcastAddr != ''){
		client.dropMembership(mcastAddr, networkAddress);
		mcastAddr = '';
	}
}

exports.setNetworkInterface = function(addr){
	networkAddress = addr;
}

exports.initAudio = function(api, id, first){
	rtAudio = new RtAudio(api);
	rtAudio.openStream({deviceId: id, nChannels: 2, firstChannel: first}, null, RtAudioFormat.RTAUDIO_SINT16, samplerate, 48, "AES67 Monitor");
	rtAudio.start();
	init = true;
}