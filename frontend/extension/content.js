// HypePool content script — injects Stake button on TikTok, YouTube, Instagram

const APP_URL = "http://localhost:3000"; // change to production URL when deployed

function getSupportedUrl() {
  const url = window.location.href;
  if (/tiktok\.com\/@.+\/video\/\d+/.test(url)) return url;
  if (/youtube\.com\/watch\?v=/.test(url)) return url;
  if (/youtube\.com\/shorts\//.test(url)) return url;
  if (/instagram\.com\/(reel|p)\//.test(url)) return url;
  return null;
}

function detectPlatform(url) {
  if (/tiktok\.com/.test(url)) return "TikTok";
  if (/youtube\.com/.test(url)) return "YouTube";
  if (/instagram\.com/.test(url)) return "Instagram";
  return null;
}

function injectButton(videoUrl) {
  if (document.querySelector(".hp-fab")) return; // already injected

  const platform = detectPlatform(videoUrl);

  const toast = document.createElement("div");
  toast.className = "hp-fab-toast";
  toast.textContent = "Opening HypePool...";
  document.body.appendChild(toast);

  const btn = document.createElement("button");
  btn.className = "hp-fab";
  btn.innerHTML = `<span class="hp-fab-dot"></span>Stake on HypePool`;
  btn.title = `Submit this ${platform} video to HypePool`;

  btn.addEventListener("click", () => {
    const submitUrl = `${APP_URL}/app/submit?url=${encodeURIComponent(videoUrl)}`;
    chrome.storage.local.set({ lastUrl: videoUrl });

    toast.classList.add("visible");
    setTimeout(() => toast.classList.remove("visible"), 2000);

    window.open(submitUrl, "_blank");
  });

  document.body.appendChild(btn);
}

function init() {
  const url = getSupportedUrl();
  if (url) {
    injectButton(url);
  }
}

// Run on load
init();

// Re-run on SPA navigation (TikTok/YouTube are SPAs)
let lastHref = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href !== lastHref) {
    lastHref = window.location.href;
    document.querySelector(".hp-fab")?.remove();
    document.querySelector(".hp-fab-toast")?.remove();
    setTimeout(init, 800);
  }
});

observer.observe(document.body, { childList: true, subtree: true });
