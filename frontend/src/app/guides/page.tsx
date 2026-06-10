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

  return (
    <main className={`${home.page} ${g.guidesMain}`}>
      <div className={home.shell}>
        <div className={home.layout}>

          {/* ── Левая навигация: только разделы ── */}
          <aside className={`${home.sidebar} ${g.gPanel}`}>
            <div className={home.filterGroup}>
              <span className={`${home.filterLabel} ${g.navLabel}`}>Разделы гайдов</span>
              <div className={home.filterList}>
                {GUIDE_CATEGORIES.map(cat => (
                  <Link key={cat.slug} href={`/guides/${FLAGSHIP}/${cat.slug}`} className={`${home.filterItem} ${g.navItem}`}>
                    <GuideIcon name={cat.slug} size={18} className={g.navIcon} />
                    <span>{cat.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          {/* ── Центр ── */}
          <section className={home.content}>
            <div className={g.hero}>
              <h1>Гайды по <span>Lineage 2</span></h1>
              <p>База знаний по Lineage 2: квесты, предметы, NPC, локации, классы, скиллы и рейд-боссы.</p>
              <div className={g.searchRow}><GuidesSearch /></div>
            </div>

            <div className={g.tiles}>
              {GUIDE_CATEGORIES.map(cat => (
                <Link key={cat.slug} href={`/guides/${FLAGSHIP}/${cat.slug}`} className={g.tile}>
                  <span className={g.tileIcon}><GuideIcon name={cat.slug} size={24} /></span>
                  <span className={g.tileLabel}>{cat.label}</span>
                </Link>
              ))}
            </div>

            {popular.length > 0 && (
              <>
                <h2 className={g.sectionTitle}>Популярные гайды</h2>
                <div className={g.popularGrid}>
                  {popular.map(pg => {
                    const ch = findGuideChronicle(pg.chronicle);
                    return (
                      <Link key={pg.id} href={`/guides/${pg.chronicle}/${pg.category}/${pg.slug}`} className={g.popularCard}>
                        <strong>{pg.title}</strong>
                        <small>{ch?.name ?? pg.chronicle} · {guideCategoryLabel(pg.category)} · {pg.views ?? 0} просм.</small>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          {/* ── Правый рейл (стандартный) ── */}
          <aside className={`${home.rightRail} ${g.gPanel}`} aria-label="Сводка">
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
