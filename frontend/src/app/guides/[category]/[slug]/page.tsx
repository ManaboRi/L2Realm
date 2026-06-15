import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { CSSProperties } from 'react';
import { findGuideChronicle } from '../../guides';
import { findGuideCategory, GUIDE_CATEGORIES } from '../../categories';
import { GuideIcon } from '../../GuideIcon';
import { GuidesDisclaimer } from '../../GuidesDisclaimer';
import { renderMarkdown } from '@/lib/markdown';
import { parseReward, REWARD_ICONS, REWARD_LABEL } from '../../reward';
import type { RewardPart } from '../../reward';
import { QUEST_TYPE_COLOR } from '../../questTypes';
import type { Guide } from '@/lib/types';
import styles from './page.module.css';

const SITE = 'https://l2realm.ru';
const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';

export const revalidate = 300;

type Props = { params: Promise<{ category: string; slug: string }> };
type RelatedItem = { label: string; meta: string; kind: 'npc' | 'item' | 'location' | 'quest'; href: string };

function chronicleLabel(slug: string): string {
  if (slug === 'all') return 'Все хроники';
  return findGuideChronicle(slug)?.name ?? slug;
}

function summaryTitle(category: string): string {
  if (category === 'quests') return 'Награда';
  if (category === 'items') return 'Кратко о предмете';
  if (category === 'npc') return 'Роль NPC';
  if (category === 'locations') return 'Кратко о локации';
  return 'Кратко';
}

function summaryCardTitle(category: string): string {
  if (category === 'quests') return 'Награда за квест';
  if (category === 'items') return 'Сводка по предмету';
  if (category === 'npc') return 'Роль NPC';
  if (category === 'locations') return 'Сводка по локации';
  return 'Сводка';
}

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

