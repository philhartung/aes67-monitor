const bonjour = require("bonjour")();

async function getManifests(timeout = 2500) {
	return new Promise((resolve, reject) => {
		const manifests = [];
		const browser = bonjour.find({ type: "nmos-node" }, async (service) => {
			for (const address of service.addresses) {
				try {
					const response = await fetch(
						`http://${address}:${service.port}/x-nmos/node/v1.0/senders`
					);
					if (!response.ok) {
						throw new Error("HTTP Error: " + response.statusText);
					}
					const json = await response.json();

					for (const sender of json) {
						if (sender.manifest_href) {
							const manifestResponse = await fetch(sender.manifest_href);
							if (!manifestResponse.ok) {
								throw new Error(
									"HTTP Error downloading manifest_href: " +
										manifestResponse.statusText
								);
							}
							const manifestData = await manifestResponse.text();
							manifests.push({
								id: sender.id,
								sender: sender,
								manifest: manifestData,
							});
						}
					}
				} catch (error) {
					console.error("HTTP Error:", error.message);
				}
			}
		});

		setTimeout(() => {
			browser.stop();
			resolve(manifests);
		}, timeout);
	});
}
setInterval(function () {
	getManifests()
		.then((manifests) => {
			console.log(manifests);
		})
		.catch((error) => {
			console.error("Error:", error);
		});
}, 10000);
