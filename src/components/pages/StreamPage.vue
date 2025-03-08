<template>
	<div class="row">
		<div class="col-md-4">
			<ul class="ul-hidden">
				<li>
					<b>Stream ID</b><br />
					<span class="copy">{{ selectedStream.id }}</span>
				</li>
				<li>
					<b>Address</b><br />
					<span class="copy">{{ selectedStream.origin.address }}</span>
				</li>
				<li v-if="selectedStream.media[0] && selectedStream.media[0].port">
					<b>Multicast</b><br />
					<span class="copy"
						>{{ selectedStream.mcast }}:{{ selectedStream.media[0].port }}</span
					>
				</li>
				<li
					v-if="selectedStream.media[0] && selectedStream.media[0].tsRefClocks"
				>
					<b>Clocksource</b><br />
					<span class="copy">{{
						selectedStream.media[0].tsRefClocks[0].clksrcExt.toUpperCase()
					}}</span>
				</li>
				<li v-if="selectedStream.isSupported">
					<b>Format</b><br />
					<span class="copy"
						>{{ selectedStream.channels }} channel @
						{{ selectedStream.samplerate }}Hz</span
					>
				</li>
				<li>
					<b>Tags</b><br />
					<span class="badge bg-primary me-1" v-if="selectedStream.dante"
						>Dante</span
					>
					<span class="badge bg-primary me-1" v-if="selectedStream.manual"
						>Manual</span
					>
					<span class="badge bg-primary me-1" v-if="selectedStream.announce"
						>SAP</span
					>
				</li>
			</ul>
		</div>
		<div class="col-md-4"></div>
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

<style></style>
