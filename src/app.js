import { ref, computed } from "vue";

export const page = ref("streams");
export const search = ref({ streams: "", interfaces: "", devices: "" });
export const streamCount = ref(0);
export const channelCount = ref(0);
export const interfaceCount = ref(0);
export const streams = ref([]);
export const streamCountDisplay = ref(true);
export const audioInterfaces = ref([]);
export const networkInterfaces = ref([]);
export const selectedStream = ref(null);
export const selectedChannel = ref([]);
export const visibleStreams = ref(0);
export const playing = ref("");
export const persistentData = ref({
	settings: {
		bufferSize: 16,
		bufferEnabled: true,
		hideUnsupported: true,
		sdpDeleteTimeout: 300,
		sidebarCollapsed: false,
	},
});

export const rawSDP = ref({
	sdp: "",
	announce: false,
});

export const isBackBtnActive = () => {
	if (page.value == "stream" || page.value == "sdp") {
		return true;
	}

	return false;
};

export const goBack = () => {
	switch (page.value) {
		case "stream":
			page.value = "streams";
			break;
		case "sdp":
			page.value = "streams";
			break;
	}
};

export const getTitle = () => {
	switch (page.value) {
		case "stream":
			return selectedStream.value.name;
		case "sdp":
			return "Add Stream";
		case "interfaces":
			return "Audio Interfaces";
	}

	return page.value.charAt(0).toUpperCase() + page.value.slice(1);
};

export const isPageSearchable = () => {
	if (page.value == "streams" || page.value == "devices") {
		return true;
	}

	return false;
};

export const viewPage = (newPage) => {
	if (page.value == "settings") {
		saveSettings();
	}
	page.value = newPage;
};

export const getPageTitle = () => {
	switch (page.value) {
		case "stream":
			return "Streams";
		case "sdp":
			return "Streams";
	}
};

export const setSidebarStatus = (status) => {
	persistentData.value.settings.sidebarCollapsed = status;
	updatePersistentData("settings");
};

export const searchStreams = () => {
	let filteredStream = streams.value.filter((stream) => {
		return (
			(stream.name.toLowerCase().includes(search.value.streams.toLowerCase()) ||
				stream.origin.address
					.toLowerCase()
					.includes(search.value.streams.toLowerCase()) ||
				stream.id.includes(search.value.streams)) &&
			(stream.isSupported || !persistentData.value.settings.hideUnsupported)
		);
	});

	visibleStreams.value = filteredStream.length;
	return filteredStream;
};

export const searchDevices = computed(() => {
	const devices = [...new Set(streams.value.map((obj) => obj.origin.address))];

	if (!persistentData.value.devices) {
		persistentData.value.devices = {};
	}

	for (let i = 0; i < devices.length; i++) {
		if (persistentData.value.devices[devices[i]] === undefined) {
			persistentData.value.devices[devices[i]] = {
				name: devices[i],
				description: "-",
				count: streams.value.filter(
					(stream) => stream.origin.address == devices[i]
				).length,
			};
		} else {
			persistentData.value.devices[devices[i]].count = streams.value.filter(
				(stream) => stream.origin.address == devices[i]
			).length;
		}
	}

	return devices.filter((device) => {
		return (
			device.includes(search.value.devices) ||
			persistentData.value.devices[device].name
				.toLowerCase()
				.includes(search.value.devices.toLowerCase()) ||
			persistentData.value.devices[device].description
				.toLowerCase()
				.includes(search.value.devices.toLowerCase())
		);
	});
});

export const getDate = (timestamp) => {
	return new Date(timestamp).toLocaleString();
};

export const viewDevice = (device) => {
	search.value.streams = device;
	page.value = "streams";
	document.getElementById("search-input").focus();
};

export const getTextareaRowNumber = () => {
	return selectedStream.value.raw.split("\n").length - 1;
};

export const viewStream = (stream) => {
	page.value = "stream";
	selectedStream.value = stream;
	console.log(stream.name);
};

export const isDevMode = () => {
	return process.env.NODE_ENV === "development";
};

export const getAudioOutputDevices = () => {
	return audioInterfaces.value.filter((device) => {
		return device.outputChannels > 0;
	});
};

export const getAudioInputDevices = () => {
	return audioInterfaces.value.filter((device) => {
		return device.inputChannels > 0;
	});
};

export const saveSDP = () => {
	sendMessage({
		type: "addStream",
		data: {
			sdp: rawSDP.value.sdp,
			announce: rawSDP.value.announce,
		},
	});

	rawSDP.value.sdp = "";
	page.value = "streams";
};

export const getChannelSelectValues = (stream) => {
	let mono = [];
	let stereo = [];

	for (var i = 0; i < stream.channels; i += 1) {
		mono.push({
			value: i + "," + i,
			string: i + 1 + " Mono",
		});

		if (i % 2 == 0 && stream.channels > 1) {
			stereo.push({
				value: i + "," + (i + 1),
				string: i + 1 + " + " + (i + 2) + " Stereo",
			});
		}
	}

	let values = stereo.concat(mono);

	if (!selectedChannel.value[stream.id]) {
		selectedChannel.value[stream.id] = values[0].value;
	}

	return values;
};

export const playStream = (stream) => {
	if (playing.value == stream.id) {
		playing.value = "";
		sendMessage({ type: "stop" });
	} else {
		playing.value = stream.id;

		let channelMapping = selectedChannel.value[stream.id].split(",");
		let channel0 = parseInt(channelMapping[0]);
		let channel1 = parseInt(channelMapping[1]);

		sendMessage({
			type: "play",
			data: {
				id: stream.id,
				mcast: stream.mcast,
				port: stream.media[0].port,
				addr: stream.origin.address,
				codec: stream.codec,
				ptime: stream.media[0].ptime,
				samplerate: stream.samplerate,
				channels: stream.channels,
				ch1Map: channel0,
				ch2Map: channel1,
				jitterBufferEnabled: persistentData.value.settings.bufferEnabled,
				jitterBufferSize: persistentData.value.settings.bufferSize,
			},
		});
	}
};

export const setCurrentAudioInterface = (device) => {
	sendMessage({
		type: "setAudioInterface",
		data: {
			inputChannels: device.inputChannels,
			outputChannels: device.outputChannels,
			name: device.name,
		},
	});

	if (playing.value != "") {
		console.log("Triggering restart");
		sendMessage({ type: "restart" });
	}
};

export const sendMessage = (message) => {
	if (window && window.electronAPI) {
		window.electronAPI.sendMessage(message);
	} else {
		console.error("Could not send message to backend!");
	}
};

export const updatePersistentData = (key) => {
	sendMessage({
		type: "save",
		key: key,
		data: JSON.stringify(persistentData.value[key]),
	});
};

export const saveSettings = () => {
	const address = document.getElementById("networkSelect").value;
	updatePersistentData("settings");
	sendMessage({ type: "setNetwork", data: address });
	page.value = "streams";
};

if (window.electronAPI) {
	window.electronAPI.recvMessage((message) => {
		switch (message.type) {
			case "streams":
				streams.value = message.data;
				streamCount.value = message.data.length;
				break;
			case "devices":
				console.log("devices", message.data);
				break;
			case "interfaces":
				networkInterfaces.value = message.data;
				break;
			case "audioDevices":
				audioInterfaces.value = message.data;
				interfaceCount.value = message.data.length;
				break;
			case "updatePersistentData":
				persistentData.value = message.data;
				break;
			default:
				console.log(message.type, message.data);
		}
	});

	sendMessage({ type: "update" });
} else {
	console.log("Running outside of electron");
}
