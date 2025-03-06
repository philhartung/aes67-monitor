<template>
	<textarea
		rows="30"
		class="form-control"
		v-model="rawSDP.sdp"
		placeholder="v=0&#10;o=- 784066 784066 IN IP4 10.0.100.20&#10;s=Stream&#10;c=IN IP4 239.69.138.112/32&#10;t=0 0&#10;m=audio 5004 RTP/AVP 97&#10;a=recvonly&#10;a=rtpmap:97 L24/48000/2&#10;a=ptime:1&#10;a=ts-refclk:ptp=IEEE1588-2008:00-1D-C1-FF-FF-FF-FF-FF:0&#10;a=mediaclk:direct=1790190952&#10;"
	></textarea>
	<div class="form-check">
		<input
			class="form-check-input"
			type="checkbox"
			id="annonce-sdp-check"
			v-model="rawSDP.announce"
		/>
		<label class="form-check-label" for="annonce-sdp-check">
			Broadcast Stream via Session Annoncement Protocol
		</label>
	</div>
</template>

<script>
import { rawSDP } from "../../app.js";

export default {
	name: "IntercomPage",
	setup() {
		return { rawSDP };
	},
};
</script>

<style></style>