function cleanTerm(value: string): string {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/[«»"]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s:;,.—-]+|[\s:;,.—-]+$/g, '')
    .trim();
}

function classifyTerm(label: string, fallback: RelatedItem['kind'] = 'item'): RelatedItem['kind'] {
  const low = label.toLowerCase();
  if (/(деревн|город|замок|локац|остров|лес|долин|поля|town|village|castle|island|forest|plains)/i.test(low)) return 'location';
  if (/(судь|судья|кузнец|мастер|страж|жрец|капитан|blacksmith|judge|master|guard|katari|piotur|casian|joan|pushkin)/i.test(low)) return 'npc';
  if (/(квест|професс|quest)/i.test(low)) return 'quest';
  return fallback;
}

function relatedHref(kind: RelatedItem['kind']): string {
  if (kind === 'npc') return '/guides/npc';
  if (kind === 'location') return '/guides/locations';
  if (kind === 'quest') return '/guides/quests';
  return '/guides/items';
}

function relatedMeta(kind: RelatedItem['kind']): string {
  if (kind === 'npc') return 'NPC';
  if (kind === 'location') return 'Локация';
  if (kind === 'quest') return 'Квест';
  return 'Предмет';
}

function addRelated(list: RelatedItem[], seen: Set<string>, value: string | null | undefined, fallback: RelatedItem['kind'] = 'item') {
  const label = cleanTerm(value ?? '');
  const key = label.toLowerCase();
  if (!label || label.length < 3 || label.length > 42 || seen.has(key)) return;
  if (/^(да|нет|pk|pvp|pve|interlude|high five|essence|main)$/i.test(label)) return;
  if (/(^|\s)(pk|pvp|pve)(\s|$)|сч[её]тчик|репутац|уров|очк/i.test(label)) return;
  const kind = classifyTerm(label, fallback);
  seen.add(key);
  list.push({ label, kind, href: relatedHref(kind), meta: relatedMeta(kind) });
}

function extractRelatedItems(guide: Guide, rewardParts: RewardPart[]): RelatedItem[] {
  const list: RelatedItem[] = [];
  const seen = new Set<string>();
  seen.add(cleanTerm(guide.title).toLowerCase());
  if (guide.titleEn) seen.add(cleanTerm(guide.titleEn).toLowerCase());
  addRelated(list, seen, guide.location, 'location');
  if (guide.category !== 'npc') {
    addRelated(list, seen, guide.npc, 'npc');
    rewardParts.forEach(part => {
      if (part.kind === 'text') addRelated(list, seen, part.text, 'item');
    });
    for (const match of (guide.content ?? '').matchAll(/\*\*([^*]+)\*\*/g)) {
      addRelated(list, seen, match[1], 'npc');
      if (list.length >= 5) break;
    }
  }
  return list.slice(0, 5);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, slug } = await params;
  const guide = await fetchGuide(slug);
  const cat = findGuideCategory(category);
  if (!guide || !cat) return { title: 'Гайд не найден', robots: { index: false, follow: false } };
  const chLabel = chronicleLabel(guide.chronicle);
  const canonical = `${SITE}/guides/${cat.slug}/${guide.slug}`;
  const description = (guide.description || `${guide.title} — гайд по Lineage 2${guide.chronicle === 'all' ? '' : ' ' + chLabel}.`).slice(0, 160);
  const image = absoluteUrl(guide.image) || `${SITE}/apple-touch-icon.png`;
  return {
    title: `${guide.title} — гайд Lineage 2${guide.chronicle === 'all' ? '' : ' ' + chLabel}`,
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
  const chLabel = chronicleLabel(guide.chronicle);
  const rewardParts = parseReward(guide.reward);
  const relatedItems = extractRelatedItems(guide, rewardParts);
  const heroImage = guide.image || null;
  const accent = findGuideChronicle(guide.chronicle)?.accent ?? '#d2ab52';
  const guideSummaryTitle = summaryTitle(cat.slug);

  const lvl = levelText(guide);
  const info: Array<[string, string]> = [['Раздел', cat.label], ['Хроника', chLabel]];
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
    <div className={styles.page} style={{ ['--accent' as string]: accent }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <nav className={styles.categoryNav} aria-label="Разделы гайдов">
        {GUIDE_CATEGORIES.map(item => (
          <Link
            key={item.slug}
            href={`/guides/${item.slug}`}
            className={`${styles.categoryNavItem}${item.slug === cat.slug ? ' ' + styles.categoryNavActive : ''}`}
          >
            <GuideIcon name={item.slug} size={17} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className={styles.layout}>
        <article className={styles.main}>
          <div className={styles.bread}>
            <Link href="/guides">Гайды</Link>
            <span>›</span>
            <Link href={`/guides/${cat.slug}`}>{cat.label}</Link>
            <span>›</span>
            <span>{guide.title}</span>
          </div>

          <header className={`${styles.head}${heroImage ? '' : ' ' + styles.headNoImage}`}>
            <div className={styles.headText}>
              <div className={styles.tagRow}>
                <span className={styles.metaTag}><GuideIcon name={cat.slug} size={14} />{cat.label}</span>
                <span className={styles.metaTag}>{chLabel}</span>
                {lvl && <span className={styles.metaTag}>{lvl}</span>}
                {guide.repeatable && <span className={`${styles.metaTag} ${styles.metaTagGreen}`}>Повторяемый</span>}
                {(guide.types ?? []).slice(0, 3).map(type => (
                  <span
                    key={type}
                    className={styles.typeTag}
                    style={{ ['--tag-color' as string]: QUEST_TYPE_COLOR[type] ?? '#d2ab52' } as CSSProperties}
                  >
                    {type}
                  </span>
                ))}
              </div>
              <h1 className={styles.title}>{guide.title}</h1>
              {guide.titleEn && <p className={styles.titleEn}>{guide.titleEn}</p>}
              {guide.description && <p className={styles.lead}>{guide.description}</p>}
            </div>
            {heroImage && (
              <div className={styles.heroImg}>
                <img src={heroImage} alt={guide.title} />
              </div>
            )}
          </header>

          <div className={styles.infoMobile}>
            <InfoCard info={info} rewardParts={rewardParts} relatedItems={relatedItems} catLabel={cat.label} catSlug={cat.slug} />
          </div>

          <div className={styles.body}>
            {guide.content
              ? renderMarkdown(guide.content)
              : <p className={styles.placeholder}>Текст гайда скоро будет дополнен.</p>}
          </div>

          {rewardParts.length > 0 && (
            <section className={styles.rewardBlock} aria-labelledby="guide-reward-title">
              <h2 id="guide-reward-title" className={styles.blockTitle}>{guideSummaryTitle}</h2>
              <div className={styles.rewardTiles}>
                {rewardParts.map((part, index) => <RewardTile key={index} part={part} />)}
              </div>
            </section>
          )}

          {relatedItems.length > 0 && (
            <section className={styles.relatedBlock} aria-labelledby="guide-related-title">
              <h2 id="guide-related-title" className={styles.blockTitle}>Связанные NPC и предметы</h2>
              <div className={styles.relatedGrid}>
                {relatedItems.map(item => <RelatedCard key={`${item.kind}-${item.label}`} item={item} />)}
              </div>
            </section>
          )}

          <div className={styles.foot}>
            <Link href={`/guides/${cat.slug}`} className={styles.backBtn}>← Все «{cat.label}»</Link>
          </div>
        </article>

        <aside className={styles.aside}>
          <div className={styles.asideSticky}>
            <InfoCard info={info} rewardParts={rewardParts} relatedItems={relatedItems} catLabel={cat.label} catSlug={cat.slug} />
          </div>
        </aside>
      </div>

      <GuidesDisclaimer />
    </div>
  );
}

function RewardTile({ part }: { part: RewardPart }) {
  if (part.kind === 'icon') {
    return (
      <div className={styles.rewardTile}>
        <img src={REWARD_ICONS[part.key]} alt={REWARD_LABEL[part.key]} loading="lazy" />
        <span>
          <strong>{REWARD_LABEL[part.key]}</strong>
          {part.amount && <em>{part.amount}</em>}
        </span>
      </div>
    );
  }
  return (
    <div className={styles.rewardTile}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3h10a2 2 0 0 1 2 2v12a4 4 0 0 1-4 4H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span><strong>{part.text}</strong></span>
    </div>
  );
}

function RelatedIcon({ kind }: { kind: RelatedItem['kind'] }) {
  if (kind === 'location') return <GuideIcon name="locations" size={22} />;
  if (kind === 'quest') return <GuideIcon name="quests" size={22} />;
  if (kind === 'npc') return <GuideIcon name="npc" size={22} />;
  return <GuideIcon name="items" size={22} />;
}

function RelatedCard({ item }: { item: RelatedItem }) {
  return (
    <Link href={item.href} className={styles.relatedCard}>
      <span className={styles.relatedIcon}><RelatedIcon kind={item.kind} /></span>
      <span className={styles.relatedText}>
        <strong>{item.label}</strong>
        <em>{item.meta}</em>
      </span>
      <i aria-hidden="true">→</i>
    </Link>
  );
}

function InfoCard({ info, rewardParts, relatedItems, catLabel, catSlug }: { info: Array<[string, string]>; rewardParts: RewardPart[]; relatedItems: RelatedItem[]; catLabel: string; catSlug: string }) {
  return (
    <>
      <div className={styles.infoCard}>
        <div className={styles.cardTitle}><span>Краткая информация</span></div>
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
          <div className={styles.cardTitle}><span>{summaryCardTitle(catSlug)}</span></div>
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

      {relatedItems.length > 0 && (
        <div className={styles.infoCard}>
          <div className={styles.cardTitle}><span>Смотрите также</span></div>
          <div className={styles.asideLinks}>
            {relatedItems.slice(0, 4).map(item => (
              <Link key={`${item.kind}-${item.label}`} href={item.href} className={styles.asideLink}>
                <RelatedIcon kind={item.kind} />
                <span>{item.label}</span>
                <i aria-hidden="true">→</i>
              </Link>
            ))}
          </div>
        </div>
      )}

      <Link href={`/guides/${catSlug}`} className={styles.asideMore}>
        Все «{catLabel}» →
      </Link>
    </>
  );
}
