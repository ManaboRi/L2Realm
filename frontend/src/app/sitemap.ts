import type { MetadataRoute } from 'next';
import type { ServersResponse, Article } from '@/lib/types';
import { CHRONICLE_CONFIGS } from './_lib/chronicleConfig';

// force-dynamic: sitemap всегда генерится на запрос, не пре-рендерится в build.
// ISR (revalidate = N) не подходит — Next.js всё равно пре-рендерит в build,
// когда контейнер backend не поднят, и кеширует пустой результат до TTL.
// sitemap дёргают поисковики редко — стоимость fresh-запроса на каждый хит ничтожна.
export const dynamic = 'force-dynamic';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';
const SITE = 'https://l2realm.ru';

async function fetchAllServers() {
  try {
    const res = await fetch(`${BACKEND}/api/servers?limit=500`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = (await res.json()) as ServersResponse;
    return data.data;
  } catch {
    return [];
  }
}

async function fetchAllArticles(): Promise<Article[]> {
  try {
    const res = await fetch(`${BACKEND}/api/articles`, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [servers, articles] = await Promise.all([fetchAllServers(), fetchAllArticles()]);
  const now = new Date();

  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${SITE}/`,            lastModified: now, changeFrequency: 'hourly',  priority: 1.0 },
    { url: `${SITE}/coming-soon`, lastModified: now, changeFrequency: 'daily',   priority: 0.8 },
    { url: `${SITE}/blog`,        lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${SITE}/pricing`,     lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${SITE}/legal`,       lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE}/privacy`,     lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];

  // Страницы по хроникам — SEO-точки входа
  const chronicleUrls: MetadataRoute.Sitemap = Object.values(CHRONICLE_CONFIGS).map(cfg => ({
    url: `${SITE}/chronicle/${cfg.slug}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.85,
  }));

  const serverUrls: MetadataRoute.Sitemap = servers.map(s => ({
    url: `${SITE}/servers/${s.id}`,
    lastModified: s.openedDate ? new Date(s.openedDate) : now,
    changeFrequency: 'daily',
    priority: s.vip ? 0.9 : 0.6,
  }));

  const articleUrls: MetadataRoute.Sitemap = articles.map(a => ({
    url: `${SITE}/blog/${a.slug}`,
    lastModified: new Date(a.updatedAt),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticUrls, ...chronicleUrls, ...serverUrls, ...articleUrls];
}
