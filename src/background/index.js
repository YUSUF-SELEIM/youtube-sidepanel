// Debugging function
function debugLog(message) {
	console.log(`[YouTube SideView Background] ${message}`);
}

// Log when background script loads
debugLog("Background script loaded");

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	debugLog(`Received message: ${JSON.stringify(message)}`);

	if (message.action === "videoDetected" || message.action === "videoStarted") {
		// Store the video info
		debugLog(`Storing video info: ${message.title}`);

		chrome.storage.local.set(
			{
				currentVideo: {
					videoId: message.videoId,
					title: message.title,
					url: message.url,
					timestamp: message.timestamp || 0,
					updatedAt: Date.now(),
				},
			},
			() => {
				if (chrome.runtime.lastError) {
					debugLog(`Error storing video: ${chrome.runtime.lastError.message}`);
				} else {
					debugLog("Video info stored successfully");
				}
			}
		);

		// If this is from videoStarted action, show badge notification
		if (message.action === "videoStarted") {
			chrome.action.setBadgeText({ text: "!" });
			chrome.action.setBadgeBackgroundColor({ color: "#F44336" });
		}

		sendResponse({ success: true });
	}

	if (message.action === "openSidePanel") {
		debugLog("Opening side panel");

		// Get the tab ID
		let tabId = sender.tab?.id;

		// If the message is from the popup, we need to get the current tab
		if (tabId === undefined) {
			debugLog("Message is from popup, getting current tab");

			chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
				if (tabs.length > 0) {
					const tab = tabs[0];
					tabId = tab.id;

					try {
						// If it's a YouTube tab, try to pause the video
						if (tab.url.includes("youtube.com/watch")) {
							debugLog("Sending pause request to content script");
							chrome.tabs.sendMessage(
								tabId,
								{ action: "pauseVideo" },
								function (response) {
									if (chrome.runtime.lastError) {
										debugLog(
											`Error pausing video: ${chrome.runtime.lastError.message}`
										);
									} else if (response) {
										debugLog(`Video paused at: ${response.currentTime}`);

										// Update timestamp in storage
										chrome.storage.local.get(["currentVideo"], (data) => {
											if (data.currentVideo) {
												chrome.storage.local.set({
													currentVideo: {
														...data.currentVideo,
														timestamp: response.currentTime,
													},
												});
											}
										});
									}
								}
							);
						}

						// Open the side panel
						chrome.sidePanel
							.open({ tabId })
							.then(() => {
								debugLog(`Side panel opened for tab: ${tabId}`);
								sendResponse({ success: true });
							})
							.catch((err) => {
								debugLog(`Error opening side panel: ${err}`);
								sendResponse({ success: false, error: err.toString() });
							});
					} catch (error) {
						debugLog(`Error opening side panel: ${error}`);
						sendResponse({ success: false, error: error.toString() });
					}
				} else {
					debugLog("No active tabs found");
					sendResponse({ success: false, error: "No active tabs found" });
				}
			});
		} else {
			// Message is from content script, use sender.tab.id
			debugLog(`Opening side panel for tab: ${tabId}`);
			chrome.sidePanel
				.open({ tabId })
				.then(() => {
					debugLog("Side panel opened successfully");
					sendResponse({ success: true });
				})
				.catch((err) => {
					debugLog(`Error opening side panel: ${err}`);
					sendResponse({ success: false, error: err.toString() });
				});
		}

		chrome.action.setBadgeText({ text: "" });
		return true; // Indicates async response
	}

	return true; // Indicates async response
});

// When the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
	debugLog("Extension installed/updated");
	chrome.sidePanel
		.setOptions({
			enabled: true,
			path: "src/sidepanel/index.html",
		})
		.then(() => {
			debugLog("Side panel options set");
		})
		.catch((err) => {
			debugLog(`Error setting side panel options: ${err}`);
		});
});
