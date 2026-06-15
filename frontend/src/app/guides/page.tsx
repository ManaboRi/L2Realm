import type { Metadata } from 'next';
import Link from 'next/link';
import type { Guide } from '@/lib/types';
import { BannersBlock } from '@/components/BannersBlock';
import { formatGuideChronicle } from './guides';
import { GuideIcon } from './GuideIcon';
import { GuidesDisclaimer } from './GuidesDisclaimer';
import g from './page.module.css';

const SITE = 'https://l2realm.ru';
const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';
const HERO_BG = '/images/guides-hero.webp';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Гайды по Lineage 2 — квесты, предметы, NPC, монстры, локации',
  description: 'База знаний по Lineage 2: квесты, предметы, NPC, монстры, локации, классы, скиллы и рейд-боссы. Гайды для хроник Interlude, High Five, Essence и Main.',
  alternates: { canonical: `${SITE}/guides` },
};

// Кнопки-разделы (вместо поиска), как на референсе.
const NAV = [
  { slug: 'novichkam', label: 'Новичкам', href: '/guides', active: true },
  { slug: 'quests', label: 'Квесты', href: '/guides/quests' },
  { slug: 'classes', label: 'Классы', href: '/guides/classes' },
  { slug: 'skills', label: 'Скиллы', href: '/guides/skills' },
  { slug: 'items', label: 'Предметы', href: '/guides/items' },
  { slug: 'npc', label: 'NPC', href: '/guides/npc' },
  { slug: 'monsters', label: 'Монстры', href: '/guides/monsters' },
  { slug: 'locations', label: 'Локации', href: '/guides/locations' },
  { slug: 'raid-bosses', label: 'Рейд-боссы', href: '/guides/raid-bosses' },
];

const START_PATH = [
  { n: '1', title: 'Выбери раздел', desc: 'Квесты, классы, локации, предметы и другое.' },
  { n: '2', title: 'Выбери хронику', desc: 'Фильтр по хронике под свой сервер.' },
  { n: '3', title: 'Открывай гайды', desc: 'Пошагово — с уровнями, NPC и наградами.' },
  { n: '4', title: 'Прокачивайся', desc: 'От первых уровней до эндгейма.' },
];

// 8 быстрых карточек-переходов (4 в ряд × 2). image — арт-шапка карточки.
const CARDS = [
  { title: 'Старт с нуля', desc: 'Про игру и интерфейс на разных хрониках. Скоро добавим.', href: '/guides/quests', btn: 'Скоро', image: '/images/guide-card-1.webp' },
  { title: 'Первые квесты 1–20', desc: 'Стартовые квесты для новых персонажей.', href: '/guides/quests?lvl=b1', btn: 'Перейти к квестам', image: '/images/guide-card-2.webp' },
  { title: 'Маршрут прокачки 20–40', desc: 'Локации и маршрут для уверенного роста.', href: '/guides/locations?lvl=b2', btn: 'Открыть локации', image: '/images/guide-card-3.webp' },
  { title: 'Квесты 40–75', desc: 'Развитие от Interlude до High Five.', href: '/guides/quests?lvl=b3', btn: 'Перейти к квестам', image: '/images/guide-card-4.webp' },
  { title: 'Экипировка по уровням', desc: 'Что надеть на старте и как улучшить.', href: '/guides/items', btn: 'Смотреть экипировку', image: '/images/guide-card-5.webp' },
  { title: 'Квесты на профессию', desc: 'Квесты на 1-ю, 2-ю и 3-ю профессию.', href: '/guides/quests', btn: 'Перейти к квестам', image: '/images/guide-card-6.webp' },
  { title: 'Прокачка Essence 1–85', desc: 'Быстрый маршрут для хроники Essence.', href: '/guides/quests?chr=essence', btn: 'Открыть', image: '/images/guide-card-7.webp' },
  { title: 'Прокачка Main 99–105', desc: 'Эндгейм-маршрут для актуальных хроник.', href: '/guides/quests?chr=main&lvl=b4', btn: 'Открыть', image: '/images/guide-card-8.webp' },
];

