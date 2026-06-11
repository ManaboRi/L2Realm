import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findGuideChronicle } from '../../guides';
import { findGuideCategory } from '../../categories';
import { GuidesDisclaimer } from '../../GuidesDisclaimer';
import { renderMarkdown } from '@/lib/markdown';
import { parseReward, REWARD_ICONS, REWARD_LABEL } from '../../reward';
import type { Guide } from '@/lib/types';
import styles from './page.module.css';

const SITE = 'https://l2realm.ru';
const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';

export const revalidate = 300;

type Props = { params: Promise<{ category: string; slug: string }> };

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
  const { category, slug } = await params;
  const guide = await fetchGuide(slug);
  const cat = findGuideCategory(category);
  if (!guide || !cat) return { title: 'Гайд не найден', robots: { index: false, follow: false } };
  const ch = findGuideChronicle(guide.chronicle);
  const canonical = `${SITE}/guides/${cat.slug}/${guide.slug}`;
  const description = (guide.description || `${guide.title} — гайд по Lineage 2${ch ? ' ' + ch.name : ''}.`).slice(0, 160);
  const image = absoluteUrl(guide.image) || `${SITE}/apple-touch-icon.png`;
  return {
    title: `${guide.title} — гайд Lineage 2${ch ? ' ' + ch.name : ''}`,
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
  const { category, slug } = await params;
  const guide = await fetchGuide(slug);
  const cat = findGuideCategory(category);
  if (!guide || !cat) notFound();
  const ch = findGuideChronicle(guide.chronicle);

  const lvl = levelText(guide);
  const info: Array<[string, string]> = [['Раздел', cat.label], ['Хроника', ch?.name ?? guide.chronicle]];
  if (lvl) info.unshift(['Уровень', lvl]);
  if (guide.npc) info.push(['Стартовый NPC', guide.npc]);
  if (guide.location) info.push(['Локация', guide.location]);
  if (guide.repeatable) info.push(['Повторяемый', 'Да']);

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
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE}/guides/${cat.slug}/${guide.slug}` },
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Гайды', item: `${SITE}/guides` },
      { '@type': 'ListItem', position: 2, name: cat.label, item: `${SITE}/guides/${cat.slug}` },
      { '@type': 'ListItem', position: 3, name: guide.title, item: `${SITE}/guides/${cat.slug}/${guide.slug}` },
    ],
  };

  return (
    <div className={styles.page} style={{ ['--accent' as string]: ch?.accent ?? '#d2ab52' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className={styles.bread}>
        <Link href="/guides">Гайды</Link>
        <span>›</span>
        <Link href={`/guides/${cat.slug}`}>{cat.label}</Link>
        <span>›</span>
        <span>{guide.title}</span>
      </div>

      <div className={styles.layout}>
        <article className={styles.main}>
          <header className={`${styles.head}${guide.image ? '' : ' ' + styles.headNoImg}`}>
            <div className={styles.headText}>
              <h1 className={styles.title}>{guide.title}</h1>
              {guide.titleEn && <p className={styles.titleEn}>{guide.titleEn}</p>}
              {guide.description && <p className={styles.lead}>{guide.description}</p>}
            </div>
            {guide.image && (
              <div className={styles.heroImg}>
                <img src={guide.image} alt={guide.title} />
              </div>
            )}
          </header>

          <div className={styles.infoMobile}>
            <InfoCard info={info} reward={guide.reward} catLabel={cat.label} catSlug={cat.slug} />
          </div>

          <div className={styles.body}>
            {guide.content
              ? renderMarkdown(guide.content)
              : <p className={styles.placeholder}>Текст гайда скоро будет дополнен.</p>}
          </div>

          <div className={styles.foot}>
            <Link href={`/guides/${cat.slug}`} className={styles.backBtn}>← Все «{cat.label}»</Link>
            {ch && <Link href={`/chronicle/${ch.slug}`} className={styles.serversBtn}>Серверы {ch.name} →</Link>}
          </div>
        </article>

        <aside className={styles.aside}>
          <div className={styles.asideSticky}>
            <InfoCard info={info} reward={guide.reward} catLabel={cat.label} catSlug={cat.slug} />
          </div>
        </aside>
      </div>

      <GuidesDisclaimer />
    </div>
  );
}

function InfoCard({ info, reward, catLabel, catSlug }: { info: Array<[string, string]>; reward?: string | null; catLabel: string; catSlug: string }) {
  const rewardParts = parseReward(reward);
  return (
    <>
      <div className={styles.infoCard}>
        <div className={styles.cardTitle}>Краткая информация</div>
        <dl className={styles.infoList}>
          {info.map(([label, value]) => (
            <div key={label} className={styles.infoRow}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {rewardParts.length > 0 && (
        <div className={`${styles.infoCard} ${styles.rewardCard}`}>
          <div className={styles.cardTitle}>Награда за квест</div>
          <ul className={styles.rewardList}>
            {rewardParts.map((p, i) => (
              <li key={i} className={styles.rewardRow}>
                {p.kind === 'icon' ? (
                  <>
                    <img className={styles.rewardRowIco} src={REWARD_ICONS[p.key]} alt={REWARD_LABEL[p.key]} loading="lazy" />
                    <span className={styles.rewardRowLabel}>
                      {REWARD_LABEL[p.key]}{p.amount ? <span className={styles.rewardRowAmt}> ({p.amount})</span> : null}
                    </span>
                  </>
                ) : (
                  <>
                    <svg className={styles.rewardRowIco} viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M7 3h10a2 2 0 0 1 2 2v12a4 4 0 0 1-4 4H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" strokeWidth="1.6" />
                      <path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                    <span className={styles.rewardRowLabel}>{p.text}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link href={`/guides/${catSlug}`} className={styles.asideMore}>
        Все «{catLabel}» →
      </Link>
    </>
  );
}
