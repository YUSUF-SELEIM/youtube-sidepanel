// DOM elements
const noVideoElement = document.getElementById("no-video");
const videoInfoElement = document.getElementById("video-info");
const videoTitleElement = document.getElementById("video-title");
const openSidepanelButton = document.getElementById("open-sidepanel");

// Debug logging
function debugLog(message) {
	console.log(`[YouTube SideView Popup] ${message}`);
}

// Function to open side panel
async function openSidePanel() {
	debugLog("Opening side panel");
	try {
		// Get the current active tab
		const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
		if (tabs.length > 0) {
			const activeTab = tabs[0];
			debugLog(`Active tab ID: ${activeTab.id}`);

			// Check if YouTube is open
			if (activeTab.url.includes("youtube.com/watch")) {
				// Execute script to pause the video on the YouTube page
				chrome.scripting
					.executeScript({
						target: { tabId: activeTab.id },
						function: () => {
							const video = document.querySelector("video");
							if (video) {
								console.log("[YouTube SideView] Pausing original video");
								video.pause();
								return { currentTime: video.currentTime };
							}
							return { currentTime: 0 };
						},
					})
					.then((results) => {
						const currentTime = results[0]?.result?.currentTime || 0;
						debugLog(`Current video time: ${currentTime}`);

						// Update the stored video timestamp
						chrome.storage.local.get(["currentVideo"], (data) => {
							if (data.currentVideo) {
								chrome.storage.local.set({
									currentVideo: {
										...data.currentVideo,
										timestamp: currentTime,
									},
								});
							}
						});
					})
					.catch((err) => {
						debugLog(`Error executing script: ${err}`);
					});
			}

			// Open the side panel
			await chrome.sidePanel.open({ tabId: activeTab.id });
			debugLog("Side panel opened successfully");
			window.close(); // Close the popup
		} else {
			debugLog("No active tab found");
		}
	} catch (error) {
		debugLog(`Error opening side panel: ${error}`);
	}
}

// Check if there's an active video
function loadVideoInfo() {
	chrome.storage.local.get(["currentVideo"], (result) => {
		debugLog(`Video info from storage: ${JSON.stringify(result)}`);

		if (result.currentVideo && result.currentVideo.videoId) {
			// Show video info
			debugLog(`Found video: ${result.currentVideo.title}`);
			noVideoElement.classList.add("hidden");
			videoInfoElement.classList.remove("hidden");

			// Set video title
			videoTitleElement.textContent = result.currentVideo.title;
			videoTitleElement.title = result.currentVideo.title;
		} else {
			// No active video
			debugLog("No active video found");
			noVideoElement.classList.remove("hidden");
			videoInfoElement.classList.add("hidden");
		}
	});
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
	debugLog("Popup loaded");

	// Load video info
	loadVideoInfo();

	// Add event listener for side panel button
	openSidepanelButton.addEventListener("click", () => {
		debugLog("Side panel button clicked");
		openSidePanel();
	});
});
