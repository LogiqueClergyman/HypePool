// HypePool service worker

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ recentPools: [], installedAt: Date.now() });
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "GET_RECENT_POOLS") {
    chrome.storage.local.get(["recentPools"], (result) => {
      sendResponse({ pools: result.recentPools ?? [] });
    });
    return true; // async response
  }

  if (msg.type === "SAVE_POOL") {
    chrome.storage.local.get(["recentPools"], (result) => {
      const pools = result.recentPools ?? [];
      pools.unshift({ id: msg.poolId, title: msg.title, savedAt: Date.now() });
      chrome.storage.local.set({ recentPools: pools.slice(0, 5) });
      sendResponse({ ok: true });
    });
    return true;
  }
});
