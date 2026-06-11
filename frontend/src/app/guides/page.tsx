import type { Metadata } from 'next';
import Link from 'next/link';
import type { Guide } from '@/lib/types';
import { BannersBlock } from '@/components/BannersBlock';
import { findGuideChronicle } from './guides';
import { GuideIcon } from './GuideIcon';
import g from './page.module.css';

const SITE = 'https://l2realm.ru';
const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';
const FLAGSHIP = 'interlude';
const HERO_BG = '/images/guides-hero.png';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Гайды по Lineage 2 — квесты, предметы, NPC, локации, классы',
  description: 'База знаний по Lineage 2: квесты, предметы, NPC, локации, классы, скиллы и рейд-боссы. Гайды для хроник Interlude, High Five, Essence и Main.',
  alternates: { canonical: `${SITE}/guides` },
};

// Кнопки-разделы (вместо поиска), как на референсе.
const NAV = [
  { slug: 'novichkam', label: 'Новичкам', href: '/guides', active: true },
  { slug: 'kvesty', label: 'Квесты', href: `/guides/${FLAGSHIP}/kvesty` },
  { slug: 'klassy', label: 'Классы', href: `/guides/${FLAGSHIP}/klassy` },
  { slug: 'skilly', label: 'Скиллы', href: `/guides/${FLAGSHIP}/skilly` },
  { slug: 'predmety', label: 'Предметы', href: `/guides/${FLAGSHIP}/predmety` },
  { slug: 'npc', label: 'NPC', href: `/guides/${FLAGSHIP}/npc` },
  { slug: 'lokacii', label: 'Локации', href: `/guides/${FLAGSHIP}/lokacii` },
];

const START_PATH = [
  { n: '1', title: 'Выбери раздел', desc: 'Квесты, классы, локации, предметы и другое.' },
  { n: '2', title: 'Выбери хронику', desc: 'Фильтр по хронике под свой сервер.' },
  { n: '3', title: 'Открывай гайды', desc: 'Пошагово — с уровнями, NPC и наградами.' },
  { n: '4', title: 'Прокачивайся', desc: 'От первых уровней до эндгейма.' },
];

// 6 быстрых карточек-переходов (как на референсе).
const CARDS = [
  { title: 'Старт с нуля', desc: 'Про игру и интерфейс на разных хрониках. Скоро добавим.', href: `/guides/${FLAGSHIP}/kvesty`, btn: 'Скоро', icon: 'novichkam' },
  { title: 'Первые квесты 1–20', desc: 'Стартовые квесты для новых персонажей.', href: `/guides/${FLAGSHIP}/kvesty?lvl=b1`, btn: 'Перейти к квестам', icon: 'kvesty' },
  { title: 'Маршрут прокачки 20–40', desc: 'Локации и маршрут для уверенного роста.', href: `/guides/${FLAGSHIP}/lokacii?lvl=b2`, btn: 'Открыть локации', icon: 'lokacii' },
  { title: 'Экипировка по уровням', desc: 'Что надеть на старте и как улучшить.', href: `/guides/${FLAGSHIP}/predmety`, btn: 'Смотреть экипировку', icon: 'predmety' },
  { title: 'Квесты на профессию', desc: 'Квесты на 1-ю, 2-ю и 3-ю профессию.', href: `/guides/${FLAGSHIP}/kvesty`, btn: 'Перейти к квестам', icon: 'kvesty' },
  { title: 'Прокачка Essence 1–85', desc: 'Быстрый маршрут для хроники Essence.', href: '/guides/essence/kvesty', btn: 'Открыть', icon: 'klassy' },
];

const NEXT_LINKS = [
  { href: `/guides/${FLAGSHIP}/kvesty`, icon: 'kvesty', label: 'Все квесты', desc: 'Уровни, NPC и награды' },
  { href: `/guides/${FLAGSHIP}/klassy`, icon: 'klassy', label: 'Классы и роли', desc: 'Описания и сложность' },
  { href: `/guides/${FLAGSHIP}/lokacii`, icon: 'lokacii', label: 'Локации', desc: 'Зоны охоты и инстансы' },
  { href: `/guides/${FLAGSHIP}/reyd-bossy`, icon: 'reyd-bossy', label: 'Рейд-боссы', desc: 'Респ, локации и дроп' },
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
            <p className={g.heroSub}>Квесты, предметы, NPC, локации, классы, скиллы и рейд-боссы — всё в одном справочнике.</p>
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
              <Link href={`/guides/${FLAGSHIP}/kvesty`} className={g.panelBtn}>Начать с квестов <i aria-hidden="true">→</i></Link>
            </div>
          </aside>

          {/* CENTER: 6 карточек-переходов */}
          <section className={g.centerCol}>
            <div className={g.cards}>
              {CARDS.map(c => (
                <Link key={c.title} href={c.href} className={g.card}>
                  <span className={g.cardArt}><GuideIcon name={c.icon} size={38} className={g.cardArtIcon} /></span>
                  <span className={g.cardBody}>
                    <strong>{c.title}</strong>
                    <small>{c.desc}</small>
                    <span className={g.cardBtn}>{c.btn} <i aria-hidden="true">→</i></span>
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* RIGHT: Куда дальше + Популярные квесты */}
          <aside className={g.rightCol}>
            <BannersBlock slot={1} variant="feature" />

            <div className={g.panel}>
              <div className={g.panelTitle}>Куда дальше?</div>
              {NEXT_LINKS.map(l => (
                <Link key={l.href} href={l.href} className={g.nextLink}>
                  <span className={g.nextIcon}><GuideIcon name={l.icon} size={18} /></span>
                  <span className={g.nextText}>
                    <strong>{l.label}</strong>
                    <small>{l.desc}</small>
                  </span>
                  <span className={g.nextArrow} aria-hidden="true">›</span>
                </Link>
              ))}
            </div>

            {popular.length > 0 && (
              <div className={g.panel}>
                <div className={g.panelTitle}>Популярные квесты</div>
                <div className={g.popList}>
                  {popular.map(pg => {
                    const ch = findGuideChronicle(pg.chronicle);
                    return (
                      <Link key={pg.id} href={`/guides/${pg.chronicle}/${pg.category}/${pg.slug}`} className={g.popRow}>
                        <span className={g.popFire} aria-hidden="true">🔥</span>
                        <span className={g.popName}>{pg.title}</span>
                        <span className={g.popMeta}>{ch?.name ?? pg.chronicle}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            <div className={g.tipCard}>
              <div className={g.tipHead}>💡 Полезный совет</div>
              <p className={g.tipText}>Не спеши: проходи квесты, изучай мир и получай максимум удовольствия от игры.</p>
            </div>
          </aside>

        </div>
      </div>
    </main>
  );
}
