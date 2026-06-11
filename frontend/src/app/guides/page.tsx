import type { Metadata } from 'next';
import Link from 'next/link';
import type { Server, Article, Guide } from '@/lib/types';
import { BannersBlock } from '@/components/BannersBlock';
import { findGuideChronicle } from './guides';
import { GUIDE_CATEGORIES, guideCategoryLabel } from './categories';
import { GuidesSearch } from './GuidesSearch';
import { GuideIcon } from './GuideIcon';
import home from '../page.module.css';
import g from './page.module.css';

const SITE = 'https://l2realm.ru';
const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';
const FLAGSHIP = 'interlude';

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
async function fetchComingSoon(): Promise<Server[]> {
  try {
    const res = await fetch(`${BACKEND}/api/servers/coming-soon`, { next: { revalidate: 120 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}
async function fetchArticles(): Promise<Article[]> {
  try {
    const res = await fetch(`${BACKEND}/api/articles`, { next: { revalidate } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.data ?? []);
  } catch { return []; }
}

function fmtDate(s?: string | null): string {
  if (!s) return '';
  const d = new Date(s);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export default async function GuidesPage() {
  const [allGuides, comingSoon, articles] = await Promise.all([
    fetchAllGuides(), fetchComingSoon(), fetchArticles(),
  ]);
  const popular = [...allGuides].sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 6);
  const categoryCounts = new Map<string, number>();
  allGuides.forEach(item => categoryCounts.set(item.category, (categoryCounts.get(item.category) ?? 0) + 1));

  return (
    <main className={`${home.page} ${g.guidesMain}`}>
      <div className={home.shell}>
        <div className={home.layout}>

          {/* ── Слева: Путь новичка ── */}
          <aside className={`${home.sidebar} ${g.gPanel}`}>
            <div className={g.pathCard}>
              <div className={g.pathTitle}>Путь новичка</div>
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
            </div>
          </aside>

          {/* ── Центр ── */}
          <section className={home.content}>
            <div className={g.hero}>
              <span className={g.kicker}>База знаний L2Realm</span>
              <h1>Гайды по <span>Lineage 2</span></h1>
              <p>Квесты, предметы, NPC, локации, классы, скиллы и рейд-боссы — в одном спокойном справочнике без лишней мишуры.</p>
              <div className={g.heroSearch}><GuidesSearch /></div>
            </div>

            {/* Разделы гайдов — единая нав-лента */}
            <nav className={g.catNav} aria-label="Разделы гайдов">
              {GUIDE_CATEGORIES.map(cat => {
                const count = categoryCounts.get(cat.slug) ?? 0;
                return (
                  <Link key={cat.slug} href={`/guides/${FLAGSHIP}/${cat.slug}`} className={g.catPill}>
                    <GuideIcon name={cat.slug} size={18} className={g.catPillIcon} />
                    <span>{cat.label}</span>
                    {count > 0 && <em>{count}</em>}
                  </Link>
                );
              })}
            </nav>

            {popular.length > 0 ? (
              <section className={g.sectionBlock}>
                <div className={g.sectionHead}>
                  <h2 className={g.sectionTitle}>Популярные гайды</h2>
                  <Link href={`/guides/${FLAGSHIP}/kvesty`} className={g.sectionLink}>Все квесты</Link>
                </div>
                <div className={g.popularGrid}>
                  {popular.map(pg => {
                    const ch = findGuideChronicle(pg.chronicle);
                    return (
                      <Link key={pg.id} href={`/guides/${pg.chronicle}/${pg.category}/${pg.slug}`} className={g.popularCard}>
                        <span className={g.popularThumb}>
                          {pg.image ? <img src={pg.image} alt="" loading="lazy" decoding="async" /> : <GuideIcon name={pg.category} size={22} />}
                        </span>
                        <span className={g.popularBody}>
                          <strong>{pg.title}</strong>
                          <small>{ch?.name ?? pg.chronicle} · {guideCategoryLabel(pg.category)} · {pg.views ?? 0} просм.</small>
                        </span>
                        <span className={g.popularOpen}>Открыть</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ) : (
              <div className={g.emptyHint}>
                База гайдов наполняется — скоро здесь появятся первые материалы. Начни с раздела{' '}
                <Link href={`/guides/${FLAGSHIP}/kvesty`}>Квесты</Link>.
              </div>
            )}
          </section>

          {/* ── Справа: Куда дальше + рейл ── */}
          <aside className={`${home.rightRail} ${g.gPanel}`} aria-label="Сводка">
            <div className={g.nextCard}>
              <div className={g.nextTitle}>Куда дальше?</div>
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

            <BannersBlock slot={1} variant="feature" />

            <section className={home.railSection}>
              <div className={home.railHead}>
                <h2>Скоро открытие</h2>
                <Link href="/coming-soon">Все</Link>
              </div>
              <div className={home.railList}>
                {comingSoon.length > 0 ? comingSoon.slice(0, 4).map(s => (
                  <Link key={s.id} href={`/servers/${s.id}`} className={home.railServerItem}>
                    <span className={home.railLogo}>
                      {s.icon ? <img src={s.icon} alt="" loading="lazy" /> : <span>{s.name.slice(0, 2)}</span>}
                    </span>
                    <span className={home.railText}>
                      <strong>{s.name}</strong>
                      <em>{s.chronicle} · {s.rates}</em>
                    </span>
                    <span className={home.railDate}>{fmtDate(s.openedDate) || 'скоро'}</span>
                  </Link>
                )) : <span className={home.railEmpty}>Открытия появятся после обновления каталога</span>}
              </div>
            </section>

            <section className={home.railSection}>
              <div className={home.railHead}>
                <h2>Статьи</h2>
                <Link href="/blog">Все статьи</Link>
              </div>
              <div className={home.railList}>
                {articles.length > 0 ? articles.slice(0, 4).map(a => (
                  <Link key={a.id} href={`/blog/${a.slug}`} className={home.railArticleItem}>
                    <span className={home.railArticleThumb}>
                      {a.image && <img src={a.image} alt="" loading="lazy" />}
                    </span>
                    <span className={home.railText}>
                      <strong>{a.title}</strong>
                      <em>{fmtDate(a.publishedAt || a.createdAt)}</em>
                    </span>
                  </Link>
                )) : <span className={home.railEmpty}>Свежие статьи скоро появятся</span>}
              </div>
            </section>

            <BannersBlock slot={2} variant="compact" />
          </aside>

        </div>
      </div>
    </main>
  );
}
