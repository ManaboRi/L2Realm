import type { Metadata } from 'next';
import Link from 'next/link';
import type { Guide } from '@/lib/types';
import { BannersBlock } from '@/components/BannersBlock';
import { findGuideChronicle } from './guides';
import { GUIDE_CATEGORIES, guideCategoryLabel } from './categories';
import { GuidesSearch } from './GuidesSearch';
import { GuideIcon } from './GuideIcon';
import g from './page.module.css';

const SITE = 'https://l2realm.ru';
const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';
const FLAGSHIP = 'interlude';
const HERO_BG = '/images/bann%20fo%20guides.png';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Гайды по Lineage 2 — квесты, предметы, NPC, локации, классы',
  description: 'База знаний по Lineage 2: квесты, предметы, NPC, локации, классы, скиллы и рейд-боссы. Гайды для хроник Interlude, High Five, Essence и Main.',
  alternates: { canonical: `${SITE}/guides` },
};

const START_PATH = [
  { n: '1', title: 'Выбери раздел', desc: 'Квесты, классы, локации, предметы и другое.' },
  { n: '2', title: 'Выбери хронику', desc: 'Фильтр по хронике под свой сервер.' },
  { n: '3', title: 'Открывай гайды', desc: 'Пошагово — с уровнями, NPC и наградами.' },
  { n: '4', title: 'Прокачивайся', desc: 'От первых уровней до эндгейма.' },
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
  const popular = [...allGuides].sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 4);
  const categoryCounts = new Map<string, number>();
  allGuides.forEach(item => categoryCounts.set(item.category, (categoryCounts.get(item.category) ?? 0) + 1));

  return (
    <main className={g.guidesMain}>
      <div className={g.wrap}>

        {/* ── Hero-баннер (компактный, текст поверх) ── */}
        <div className={g.heroBand}>
          <div className={g.heroBg} aria-hidden="true"><img src={HERO_BG} alt="" /></div>
          <div className={g.heroContent}>
            <span className={g.heroKicker}>База знаний L2Realm</span>
            <h1 className={g.heroTitle}>Гайды по <span>Lineage 2</span></h1>
            <p className={g.heroSub}>Квесты, предметы, NPC, локации, классы, скиллы и рейд-боссы — всё в одном справочнике.</p>
          </div>
        </div>

        {/* Поиск — отдельной строкой под баннером */}
        <div className={g.searchRow}><GuidesSearch /></div>

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

          {/* CENTER: крупные карточки разделов */}
          <section className={g.centerCol}>
            <div className={g.cards}>
              {GUIDE_CATEGORIES.map(cat => {
                const count = categoryCounts.get(cat.slug) ?? 0;
                return (
                  <Link key={cat.slug} href={`/guides/${FLAGSHIP}/${cat.slug}`} className={g.card}>
                    <span className={g.cardArt}>
                      <GuideIcon name={cat.slug} size={40} className={g.cardArtIcon} />
                      {count > 0 && <em className={g.cardCount}>{count}</em>}
                    </span>
                    <span className={g.cardBody}>
                      <strong>{cat.label}</strong>
                      <small>{cat.desc}</small>
                      <span className={g.cardBtn}>Открыть раздел <i aria-hidden="true">→</i></span>
                    </span>
                  </Link>
                );
              })}
            </div>

            {popular.length > 0 && (
              <div className={g.popBlock}>
                <div className={g.popHead}>
                  <h2>Популярные гайды</h2>
                  <Link href={`/guides/${FLAGSHIP}/kvesty`}>Все квесты</Link>
                </div>
                <div className={g.popGrid}>
                  {popular.map(pg => {
                    const ch = findGuideChronicle(pg.chronicle);
                    return (
                      <Link key={pg.id} href={`/guides/${pg.chronicle}/${pg.category}/${pg.slug}`} className={g.popCard}>
                        <span className={g.popThumb}>
                          {pg.image ? <img src={pg.image} alt="" loading="lazy" decoding="async" /> : <GuideIcon name={pg.category} size={20} />}
                        </span>
                        <span className={g.popText}>
                          <strong>{pg.title}</strong>
                          <small>{ch?.name ?? pg.chronicle} · {guideCategoryLabel(pg.category)} · {pg.views ?? 0} просм.</small>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* RIGHT: Куда дальше + совет */}
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

            <div className={g.tipCard}>
              <div className={g.tipHead}>💡 Полезный совет</div>
              <p className={g.tipText}>Не спеши: проходи квесты, изучай мир и получай максимум удовольствия от игры. Качество прохождения важнее скорости.</p>
            </div>

            <BannersBlock slot={2} variant="compact" />
          </aside>

        </div>
      </div>
    </main>
  );
}
