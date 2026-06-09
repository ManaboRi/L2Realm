import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Server } from '@/lib/types';
import {
  activityMeta,
  currentProjectWorlds,
  latestProjectOpening,
  projectWorldCount,
  trustMeta,
} from '@/lib/project-metrics';
import { ServerDetailClient } from './ServerDetailClient';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';
const SITE = 'https://l2realm.ru';
const DEFAULT_SHARE_IMAGE = `${SITE}/images/og-default.jpg`;
const MAX_TITLE_LENGTH = 68;
const MAX_DESCRIPTION_LENGTH = 165;

const TYPE_LABELS: Record<string, string> = {
  pvp: 'PvP',
  pve: 'PvE',
  'pvp-pve': 'PvP/PvE',
  gve: 'GvE',
  rvr: 'RvR',
  multiproff: 'MultiProf',
  multicraft: 'MultiCraft',
};

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

function publicHttpUrl(url: string | null | undefined): string | undefined {
  const value = url?.trim();
  if (!value || !/^https?:\/\//i.test(value)) return undefined;
  return absoluteUrl(value);
}

function cleanMetaText(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\[\[project:[^\]]+\]\]/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[`*#>~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function trimMetaText(value: string, maxLength: number): string {
  const text = cleanMetaText(value);
  if (text.length <= maxLength) return text;

  const slice = text.slice(0, maxLength - 3);
  const boundary = slice.lastIndexOf(' ');
  const cutAt = boundary > Math.floor(maxLength * 0.65) ? boundary : slice.length;
  return `${slice.slice(0, cutAt).trim()}...`;
}

function sentence(value: string | null | undefined): string | null {
  const text = cleanMetaText(value).replace(/[.。]+$/g, '');
  return text ? `${text}.` : null;
}

function uniqueValues(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  return values
    .map(value => cleanMetaText(value))
    .filter(Boolean)
    .filter(value => {
      const key = value.toLocaleLowerCase('ru-RU');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function uniquePlainValues(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  return values
    .map(value => value?.trim() ?? '')
    .filter(Boolean)
    .filter(value => {
      const key = value.toLocaleLowerCase('ru-RU');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function compactList(values: Array<string | null | undefined>, max = 3): string {
  const unique = uniqueValues(values);
  if (unique.length <= max) return unique.join(' / ');
  return `${unique.slice(0, max).join(' / ')} +${unique.length - max}`;
}

function formatTypes(server: Server): string {
  const worlds = currentProjectWorlds(server);
  const values = [
    ...(server.type ?? []),
    ...worlds.map(world => world.type),
  ];

  return compactList(values.map(value => (value ? TYPE_LABELS[value] || value : value)), 2);
}

function worldWord(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'мир';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'мира';
  return 'миров';
}

function validIsoDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function buildServerSeo(server: Server, id: string) {
  const worlds = currentProjectWorlds(server);
  const worldSources = worlds.length > 0 ? worlds : [];
  const chronicleText = compactList([...worldSources.map(world => world.chronicle), server.chronicle]);
  const ratesText = compactList([...worldSources.map(world => world.rates), server.rates]);
  const typeText = formatTypes(server);
  const worldCount = projectWorldCount(server);
  const activity = activityMeta(server.activityLevel);
  const trust = trustMeta(server.trustLevel);

  const title = trimMetaText(
    [
      `${server.name} - сервер Lineage 2`,
      chronicleText,
      ratesText,
      typeText,
    ].filter(Boolean).join(' '),
    MAX_TITLE_LENGTH,
  );

  const facts = [
    chronicleText ? `Lineage 2 ${chronicleText}` : 'Lineage 2',
    ratesText ? `рейты ${ratesText}` : null,
    typeText || null,
    worldCount > 1 ? `${worldCount} ${worldWord(worldCount)}` : null,
    activity.known ? `активность ${activity.label.toLocaleLowerCase('ru-RU')}` : null,
    trust.known ? `доверие ${trust.label}` : server.manualCheckAt ? 'ручная проверка L2Realm' : null,
  ].filter(Boolean).join(', ');

  const shortDescription = cleanMetaText(server.shortDesc);
  const intro = sentence(shortDescription);
  const description = trimMetaText(
    intro
      ? `${server.name}: ${intro} ${facts}.`
      : `${server.name} - проект Lineage 2: ${facts}. Описания, открытия, трафик, голоса игроков и проверка L2Realm.`,
    MAX_DESCRIPTION_LENGTH,
  );

  const canonical = `${SITE}/servers/${encodeURIComponent(id)}`;
  const image = absoluteUrl(server.banner || server.icon) || DEFAULT_SHARE_IMAGE;
  const imageAlt = `${server.name} - сервер Lineage 2`;
  const keywords = uniqueValues([
    server.name,
    `${server.name} сервер`,
    `${server.name} Lineage 2`,
    `${server.name} ${chronicleText}`,
    `${server.name} ${ratesText}`,
    `сервер Lineage 2 ${chronicleText}`,
    `сервер л2 ${ratesText}`,
    'каталог серверов Lineage 2',
    'L2Realm',
  ]);

  return {
    title,
    description,
    canonical,
    image,
    imageAlt,
    keywords,
    openedAt: validIsoDate(latestProjectOpening(server) || server.openedDate),
    checkedAt: validIsoDate(server.manualCheckAt),
  };
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

  const seo = buildServerSeo(server, id);

  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    alternates: { canonical: seo.canonical },
    openGraph: {
      type: 'website',
      title: seo.title,
      description: seo.description,
      url: seo.canonical,
      siteName: 'L2Realm',
      locale: 'ru_RU',
      images: [{ url: seo.image, alt: seo.imageAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
      images: [seo.image],
    },
  };
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  const server = await fetchServer(id);
  if (!server) notFound();

  const seo = buildServerSeo(server, id);
  const sameAs = uniquePlainValues([
    publicHttpUrl(server.url),
    publicHttpUrl(server.site),
    publicHttpUrl(server.discord),
    publicHttpUrl(server.telegram),
    publicHttpUrl(server.vk),
    publicHttpUrl(server.youtube),
  ]);

  // VideoGame schema описывает проект без товарных/рейтинговых полей:
  // после отключения публичных отзывов так честнее для поисковиков.
  const productSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: server.name,
    description: seo.description,
    image: seo.image,
    url: seo.canonical,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': seo.canonical,
    },
    gamePlatform: 'PC',
    applicationCategory: 'Game',
    genre: 'MMORPG',
    inLanguage: 'ru',
    keywords: seo.keywords.join(', '),
    isAccessibleForFree: true,
    publisher: { '@type': 'Organization', name: 'L2Realm', url: SITE },
    ...(seo.openedAt && { datePublished: seo.openedAt }),
    ...(seo.checkedAt && { dateModified: seo.checkedAt }),
    ...(sameAs.length > 0 && { sameAs }),
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
        item: seo.canonical,
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
