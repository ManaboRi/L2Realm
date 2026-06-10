import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GUIDE_CHRONICLES, findGuideChronicle } from '../guides';
import styles from './page.module.css';

const SITE = 'https://l2realm.ru';

// Темы-заготовки (пока без контента — структура под будущие гайды).
const PLANNED_TOPICS = [
  { icon: '🚀', title: 'Старт для новичков', desc: 'Создание персонажа, первые уровни, что качать сначала.' },
  { icon: '⚔️', title: 'Прокачка до 70–80', desc: 'Эффективные локации, спойл/фарм, оптимальный маршрут.' },
  { icon: '🧙', title: 'Гайды по классам', desc: 'Выбор класса под стиль игры, билды, сильные и слабые стороны.' },
  { icon: '📜', title: 'Квесты и профессии', desc: 'Квесты на смену профессии, важные сюжетные и наградные квесты.' },
  { icon: '💰', title: 'Экономика и крафт', desc: 'Заработок адены, заточка, крафт экипировки, рынок.' },
  { icon: '🏰', title: 'PvP и осады', desc: 'Олимпиада, осады замков, массовые битвы, тактика.' },
];

type Props = { params: Promise<{ chronicle: string }> };

export function generateStaticParams() {
  return GUIDE_CHRONICLES.map(c => ({ chronicle: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { chronicle } = await params;
  const c = findGuideChronicle(chronicle);
  if (!c) return { title: 'Гайды не найдены', robots: { index: false, follow: false } };
  return {
    title: `Гайды Lineage 2 ${c.name} — прокачка, классы, квесты`,
    description: `Гайды по Lineage 2 ${c.name}: старт для новичков, прокачка до 70–80, выбор класса, квесты, экономика и PvP.`,
    alternates: { canonical: `${SITE}/guides/${c.slug}` },
  };
}

export default async function ChronicleGuidesPage({ params }: Props) {
  const { chronicle } = await params;
  const c = findGuideChronicle(chronicle);
  if (!c) notFound();

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

      <section>
        <h2 className={styles.sectionTitle}>Темы гайдов</h2>
        <div className={styles.topics}>
          {PLANNED_TOPICS.map(t => (
            <div key={t.title} className={styles.topic}>
              <span className={styles.topicIcon} aria-hidden="true">{t.icon}</span>
              <div>
                <strong>{t.title}</strong>
                <p>{t.desc}</p>
              </div>
              <span className={styles.soon}>Скоро</span>
            </div>
          ))}
        </div>
      </section>

      <p className={styles.note}>
        Гайды для {c.name} в работе — добавляем постепенно. Есть что предложить или хочешь
        поделиться своим материалом? <Link href="/contacts">Напиши нам</Link>.
      </p>
    </div>
  );
}
