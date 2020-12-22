const dgram = require('dgram');
const sdpTransform = require('sdp-transform');
const crypto = require('crypto');

const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
let address;
let sessions = {};

const preParse = function(sdp){
	//check if valid for playback
	sdp.isValid = isValidAES67(sdp);
	sdp.dante = (sdp.keywords == 'Dante');

	//get multicast from connection
	
	if(sdp.media[0] && sdp.media[0].connection && sdp.media[0].connection.ip){
		sdp.mcast = sdp.media[0].connection.ip.split('/')[0];
	}else if(sdp.connection && sdp.connection.ip){
		sdp.mcast = sdp.connection.ip.split('/')[0];
	}else{
		sdp.mcast = '-';
		sdp.isValid = false;
	}

	sdp.description = sdp.description ? sdp.description : '-';

	//put all filter relevant stuff into one string (name, description, multicast, unicast host)
	sdp.filterBy = (sdp.name+' '+sdp.description+' '+sdp.mcast+' '+sdp.origin.address).toLowerCase();

	if(sdp.isValid){
		sdp.codec = sdp.media[0].rtp[0].codec;
		sdp.samplerate = sdp.media[0].rtp[0].rate;
		sdp.channels = sdp.media[0].rtp[0].encoding;
		sdp.rtpMap = sdp.codec+'/'+sdp.samplerate+'/'+sdp.channels;
	}else{
		sdp.rtpMap = 'unsupported format';
	}

	return sdp;
}

const isValidAES67 = function(sdp){
	if(sdp.media.length != 1){
		return false;
	}

	if(sdp.media[0].direction != 'recvonly' || sdp.media[0].type != 'audio' || sdp.media[0].protocol != 'RTP/AVP'){
		return false;
	}

	if(sdp.media[0].rtp.length != 1){
		return false;
	}

	if(sdp.media[0].rtp[0].rate != 48000 && sdp.media[0].rtp[0].rate != 44100){
		return false;
	}

	if(sdp.media[0].rtp[0].codec != 'L24' && sdp.media[0].rtp[0].codec != 'L16'){
		return false;
	}

	if(sdp.media[0].rtp[0].encoding < 1 || sdp.media[0].rtp[0].encoding > 8){
		return false;
	}

	return true;
}

socket.on('message', function(message, rinfo) {
	if(message.length <= 24 || message.toString('ascii', 8, 23) != 'application/sdp'){
		return;
	}

	let sdpRaw = message.toString('ascii', 24);
	let sdp = sdpTransform.parse(sdpRaw);

	sdp.raw = sdpRaw;
	sdp.id = crypto.createHash('md5').update(JSON.stringify(sdp.origin)).digest('hex');
	sdp.lastSeen = Date.now();

	sessions[sdp.id] = preParse(sdp);
});

exports.init = function(address){
	this.address = address;

	socket.on('listening', function() {
		socket.addMembership('239.255.255.255', address);
	});

	socket.bind(9875);
}

exports.setNetworkInterface = function(address){
	if(this.address != address){
		socket.dropMembership('239.255.255.255', this.address);
		this.address = address;
		socket.addMembership('239.255.255.255', address);
	}
}

exports.getSessions = function(){
	return Object.keys(sessions).map(function(key){return sessions[key];});
}

setInterval(function(){
	let keys = Object.keys(sessions);

	for(let i = 0; i < keys.length; i++){		
		if((Date.now() - sessions[keys[i]].lastSeen) > 5 * 60 * 1000){
			delete sessions[keys[i]];
		}
	}
}, 60000);