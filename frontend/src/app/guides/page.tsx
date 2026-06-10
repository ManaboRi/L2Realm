import type { Metadata } from 'next';
import Link from 'next/link';
import { GUIDE_CHRONICLES } from './guides';
import styles from './page.module.css';

const SITE = 'https://l2realm.ru';

export const metadata: Metadata = {
  title: 'Гайды по Lineage 2 — прокачка, классы, квесты',
  description: 'Гайды по Lineage 2 для каждой хроники: Interlude, High Five, Essence, Main. Прокачка, выбор класса, квесты, старт для новичков и продвинутые тактики.',
  alternates: { canonical: `${SITE}/guides` },
};

export default function GuidesPage() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <Link href="/" className={styles.back}>Все проекты</Link>
        <h1>Гайды по <span>Lineage 2</span></h1>
        <p>Выбери хронику — внутри собраны гайды по старту, прокачке, классам и квестам именно для неё. От первых уровней до эндгейма.</p>
      </header>

      <section className={styles.grid}>
        {GUIDE_CHRONICLES.map(c => (
          <Link key={c.slug} href={`/guides/${c.slug}`} className={styles.card} style={{ ['--accent' as string]: c.accent }}>
            <div className={styles.cardMedia}>
              <img src={c.image} alt={`Гайды Lineage 2 ${c.name}`} loading="lazy" decoding="async" />
              <span className={styles.cardShade} />
            </div>
            <div className={styles.cardBody}>
              <span className={styles.cardKicker}>Хроника</span>
              <h2>{c.name}</h2>
              <p>{c.tagline}</p>
              <span className={styles.cardLink}>Открыть гайды <i aria-hidden="true">→</i></span>
            </div>
          </Link>
        ))}
      </section>

      <p className={styles.note}>
        Раздел в развитии — гайды добавляются постепенно. Хочешь предложить тему или
        свой материал? <Link href="/contacts">Напиши нам</Link>.
      </p>
    </div>
  );
}
