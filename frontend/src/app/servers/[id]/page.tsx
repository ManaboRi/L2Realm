import type { Metadata } from 'next';
import type { Server } from '@/lib/types';
import { ServerDetailClient } from './ServerDetailClient';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';
const SITE = 'https://l2realm.ru';

async function fetchServer(id: string): Promise<Server | null> {
  try {
    const res = await fetch(`${BACKEND}/api/servers/${id}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as Server;
  } catch {
    return null;
  }
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const server = await fetchServer(id);

  if (!server) {
    return {
      title: 'Сервер не найден',
      robots: { index: false, follow: false },
    };
  }

  const typeStr = server.type?.includes('pvp')
    ? 'PvP'
    : server.type?.includes('pve')
      ? 'PvE'
      : '';
  const title = `${server.name} — Lineage 2 ${server.chronicle} ${server.rates}${typeStr ? ' ' + typeStr : ''}`;

  const ratingStr = server.ratingCount > 0
    ? ` Рейтинг ${server.rating.toFixed(1)} ⭐ по ${server.ratingCount} отзывам игроков.`
    : '';
  const description = (server.shortDesc && server.shortDesc.trim())
    || `Приватный сервер Lineage 2 «${server.name}» — хроника ${server.chronicle}, рейты ${server.rates}${typeStr ? ', ' + typeStr : ''}.${ratingStr} Честные отзывы и онлайн-статус на L2Realm.`;

  const ogImage = server.banner || server.icon;
  const canonical = `${SITE}/servers/${id}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      title,
      description,
      url: canonical,
      siteName: 'L2Realm',
      locale: 'ru_RU',
      ...(ogImage && { images: [{ url: ogImage }] }),
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
  };
}

export default function Page() {
  return <ServerDetailClient />;
}
