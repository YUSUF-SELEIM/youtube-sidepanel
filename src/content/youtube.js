// Variables to track video state
let videoPlaying = false;
let videoId = null;
let notificationShown = false;

// Function to extract video ID from URL
function getYouTubeVideoId(url) {
	const urlParams = new URLSearchParams(new URL(url).search);
	return urlParams.get("v");
}

// Log function for debugging
function debugLog(message) {
	console.log(`[YouTube SideView] ${message}`);
}

// Function to detect video and send info to background script
function detectAndSendVideoInfo(pauseVideo = false) {
	const video = document.querySelector("video");
	const currentUrl = window.location.href;
	const currentVideoId = getYouTubeVideoId(currentUrl);

	if (video && currentVideoId) {
		const videoTitle =
			document.querySelector(".title.ytd-video-primary-info-renderer")
				?.textContent ||
			document.querySelector("h1.title")?.textContent ||
			"YouTube Video";

		// Pause the video if requested
		if (pauseVideo && !video.paused) {
			debugLog("Pausing original video");
			video.pause();
		}

		const currentTime = video ? video.currentTime : 0;

		debugLog(
			`Detected video: ${videoTitle} (${currentVideoId}) at ${currentTime}`
		);

		// Send message to background script regardless of notification state
		chrome.runtime.sendMessage(
			{
				action: "videoDetected",
				videoId: currentVideoId,
				title: videoTitle,
				url: window.location.href,
				timestamp: currentTime,
			},
			(response) => {
				if (chrome.runtime.lastError) {
					debugLog(
						`Error sending message: ${chrome.runtime.lastError.message}`
					);
				} else if (response) {
					debugLog(`Background responded: ${JSON.stringify(response)}`);
				}
			}
		);

		return currentTime;
	}

	return 0;
}

// Function to create notification
function createNotification() {
	// Create notification element
	const notification = document.createElement("div");
	notification.className = "yt-sidepanel-notification";
	notification.innerHTML = `
    <div style="position: fixed; top: 20px; right: 20px; background: white; padding: 15px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 9999; width: 300px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h3 style="margin: 0; font-size: 16px; font-weight: 600;">Watch in Side Panel</h3>
        <button id="close-notification" style="background: none; border: none; cursor: pointer; font-size: 16px;">&times;</button>
      </div>
      <p style="margin: 0 0 10px; font-size: 14px;">Continue watching this video in the side panel while browsing other tabs?</p>
      <div style="display: flex; gap: 10px;">
        <button id="yes-button" style="background: #065fd4; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-weight: 500;">Yes</button>
        <button id="no-button" style="background: #f2f2f2; color: #0f0f0f; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-weight: 500;">No</button>
      </div>
    </div>
  `;

	document.body.appendChild(notification);

	// Add event listeners
	document
		.getElementById("close-notification")
		.addEventListener("click", () => {
			notification.remove();
			notificationShown = false;
		});

	document.getElementById("no-button").addEventListener("click", () => {
		notification.remove();
		notificationShown = false;
	});

	document.getElementById("yes-button").addEventListener("click", () => {
		notification.remove();
		notificationShown = false;

		// Send video info and pause the original video
		detectAndSendVideoInfo(true);

		// Open side panel
		chrome.runtime.sendMessage({ action: "openSidePanel" }, (response) => {
			if (chrome.runtime.lastError) {
				debugLog(
					`Error opening side panel: ${chrome.runtime.lastError.message}`
				);
			} else {
				debugLog("Side panel opened");
			}
		});
	});
}

// Main function to check for video playback
function checkVideoPlayback() {
	const video = document.querySelector("video");
	const currentUrl = window.location.href;
	const currentVideoId = getYouTubeVideoId(currentUrl);

	if (video && currentVideoId) {
		// Always detect and send video info for the side panel to use
		detectAndSendVideoInfo();

		// Only show notification if video is playing and notification hasn't been shown
		if (
			!videoPlaying &&
			!video.paused &&
			video.currentTime > 0 &&
			!notificationShown
		) {
			videoPlaying = true;
			videoId = currentVideoId;

			// Wait a bit before showing notification to avoid false positives
			setTimeout(() => {
				if (videoPlaying && !notificationShown) {
					notificationShown = true;
					createNotification();
				}
			}, 2000);
		}
	}
}

// Run the check periodically
setInterval(checkVideoPlayback, 2000);

// Initial check when page loads
window.addEventListener("load", () => {
	setTimeout(checkVideoPlayback, 2000);
});

// Listen for navigation within YouTube
window.addEventListener("yt-navigate-finish", () => {
	debugLog("YouTube navigation detected");
	videoPlaying = false;
	notificationShown = false;
	videoId = null;
	setTimeout(checkVideoPlayback, 2000);
});

// Listen for messages from background/popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.action === "pauseVideo") {
		const video = document.querySelector("video");
		if (video) {
			debugLog("Pausing video on request");
			video.pause();
			sendResponse({ currentTime: video.currentTime });
		} else {
			sendResponse({ currentTime: 0 });
		}
	}
	return true;
});

// Manual detection for debugging
debugLog("Content script loaded on: " + window.location.href);
setTimeout(checkVideoPlayback, 2000);
