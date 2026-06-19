import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { CSSProperties } from 'react';
import { findGuideChronicle, formatGuideChronicle } from '../../guides';
import { findGuideCategory, GUIDE_CATEGORIES } from '../../categories';
import { GuideIcon } from '../../GuideIcon';
import { GuidesDisclaimer } from '../../GuidesDisclaimer';
import { renderMarkdown } from '@/lib/markdown';
import type { MarkdownAutoLink } from '@/lib/markdown';
import { findRewardItemIcon, parseReward, REWARD_ICONS, REWARD_LABEL, buildItemIconMap } from '../../reward';
import type { ItemIconMap } from '../../reward';
import type { RewardPart } from '../../reward';
import { QUEST_TYPE_COLOR, gradeColor } from '../../questTypes';
import type { Guide } from '@/lib/types';
import styles from './page.module.css';

const SITE = 'https://l2realm.ru';
const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';

export const revalidate = 300;

type Props = { params: Promise<{ category: string; slug: string }> };
type RelatedItem = { label: string; meta: string; kind: 'npc' | 'item' | 'location' | 'quest' | 'monster' | 'raid'; href: string };

function chronicleLabel(slug: string): string {
  return formatGuideChronicle(slug);
}

// Акцентный цвет по разделу: квесты — синий, NPC — золото, рейды — оранж, монстры — красный и т.д.
const CATEGORY_ACCENT: Record<string, string> = {
  quests: '#67b7ff',
  npc: '#e0b94f',
  'raid-bosses': '#f0a868',
  monsters: '#e25c4b',
  locations: '#5fcf8a',
  items: '#caa46a',
  classes: '#d2ab52',
  skills: '#9b8cff',
};
function categoryAccent(slug: string): string {
  return CATEGORY_ACCENT[slug] ?? '#d2ab52';
}

function summaryTitle(category: string): string {
  if (category === 'quests') return 'Награда';
  if (category === 'items') return 'Кратко о предмете';
  if (category === 'npc') return 'Роль NPC';
  if (category === 'monsters') return 'Дроп / спойл';
  if (category === 'raid-bosses') return 'Дроп';
  if (category === 'locations') return 'Кратко о локации';
  return 'Кратко';
}

