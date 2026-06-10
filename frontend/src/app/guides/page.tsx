import type { Metadata } from 'next';
import Link from 'next/link';
import { GUIDE_CHRONICLES } from './guides';
import { GuidesSearch } from './GuidesSearch';
import styles from './page.module.css';

const SITE = 'https://l2realm.ru';

export const metadata: Metadata = {
  title: 'Гайды по Lineage 2 — квесты, прокачка, классы',
  description: 'База знаний по Lineage 2: гайды по квестам, NPC, локациям и прохождению для хроник Interlude, High Five, Essence и Main.',
  alternates: { canonical: `${SITE}/guides` },
};

const STARTER = [
  { n: '1', title: 'Выбери хронику', desc: 'Interlude, High Five, Essence или Main — под свой сервер.' },
  { n: '2', title: 'Открой раздел', desc: 'Сейчас готовы Квесты — задания, NPC, локации и награды.' },
  { n: '3', title: 'Проходи по шагам', desc: 'Пошаговые гайды с уровнями, стартовыми NPC и наградами.' },
];

export default function GuidesPage() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <Link href="/" className={styles.back}>Все проекты</Link>
        <h1>Гайды по <span>Lineage 2</span></h1>
        <p>База знаний по Lineage 2: квесты, NPC, локации и прохождения. Выбери хронику — внутри гайды именно для неё.</p>

        <div className={styles.searchRow}>
          <GuidesSearch />
        </div>

        <div className={styles.chips}>
          <Link href="/guides/interlude/kvesty" className={styles.chipActive}>
            <span aria-hidden="true">📜</span> Квесты
          </Link>
          <span className={styles.chipSoon}>Классы · Локации · Предметы · NPC — скоро</span>
        </div>
      </header>

      <section className={styles.chronSection}>
        <div className={styles.grid}>
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
        </div>
      </section>

      <section className={styles.starter}>
        {STARTER.map(s => (
          <div key={s.n} className={styles.step}>
            <span className={styles.stepNum}>{s.n}</span>
            <div className={styles.stepText}>
              <strong>{s.title}</strong>
              <p>{s.desc}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
