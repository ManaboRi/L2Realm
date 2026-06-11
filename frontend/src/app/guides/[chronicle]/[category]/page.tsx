import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findGuideChronicle } from '../../guides';
import { findGuideCategory, GUIDE_CATEGORIES } from '../../categories';
import { GuideIcon } from '../../GuideIcon';
import { QuestList } from './QuestList';
import type { Guide } from '@/lib/types';
import home from '../../../page.module.css';
import styles from './page.module.css';

const SITE = 'https://l2realm.ru';
const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';

export const revalidate = 300;

type Props = { params: Promise<{ chronicle: string; category: string }> };

const PLAYER_PATH = [
  { n: '1', title: 'Новичок (1–20)', desc: 'Первые квесты, основы и квест на 1 профессию.' },
  { n: '2', title: 'Развитие (20–40)', desc: 'Снаряжение и квесты на 2 профессию.' },
  { n: '3', title: 'Подготовка (40–76)', desc: 'Нублесс, сабкласс и фарм ресурсов.' },
  { n: '4', title: 'Эндгейм (76+)', desc: 'Пайлака, эпик-квесты и мировые боссы.' },
];

// Тянем все гайды категории (по всем хроникам) — фильтр по хронике делает QuestList.
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
  const { chronicle, category } = await params;
  const ch = findGuideChronicle(chronicle);
  const cat = findGuideCategory(category);
  if (!ch || !cat) return { title: 'Гайды не найдены', robots: { index: false, follow: false } };
  return {
    title: `${ch.name} — ${cat.label} | Гайды Lineage 2 — L2Realm`,
    description: `${cat.label} Lineage 2 ${ch.name}: ${cat.desc} Список гайдов, уровни, локации и награды.`,
    alternates: { canonical: `${SITE}/guides/${ch.slug}/${cat.slug}` },
  };
}

export default async function GuideCategoryPage({ params }: Props) {
  const { chronicle, category } = await params;
  const ch = findGuideChronicle(chronicle);
  const cat = findGuideCategory(category);
  if (!ch || !cat) notFound();

  const guides = await fetchGuides(cat.slug);
  const activeChronicleCount = guides.filter(g => g.chronicle === ch.slug).length;
  const popular = [...guides].sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 6);

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Гайды', item: `${SITE}/guides` },
      { '@type': 'ListItem', position: 2, name: ch.name, item: `${SITE}/guides/${ch.slug}` },
      { '@type': 'ListItem', position: 3, name: cat.label, item: `${SITE}/guides/${ch.slug}/${cat.slug}` },
    ],
  };

  return (
    <main className={`${home.page} ${styles.guidesMain}`} style={{ ['--accent' as string]: ch.accent }}>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <div className={home.shell}>
        <div className={home.layout}>

          {/* ── Левая навигация: только разделы ── */}
          <aside className={`${home.sidebar} ${styles.gPanel}`}>
            <div className={home.filterGroup}>
              <span className={`${home.filterLabel} ${styles.navLabel}`}>Разделы гайдов</span>
              <div className={home.filterList}>
                {GUIDE_CATEGORIES.map(x => (
                  <Link
                    key={x.slug}
                    href={`/guides/${ch.slug}/${x.slug}`}
                    className={`${home.filterItem} ${styles.navItem} ${x.slug === cat.slug ? styles.navActive : ''}`}
                  >
                    <GuideIcon name={x.slug} size={18} className={styles.navIcon} />
                    <span>{x.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          {/* ── Центр ── */}
          <section className={home.content}>
            <div className={styles.categoryHero}>
              <div className={styles.bread}>
                <Link href="/guides">Гайды</Link>
                <span>›</span>
                <Link href={`/guides/${ch.slug}`}>{ch.name}</Link>
                <span>›</span>
                <span>{cat.label}</span>
              </div>

              <header className={styles.head}>
                <span className={styles.kicker}>{ch.name}</span>
                <h1><GuideIcon name={cat.slug} size={28} className={styles.h1Icon} /> {cat.label}</h1>
                <p>{cat.desc} Сводка по уровню, NPC, локации и награде помогает быстро понять, с чего начать.</p>
                <div className={styles.headStats} aria-label="Сводка раздела">
                  <span><strong>{activeChronicleCount}</strong><em>в {ch.name}</em></span>
                  <span><strong>{guides.length}</strong><em>во всех хрониках</em></span>
                  <span><strong>{popular.length}</strong><em>в топе</em></span>
                </div>
              </header>
            </div>

            {guides.length === 0 ? (
              <div className={styles.empty}>
                <p>Гайды в разделе «{cat.label}» скоро появятся — база пополняется.</p>
                <div className={styles.emptyActions}>
                  <Link href={`/guides/${ch.slug}`} className={styles.backBtn}>← К разделам {ch.name}</Link>
                  <Link href="/contacts" className={styles.suggestBtn}>Предложить тему</Link>
                </div>
              </div>
            ) : (
              <QuestList guides={guides} defaultChronicle={ch.slug} />
            )}
          </section>

          {/* ── Правый сайдбар ── */}
          <aside className={`${home.rightRail} ${styles.gPanel}`} aria-label="Сводка">
            {popular.length > 0 && (
              <section className={home.railSection}>
                <div className={home.railHead}><h2>Популярные квесты</h2></div>
                <div className={styles.popList}>
                  {popular.map((pg, index) => (
                    <Link key={pg.id} href={`/guides/${pg.chronicle}/${pg.category}/${pg.slug}`} className={styles.popRow}>
                      <span className={styles.popRank} aria-hidden="true">{index + 1}</span>
                      <span className={styles.popName}>{pg.title}</span>
                      <span className={styles.popViews}>{pg.views ?? 0}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <section className={home.railSection}>
              <div className={home.railHead}><h2>Путь игрока</h2></div>
              <div className={styles.pathList}>
                {PLAYER_PATH.map(p => (
                  <div key={p.n} className={styles.pathStep}>
                    <span className={styles.pathNum}>{p.n}</span>
                    <div className={styles.pathText}>
                      <strong>{p.title}</strong>
                      <p>{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>

        </div>
      </div>
    </main>
  );
}
