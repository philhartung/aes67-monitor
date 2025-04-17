const dgram = require("dgram");
const sdpTransform = require("sdp-transform");
const crypto = require("crypto");

const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
const supportedSampleRates = [16000, 32000, 44100, 48000, 88200, 96000, 192000];
let cb = function (error) {
	console.error(error);
};
let sessions = {};
let deleteTimeout = 5 * 60 * 1000;

const preParse = function (sdp) {
	//check if valid for playback
	sdp = isSupportedStream(sdp);
	sdp.dante = sdp.keywords == "Dante";

	//get multicast from connection
	if (sdp.media[0] && sdp.media[0].connection && sdp.media[0].connection.ip) {
		sdp.mcast = sdp.media[0].connection.ip.split("/")[0];
	} else if (sdp.connection && sdp.connection.ip) {
		sdp.mcast = sdp.connection.ip.split("/")[0];
	} else {
		sdp.mcast = "-";
		sdp.isSupported = false;
	}

	sdp.description = sdp.description ? sdp.description : "-";
	if (sdp.description == "-" && sdp.media[0].description) {
		sdp.description = sdp.media[0].description;
	}

	if (sdp.isSupported) {
		sdp.codec = sdp.media[0].rtp[0].codec;
		sdp.samplerate = sdp.media[0].rtp[0].rate;
		sdp.channels = sdp.media[0].rtp[0].encoding;
		sdp.rtpMap = sdp.codec + "/" + sdp.samplerate + "/" + sdp.channels;
	} else {
		sdp.rtpMap = "-";
	}

	return sdp;
};

const isSupportedStream = function (sdp) {
	if (sdp.media.length <= 0) {
		sdp.isSupported = false;
		sdp.unsupportedReason = "Unsupported media type";
		return sdp;
	}

	for (let i = 0; i < sdp.media.length; i++) {
		if (sdp.media[i].type != "audio" || sdp.media[i].protocol != "RTP/AVP") {
			sdp.isSupported = false;
			sdp.unsupportedReason = "Unsupported media type";
			return sdp;
		}

		if (sdp.media[i].rtp.length != 1) {
			sdp.isSupported = false;
			sdp.unsupportedReason = "Unsupported rtpmap";
			return sdp;
		}

		if (supportedSampleRates.indexOf(sdp.media[i].rtp[0].rate) === -1) {
			sdp.isSupported = false;
			sdp.unsupportedReason = "Unsupported samplerate";
			return sdp;
		}

		if (
			sdp.media[i].rtp[0].codec != "L24" &&
			sdp.media[i].rtp[0].codec != "L16"
		) {
			sdp.isSupported = false;
			sdp.unsupportedReason = "Unsupported codec";
			return sdp;
		}

		if (sdp.media[i].rtp[0].encoding < 1 || sdp.media[i].rtp[0].encoding > 64) {
			sdp.isSupported = false;
			sdp.unsupportedReason = "Unsupported channel number";
			return sdp;
		}
	}

	sdp.isSupported = true;
	return sdp;
};

socket.on("message", function (message) {
	if (
		message.length <= 24 ||
		message.toString("ascii", 8, 23) != "application/sdp"
	) {
		return;
	}

	let rawSDP = message.toString("ascii", 24);
	let sdp = sdpTransform.parse(rawSDP);
	let del = (message.readUInt8(0) & 0x4) == 0x4;

	if (!sdp.origin || !sdp.name) {
		return;
	}

	sdp.raw = rawSDP;
	sdp.id = crypto
		.createHash("md5")
		.update(JSON.stringify(sdp.origin))
		.digest("hex");
	sdp.lastSeen = Date.now();
	sdp.manual = false;

	if (del) {
		delete sessions[sdp.id];
		sendUpdate();
		return;
	}

	if (sessions[sdp.id] && sessions[sdp.id].manual === true) {
		return;
	}

	sessions[sdp.id] = preParse(sdp);
	sendUpdate();
});

socket.on("error", function (error) {
	console.error("[SDP ERROR]", error);
	if (error.message == "bind EACCES 0.0.0.0:9875") {
		cb("Could not bind to socket!");
	}
});

