const { RtAudio, RtAudioFormat } = require('audify');
const dgram = require('dgram');

const args = JSON.parse(process.argv[2]);
const client = dgram.createSocket({ type: 'udp4', reuseAddr: true });

//set up constants for lates use
const samplesPerPacket = (args.samplerate / 1000) * args.ptime;
const bytesPerSample = (args.codec == 'L24' ? 3 : 2);
const pcmDataSize = (samplesPerPacket * bytesPerSample * args.channels);
const pcmL16out = Buffer.alloc(samplesPerPacket * 4);

client.on('listening', function() {
	client.addMembership(args.mcast, args.networkInterface);
});

client.on('message', function(buffer, remote) {
	if(buffer.length != (expectedPCMDataSize + 12) || remote.address != args.addr){
		return;
	}

	for(let sample = 0; sample < samplesPerPacket; sample++){
		pcmL16out.writeUInt16LE(buffer.readUInt16BE((sample * args.channels + args.ch1Map) * bytesPerSample + 12), sample * 4);
		pcmL16out.writeUInt16LE(buffer.readUInt16BE((sample * args.channels + args.ch2Map) * bytesPerSample + 12), sample * 4 + 2);
	}

	rtAudio.write(pcmL16out);
});

//init audio api
const rtAudio = new RtAudio(args.audioAPI);
rtAudio.openStream({deviceId: args.audioDevice, nChannels: 2, firstChannel: 0}, null, RtAudioFormat.RTAUDIO_SINT16, args.samplerate, fpp, "AES67 Monitor");
rtAudio.start();

//init network stuff
//client.bind(5004, args.addr); //wont work, needs more testing
client.bind(5004);