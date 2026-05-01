export type Platform = "youtube" | "tiktok" | "instagram";

export function detectPlatform(url: string): Platform | null {
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube";
  if (/tiktok\.com/.test(url)) return "tiktok";
  if (/instagram\.com/.test(url)) return "instagram";
  return null;
}

export function extractVideoId(url: string, platform: Platform): string | null {
  try {
    const u = new URL(url);
    switch (platform) {
      case "youtube": {
        if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0];
        const v = u.searchParams.get("v");
        if (v) return v;
        const shorts = u.pathname.match(/\/shorts\/([^/?]+)/);
        if (shorts) return shorts[1];
        break;
      }
      case "tiktok": {
        const video = u.pathname.match(/\/video\/(\d+)/);
        if (video) return video[1];
        return u.pathname.replace("/", "") || null;
      }
      case "instagram": {
        const post = u.pathname.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
        if (post) return post[2];
        break;
      }
    }
  } catch {}
  return null;
}

export function thumbnailFromYouTube(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}
