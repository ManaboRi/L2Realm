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

function hasStartGuide(server: Server): boolean {
  return Boolean(server.clientUrl || server.patchUrl || server.updaterUrl || server.installGuide);
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
  const downloadsReady = hasStartGuide(server);
  const title = downloadsReady
    ? `${server.name} — скачать клиент и играть Lineage 2 ${server.chronicle}`
    : `${server.name} — Lineage 2 ${server.chronicle} ${server.rates}${typeStr ? ' ' + typeStr : ''}`;

  const ratingStr = server.ratingCount > 0
    ? ` Рейтинг ${server.rating.toFixed(1)} ⭐ по ${server.ratingCount} отзывам игроков.`
    : '';
  const startStr = downloadsReady
    ? ` Скачать клиент, патч или апдейтер ${server.name} и посмотреть инструкцию запуска.`
    : '';
  const baseDescription = (server.shortDesc && server.shortDesc.trim())
    || `Приватный сервер Lineage 2 «${server.name}» — хроника ${server.chronicle}, рейты ${server.rates}${typeStr ? ', ' + typeStr : ''}.${ratingStr} Честные отзывы и онлайн-статус на L2Realm.`;
  const description = downloadsReady ? `${baseDescription}${startStr}` : baseDescription;

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

  // Product schema (JSON-LD) — даёт Google возможность показать звёздочки
  // и количество отзывов прямо в выдаче. Offer нужен Google для страниц без
  // отзывов, а AggregateRating добавляем только когда есть реальные оценки.
  const productSchema: any = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: server.name,
    description: server.shortDesc || `Приватный сервер Lineage 2 ${server.chronicle} ${server.rates}`,
    image,
    brand: { '@type': 'Brand', name: 'L2Realm' },
    category: `Lineage 2 ${server.chronicle}`,
    offers: {
      '@type': 'Offer',
      url: canonical,
      price: '0',
      priceCurrency: 'RUB',
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };
  if (server.ratingCount > 0) {
    productSchema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: server.rating.toFixed(1),
      reviewCount: server.ratingCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <ServerDetailClient initialServer={server} />
    </>
  );
}
