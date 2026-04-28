import { google, youtube_v3 } from 'googleapis';
import { ContentProvider, ContentMetadata } from '../interfaces/contentProvider';

export class YouTubeProvider implements ContentProvider {
  readonly platform = 'youtube';
  private youtube: youtube_v3.Youtube;

  constructor(apiKey: string) {
    this.youtube = google.youtube({ version: 'v3', auth: apiKey });
  }

  canHandle(url: string): boolean {
    return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/.test(url);
  }

  extractId(url: string): string | null {
    let videoId: string | null = null;
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.hostname === 'youtu.be') {
        videoId = parsedUrl.pathname.slice(1);
      } else if (parsedUrl.hostname.includes('youtube.com')) {
        if (parsedUrl.pathname.startsWith('/shorts/')) {
          videoId = parsedUrl.pathname.split('/')[2];
        } else {
          videoId = parsedUrl.searchParams.get('v');
        }
      }
    } catch (e) {
      // Invalid URL
    }
    return videoId || null;
  }

  async getContentDetails(externalId: string): Promise<ContentMetadata | null> {
    try {
      const response = await this.youtube.videos.list({
        part: ['snippet', 'statistics'],
        id: [externalId],
      });

      const video = response.data.items?.[0];
      if (!video || !video.snippet || !video.statistics) return null;

      return {
        platform: this.platform,
        externalId: externalId,
        url: `https://youtube.com/watch?v=${externalId}`,
        title: video.snippet.title || 'Unknown Title',
        author: video.snippet.channelTitle || 'Unknown Channel',
        thumbnailUrl: video.snippet.thumbnails?.maxres?.url || video.snippet.thumbnails?.high?.url || '',
        publishedAt: new Date(video.snippet.publishedAt!),
        currentViews: parseInt(video.statistics.viewCount || '0', 10),
      };
    } catch (error) {
      console.error('YouTube API error:', error);
      return null;
    }
  }

  async batchGetViewCounts(externalIds: string[]): Promise<Map<string, number>> {
    const results = new Map<string, number>();
    
    // Split into chunks of 50
    for (let i = 0; i < externalIds.length; i += 50) {
      const chunk = externalIds.slice(i, i + 50);
      try {
        const response = await this.youtube.videos.list({
          part: ['statistics'],
          id: chunk,
        });

        for (const video of response.data.items || []) {
          if (video.id && video.statistics?.viewCount) {
            results.set(video.id, parseInt(video.statistics.viewCount, 10));
          }
        }
      } catch (error) {
        console.error('YouTube API batch error:', error);
      }
    }

    return results;
  }
}