async function fetchAllGuides(): Promise<Guide[]> {
  try {
    const res = await fetch(`${BACKEND}/api/guides`, { next: { revalidate } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

export default async function GuidesPage() {
  const allGuides = await fetchAllGuides();
  const popular = [...allGuides].sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 6);

  return (
    <main className={g.guidesMain}>
      {/* ── Hero на всю ширину (full-bleed, низ растворяется в фоне) ── */}
      <div className={g.heroBand}>
        <div className={g.heroBg} aria-hidden="true"><img src={HERO_BG} alt="" /></div>
        <div className={g.heroInner}>
          <div className={g.heroContent}>
            <span className={g.heroKicker}>База знаний L2Realm</span>
            <h1 className={g.heroTitle}>Гайды по <span>Lineage 2</span></h1>
            <p className={g.heroSub}>Квесты, предметы, NPC, монстры, локации, классы, скиллы и рейд-боссы — всё в одном справочнике.</p>
          </div>
        </div>
      </div>

      <div className={g.wrap}>
        {/* ── Кнопки-разделы (вместо поиска) ── */}
        <nav className={g.catNav} aria-label="Разделы гайдов">
          {NAV.map(item => (
            <Link key={item.slug} href={item.href} className={`${g.catBtn} ${item.active ? g.catBtnActive : ''}`}>
              <GuideIcon name={item.slug} size={18} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* ── 3 колонки ── */}
        <div className={g.gGrid}>

          {/* LEFT: Путь новичка */}
          <aside className={g.leftCol}>
            <div className={g.panel}>
              <div className={g.panelTitle}>Путь новичка</div>
              <div className={g.pathSteps}>
                {START_PATH.map(s => (
                  <div key={s.n} className={g.pathStep}>
                    <span className={g.pathNum}>{s.n}</span>
                    <div className={g.pathText}>
                      <strong>{s.title}</strong>
                      <p>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/guides/quests" className={g.panelBtn}>Начать с квестов <i aria-hidden="true">→</i></Link>
            </div>
          </aside>

          {/* CENTER: 6 карточек-переходов */}
          <section className={g.centerCol}>
            <div className={g.cards}>
              {CARDS.map(c => (
                <Link key={c.title} href={c.href} className={g.card}>
                  <span className={g.cardArt}><img src={c.image} alt="" loading="lazy" decoding="async" /></span>
                  <span className={g.cardBody}>
                    <strong>{c.title}</strong>
                    <small>{c.desc}</small>
                    <span className={g.cardBtn}>{c.btn} <i aria-hidden="true">→</i></span>
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* RIGHT: Популярные квесты + совет */}
          <aside className={g.rightCol}>
            <BannersBlock slot={1} variant="feature" />

            <div className={g.panel}>
              <div className={g.panelTitle}>Популярные квесты</div>
              {popular.length > 0 ? (
                <div className={g.popList}>
                  {popular.map(pg => {
                    return (
                      <Link key={pg.id} href={`/guides/${pg.category}/${pg.slug}`} className={g.popRow}>
                        <span className={g.popFire} aria-hidden="true">🔥</span>
                        <span className={g.popName}>{pg.title}</span>
                        <span className={g.popMeta}>{formatGuideChronicle(pg.chronicle)}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className={g.popEmpty}>Скоро здесь будут самые просматриваемые квесты.</p>
              )}
            </div>

            <div className={g.tipCard}>
              <div className={g.tipHead}>💡 Полезный совет</div>
              <p className={g.tipText}>Не спеши: проходи квесты, изучай мир и получай максимум удовольствия от игры.</p>
            </div>
          </aside>

        </div>

        <GuidesDisclaimer />
      </div>
    </main>
  );
}
