import { prisma } from '../lib/prisma';
import { registry } from '../providers/registry';

export async function refreshContent(): Promise<void> {
  try {
    const activeContents = await prisma.content.findMany({
      where: {
        markets: { some: { status: 'ACTIVE' } }
      }
    });

    if (activeContents.length === 0) return;

    const platformMap = new Map<string, string[]>();
    for (const content of activeContents) {
      if (!platformMap.has(content.platform)) {
        platformMap.set(content.platform, []);
      }
      platformMap.get(content.platform)!.push(content.externalId);
    }

    for (const [platform, externalIds] of platformMap.entries()) {
      const provider = registry.getProviderByPlatform(platform);
      if (!provider) continue;

      const viewCounts = await provider.batchGetViewCounts(externalIds);

      for (const [externalId, views] of viewCounts.entries()) {
        try {
          await prisma.content.update({
            where: { platform_externalId: { platform, externalId } },
            data: { currentViews: BigInt(views), lastFetchedAt: new Date() }
          });
        } catch (e) {
          console.error(`DB Update failed for content ${externalId}`, e);
        }
      }
    }
  } catch (error) {
    console.error('Content refresh job failed:', error);
  }
}
