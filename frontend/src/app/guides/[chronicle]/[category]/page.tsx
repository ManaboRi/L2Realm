import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findGuideChronicle, GUIDE_CHRONICLES } from '../../guides';
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

async function fetchGuides(chronicle: string, category: string): Promise<Guide[]> {
  try {
    const res = await fetch(
      `${BACKEND}/api/guides?chronicle=${encodeURIComponent(chronicle)}&category=${encodeURIComponent(category)}`,
      { next: { revalidate } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function levelText(g: Guide): string {
  if (g.levelMin != null && g.levelMax != null) return `${g.levelMin}–${g.levelMax}`;
  if (g.levelMin != null) return `${g.levelMin}+`;
  if (g.levelMax != null) return `до ${g.levelMax}`;
  return 'уровень не указан';
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

  const guides = await fetchGuides(ch.slug, cat.slug);
  const popular = [...guides].sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 5);
  const base = `/guides/${ch.slug}/${cat.slug}`;

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
    <main className={home.page} style={{ ['--accent' as string]: ch.accent }}>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <div className={home.shell}>
        <div className={home.layout}>

          {/* ── Левая навигация ── */}
          <aside className={`${home.sidebar} ${styles.gPanel}`}>
            <div className={home.filterGroup}>
              <span className={home.filterLabel}>Хроники</span>
              <div className={home.filterList}>
                {GUIDE_CHRONICLES.map(c => (
                  <Link
                    key={c.slug}
                    href={`/guides/${c.slug}/${cat.slug}`}
                    className={`${home.filterItem} ${styles.navItem} ${c.slug === ch.slug ? styles.navActive : ''}`}
                  >
                    <span className={styles.navLetter} style={{ ['--accent' as string]: c.accent }}>{c.name[0]}</span>
                    <span>{c.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className={home.filterGroup}>
              <span className={home.filterLabel}>Разделы</span>
              <div className={home.filterList}>
                {GUIDE_CATEGORIES.map(x => (
                  <Link
                    key={x.slug}
                    href={`/guides/${ch.slug}/${x.slug}`}
                    className={`${home.filterItem} ${styles.navItem} ${x.slug === cat.slug ? styles.navActive : ''}`}
                  >
                    <GuideIcon name={x.slug} size={16} className={styles.navIcon} />
                    <span>{x.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          {/* ── Центр ── */}
          <section className={home.content}>
            <div className={styles.bread}>
              <Link href="/guides">Гайды</Link>
              <span>›</span>
              <Link href={`/guides/${ch.slug}`}>{ch.name}</Link>
              <span>›</span>
              <span>{cat.label}</span>
            </div>

            <header className={styles.head}>
              <span className={styles.kicker}>Хроника {ch.name}</span>
              <h1><GuideIcon name={cat.slug} size={28} className={styles.h1Icon} /> {cat.label}</h1>
              <p>{cat.desc}</p>
            </header>

            {guides.length === 0 ? (
              <div className={styles.empty}>
                <p>Гайды в разделе «{cat.label}» для {ch.name} скоро появятся — база пополняется.</p>
                <div className={styles.emptyActions}>
                  <Link href={`/guides/${ch.slug}`} className={styles.backBtn}>← К разделам {ch.name}</Link>
                  <Link href="/contacts" className={styles.suggestBtn}>Предложить тему</Link>
                </div>
              </div>
            ) : (
              <QuestList guides={guides} base={base} />
            )}
          </section>

          {/* ── Правый сайдбар ── */}
          <aside className={`${home.rightRail} ${styles.gPanel}`} aria-label="Сводка">
            {popular.length > 0 && (
              <section className={home.railSection}>
                <div className={home.railHead}><h2>Популярное</h2></div>
                <div className={home.railList}>
                  {popular.map((g, i) => (
                    <Link key={g.id} href={`${base}/${g.slug}`} className={home.railVoteItem}>
                      <span className={home.railRank}>{i + 1}</span>
                      <span className={home.railText}>
                        <strong>{g.title}</strong>
                        <em>{levelText(g)}</em>
                      </span>
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
