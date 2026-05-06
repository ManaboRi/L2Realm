import type { Metadata } from 'next';
import type { Server, ServersResponse, Stats } from '@/lib/types';
import { HomeClient, type FilterCounts } from './HomeClient';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';
const SITE = 'https://l2realm.ru';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'L2Realm — Каталог серверов Lineage 2',
  description: 'Лучший каталог приватных серверов Lineage 2. Фильтры, честные отзывы, рейтинг.',
  alternates: { canonical: SITE },
  openGraph: {
    type: 'website',
    title: 'L2Realm — Каталог серверов Lineage 2',
    description: 'Лучший каталог приватных серверов Lineage 2. Фильтры, честные отзывы, рейтинг.',
    url: SITE,
    siteName: 'L2Realm',
    locale: 'ru_RU',
  },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function buildServerParams(searchParams: Record<string, string | string[] | undefined>) {
  const page = Number(firstParam(searchParams.page) ?? 1);
  const params: Record<string, string> = {
    page: Number.isFinite(page) && page > 0 ? String(page) : '1',
    limit: '30',
  };

  const sort = firstParam(searchParams.sort);
  const search = firstParam(searchParams.q);
  const chronicle = firstParam(searchParams.chr);
  const rate = firstParam(searchParams.rate);
  const opened = firstParam(searchParams.opened);
  const donate = firstParam(searchParams.donate);
  const type = firstParam(searchParams.type);

  if (sort) params.sort = sort;
  if (search) params.search = search;
  if (chronicle) params.chronicle = chronicle;
  if (rate) params.rate = rate;
  if (opened) params.openedWithin = opened;
  if (donate) params.donate = donate;
  if (type) params.type = type;

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

  const [serversResponse, stats, counts] = await Promise.all([
    fetchBackend<ServersResponse>(`/servers?${query}`),
    fetchBackend<Stats>('/servers/stats'),
    fetchBackend<FilterCounts>('/servers/counts'),
  ]);

  return (
    <HomeClient
      initialServers={(serversResponse?.data ?? []) as Server[]}
      initialStats={stats}
      initialCounts={counts}
      initialPages={serversResponse?.pages ?? 1}
      initialOk={!!serversResponse}
    />
  );
}
