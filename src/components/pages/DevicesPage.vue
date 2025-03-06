<template>
	<div
		class="alert alert-primary"
		role="alert"
		v-if="searchDevices.length == 0"
	>
		No devices found.
	</div>

	<table class="table table-sm table-borderless">
		<thead v-if="searchDevices.length > 0">
			<tr>
				<th>Name</th>
				<th>Address</th>
				<th>Streams</th>
				<th>Description</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="device in searchDevices" :key="device">
				<td>
					<span v-if="editDevice != device">{{
						persistentData.devices[device].name
					}}</span>
					<input
						class="form-control form-control-sm"
						type="text"
						v-model="persistentData.devices[device].name"
						v-else
					/>
				</td>
				<td>{{ device }}</td>
				<td>{{ persistentData.devices[device].count }}</td>
				<td>
					<span v-if="editDevice != device">{{
						persistentData.devices[device].description
					}}</span>
					<input
						class="form-control form-control-sm"
						type="text"
						v-model="persistentData.devices[device].description"
						v-else
					/>
				</td>
				<td>
					<button class="btn btn-sm btn-primary" @click="edit(device)">
						<i
							class="bi"
							:class="{
								'bi-pencil-square': editDevice != device,
								'bi-check-lg': editDevice == device,
							}"
						></i>
					</button>
				</td>
				<td>
					<button class="btn btn-sm btn-primary" @click="viewDevice(device)">
						Filter
					</button>
				</td>
			</tr>
		</tbody>
	</table>
</template>

<script>
import { ref } from "vue";
import {
	searchDevices,
	viewDevice,
	persistentData,
	updatePersistentData,
} from "../../app.js";

export default {
	name: "DevicesPage",
	setup() {
		const editDevice = ref("");

		const edit = (device) => {
			if (editDevice.value == device) {
				editDevice.value = "";
			} else {
				editDevice.value = device;
			}
			updatePersistentData("devices");
		};

		return {
			searchDevices,
			viewDevice,
			persistentData,
			editDevice,
			edit,
		};
	},
};
</script>

<style></style>
