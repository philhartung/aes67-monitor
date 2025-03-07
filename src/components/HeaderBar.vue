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
		};
	},
};
</script>

<style></style>
