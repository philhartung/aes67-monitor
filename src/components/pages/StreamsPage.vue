<template>
	<div class="alert alert-primary" role="alert" v-if="visibleStreams == 0">
		No streams found.
		<span v-if="streamCount == 0">
			It might take a few seconds for streams to show up.
		</span>
	</div>

	<table class="table table-sm table-borderless" id="streams-table">
		<thead v-if="visibleStreams > 0">
			<tr>
				<th @click="setSort('name')" style="cursor: pointer">
					Name
					<span v-if="sortKey === 'name'">
						{{ sortOrder === 1 ? "▲" : "▼" }}
					</span>
				</th>
				<th @click="setSort('mcast')" style="cursor: pointer">
					Multicast
					<span v-if="sortKey === 'mcast'">
						{{ sortOrder === 1 ? "▲" : "▼" }}
					</span>
				</th>
				<th>Tags</th>
				<th>Info</th>
				<th @click="setSort('address')" style="cursor: pointer">
					Device Address
					<span v-if="sortKey === 'address'">
						{{ sortOrder === 1 ? "▲" : "▼" }}
					</span>
				</th>
				<th @click="setSort('format')" style="cursor: pointer">
					Format
					<span v-if="sortKey === 'format'">
						{{ sortOrder === 1 ? "▲" : "▼" }}
					</span>
				</th>
				<th v-if="streamCount > 0">Channel</th>
				<th></th>
				<th></th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			<template v-for="stream in sortedStreams" :key="stream.id">
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
						<span v-if="stream.isSupported">
							{{ stream.codec }} / {{ stream.samplerate }}Hz /
							{{ stream.channels }}
						</span>
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
	// Importing application-wide functions and reactive variables for stream management.
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
import { ref, computed } from "vue";

export default {
	name: "StreamsPage",
	setup() {
		// Reactive variables for sorting streams.
		const sortKey = ref("name"); // Default sort by "name"
		const sortOrder = ref(1); // 1 for ascending order, -1 for descending order

		// Function to toggle or set the sorting key and order.
		function setSort(key) {
			if (sortKey.value === key) {
				// If the same key is clicked again, reverse the sorting order.
				sortOrder.value = -sortOrder.value;
			} else {
				// If a different key is clicked, change sort key and reset order to ascending.
				sortKey.value = key;
				sortOrder.value = 1;
			}
		}

		// Helper function to retrieve the value for sorting based on the key.
		function getSortValue(stream, key) {
			switch (key) {
				case "name":
					// Returns the stream name for sorting.
					return stream.name;
				case "mcast":
					// Returns the multicast address for sorting.
					return stream.mcast;
				case "address":
					// Returns the device address from the stream's origin.
					return stream.origin.address;
				case "format":
					// Returns a formatted string only if the stream is supported.
					return stream.isSupported
						? `${stream.codec} ${stream.samplerate}Hz ${stream.channels}`
						: "";
				default:
					// Returns generic property based on the key.
					return stream[key];
			}
		}

		// Computed property that returns a sorted list of streams based on the selected sort key and order.
		const sortedStreams = computed(() => {
			const streamsList = searchStreams();
			return streamsList.slice().sort((a, b) => {
				let propA = getSortValue(a, sortKey.value);
				let propB = getSortValue(b, sortKey.value);
				// For string values, perform case-insensitive comparison.
				if (typeof propA === "string") propA = propA.toLowerCase();
				if (typeof propB === "string") propB = propB.toLowerCase();
				if (propA < propB) return -1 * sortOrder.value;
				if (propA > propB) return 1 * sortOrder.value;
				return 0;
			});
		});

		// Expose methods and reactive variables to the template.
		return {
			sortedStreams,
			setSort,
			sortKey,
			sortOrder,
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
	methods: {
		// Method to delete a manual stream by sending a message through the electronAPI.
		deleteStream(id) {
			window.electronAPI.sendMessage({ type: "delete", data: id });
		},
	},
};
</script>

<style></style>