function summaryCardTitle(category: string): string {
  if (category === 'quests') return 'Награда за квест';
  if (category === 'items') return 'Сводка по предмету';
  if (category === 'npc') return 'Роль NPC';
  if (category === 'monsters') return 'Ключевой дроп';
  if (category === 'raid-bosses') return 'Ключевой дроп';
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

async function fetchGuideLinks(): Promise<Guide[]> {
  try {
    const res = await fetch(`${BACKEND}/api/guides`, { next: { revalidate } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function entityAliases(guide: Guide): string[] {
  const aliases = new Set<string>();
  const title = cleanTerm(guide.title);
  aliases.add(title);
  if (guide.titleEn) aliases.add(cleanTerm(guide.titleEn));
  if (guide.npc) aliases.add(cleanTerm(guide.npc));

  if (guide.category === 'npc' || guide.category === 'monsters' || guide.category === 'raid-bosses') {
    const short = title
      .replace(/^(Великий\s+Мастер|Верховный\s+Жрец|Главный\s+Кузнец|Начальник\s+Склада|Рабочий\s+Склада|Мастер\s+Татуировок|Хранитель\s+Портала|Торговец\s+(?:Оружием|Доспехами)|Привратник\s+Обители\s+Клана|Управляющий\s+(?:Аукциона|Олимпиады)|Жрец|Жрица|Магистр|Мастер|Кузнец|Страж|Провидец|Бакалейщик|Ювелир)\s+/i, '')
      .trim();
    if (short && short !== title) aliases.add(short);
  }

  return [...aliases]
    .flatMap(expandAliasVariants)
    .filter(alias => alias.length >= 3 && alias !== title);
}

function addYoVariants(value: string): string[] {
  const variants = new Set<string>([value]);
  if (/[еЕ]/.test(value)) variants.add(value.replace(/е/g, 'ё').replace(/Е/g, 'Ё'));
  if (/[ёЁ]/.test(value)) variants.add(value.replace(/ё/g, 'е').replace(/Ё/g, 'Е'));
  return [...variants];
}

function inflectLastWord(word: string): string[] {
  const variants = new Set<string>();
  if (/я$/i.test(word)) variants.add(word.replace(/я$/i, 'ю'));
  if (/а$/i.test(word)) variants.add(word.replace(/а$/i, 'у'));
  if (/й$/i.test(word)) variants.add(word.replace(/й$/i, 'я'));
  return [...variants];
}

function inflectAdjective(word: string): string[] {
  const variants = new Set<string>();
  if (/ый$/i.test(word) || /ой$/i.test(word)) variants.add(word.replace(/(ый|ой)$/i, 'ого'));
  if (/ий$/i.test(word)) variants.add(word.replace(/ий$/i, 'его'));
  if (/ая$/i.test(word)) variants.add(word.replace(/ая$/i, 'ую'));
  if (/яя$/i.test(word)) variants.add(word.replace(/яя$/i, 'юю'));
  return [...variants];
}

function expandAliasVariants(alias: string): string[] {
  const clean = cleanTerm(alias);
  if (!clean) return [];

  const variants = new Set<string>([clean]);
  const words = clean.split(/\s+/).filter(Boolean);
  const lastIndex = words.length - 1;
  const lastWord = words[lastIndex];

  for (const lastVariant of inflectLastWord(lastWord)) {
    const next = [...words];
    next[lastIndex] = lastVariant;
    variants.add(next.join(' '));
  }

  if (words.length >= 2) {
    const prevIndex = words.length - 2;
    const prevWord = words[prevIndex];
    const prevVariants = inflectAdjective(prevWord);
    const lastVariants = [lastWord, ...inflectLastWord(lastWord)];

    for (const prevVariant of prevVariants) {
      for (const lastVariant of lastVariants) {
        const next = [...words];
        next[prevIndex] = prevVariant;
        next[lastIndex] = lastVariant;
        variants.add(next.join(' '));
      }
    }
  }

  return [...variants].flatMap(addYoVariants);
}

function buildAutoLinks(guides: Guide[], current: Guide): MarkdownAutoLink[] {
  const seen = new Set<string>();
  const links: MarkdownAutoLink[] = [];
  // Имена самой текущей страницы (рус + англ) — чтобы НЕ линковать чужую сущность,
  // чьё имя является частью названия текущей (напр. «Бурый Шакал» внутри «Молодой Бурый Шакал»).
  const ownNames = [current.title, current.titleEn]
    .map(n => cleanTerm(n ?? '').toLowerCase())
    .filter(Boolean);
  for (const g of guides) {
    if (g.id === current.id || !g.slug || !g.title || !g.category) continue;
    const key = `${g.category}/${g.slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const candidates = [...new Set([g.title, ...entityAliases(g)].map(a => cleanTerm(a)).filter(Boolean))]
      .filter(alias => !ownNames.some(own => own.includes(alias.toLowerCase())));
    if (!candidates.length) continue;
    links.push({
      label: candidates[0],
      aliases: candidates.slice(1),
      href: `/guides/${g.category}/${g.slug}`,
      kind: guideCategoryLinkKind(g.category),
    });
  }
  return links;
}

function guideCategoryLinkKind(category: string): MarkdownAutoLink['kind'] {
  if (category === 'quests') return 'quest';
  if (category === 'npc') return 'npc';
  if (category === 'monsters') return 'monster';
  if (category === 'raid-bosses') return 'raid';
  if (category === 'locations') return 'location';
  if (category === 'skills') return 'skill';
  if (category === 'classes') return 'class';
  return 'item';
}

// Разбивает markdown на секции по «## Заголовок».
function splitSections(content: string): Array<{ title: string; body: string }> {
  const out: Array<{ title: string; body: string }> = [];
  for (const part of String(content ?? '').split(/\n(?=##\s)/)) {
    const m = part.match(/^##\s+(.+?)\n([\s\S]*)$/);
    if (m) out.push({ title: m[1].trim(), body: m[2].trim() });
    else if (part.trim()) out.push({ title: '', body: part.trim() });
  }
  return out;
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
  if (/(рейд|босс|raid|boss|epic)/i.test(low)) return 'raid';
  if (/(монстр|моб|monster|mob)/i.test(low)) return 'monster';
  if (/(судь|судья|кузнец|мастер|страж|жрец|капитан|blacksmith|judge|master|guard|katari|piotur|casian|joan|pushkin)/i.test(low)) return 'npc';
  if (/(квест|професс|quest)/i.test(low)) return 'quest';
  return fallback;
}

function relatedHref(kind: RelatedItem['kind']): string {
  if (kind === 'npc') return '/guides/npc';
  if (kind === 'monster') return '/guides/monsters';
  if (kind === 'raid') return '/guides/raid-bosses';
  if (kind === 'location') return '/guides/locations';
  if (kind === 'quest') return '/guides/quests';
  return '/guides/items';
}

function relatedMeta(kind: RelatedItem['kind']): string {
  if (kind === 'npc') return 'NPC';
  if (kind === 'monster') return 'Монстр';
  if (kind === 'raid') return 'Рейд-босс';
  if (kind === 'location') return 'Локация';
  if (kind === 'quest') return 'Квест';
  return 'Предмет';
}

function addRelated(list: RelatedItem[], seen: Set<string>, value: string | null | undefined, fallback: RelatedItem['kind'] = 'item') {
  const label = cleanTerm(value ?? '');
  const key = label.toLowerCase();
  if (!label || label.length < 3 || label.length > 42 || seen.has(key)) return;
  if (/^(да|нет|pk|pvp|pve|interlude|high five|essence|main)$/i.test(label)) return;
  if (/^\d+\+?$|^\d+\s*[–-]\s*\d+$/.test(label)) return;
  if (/(^|\s)(pk|pvp|pve)(\s|$)|сч[её]тчик|репутац|уров|очк/i.test(label)) return;
  const kind = classifyTerm(label, fallback);
  seen.add(key);
  list.push({ label, kind, href: relatedHref(kind), meta: relatedMeta(kind) });
}

function textIncludesTerm(text: string, term: string | null | undefined): boolean {
  const clean = cleanTerm(term ?? '');
  return clean.length >= 3 && text.toLowerCase().includes(clean.toLowerCase());
}

function addRelatedGuide(list: RelatedItem[], seen: Set<string>, guide: Guide, kind: RelatedItem['kind']) {
  const label = cleanTerm(guide.title);
  const key = `${kind}:${guide.slug}`;
  if (!label || !guide.slug || seen.has(key)) return;
  seen.add(key);
  list.push({
    label,
    kind,
    href: `/guides/${guide.category}/${guide.slug}`,
    meta: relatedMeta(kind),
  });
}

function extractRelatedItems(guide: Guide, rewardParts: RewardPart[], guides: Guide[]): RelatedItem[] {
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
  } else {
    const pageText = `${guide.content ?? ''} ${guide.description ?? ''}`;
    const npcAliases = [guide.title, guide.titleEn, ...entityAliases(guide)].filter(Boolean) as string[];

    for (const item of guides) {
      if (item.category !== 'quests') continue;
      const npcMentionedInQuest = npcAliases.some(alias => textIncludesTerm(`${item.npc ?? ''} ${item.description ?? ''}`, alias));
      const questMentionedHere = textIncludesTerm(pageText, item.title) || textIncludesTerm(pageText, item.titleEn);
      if (npcMentionedInQuest || questMentionedHere) addRelatedGuide(list, seen, item, 'quest');
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
  const [guide, guideLinksSource] = await Promise.all([fetchGuide(slug), fetchGuideLinks()]);
  const cat = findGuideCategory(category);
  if (!guide || !cat) notFound();
  const isNpc = cat.slug === 'npc';
  const isMonster = cat.slug === 'monsters' || cat.slug === 'raid-bosses';
  const isPortraitGuide = cat.slug === 'npc' || isMonster;
  const chLabel = chronicleLabel(guide.chronicle);
  const rewardParts = parseReward(guide.reward);
  const infoRewardParts = isMonster ? [] : rewardParts;
  const relatedItems = extractRelatedItems(guide, rewardParts, guideLinksSource);
  const heroImage = guide.image || null;
  const showHeroImage = Boolean(heroImage && !isPortraitGuide);
  const sidePortrait = isPortraitGuide ? heroImage : null;
  const accent = categoryAccent(cat.slug);
  const guideSummaryTitle = summaryTitle(cat.slug);
  const relatedBlockTitle = isNpc
    ? 'Связанные квесты и локации'
    : cat.slug === 'monsters'
      ? 'Связанные квесты, локации и предметы'
      : 'Связанные NPC и предметы';
  const autoLinks = buildAutoLinks(guideLinksSource, guide);
  const itemMap = buildItemIconMap(guideLinksSource);
  const mdOpts = { autoLinks, itemIcon: (name: string) => findRewardItemIcon(name, itemMap) };

  // Монстры/рейды — особый лейаут: обзор + дроп/спойл. Старые "Параметры"
  // рендерим внутри обзора, чтобы не появлялась отдельная тяжелая полоса плиток.
  let monsterLayout: { overviewBody: string; dropBody?: string; belowBody: string } | null = null;
  if (isMonster && guide.content) {
    const secs = splitSections(guide.content);
    const stats = secs.find(s => /параметр|stats/i.test(s.title));
    const drop = secs.find(s => /дроп/i.test(s.title));
    const overviewSecs = secs.filter(s => s.title === '' || /что это|где находит|обзор/i.test(s.title));
    if (drop || stats) {
      const belowSecs = secs.filter(s => s !== stats && s !== drop && !overviewSecs.includes(s) && !/связан/i.test(s.title));
      const plainStats = stats?.body
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !/^:::/i.test(line))
        .map(line => `- ${line.replace(/^\-\s*/, '')}`)
        .join('\n');
      monsterLayout = {
        overviewBody: [
          ...overviewSecs.map(s => (s.title ? `## ${s.title}\n${s.body}` : s.body)),
          plainStats ? `## Параметры\n${plainStats}` : null,
        ].filter(Boolean).join('\n\n'),
        dropBody: drop?.body,
        belowBody: belowSecs.map(s => `## ${s.title}\n${s.body}`).join('\n\n'),
      };
    }
  }
  const displayTypes = (guide.types ?? [])
    .filter(type => !(guide.repeatable && /^Повторяемые$/i.test(type)))
    .slice(0, 3);

  const lvl = levelText(guide);
  const info: Array<[string, string]> = isNpc ? [['Раздел', cat.label]] : [['Раздел', cat.label], ['Хроника', chLabel]];
  if (!isNpc && lvl) info.unshift(['Уровень', lvl]);
  if (!isNpc && guide.npc) info.push(['Стартовый NPC', guide.npc]);
  if (guide.location) info.push(['Локация', guide.location]);
  if (guide.grade) info.push(['Грейд', guide.grade]);
  if (isNpc && guide.reward) info.push(['Роль', guide.reward]);
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
      { '@type': 'ListItem', position: 1, name: 'База знаний', item: `${SITE}/guides` },
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
            <Link href="/guides">База знаний</Link>
            <span>›</span>
            <Link href={`/guides/${cat.slug}`}>{cat.label}</Link>
            <span>›</span>
            <span>{guide.title}</span>
          </div>

          <header className={`${styles.head}${showHeroImage ? '' : ' ' + styles.headNoImage}`}>
            <div className={styles.headText}>
              <div className={styles.tagRow}>
                <span className={styles.metaTag}><GuideIcon name={cat.slug} size={14} />{cat.label}</span>
                {guide.grade && <span className={`${styles.metaTag} ${styles.gradeTag}`} style={{ ['--gc' as string]: gradeColor(guide.grade) }}>Грейд {guide.grade}</span>}
                {!isNpc && <span className={styles.metaTag}>{chLabel}</span>}
                {!isNpc && lvl && <span className={styles.metaTag}>{lvl}</span>}
                {!isNpc && guide.repeatable && <span className={`${styles.metaTag} ${styles.metaTagGreen}`}>Повторяемый</span>}
                {displayTypes.map(type => (
                  <span
                    key={type}
                    className={styles.typeTag}
                    style={{ ['--tag-color' as string]: QUEST_TYPE_COLOR[type] ?? '#d2ab52' } as CSSProperties}
                  >
                    {type}
                  </span>
                ))}
              </div>
              <h1 className={styles.title}>
                {guide.title}
                {guide.grade && <span className={styles.titleGrade} style={{ ['--gc' as string]: gradeColor(guide.grade) }}>{guide.grade}</span>}
              </h1>
              {guide.titleEn && <p className={styles.titleEn}>{guide.titleEn}</p>}
              {guide.description && <p className={styles.lead}>{guide.description}</p>}
            </div>
            {showHeroImage && heroImage && (
              <div className={`${styles.heroImg}${isMonster ? ' ' + styles.heroImgBare : ''}`}>
                <img src={heroImage} alt={guide.title} />
              </div>
            )}
          </header>

          <div className={styles.infoMobile}>
            <InfoCard info={info} rewardParts={infoRewardParts} relatedItems={relatedItems} catLabel={cat.label} catSlug={cat.slug} portraitImage={sidePortrait} portraitTitle={guide.title} portraitSubtitle={guide.titleEn || guide.location || cat.label} itemMap={itemMap} />
          </div>

          {monsterLayout ? (
            <div className={styles.body}>
              <div className={styles.monsterCols}>
                <div className={styles.monsterCol}>
                  <h2 className={styles.blockTitle}>Обзор</h2>
                  {renderMarkdown(monsterLayout.overviewBody, mdOpts)}
                </div>
                {monsterLayout.dropBody && (
                  <div className={styles.monsterCol}>
                    <h2 className={styles.blockTitle}>Дроп</h2>
                    {renderMarkdown(monsterLayout.dropBody, mdOpts)}
                  </div>
                )}
              </div>
              {monsterLayout.belowBody && renderMarkdown(monsterLayout.belowBody, mdOpts)}
            </div>
          ) : (
            <div className={styles.body}>
              {guide.content
                ? renderMarkdown(guide.content, mdOpts)
                : <p className={styles.placeholder}>Текст гайда скоро будет дополнен.</p>}
            </div>
          )}

          {!monsterLayout && rewardParts.length > 0 && (
            <section className={styles.rewardBlock} aria-labelledby="guide-reward-title">
              <h2 id="guide-reward-title" className={styles.blockTitle}>{guideSummaryTitle}</h2>
              <div className={styles.rewardTiles}>
                {rewardParts.map((part, index) => <RewardTile key={index} part={part} itemMap={itemMap} />)}
              </div>
            </section>
          )}

          {relatedItems.length > 0 && (
            <section className={styles.relatedBlock} aria-labelledby="guide-related-title">
              <h2 id="guide-related-title" className={styles.blockTitle}>{relatedBlockTitle}</h2>
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
            <InfoCard info={info} rewardParts={infoRewardParts} relatedItems={relatedItems} catLabel={cat.label} catSlug={cat.slug} portraitImage={sidePortrait} portraitTitle={guide.title} portraitSubtitle={guide.titleEn || guide.location || cat.label} itemMap={itemMap} />
          </div>
        </aside>
      </div>

      <GuidesDisclaimer />
    </div>
  );
}

function RewardTile({ part, itemMap }: { part: RewardPart; itemMap?: ItemIconMap }) {
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
  const itemIcon = findRewardItemIcon(part.text, itemMap);
  return (
    <div className={styles.rewardTile}>
      {itemIcon ? (
        <img src={itemIcon} alt="" loading="lazy" />
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 3h10a2 2 0 0 1 2 2v12a4 4 0 0 1-4 4H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )}
      <span><strong>{part.text}</strong></span>
    </div>
  );
}

function RelatedIcon({ kind }: { kind: RelatedItem['kind'] }) {
  if (kind === 'location') return <GuideIcon name="locations" size={22} />;
  if (kind === 'quest') return <GuideIcon name="quests" size={22} />;
  if (kind === 'npc') return <GuideIcon name="npc" size={22} />;
  if (kind === 'monster') return <GuideIcon name="monsters" size={22} />;
  if (kind === 'raid') return <GuideIcon name="raid-bosses" size={22} />;
  return <GuideIcon name="items" size={22} />;
}

function RelatedCard({ item }: { item: RelatedItem }) {
  return (
    <Link href={item.href} className={`${styles.relatedCard} ${styles[`relatedCard_${item.kind}`] ?? ''}`}>
      <span className={styles.relatedIcon}><RelatedIcon kind={item.kind} /></span>
      <span className={styles.relatedText}>
        <strong>{item.label}</strong>
        <em>{item.meta}</em>
      </span>
      <i aria-hidden="true">→</i>
    </Link>
  );
}

function InfoCard({
  info,
  rewardParts,
  relatedItems,
  catLabel,
  catSlug,
  portraitImage,
  portraitTitle,
  portraitSubtitle,
  itemMap,
}: {
  info: Array<[string, string]>;
  rewardParts: RewardPart[];
  relatedItems: RelatedItem[];
  catLabel: string;
  catSlug: string;
  portraitImage?: string | null;
  portraitTitle?: string;
  portraitSubtitle?: string | null;
  itemMap?: ItemIconMap;
}) {
  return (
    <>
      {portraitImage && (
        <div className={styles.portraitCard}>
          <div className={styles.portraitFrame}>
            <img src={portraitImage} alt={portraitTitle || catLabel} loading="lazy" />
          </div>
          <div className={styles.portraitMeta}>
            <strong>{portraitTitle}</strong>
            {portraitSubtitle && <span>{portraitSubtitle}</span>}
          </div>
        </div>
      )}

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
            {rewardParts.map((p, i) => {
              const itemIcon = p.kind === 'text' ? findRewardItemIcon(p.text, itemMap) : null;
              return (
                <li key={i} className={styles.rewardRow}>
                  {p.kind === 'icon' ? (
                    <>
                      <img className={styles.rewardRowIco} src={REWARD_ICONS[p.key]} alt={REWARD_LABEL[p.key]} loading="lazy" />
                      <span className={styles.rewardRowLabel}>
                        {REWARD_LABEL[p.key]}{p.amount ? <span className={styles.rewardRowAmt}> ({p.amount})</span> : null}
                      </span>
                    </>
                  ) : itemIcon ? (
                    <>
                      <img className={styles.rewardRowIco} src={itemIcon} alt="" loading="lazy" />
                      <span className={styles.rewardRowLabel}>{p.text}</span>
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
              );
            })}
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
