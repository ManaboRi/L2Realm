import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';

const SITE = 'https://l2realm.ru';

const clients = [
  {
    title: 'Interlude',
    tag: 'Classic PvP',
    build: 'C6',
    size: '4-6 ГБ',
    accent: 'gold',
    text: 'Самая узнаваемая база для PvP-проектов, ремастеров и x1200-серверов.',
  },
  {
    title: 'High Five',
    tag: 'PvE / Craft',
    build: 'H5',
    size: '8-12 ГБ',
    accent: 'green',
    text: 'Универсальный клиент для стабильных mid-rate и long-play серверов.',
  },
  {
    title: 'Gracia Final',
    tag: 'Old school',
    build: 'GF',
    size: '7-10 ГБ',
    accent: 'blue',
    text: 'Переходная хроника с воздушными зонами, Камалокой и живым темпом прокачки.',
  },
  {
    title: 'Classic',
    tag: 'Modern old school',
    build: 'Classic',
    size: '10-18 ГБ',
    accent: 'red',
    text: 'Клиент для проектов с новым интерфейсом, сезонной экономикой и свежими патчами.',
  },
  {
    title: 'Essence',
    tag: 'Auto-hunt',
    build: 'Essence',
    size: '12-20 ГБ',
    accent: 'violet',
    text: 'Современная ветка Lineage 2 с автоохотой и быстрым стартом персонажа.',
  },
];

export const metadata: Metadata = {
  title: 'Скачать Lineage 2',
  description:
    'Клиенты Lineage 2 по хроникам для игроков L2Realm: Interlude, High Five, Gracia Final, Classic и Essence.',
  alternates: { canonical: `${SITE}/download` },
  openGraph: {
    type: 'website',
    title: 'Скачать Lineage 2 - L2Realm',
    description: 'Раздел клиентов Lineage 2 по хроникам для игроков каталога L2Realm.',
    url: `${SITE}/download`,
    siteName: 'L2Realm',
    locale: 'ru_RU',
  },
};

export default function DownloadPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.heroEye}>◆ Клиенты игры ◆</p>
          <h1 className={styles.heroTitle}>Скачать <em>Lineage 2</em></h1>
          <p className={styles.heroSub}>
            Раздел под клиенты и патчи по хроникам. Сейчас собираем чистые ссылки, чтобы игроки могли быстро перейти
            от страницы сервера к нужной версии игры.
          </p>
          <div className={styles.heroActions}>
            <Link href="/" className="btn-primary">Каталог серверов</Link>
            <Link href="/coming-soon" className="btn-ghost">Скоро открытие</Link>
          </div>
        </div>
        <div className={styles.heroMedia} aria-hidden="true">
          <div className={styles.clientBox}>
            <span className={styles.boxRune}>II</span>
            <span className={styles.boxLine} />
            <span className={styles.boxText}>Lineage 2</span>
          </div>
        </div>
      </section>

      <section className={styles.clients} aria-label="Версии Lineage 2">
        {clients.map((client) => (
          <article key={client.title} className={`${styles.clientCard} ${styles[client.accent]}`}>
            <div className={styles.cardTop}>
              <span className={styles.clientTag}>{client.tag}</span>
              <span className={styles.clientBuild}>{client.build}</span>
            </div>
            <h2>{client.title}</h2>
            <p>{client.text}</p>
            <div className={styles.cardMeta}>
              <span>Клиент</span>
              <strong>{client.size}</strong>
            </div>
            <div className={styles.cardButtons}>
              <button type="button" className={styles.disabledButton} disabled>Ссылка скоро</button>
              <button type="button" className={styles.patchButton} disabled>Патч</button>
            </div>
          </article>
        ))}
      </section>

      <section className={styles.note}>
        <div>
          <p className={styles.noteKicker}>L2Realm</p>
          <h2>Единая витрина клиентов</h2>
        </div>
        <p>
          Сюда удобно вынести проверенные зеркала, патчи серверов, системные требования и пометки по хроникам. Пока это
          базовая вкладка в стиле сайта, без внешних ссылок.
        </p>
      </section>
    </div>
  );
}