const announceStream = function (rawSDP, addr, header, del) {
	let sapHeader = Buffer.alloc(8);
	let sapContentType = Buffer.from("application/sdp\0");
	let ip = addr.split(".");

	if (del) {
		sapHeader.writeUInt8(0x20 | 0x4, 0);
	} else {
		sapHeader.writeUInt8(0x20, 0);
	}

	sapHeader.writeUInt16LE(header, 2); //needs to be random per Stream change because of Dante Controller
	sapHeader.writeUInt8(parseInt(ip[0]), 4);
	sapHeader.writeUInt8(parseInt(ip[1]), 5);
	sapHeader.writeUInt8(parseInt(ip[2]), 6);
	sapHeader.writeUInt8(parseInt(ip[3]), 7);

	let sdpBody = Buffer.from(rawSDP);
	let sdpMsg = Buffer.concat([sapHeader, sapContentType, sdpBody]);

	socket.send(sdpMsg, 9875, "239.255.255.255", function (err) {
		if (err) console.error("Error sending SDP Message", err);
	});
};

const init = function (address, callback) {
	this.address = address;
	cb = callback;

	socket.on("listening", function () {
		socket.setMulticastInterface(address);
		socket.addMembership("239.255.255.255", address);
	});

	socket.bind(9875);
};

const setNetworkInterface = function (address) {
	if (this.address != address) {
		console.log("SDP changing network interface to", address);
		try {
			socket.dropMembership("239.255.255.255", this.address);
		} catch (e) {
			console.error(e);
		}

		this.address = address;

		//delete all streams except manually added ones
		let keys = Object.keys(sessions);
		for (let i = 0; i < keys.length; i++) {
			if (!sessions[keys[i]].manual) {
				delete sessions[keys[i]];
			}
		}
		try {
			socket.setMulticastInterface(address);
		} catch (e) {
			console.error(e);
		}

		try {
			socket.addMembership("239.255.255.255", address);
		} catch (e) {
			cb("Could not bind to multicast Interface!");
		}

		sendUpdate();
	}
};

const addStream = function (rawSDP, announce) {
	let sdp;

	try {
		sdp = sdpTransform.parse(rawSDP);
	} catch (error) {
		console.error("Error parsing SDP", error);
		return;
	}

	if (!sdp.origin || !sdp.name) {
		return;
	}

	sdp.raw = rawSDP;
	sdp.header = crypto.randomBytes(2).readUInt16LE(0);
	sdp.id = crypto
		.createHash("md5")
		.update(JSON.stringify(sdp.origin))
		.digest("hex");
	sdp.manual = true;
	sdp.announce = announce;

	sessions[sdp.id] = preParse(sdp);

	if (announce) {
		announceStream(rawSDP, sessions[sdp.id].origin.address, sdp.header, false);
	}

	sendUpdate();
};

const deleteStream = function (id) {
	if (sessions[id] && sessions[id].announce) {
		announceStream(
			sessions[id].raw,
			sessions[id].origin.address,
			sessions[id].header,
			true
		);
	}

	delete sessions[id];
	sendUpdate();
};

const setDeleteTimeout = function (timeout) {
	deleteTimeout = timeout * 1000;
};

const sendUpdate = function () {
	let keys = Object.keys(sessions);

	for (let i = 0; i < keys.length; i++) {
		if (
			Date.now() - sessions[keys[i]].lastSeen > deleteTimeout &&
			!sessions[keys[i]].manual
		) {
			console.log("deleting");
			delete sessions[keys[i]];
		}
	}

	process.send(
		Object.keys(sessions).map(function (key) {
			return sessions[key];
		})
	);
};

setInterval(function () {
	let keys = Object.keys(sessions);

	for (let i = 0; i < keys.length; i++) {
		if (sessions[keys[i]].announce) {
			var rawSDP = sessions[keys[i]].raw;
			announceStream(
				rawSDP,
				sessions[keys[i]].origin.address,
				sessions[keys[i]].header,
				false
			);
		}
	}

	sendUpdate();
}, 30 * 1000);

process.on("message", (message) => {
	switch (message.type) {
		case "init":
			console.log("Init:", message.data);
			init(message.data, function (error) {
				process.send(
					error ? { type: "error", data: error } : { type: "success" }
				);
			});
			break;
		case "add":
			addStream(message.data.sdp, message.data.announce);
			break;
		case "delete":
			deleteStream(message.data);
			break;
		case "deleteTimeout":
			setDeleteTimeout(message.data);
			break;
		case "interface":
			setNetworkInterface(message.data);
			break;
		case "update":
			sendUpdate();
			break;
	}
});

process.on("disconnect", () => {
	process.exit(0);
});
