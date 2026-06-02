import type { Metadata } from 'next';
import type { Article, Server, ServersResponse } from '@/lib/types';
import { HomeClient, type FilterCounts } from './HomeClient';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';
const SITE = 'https://l2realm.ru';
const DEFAULT_SHARE_IMAGE = '/images/og-default.jpg';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'L2Realm — Каталог серверов Lineage 2',
  description: 'Каталог приватных серверов Lineage 2: проверенные проекты, фильтры по хроникам и рейтам, активность и анонсы открытий.',
  alternates: { canonical: SITE },
  openGraph: {
    type: 'website',
    title: 'L2Realm — Каталог серверов Lineage 2',
    description: 'Каталог приватных серверов Lineage 2: проверенные проекты, фильтры по хроникам и рейтам, активность и анонсы открытий.',
    url: SITE,
    siteName: 'L2Realm',
    locale: 'ru_RU',
    images: [
      {
        url: DEFAULT_SHARE_IMAGE,
        width: 1200,
        height: 630,
        alt: 'L2Realm — каталог серверов Lineage 2',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'L2Realm — Каталог серверов Lineage 2',
    description: 'Каталог приватных серверов Lineage 2: проверенные проекты, фильтры по хроникам и рейтам, активность и анонсы открытий.',
    images: [DEFAULT_SHARE_IMAGE],
  },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function buildServerParams(searchParams: Record<string, string | string[] | undefined>) {
  const page = Number(firstParam(searchParams.page) ?? 1);
  const view = firstParam(searchParams.view);
  const params: Record<string, string> = {
    page: Number.isFinite(page) && page > 0 ? String(page) : '1',
    limit: '30',
    compact: 'true',
  };

  const sort = firstParam(searchParams.sort);
  const search = firstParam(searchParams.q);
  const chronicle = firstParam(searchParams.chr);
  const rate = firstParam(searchParams.rate);
  const opened = firstParam(searchParams.opened);
  const type = firstParam(searchParams.type);
  const activity = firstParam(searchParams.activity);
  const trust = firstParam(searchParams.trust);
  const listSort = firstParam(searchParams.lsort);
  const listDir = firstParam(searchParams.ldir);

  if (sort) params.sort = sort;
  if (search) params.search = search;
  if (chronicle) params.chronicle = chronicle;
  if (rate) params.rate = rate;
  if (opened) params.openedWithin = opened;
  if (type) params.type = type;
  if (activity) params.activity = activity;
  if (trust) params.trust = trust;
  if (view === 'list' && listSort) {
    params.lsort = listSort;
    if (listDir) params.ldir = listDir;
  }

  return params;
}

async function fetchBackend<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BACKEND}/api${path}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const params = buildServerParams(sp);
  const query = new URLSearchParams(params).toString();

  const [serversResponse, counts] = await Promise.all([
    fetchBackend<ServersResponse>(`/servers?${query}`),
    fetchBackend<FilterCounts>('/servers/counts'),
  ]);

  const [comingSoon, topPool, articles] = await Promise.all([
    fetchBackend<Server[]>('/servers/coming-soon'),
    fetchBackend<ServersResponse>('/servers?page=1&limit=100&compact=true'),
    fetchBackend<Article[]>('/articles'),
  ]);

  const initialTopVotes = [...(topPool?.data ?? [])]
    .sort((left, right) => (right.totalVotes ?? right.weeklyVotes ?? 0) - (left.totalVotes ?? left.weeklyVotes ?? 0))
    .slice(0, 5);

  return (
    <HomeClient
      initialServers={(serversResponse?.data ?? []) as Server[]}
      initialCounts={counts}
      initialPages={serversResponse?.pages ?? 1}
      initialOk={!!serversResponse}
      initialComingSoon={(comingSoon ?? []).slice(0, 5)}
      initialTopVotes={initialTopVotes}
      initialArticles={(articles ?? []).filter(article => article.publishedAt).slice(0, 4)}
    />
  );
}
