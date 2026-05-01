import { Platform, extractVideoId, thumbnailFromYouTube } from "./videoParser";

export interface VideoMeta {
  platform: Platform;
  videoId: string;
  title: string;
  creator: string;
  thumbnailUrl: string | null;
}

export async function fetchVideoMeta(url: string, platform: Platform): Promise<VideoMeta> {
  const videoId = extractVideoId(url, platform);
  if (!videoId) throw new Error("Could not extract video ID from URL");

  switch (platform) {
    case "youtube": {
      const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const res = await fetch(endpoint, { next: { revalidate: 60 } });
      if (!res.ok) throw new Error("YouTube oEmbed failed");
      const d = await res.json();
      return {
        platform,
        videoId,
        title: d.title ?? "YouTube Video",
        creator: d.author_name ?? "YouTube Creator",
        thumbnailUrl: thumbnailFromYouTube(videoId),
      };
    }
    case "tiktok": {
      const endpoint = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
      const res = await fetch(endpoint, { next: { revalidate: 60 } });
      if (!res.ok) throw new Error("TikTok oEmbed failed");
      const d = await res.json();
      return {
        platform,
        videoId,
        title: d.title ?? "TikTok Video",
        creator: d.author_name ?? "@tiktok_user",
        thumbnailUrl: d.thumbnail_url ?? null,
      };
    }
    case "instagram": {
      return {
        platform,
        videoId,
        title: "Instagram Reel",
        creator: "@instagram_user",
        thumbnailUrl: null,
      };
    }
  }
}
