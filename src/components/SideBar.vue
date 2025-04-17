<template>
	<div
		id="sidebar-left"
		:class="{ sidebarCollapse: persistentData.settings.sidebarCollapsed }"
	>
		<a
			id="sidebar-logo"
			@click="setSidebarStatus(!persistentData.settings.sidebarCollapsed)"
		>
			<span class="text">Stream Monitor</span>
			<span class="icon"><i class="bi bi-soundwave"></i></span>
		</a>
		<ul>
			<li id="streams-li" :class="{ active: page === 'streams' }">
				<a @click="viewPage('streams')">
					<i class="bi bi-speaker"></i><span>Streams</span>
					<span
						class="badge bg-primary"
						@click.stop="streamCountDisplay = !streamCountDisplay"
					>
						<template v-if="streamCountDisplay">{{ visibleStreams }}</template>
						<template v-else>{{ channelCount }}</template>
					</span>
				</a>
			</li>
			<li id="devices-li" :class="{ active: page === 'devices' }">
				<a @click="viewPage('devices')">
					<i class="bi bi-hdd-network"></i><span>Devices</span>
					<span class="badge bg-primary" id="device-count">{{
						searchDevices.length
					}}</span>
				</a>
			</li>
			<li id="interfaces-li" :class="{ active: page === 'interfaces' }">
				<a @click="viewPage('interfaces')">
					<i class="bi bi-pci-card-sound"></i><span>Interfaces</span>
				</a>
			</li>
			<li id="settings-li" :class="{ active: page === 'settings' }">
				<a @click="viewPage('settings')">
					<i class="bi bi-gear"></i><span>Settings</span>
				</a>
			</li>
		</ul>
	</div>
</template>

<script>
import {
	viewPage,
	persistentData,
	page,
	streamCountDisplay,
	channelCount,
	getPageTitle,
	setSidebarStatus,
	searchDevices,
	visibleStreams,
} from "../app.js";

export default {
	name: "SideBar",
	setup() {
		return {
			viewPage,
			persistentData,
			page,
			streamCountDisplay,
			channelCount,
			getPageTitle,
			setSidebarStatus,
			searchDevices,
			visibleStreams,
		};
	},
};
</script>

<style></style>
