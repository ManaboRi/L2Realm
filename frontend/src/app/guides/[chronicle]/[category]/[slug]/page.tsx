import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findGuideChronicle } from '../../../guides';
import { findGuideCategory } from '../../../categories';
import { renderMarkdown, readingTime } from '@/lib/markdown';
import type { Guide } from '@/lib/types';
import styles from './page.module.css';

const SITE = 'https://l2realm.ru';
const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';

export const revalidate = 300;

type Props = { params: Promise<{ chronicle: string; category: string; slug: string }> };

async function fetchGuide(slug: string): Promise<Guide | null> {
  try {
    const res = await fetch(`${BACKEND}/api/guides/${encodeURIComponent(slug)}`, { next: { revalidate } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function levelText(g: Guide): string | null {
  if (g.levelMin != null && g.levelMax != null) return `${g.levelMin}–${g.levelMax}`;
  if (g.levelMin != null) return `${g.levelMin}+`;
  if (g.levelMax != null) return `до ${g.levelMax}`;
  return null;
}

function absoluteUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try { return new URL(url, SITE).toString(); } catch { return undefined; }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { chronicle, category, slug } = await params;
  const guide = await fetchGuide(slug);
  const ch = findGuideChronicle(chronicle);
  const cat = findGuideCategory(category);
  if (!guide || !ch || !cat) return { title: 'Гайд не найден', robots: { index: false, follow: false } };
  const canonical = `${SITE}/guides/${ch.slug}/${cat.slug}/${guide.slug}`;
  const description = (guide.description || `${guide.title} — гайд по Lineage 2 ${ch.name}.`).slice(0, 160);
  const image = absoluteUrl(guide.image) || `${SITE}/apple-touch-icon.png`;
  return {
    title: `${guide.title} — гайд Lineage 2 ${ch.name}`,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      title: guide.title,
      description,
      url: canonical,
      siteName: 'L2Realm',
      locale: 'ru_RU',
      images: [{ url: image, width: 1200, height: 630, alt: guide.title }],
    },
  };
}

export default async function GuideDetailPage({ params }: Props) {
  const { chronicle, category, slug } = await params;
  const guide = await fetchGuide(slug);
  const ch = findGuideChronicle(chronicle);
  const cat = findGuideCategory(category);
  if (!guide || !ch || !cat) notFound();

  const lvl = levelText(guide);
  const info: Array<[string, string]> = [];
  if (lvl) info.push(['Уровень', lvl]);
  if (guide.npc) info.push(['Стартовый NPC', guide.npc]);
  if (guide.location) info.push(['Локация', guide.location]);
  if (guide.reward) info.push(['Награда', guide.reward]);

  const guideImage = absoluteUrl(guide.image);
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: (guide.description || guide.title).slice(0, 160),
    image: guideImage ? [guideImage] : undefined,
    datePublished: guide.publishedAt ?? guide.createdAt,
    dateModified: guide.updatedAt ?? guide.publishedAt ?? guide.createdAt,
    author: { '@type': 'Organization', name: 'L2Realm' },
    publisher: {
      '@type': 'Organization',
      name: 'L2Realm',
      logo: { '@type': 'ImageObject', url: `${SITE}/icon.svg` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE}/guides/${ch.slug}/${cat.slug}/${guide.slug}` },
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Гайды', item: `${SITE}/guides` },
      { '@type': 'ListItem', position: 2, name: ch.name, item: `${SITE}/guides/${ch.slug}` },
      { '@type': 'ListItem', position: 3, name: cat.label, item: `${SITE}/guides/${ch.slug}/${cat.slug}` },
      { '@type': 'ListItem', position: 4, name: guide.title, item: `${SITE}/guides/${ch.slug}/${cat.slug}/${guide.slug}` },
    ],
  };

  return (
    <div className={styles.page} style={{ ['--accent' as string]: ch.accent }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className={styles.bread}>
        <Link href="/guides">Гайды</Link>
        <span>›</span>
        <Link href={`/guides/${ch.slug}`}>{ch.name}</Link>
        <span>›</span>
        <Link href={`/guides/${ch.slug}/${cat.slug}`}>{cat.label}</Link>
        <span>›</span>
        <span>{guide.title}</span>
      </div>

      <article className={styles.article}>
        {guide.image && (
          <div className={styles.banner}>
            <img src={guide.image} alt={guide.title} />
          </div>
        )}

        <header className={styles.head}>
          <div className={styles.meta}>
            <span className={styles.category}>{cat.icon} {cat.label}</span>
            <span className={styles.metaDot}>·</span>
            <span>Хроника {ch.name}</span>
            {guide.content && (
              <>
                <span className={styles.metaDot}>·</span>
                <span>{readingTime(guide.content)} мин чтения</span>
              </>
            )}
          </div>
          <h1 className={styles.title}>{guide.title}</h1>
          {guide.description && <p className={styles.lead}>{guide.description}</p>}
        </header>

        {info.length > 0 && (
          <div className={styles.infoBar}>
            {info.map(([label, value]) => (
              <div key={label} className={styles.infoItem}>
                <small>{label}</small>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        )}

        <div className={styles.body}>
          {guide.content
            ? renderMarkdown(guide.content)
            : <p className={styles.placeholder}>Текст гайда скоро будет дополнен.</p>}
        </div>

        <div className={styles.foot}>
          <Link href={`/guides/${ch.slug}/${cat.slug}`} className={styles.backBtn}>← Все «{cat.label}» {ch.name}</Link>
          <Link href={`/chronicle/${ch.slug}`} className={styles.serversBtn}>Серверы {ch.name} →</Link>
        </div>
      </article>
    </div>
  );
}
