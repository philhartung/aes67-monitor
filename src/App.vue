<template>
	<div
		v-cloak
		id="app-wrapper"
		:class="{ sidebarCollapse: persistentData.settings.sidebarCollapsed }"
	>
		<HeaderBar />
		<SideBar />
		<component :is="currentComponent" />
	</div>
</template>

<script>
import { computed } from "vue";
import { persistentData, page } from "./app.js";

import HeaderBar from "./components/HeaderBar.vue";
import SideBar from "./components/SideBar.vue";
import Streams from "./components/pages/StreamsPage.vue";
import Stream from "./components/pages/StreamPage.vue";
import Devices from "./components/pages/DevicesPage.vue";
import Interfaces from "./components/pages/InterfacesPage.vue";
import Settings from "./components/pages/SettingsPage.vue";
import Sdp from "./components/pages/SdpPage.vue";

export default {
	name: "App",
	components: {
		HeaderBar,
		SideBar,
	},
	setup() {
		return {
			persistentData,
			currentComponent,
		};
	},
};

const currentComponent = computed(() => {
	switch (page.value) {
		case "streams":
			return Streams;
		case "devices":
			return Devices;
		case "interfaces":
			return Interfaces;
		case "settings":
			return Settings;
		case "stream":
			return Stream;
		case "sdp":
			return Sdp;
		default:
			return Streams;
	}
});
</script>

<style>
@import "./assets/style.css";
</style>
