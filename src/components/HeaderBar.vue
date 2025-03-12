<template>
	<div
		id="sidebar-top"
		:class="{ sidebarCollapse: persistentData.settings.sidebarCollapsed }"
	>
		<button
			class="btn btn-outline btn-secondary"
			id="btn-back"
			@click="goBack()"
			v-if="isBackBtnActive()"
		>
			<i class="bi bi-caret-left"></i> {{ getPageTitle() }}
		</button>
		<h4 id="pageTitle" v-html="getTitle()"></h4>

		<input
			type="text"
			class="form-control"
			id="search-input"
			@click="$event.target.focus(), $event.target.select()"
			placeholder="Search"
			v-model="search[page]"
			v-if="isPageSearchable()"
		/>
		<button
			class="btn btn-primary"
			style="float: right; margin-right: 10px"
			v-if="page == 'streams'"
			title="Add Stream via SDP"
			@click="page = 'sdp'"
		>
			<b class="bi bi-plus-lg"></b>
		</button>
		<button
			class="btn btn-success"
			style="float: right; margin-right: 10px"
			v-if="page == 'sdp'"
			:disabled="rawSDP.sdp.trim() == ''"
			title="Save"
			@click="saveSDP()"
		>
			<i class="bi bi-floppy2-fill"></i>
		</button>
		<button
			class="btn btn-sm btn-danger"
			style="float: right"
			v-if="page === 'stream' && selectedStream.manual"
			title="Delete Stream"
			@click="deleteStream(selectedStream.id)"
		>
			<i class="bi bi-trash3-fill"></i>
		</button>
		<button
			class="btn btn-sm btn-primary me-2"
			style="float: right"
			v-if="page === 'stream'"
			title="Copy SDP to Clipboard"
			@click="copyClip(selectedStream.raw)"
		>
			<i class="bi bi-copy"></i>
		</button>
	</div>
</template>

<script>
import {
	isBackBtnActive,
	goBack,
	getTitle,
	isPageSearchable,
	getPageTitle,
	search,
	page,
	persistentData,
	saveSDP,
	rawSDP,
	selectedStream,
} from "../app.js";

export default {
	name: "HeaderBar",
	setup() {
		return {
			isBackBtnActive,
			getTitle,
			isPageSearchable,
			getPageTitle,
			search,
			page,
			persistentData,
			goBack,
			saveSDP,
			rawSDP,
			selectedStream,
		};
	},
	methods: {
		deleteStream(id) {
			window.electronAPI.sendMessage({ type: "delete", data: id });
			page.value = "streams";
		},
		copyClip(sdp) {
			navigator.clipboard.writeText(sdp);
		},
	},
};
</script>

<style></style>
