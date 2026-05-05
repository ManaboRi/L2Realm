import type { Metadata } from 'next';
import type { Server } from '@/lib/types';
import { ComingSoonClient } from './ComingSoonClient';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';
const SITE = 'https://l2realm.ru';

export const dynamic = 'force-dynamic';

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
    const res = await fetch(`${BACKEND}/api/servers/coming-soon`, { cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()) as Server[];
  } catch {
    return [];
  }
}

export default async function Page() {
  const servers = await fetchComingSoon();
  return <ComingSoonClient initialServers={servers} />;
}
