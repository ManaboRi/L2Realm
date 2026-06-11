import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findGuideChronicle } from '../guides';
import { findGuideCategory } from '../categories';
import { GuideIcon } from '../GuideIcon';
import { GuidesDisclaimer } from '../GuidesDisclaimer';
import { QuestList } from './QuestList';
import type { Guide } from '@/lib/types';
import g from '../page.module.css';

const SITE = 'https://l2realm.ru';
const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';

export const revalidate = 300;

type Props = { params: Promise<{ category: string }>; searchParams: Promise<{ lvl?: string; chr?: string }> };

// Кнопки-разделы (как на хабе).
const NAV = [
  { slug: 'novichkam', label: 'Новичкам', href: '/guides' },
  { slug: 'quests', label: 'Квесты', href: '/guides/quests' },
  { slug: 'classes', label: 'Классы', href: '/guides/classes' },
  { slug: 'skills', label: 'Скиллы', href: '/guides/skills' },
  { slug: 'items', label: 'Предметы', href: '/guides/items' },
  { slug: 'npc', label: 'NPC', href: '/guides/npc' },
  { slug: 'locations', label: 'Локации', href: '/guides/locations' },
];

// Левый блок «Основные квесты» — частые подборки.
const MAIN_QUESTS = [
  { label: 'Квесты на 1 профессию', desc: 'с 18–20 уровня', href: '/guides/quests?lvl=b1' },
  { label: 'Квесты на 2 профессию', desc: 'с 40 уровня', href: '/guides/quests?lvl=b3' },
  { label: 'Квесты на 3 профессию', desc: 'с 76 уровня', href: '/guides/quests?lvl=b4' },
  { label: 'Сабкласс', desc: 'дополнительные классы', href: '/guides/quests' },
  { label: 'Нублесс', desc: 'статус Noblesse', href: '/guides/quests' },
  { label: 'Пайлака', desc: 'эндгейм-инстанс', href: '/guides/quests?lvl=b4' },
];

const PLAYER_PATH = [
  { n: '1', title: 'Новичок (1–20)', desc: 'Первые квесты и квест на 1 профессию.' },
  { n: '2', title: 'Развитие (20–40)', desc: 'Снаряжение и 2 профессия.' },
  { n: '3', title: 'Подготовка (40–76)', desc: 'Нублесс, сабкласс, фарм.' },
  { n: '4', title: 'Эндгейм (76+)', desc: 'Пайлака, эпик и боссы.' },
];

const HERO_IMG: Record<string, string> = {
  quests: '/images/guide-hero-quests.webp',
  items: '/images/guide-hero-items.webp',
  npc: '/images/guide-hero-npc.webp',
  locations: '/images/guide-hero-locations.webp',
  classes: '/images/guide-hero-classes.webp',
  skills: '/images/guide-hero-skills.webp',
};

async function fetchGuides(category: string): Promise<Guide[]> {
  try {
    const res = await fetch(`${BACKEND}/api/guides?category=${encodeURIComponent(category)}`, { next: { revalidate } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const cat = findGuideCategory(category);
  if (!cat) return { title: 'Гайды не найдены', robots: { index: false, follow: false } };
  return {
    title: `${cat.label} Lineage 2 — гайды и список | L2Realm`,
    description: `${cat.label} Lineage 2: ${cat.desc} Фильтр по хронике, уровню, расе и локации.`,
    alternates: { canonical: `${SITE}/guides/${cat.slug}` },
  };
}

export default async function GuideCategoryPage({ params, searchParams }: Props) {
  const { category } = await params;
  const sp = await searchParams;
  const cat = findGuideCategory(category);
  if (!cat) notFound();

  const guides = await fetchGuides(cat.slug);
  const popular = [...guides].sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 6);
  const heroImg = HERO_IMG[cat.slug] ?? '/images/guides-hero.webp';

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Гайды', item: `${SITE}/guides` },
      { '@type': 'ListItem', position: 2, name: cat.label, item: `${SITE}/guides/${cat.slug}` },
    ],
  };

  return (
    <main className={g.guidesMain}>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* ── Hero раздела (full-bleed, своя картинка) ── */}
      <div className={g.heroBand}>
        <div className={g.heroBg} aria-hidden="true"><img src={heroImg} alt="" /></div>
        <div className={g.heroInner}>
          <div className={g.heroContent}>
            <span className={g.heroKicker}>База знаний L2Realm</span>
            <h1 className={g.heroTitle}>{cat.label} <span>Lineage 2</span></h1>
            <p className={g.heroSub}>{cat.desc} Хроника, уровень, раса и локация — фильтры, выбирай нужное.</p>
          </div>
        </div>
      </div>

      <div className={g.wrap}>
        {/* ── Кнопки-разделы ── */}
        <nav className={g.catNav} aria-label="Разделы гайдов">
          {NAV.map(item => (
            <Link key={item.slug} href={item.href} className={`${g.catBtn} ${item.slug === cat.slug ? g.catBtnActive : ''}`}>
              <GuideIcon name={item.slug} size={18} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className={g.gGrid}>

          {/* LEFT: Основные квесты */}
          <aside className={g.leftCol}>
            <div className={g.panel}>
              <div className={g.panelTitle}>Основные квесты</div>
              {MAIN_QUESTS.map(m => (
                <Link key={m.label} href={m.href} className={g.nextLink}>
                  <span className={g.nextIcon}><GuideIcon name="quests" size={16} /></span>
                  <span className={g.nextText}>
                    <strong>{m.label}</strong>
                    <small>{m.desc}</small>
                  </span>
                  <span className={g.nextArrow} aria-hidden="true">›</span>
                </Link>
              ))}
            </div>
          </aside>

          {/* CENTER: список квестов */}
          <section className={g.centerCol}>
            {guides.length === 0 ? (
              <div className={g.emptyHint}>
                Гайды в разделе «{cat.label}» скоро появятся — база пополняется.{' '}
                <Link href="/contacts">Предложить тему</Link>.
              </div>
            ) : (
              <QuestList guides={guides} defaultChronicle={sp.chr ?? ''} initialLevel={sp.lvl ?? 'all'} />
            )}
          </section>

          {/* RIGHT: популярные + путь игрока */}
          <aside className={g.rightCol}>
            <div className={g.panel}>
              <div className={g.panelTitle}>Популярные квесты</div>
              {popular.length > 0 ? (
                <div className={g.popList}>
                  {popular.map(pg => {
                    const ch = findGuideChronicle(pg.chronicle);
                    return (
                      <Link key={pg.id} href={`/guides/${pg.category}/${pg.slug}`} className={g.popRow}>
                        <span className={g.popFire} aria-hidden="true">🔥</span>
                        <span className={g.popName}>{pg.title}</span>
                        <span className={g.popMeta}>{ch?.name ?? pg.chronicle}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className={g.popEmpty}>Скоро здесь будут самые просматриваемые квесты.</p>
              )}
            </div>

            <div className={g.panel}>
              <div className={g.panelTitle}>Путь игрока</div>
              <div className={g.pathSteps}>
                {PLAYER_PATH.map(p => (
                  <div key={p.n} className={g.pathStep}>
                    <span className={g.pathNum}>{p.n}</span>
                    <div className={g.pathText}>
                      <strong>{p.title}</strong>
                      <p>{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

        </div>

        <GuidesDisclaimer />
      </div>
    </main>
  );
}
