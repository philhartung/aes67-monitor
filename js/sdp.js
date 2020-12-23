const dgram = require('dgram');
const sdpTransform = require('sdp-transform');
const crypto = require('crypto');

const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
const supportedSampleRates = [16000, 32000, 44100, 48000, 88200, 96000, 192000];
let address;
let sessions = {};
let deleteTimeout = 5 * 60 * 1000;

const preParse = function(sdp){
	//check if valid for playback
	sdp = isSupportedStream(sdp);
	sdp.dante = (sdp.keywords == 'Dante');

	//get multicast from connection
	if(sdp.media[0] && sdp.media[0].connection && sdp.media[0].connection.ip){
		sdp.mcast = sdp.media[0].connection.ip.split('/')[0];
	}else if(sdp.connection && sdp.connection.ip){
		sdp.mcast = sdp.connection.ip.split('/')[0];
	}else{
		sdp.mcast = '-';
		sdp.isSupported = false;
	}

	sdp.description = sdp.description ? sdp.description : '-';
	if(sdp.description == '-' && sdp.media[0].description){
		sdp.description = sdp.media[0].description;
	}

	//put all filter relevant stuff into one string (name, description, multicast, unicast host)
	sdp.filterBy = (sdp.name+' '+sdp.origin.address+' '+sdp.description+' '+sdp.mcast).toLowerCase();

	if(sdp.isSupported){
		sdp.codec = sdp.media[0].rtp[0].codec;
		sdp.samplerate = sdp.media[0].rtp[0].rate;
		sdp.channels = sdp.media[0].rtp[0].encoding;
		sdp.rtpMap = sdp.codec+'/'+sdp.samplerate+'/'+sdp.channels;
	}else{
		sdp.rtpMap = '-';
	}

	return sdp;
}

const isSupportedStream = function(sdp){
	if(sdp.media.length != 1){
		sdp.isSupported = false;
		sdp.unsupportedReason = 'Unsupported media type';
		return sdp;
	}

	if(sdp.media[0].type != 'audio' || sdp.media[0].protocol != 'RTP/AVP'){
		sdp.isSupported = false;
		sdp.unsupportedReason = 'Unsupported media type';
		return sdp;
	}

	if(sdp.media[0].rtp.length != 1){
		sdp.isSupported = false;
		sdp.unsupportedReason = 'Unsupported rtpmap';
		return sdp;
	}

	if(supportedSampleRates.indexOf(sdp.media[0].rtp[0].rate) === -1){
		sdp.isSupported = false;
		sdp.unsupportedReason = 'Unsupported samplerate';
		return sdp;
	}

	if(sdp.media[0].rtp[0].codec != 'L24' && sdp.media[0].rtp[0].codec != 'L16'){
		sdp.isSupported = false;
		sdp.unsupportedReason = 'Unsupported codec';
		return sdp;
	}

	if(sdp.media[0].rtp[0].encoding < 1 || sdp.media[0].rtp[0].encoding > 8){
		sdp.isSupported = false;
		sdp.unsupportedReason = 'Unsupported channel number';
		return sdp;
	}

	sdp.isSupported = true;
	return sdp;
}

socket.on('message', function(message, rinfo) {
	if(message.length <= 24 || message.toString('ascii', 8, 23) != 'application/sdp'){
		return;
	}

	let rawSDP = message.toString('ascii', 24);
	let sdp = sdpTransform.parse(rawSDP);

	if(!sdp.origin || !sdp.name){
		return;
	}

	sdp.raw = rawSDP;
	sdp.id = crypto.createHash('md5').update(JSON.stringify(sdp.origin)).digest('hex');
	sdp.lastSeen = Date.now();
	sdp.manual = false;
	
	if(sessions[sdp.id] && sessions[sdp.id].manual === true){
		return;
	}

	sessions[sdp.id] = preParse(sdp);
});

const announceStream = function(rawSDP, addr){
	let sapHeader = Buffer.alloc(8);
	let sapContentType = Buffer.from('application/sdp\0');
	let ip = addr.split('.');

	sapHeader.writeUInt8(0x20);
	sapHeader.writeUInt16LE(0xefef, 2);
	sapHeader.writeUInt8(parseInt(ip[0]), 4);
	sapHeader.writeUInt8(parseInt(ip[1]), 5);
	sapHeader.writeUInt8(parseInt(ip[2]), 6);
	sapHeader.writeUInt8(parseInt(ip[3]), 7);

	let sdpBody = Buffer.from(rawSDP);
	let sdpMsg = Buffer.concat([sapHeader, sapContentType, sdpBody]);

	socket.send(sdpMsg, 9875, '239.255.255.255', function(err){});
}

exports.init = function(address){
	this.address = address;

	socket.on('listening', function() {
		socket.addMembership('239.255.255.255', address);
		socket.setMulticastInterface(address)
	});

	socket.bind(9875);
}

exports.setNetworkInterface = function(address){
	if(this.address != address){
		socket.dropMembership('239.255.255.255', this.address);
		this.address = address;
		
		//delete all streams except manually added ones
		let keys = Object.keys(sessions);
		for(let i = 0; i < keys.length; i++){		
			if(!sessions[keys[i]].manual){
				delete sessions[keys[i]];
			}
		}

		socket.addMembership('239.255.255.255', address);
		socket.setMulticastInterface(address);
	}
}

exports.getSessions = function(){
	let keys = Object.keys(sessions);

	for(let i = 0; i < keys.length; i++){		
		if((Date.now() - sessions[keys[i]].lastSeen) > deleteTimeout && !sessions[keys[i]].manual){
			delete sessions[keys[i]];
		}
	}

	return Object.keys(sessions).map(function(key){return sessions[key];});
}

exports.addStream = function(rawSDP, announce){
	let sdp = sdpTransform.parse(rawSDP);

	if(!sdp.origin || !sdp.name){
		return;
	}

	sdp.raw = rawSDP;
	sdp.id = crypto.createHash('md5').update(JSON.stringify(sdp.origin)).digest('hex');
	sdp.manual = true;
	sdp.announce = announce;

	sessions[sdp.id] = preParse(sdp);
}

exports.deleteStream = function(id){
	delete sessions[id];
}

exports.setDeleteTimeout = function(timeout){
	deleteTimeout = timeout;
}

setInterval(function(){
	let keys = Object.keys(sessions);

	for(let i = 0; i < keys.length; i++){		
		if(sessions[keys[i]].announce){
			var rawSDP = sessions[keys[i]].raw;
			announceStream(rawSDP, sessions[keys[i]].origin.address);
		}
	}
}, 30 * 1000);