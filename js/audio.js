const { RtAudio, RtAudioFormat } = require('audify');
const dgram = require('dgram');

let rtAudio;
let client;
let streamOpen = false;

exports.start = function(args){
	client = dgram.createSocket({ type: 'udp4', reuseAddr: true });

	//other constants
	const bufferSize = 1024;
	const jitterBufferSize = args.jitterBufferEnabled ? args.jitterBufferSize : 0;

	//set up constants for lates use
	const samplesPerPacket = Math.round((args.samplerate / 1000) * args.ptime);
	const bytesPerSample = (args.codec == 'L24' ? 3 : 2);
	const pcmDataSize = (samplesPerPacket * bytesPerSample * args.channels);
	const packetSize = pcmDataSize + 12;
	const pcmL16out = Buffer.alloc(samplesPerPacket * 4 * bufferSize);

	//vars
	let seqInternal = -1;

	client.on('listening', function() {
		client.addMembership(args.mcast, args.networkInterface);
	});

	client.on('message', function(buffer, remote) {
		if(buffer.length != packetSize || remote.address != args.addr){
			return;
		}

		let seqNum = buffer.readUInt16BE(2);
		let bufferIndex = (seqNum % bufferSize) * samplesPerPacket * 4;

		for(let sample = 0; sample < samplesPerPacket; sample++){
			pcmL16out.writeUInt16LE(buffer.readUInt16BE((sample * args.channels + args.ch1Map) * bytesPerSample + 12), sample * 4 + bufferIndex);
			pcmL16out.writeUInt16LE(buffer.readUInt16BE((sample * args.channels + args.ch2Map) * bytesPerSample + 12), sample * 4 + bufferIndex + 2);
		}

		if(seqInternal != -1){
			let bufferIndex = seqInternal * samplesPerPacket * 4;
			let outBuf = pcmL16out.slice(bufferIndex, bufferIndex + samplesPerPacket * 4)
			rtAudio.write(outBuf);
			seqInternal = (seqInternal + 1) % bufferSize
		}else{
			seqInternal = (seqNum - jitterBufferSize) % bufferSize;
			for(var j = 0; j < jitterBufferSize; j++){
				rtAudio.write(Buffer.alloc(samplesPerPacket * 4));
			}
		}
	});

	rtAudio = new RtAudio(args.audioAPI);
	rtAudio.openStream({deviceId: args.audioDevice, nChannels: 2, firstChannel: 0}, null, RtAudioFormat.RTAUDIO_SINT16, args.samplerate, samplesPerPacket, "AES67 Monitor");
	rtAudio.start();

	client.bind(5004);
	streamOpen = true;
}

exports.stop = function(){
	if(streamOpen){
		streamOpen = false;
		client.close();
		rtAudio.stop();
		rtAudio.clearOutputQueue();
		rtAudio.closeStream();
	}
}