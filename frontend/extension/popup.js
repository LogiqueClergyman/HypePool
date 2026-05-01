const APP_URL = "http://localhost:3000";

const SUPPORTED = [
  /tiktok\.com\/@.+\/video\/\d+/,
  /youtube\.com\/watch\?v=/,
  /youtube\.com\/shorts\//,
  /instagram\.com\/(reel|p)\//,
];

function detectPlatform(url) {
  if (/tiktok\.com/.test(url)) return "TikTok";
  if (/youtube\.com/.test(url)) return "YouTube";
  if (/instagram\.com/.test(url)) return "Instagram";
  return null;
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

async function init() {
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url ?? "";
  const platform = detectPlatform(url);
  const isSupported = SUPPORTED.some((re) => re.test(url));

  const pageUrlEl = document.getElementById("page-url");
  const stakeBtn = document.getElementById("stake-btn");

  if (isSupported && platform) {
    pageUrlEl.innerHTML = `<span>${platform}</span> video detected`;
    stakeBtn.classList.remove("disabled");
    stakeBtn.addEventListener("click", () => {
      window.open(`${APP_URL}/app/submit?url=${encodeURIComponent(url)}`, "_blank");
      window.close();
    });
  } else {
    pageUrlEl.textContent = "Open TikTok, YouTube, or Instagram";
  }

  // Load recent pools from storage
  chrome.storage.local.get(["recentPools"], (result) => {
    const pools = result.recentPools ?? [];
    const listEl = document.getElementById("recent-list");
    if (pools.length === 0) return;

    listEl.innerHTML = pools
      .map(
        (p) => `
        <a class="recent-pool" href="${APP_URL}/app/pool/${p.id}" target="_blank">
          <span class="pool-title">${p.title ?? "Pool"}</span>
          <span class="pool-age">${timeAgo(p.savedAt)}</span>
        </a>
      `
      )
      .join("");
  });
}

init();
