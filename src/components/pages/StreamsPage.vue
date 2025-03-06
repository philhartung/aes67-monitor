<template>
	<div class="alert alert-primary" role="alert" v-if="visibleStreams == 0">
		No streams found.
		<span v-if="streamCount == 0"
			>It might take a few seconds for streams to show up.</span
		>
	</div>

	<table class="table table-sm table-borderless" id="streams-table">
		<thead v-if="visibleStreams > 0">
			<tr>
				<th>Name</th>
				<th>Multicast</th>
				<th>Tags</th>
				<th>Info</th>
				<th>Device Address</th>
				<th>Format</th>
				<th v-if="streamCount > 0">Channel</th>
				<th></th>
				<th></th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			<template v-for="stream in searchStreams()" :key="stream.id">
				<tr>
					<td>{{ stream.name }}</td>
					<td>{{ stream.mcast }}:{{ stream.media[0].port }}</td>
					<td>
						<span class="badge bg-primary" v-if="stream.dante">Dante</span>
						&nbsp;
						<span class="badge bg-primary" v-if="stream.manual">Manual</span>
						&nbsp;
						<span class="badge bg-primary" v-if="stream.announce">SAP</span>
					</td>
					<td>
						{{ stream.media[0].description ? stream.media[0].description : "" }}
					</td>
					<td>{{ stream.origin.address }}</td>
					<td>
						<span v-if="stream.isSupported"
							>{{ stream.codec }} / {{ stream.samplerate }}Hz /
							{{ stream.channels }}</span
						>
					</td>
					<td v-if="streamCount > 0">
						<select
							class="form-select form-select-sm"
							v-model="selectedChannel[stream.id]"
							:disabled="stream.id === playing"
							v-if="stream.isSupported"
						>
							<template
								v-for="value in getChannelSelectValues(stream)"
								:key="value.value"
							>
								<option :value="value.value">
									{{ value.string }}
								</option>
							</template>
						</select>
						<span v-else>{{ stream.unsupportedReason }}</span>
					</td>
					<td>
						<button
							class="btn btn-sm"
							:class="{
								'btn-success': stream.id !== playing,
								'btn-danger': stream.id === playing,
							}"
							@click="playStream(stream)"
							v-if="stream.isSupported"
						>
							{{ stream.id === playing ? "Stop" : "Play" }}
						</button>
					</td>
					<td>
						<button class="btn btn-sm btn-primary" @click="viewStream(stream)">
							View
						</button>
					</td>
					<td>
						<button
							class="btn btn-sm btn-danger"
							v-if="stream.manual"
							@click="deleteStream(stream.id)"
						>
							Delete
						</button>
					</td>
				</tr>
			</template>
		</tbody>
	</table>
</template>

<script>
import {
	searchStreams,
	streams,
	streamCount,
	viewStream,
	getChannelSelectValues,
	selectedChannel,
	playStream,
	visibleStreams,
	playing,
	persistentData,
} from "../../app.js";

export default {
	name: "StreamsPage",
	methods: {
		deleteStream(id) {
			window.electronAPI.sendMessage({ type: "delete", data: id });
		},
	},
	setup() {
		return {
			searchStreams,
			streams,
			streamCount,
			viewStream,
			getChannelSelectValues,
			selectedChannel,
			playStream,
			visibleStreams,
			playing,
			persistentData,
		};
	},
};
</script>

<style>
#streams-table th:nth-child(7),
#streams-table td:nth-child(7) {
	max-width: 90px;
	overflow: hidden;
}
</style>
