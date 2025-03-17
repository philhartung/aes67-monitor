<template>
	<div class="row">
		<div class="col-md-3">
			<ul class="ul-hidden">
				<li>
					<b>Stream ID</b><br />
					<span class="copy">{{ selectedStream.id }}</span>
				</li>
				<li>
					<b>Address</b><br />
					<span class="copy">{{ selectedStream.origin.address }}</span>
				</li>
				<li
					v-if="selectedStream.media[0] && selectedStream.media[0].tsRefClocks"
				>
					<b>Clocksource</b><br />
					<span class="copy">{{
						selectedStream.media[0].tsRefClocks[0].clksrcExt.toUpperCase()
					}}</span>
				</li>
				<li v-else-if="selectedStream.tsRefClocks">
					<b>Clocksource</b><br />
					<span class="copy">{{
						selectedStream.tsRefClocks[0].clksrcExt.toUpperCase()
					}}</span>
				</li>
				<li
					v-if="
						selectedStream.dante ||
						selectedStream.manual ||
						selectedStream.announce ||
						(selectedStream.groups &&
							selectedStream.groups[0] &&
							selectedStream.groups[0].type == 'DUP') ||
						!selectedStream.isSupported
					"
				>
					<b>Tags</b><br />
					<span
						class="badge bg-primary me-1"
						title="Dante device"
						v-if="selectedStream.dante"
						>Dante</span
					>
					<span
						class="badge bg-primary me-1"
						title="ST 2022-7 redundant stream"
						v-if="
							selectedStream.groups &&
							selectedStream.groups[0] &&
							selectedStream.groups[0].type == 'DUP'
						"
						>2022-7</span
					>
					<span
						class="badge bg-secondary me-1"
						title="Manually added stream"
						v-if="selectedStream.manual"
						>Manual</span
					>
					<span
						class="badge bg-secondary me-1"
						title="Stream is broadcasted on the network via SAP"
						v-if="selectedStream.announce"
						>SAP</span
					>
					<span
						class="badge bg-danger me-1"
						:title="selectedStream.unsupportedReason"
						v-if="!selectedStream.isSupported"
						>Unsupported</span
					>
				</li>
				<template v-for="(group, index) in selectedStream.groups" :key="index">
					<li v-if="group.mids">
						<b>Stream Group</b><br />
						<span class="copy">{{ group.type }}: {{ group.mids }}</span>
					</li>
				</template>
			</ul>
		</div>
		<div class="col-md-5">
			<div class="row" v-if="selectedStream.isSupported">
				<div
					class="col-md-6"
					v-for="(media, index) in selectedStream.media"
					:key="index"
				>
					<h5>
						Media
						<span v-if="selectedStream.media.length > 1">#{{ index + 1 }}</span>
					</h5>
					<ul class="ul-hidden">
						<li v-if="media.mid">
							<b>Stream Identification</b><br />
							<span class="copy">{{ media.mid }}</span>
						</li>
						<li v-if="media.connection && media.connection.ip">
							<b>Address</b><br />
							<span class="copy"
								>{{ media.connection.ip.split("/")[0] }}:{{ media.port }}</span
							>
						</li>
						<li v-else>
							<b>Address</b><br />
							<span class="copy"
								>{{ selectedStream.mcast }}:{{ media.port }}</span
							>
						</li>
						<li>
							<b>Format</b><br />
							<span class="copy"
								>{{ media.rtp[0].encoding }} ch. @
								{{ media.rtp[0].rate }}Hz</span
							>
						</li>
						<li>
							<b>Codec</b><br />
							<span v-if="media.rtp[0].codec == 'L24'" class="copy"
								>24-bit PCM</span
							>
							<span v-else-if="media.rtp[0].codec == 'L16'" class="copy"
								>16-bit PCM</span
							>
							<span v-else class="copy">{{ media.rtp[0].codec }}</span>
						</li>
						<li v-if="media.ptime">
							<b>Packet Time</b><br />
							<span class="copy">{{ media.ptime }}ms</span>
						</li>
						<li v-if="media.description">
							<b>Description</b><br />
							<span class="copy">{{ media.description }}</span>
						</li>
					</ul>
				</div>
			</div>
		</div>
		<div class="col-md-4">
			<textarea
				class="form-control"
				id="textarea-sdp"
				v-bind:rows="getTextareaRowNumber()"
				onclick="this.focus();this.select()"
				v-model="selectedStream.raw"
				readonly
			></textarea>
		</div>
	</div>
</template>

<script>
import { selectedStream, getTextareaRowNumber } from "../../app.js";

export default {
	name: "StreamPage",
	setup() {
		return {
			selectedStream,
			getTextareaRowNumber,
		};
	},
};
</script>

<style>
li > span {
	word-wrap: break-word;
}
</style>
