import type { Metadata } from 'next';
import type { Article, Server } from '@/lib/types';
import { ComingSoonClient } from './ComingSoonClient';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';
const SITE = 'https://l2realm.ru';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Скоро открытие — новые сервера Lineage 2',
  description:
    'Анонс открытия приватных серверов Lineage 2: дата запуска, хроника, рейты. Узнавай первым о старте новых проектов на L2Realm.',
  alternates: { canonical: `${SITE}/coming-soon` },
  openGraph: {
    type: 'website',
    title: 'Скоро открытие — L2Realm',
    description:
      'Список анонсированных серверов Lineage 2 с датой открытия. Новые проекты — хроники, рейты, анонсы.',
    url: `${SITE}/coming-soon`,
    siteName: 'L2Realm',
    locale: 'ru_RU',
  },
};

async function fetchComingSoon(): Promise<Server[]> {
  try {
    const res = await fetch(`${BACKEND}/api/servers/coming-soon`, { next: { revalidate } });
    if (!res.ok) return [];
    return (await res.json()) as Server[];
  } catch {
    return [];
  }
}

async function fetchArticles(): Promise<Article[]> {
  try {
    const res = await fetch(`${BACKEND}/api/articles?compact=true&limit=4`, { next: { revalidate } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data)
      ? (data as Article[]).map(article => ({
          ...article,
          content: article.content ?? '',
        }))
      : [];
  } catch {
    return [];
  }
}

export default async function Page() {
  const [servers, articles] = await Promise.all([fetchComingSoon(), fetchArticles()]);
  return <ComingSoonClient initialServers={servers} initialArticles={articles.filter(article => article.publishedAt).slice(0, 4)} initialNow={Date.now()} />;
}
