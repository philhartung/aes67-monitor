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
				<th @click="setSort('tags')" style="cursor: pointer">
					Tags
					<span v-if="sortKey === 'tags'">
						{{ sortOrder === 1 ? "▲" : "▼" }}
					</span>
				</th>
				<th @click="setSort('info')" style="cursor: pointer">
					Info
					<span v-if="sortKey === 'info'">
						{{ sortOrder === 1 ? "▲" : "▼" }}
					</span>
				</th>
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
						<small
							v-else
							class="d-inline-flex px-2 py-1 fw-semibold text-danger-emphasis bg-danger-subtle border border-danger-subtle rounded-2"
							>{{ stream.unsupportedReason }}</small
						>
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
import { ref, computed } from "vue";

export default {
	name: "StreamsPage",
	setup() {
		const sortKey = ref("name");
		const sortOrder = ref(1);

		function setSort(key) {
			if (sortKey.value === key) {
				sortOrder.value = -sortOrder.value;
			} else {
				sortKey.value = key;
				sortOrder.value = 1;
			}
		}

		function getSortValue(stream, key) {
			switch (key) {
				case "name":
					return stream.name;
				case "mcast":
					return stream.mcast;
				case "address":
					return stream.origin.address;
				case "format":
					return stream.isSupported
						? `${stream.codec} ${stream.samplerate}Hz ${stream.channels}`
						: "";
				case "info":
					return stream.media[0].description ? stream.media[0].description : "";
				case "tags":
					var tags = "";
					if (stream.dante) tags += "Dante ";
					if (stream.manual) tags += "Manual ";
					if (stream.announce) tags += "SAP ";
					return tags.trim();
				default:
					return stream[key];
			}
		}

		const sortedStreams = computed(() => {
			const streamsList = searchStreams();
			return streamsList.slice().sort((a, b) => {
				let propA = getSortValue(a, sortKey.value);
				let propB = getSortValue(b, sortKey.value);
				if (typeof propA === "string") propA = propA.toLowerCase();
				if (typeof propB === "string") propB = propB.toLowerCase();
				if (propA < propB) return -1 * sortOrder.value;
				if (propA > propB) return 1 * sortOrder.value;
				return 0;
			});
		});

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
		deleteStream(id) {
			window.electronAPI.sendMessage({ type: "delete", data: id });
		},
	},
};
</script>

<style></style>
