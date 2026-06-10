import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GUIDE_CHRONICLES, findGuideChronicle } from '../guides';
import { GUIDE_CATEGORIES } from '../categories';
import { GuideIcon } from '../GuideIcon';
import styles from './page.module.css';

const SITE = 'https://l2realm.ru';
const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';

export const revalidate = 300;

type Props = { params: Promise<{ chronicle: string }> };

async function fetchCounts(chronicle: string): Promise<Record<string, number>> {
  try {
    const res = await fetch(`${BACKEND}/api/guides/counts?chronicle=${encodeURIComponent(chronicle)}`, {
      next: { revalidate },
    });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

export function generateStaticParams() {
  return GUIDE_CHRONICLES.map(c => ({ chronicle: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { chronicle } = await params;
  const c = findGuideChronicle(chronicle);
  if (!c) return { title: 'Гайды не найдены', robots: { index: false, follow: false } };
  return {
    title: `Гайды Lineage 2 ${c.name} — прокачка, классы, квесты`,
    description: `Гайды по Lineage 2 ${c.name}: старт для новичков, прокачка, выбор класса, квесты, локации, фарм, экипировка и PvP.`,
    alternates: { canonical: `${SITE}/guides/${c.slug}` },
  };
}

export default async function ChronicleGuidesPage({ params }: Props) {
  const { chronicle } = await params;
  const c = findGuideChronicle(chronicle);
  if (!c) notFound();

  const counts = await fetchCounts(c.slug);

  return (
    <div className={styles.page} style={{ ['--accent' as string]: c.accent }}>
      <header className={styles.hero}>
        <Link href="/guides" className={styles.back}>Все гайды</Link>
        <div className={styles.heroRow}>
          <div className={styles.heroArt}>
            <img src={c.image} alt={`Lineage 2 ${c.name}`} loading="eager" decoding="async" />
          </div>
          <div className={styles.heroCopy}>
            <span className={styles.kicker}>Хроника</span>
            <h1>Гайды <span>{c.name}</span></h1>
            <p>{c.tagline}</p>
            <Link href={`/chronicle/${c.slug}`} className={styles.serversBtn}>Серверы {c.name} в каталоге →</Link>
          </div>
        </div>
      </header>

      <nav className={styles.chronTabs} aria-label="Хроники">
        {GUIDE_CHRONICLES.map(ch => (
          <Link
            key={ch.slug}
            href={`/guides/${ch.slug}`}
            className={`${styles.chronTab} ${ch.slug === c.slug ? styles.chronTabActive : ''}`}
          >
            {ch.name}
          </Link>
        ))}
      </nav>

      <section>
        <h2 className={styles.sectionTitle}>Разделы гайдов</h2>
        <div className={styles.topics}>
          {GUIDE_CATEGORIES.map(cat => {
            const n = counts[cat.slug] ?? 0;
            return (
              <Link key={cat.slug} href={`/guides/${c.slug}/${cat.slug}`} className={styles.topic}>
                <span className={styles.topicIcon}><GuideIcon name={cat.slug} size={22} /></span>
                <div>
                  <strong>{cat.label}</strong>
                  <p>{cat.desc}</p>
                </div>
                {n > 0
                  ? <span className={styles.count}>{n}</span>
                  : <span className={styles.soon}>Скоро</span>}
              </Link>
            );
          })}
        </div>
      </section>

      <p className={styles.note}>
        База гайдов {c.name} пополняется. Хочешь предложить тему или свой материал?{' '}
        <Link href="/contacts">Напиши нам</Link>.
      </p>
    </div>
  );
}
