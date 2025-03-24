// DOM elements
const noVideoElement = document.getElementById("no-video");
const videoPlayerElement = document.getElementById("video-player");
const youtubeIframeElement = document.getElementById("youtube-iframe");

// Track current video to prevent unnecessary reloads
let currentLoadedVideoId = null;
let currentLoadedTimestamp = null;

// Debug logging
function debugLog(message) {
	console.log(`[YouTube SideView SidePanel] ${message}`);
}

// Load video info from storage
function loadVideoInfo(forceReload = false) {
	debugLog("Checking for video info updates");

	chrome.storage.local.get(["currentVideo"], (result) => {
		if (result.currentVideo && result.currentVideo.videoId) {
			const videoId = result.currentVideo.videoId;
			const timestamp = Math.floor(result.currentVideo.timestamp || 0);

			// Check if this is a new video or force reload requested
			const isNewVideo = currentLoadedVideoId !== videoId;
			const isSignificantTimeChange =
				Math.abs(timestamp - (currentLoadedTimestamp || 0)) > 10;

			if (isNewVideo || forceReload || isSignificantTimeChange) {
				debugLog(`Loading video at timestamp ${timestamp}s`);

				// Show video player
				noVideoElement.classList.add("hidden");
				videoPlayerElement.classList.remove("hidden");

				// Set iframe source
				const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&start=${timestamp}`;
				debugLog(`Setting iframe src to: ${embedUrl}`);
				youtubeIframeElement.src = embedUrl;

				// Update tracking variables
				currentLoadedVideoId = videoId;
				currentLoadedTimestamp = timestamp;
			} else {
				debugLog("Video already loaded, no need to refresh");
			}
		} else {
			// No video information found
			debugLog("No video information found");
			noVideoElement.classList.remove("hidden");
			videoPlayerElement.classList.add("hidden");
			youtubeIframeElement.src = "";
			currentLoadedVideoId = null;
			currentLoadedTimestamp = null;
		}
	});
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
	debugLog("Side panel loaded");
	loadVideoInfo(true);

	// Listen for storage changes
	chrome.storage.onChanged.addListener((changes, namespace) => {
		if (namespace === "local" && changes.currentVideo) {
			debugLog("Video info changed in storage");
			loadVideoInfo();
		}
	});
});

// Check for updates every 30 seconds
setInterval(() => loadVideoInfo(), 30000);
