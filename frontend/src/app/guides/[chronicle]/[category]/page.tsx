import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findGuideChronicle } from '../../guides';
import { findGuideCategory } from '../../categories';
import { GuideIcon } from '../../GuideIcon';
import type { Guide } from '@/lib/types';
import styles from './page.module.css';

const SITE = 'https://l2realm.ru';
const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';

export const revalidate = 300;

type Props = { params: Promise<{ chronicle: string; category: string }> };

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
  return '—';
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
    <div className={styles.page} style={{ ['--accent' as string]: ch.accent }}>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

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
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Гайд</th>
                <th className={styles.colLevel}>Уровень</th>
                <th className={styles.colNpc}>NPC / Локация</th>
                <th className={styles.colReward}>Итог / награда</th>
                <th className={styles.colAction}></th>
              </tr>
            </thead>
            <tbody>
              {guides.map(g => (
                <tr key={g.id}>
                  <td>
                    <Link href={`/guides/${ch.slug}/${cat.slug}/${g.slug}`} className={styles.gName}>
                      {g.image && <img src={g.image} alt="" loading="lazy" decoding="async" />}
                      <span>
                        <strong>{g.title}</strong>
                        {g.description && <em>{g.description}</em>}
                      </span>
                    </Link>
                  </td>
                  <td className={styles.colLevel}><span className={styles.lvl}>{levelText(g)}</span></td>
                  <td className={styles.colNpc}>
                    {g.npc && <span className={styles.npc}>{g.npc}</span>}
                    {g.location && <span className={styles.loc}>{g.location}</span>}
                    {!g.npc && !g.location && <span className={styles.dash}>—</span>}
                  </td>
                  <td className={styles.colReward}>{g.reward || <span className={styles.dash}>—</span>}</td>
                  <td className={styles.colAction}>
                    <Link href={`/guides/${ch.slug}/${cat.slug}/${g.slug}`} className={styles.openBtn}>
                      Открыть →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={styles.footNav}>
        <Link href={`/guides/${ch.slug}`} className={styles.backBtn}>← Все разделы {ch.name}</Link>
      </div>
    </div>
  );
}
