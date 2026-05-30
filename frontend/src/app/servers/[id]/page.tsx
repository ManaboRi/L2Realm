import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Server } from '@/lib/types';
import { ServerDetailClient } from './ServerDetailClient';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';
const SITE = 'https://l2realm.ru';

// Fetch memoization в Next.js: этот вызов дедуплицируется между
// generateMetadata и Page, так что реальный запрос к backend один.
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

function absoluteUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url, SITE).toString();
  } catch {
    return undefined;
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
  const baseDescription = (server.shortDesc && server.shortDesc.trim())
    || `Приватный сервер Lineage 2 «${server.name}» — хроника ${server.chronicle}, рейты ${server.rates}${typeStr ? ', ' + typeStr : ''}.${ratingStr} Честные отзывы, активность и проверка проекта на L2Realm.`;
  const description = baseDescription;

  const ogImage = absoluteUrl(server.banner || server.icon);
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

export default async function Page({ params }: Props) {
  const { id } = await params;
  const server = await fetchServer(id);
  if (!server) notFound();

  const canonical = `${SITE}/servers/${id}`;
  const image = absoluteUrl(server.banner || server.icon) || `${SITE}/icon.svg`;

  // VideoGame schema (JSON-LD) — точнее Product для игрового проекта: помогает
  // Яндексу/Google понять, что это игровой сервер Lineage 2, без «товарных»
  // полей (цены/рейтинга), которые после отказа от отзывов стали неуместны.
  const productSchema: any = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: server.name,
    description: server.shortDesc || `Приватный сервер Lineage 2 ${server.chronicle} ${server.rates}`,
    image,
    url: canonical,
    gamePlatform: 'PC',
    applicationCategory: 'Game',
    genre: 'MMORPG',
    inLanguage: 'ru',
    publisher: { '@type': 'Organization', name: 'L2Realm', url: SITE },
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'L2Realm',
        item: SITE,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Серверы Lineage 2',
        item: `${SITE}/`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: server.name,
        item: canonical,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <ServerDetailClient initialServer={server} />
    </>
  );
}
