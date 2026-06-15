import type { MetadataRoute } from 'next';
import type { ServersResponse, Article, Guide } from '@/lib/types';
import { CHRONICLE_CONFIGS } from './_lib/chronicleConfig';
import { GUIDE_CATEGORIES } from './guides/categories';

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

async function fetchAllGuides(): Promise<Guide[]> {
  try {
    const res = await fetch(`${BACKEND}/api/guides`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [servers, articles, guides] = await Promise.all([fetchAllServers(), fetchAllArticles(), fetchAllGuides()]);
  const now = new Date();

  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${SITE}/`,            lastModified: now, changeFrequency: 'hourly',  priority: 1.0 },
    { url: `${SITE}/coming-soon`, lastModified: now, changeFrequency: 'daily',   priority: 0.8 },
    { url: `${SITE}/blog`,        lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${SITE}/methodology`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE}/contacts`,    lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE}/guides`,      lastModified: now, changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${SITE}/privacy`,     lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${SITE}/terms`,       lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
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

  const guideCategoryUrls: MetadataRoute.Sitemap = GUIDE_CATEGORIES.map(c => ({
    url: `${SITE}/guides/${c.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.55,
  }));

  const guideUrls: MetadataRoute.Sitemap = guides.map(g => ({
    url: `${SITE}/guides/${g.category}/${g.slug}`,
    lastModified: g.updatedAt ? new Date(g.updatedAt) : (g.publishedAt ? new Date(g.publishedAt) : now),
    changeFrequency: 'monthly',
    priority: g.category === 'quests' ? 0.58 : 0.5,
  }));

  return [...staticUrls, ...chronicleUrls, ...serverUrls, ...articleUrls, ...guideCategoryUrls, ...guideUrls];
}
