const { RtAudio, RtAudioFormat } = require('audify');
const dgram = require('dgram');

const args = JSON.parse(process.argv[2]);
const client = dgram.createSocket({ type: 'udp4', reuseAddr: true });

//set up variables for lates use
let fpp = (args.samplerate/1000) * args.ptime;
let bytesPerSample = (args.codec == 'L24' ? 3 : 2);
let expectedPacketSize = 12 + (fpp * bytesPerSample * args.channels);
let out = Buffer.alloc(fpp * 4);

client.on('listening', function() {
	client.addMembership(args.mcast, args.networkInterface);
});

client.on('message', function(buffer, remote) {
	if(buffer.length != expectedPacketSize || remote.address != args.addr){
		return;
	}

	for(let sample = 0; sample < fpp; sample++){
		out.writeUInt16LE(buffer.readUInt16BE((sample * args.channels + args.ch1Map) * bytesPerSample + 12), sample * 4);
		out.writeUInt16LE(buffer.readUInt16BE((sample * args.channels + args.ch2Map) * bytesPerSample + 12), sample * 4 + 2);
	}

	rtAudio.write(out);
});

//init audio api
let rtAudio = new RtAudio(args.audioAPI);
rtAudio.openStream({deviceId: args.audioDevice, nChannels: 2, firstChannel: 0}, null, RtAudioFormat.RTAUDIO_SINT16, args.samplerate, fpp, "AES67 Monitor");
rtAudio.start();

//init network stuff
//client.bind(5004, args.addr); //wont work, needs more testing
client.bind(5004);