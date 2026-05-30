import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../methodology/page.module.css';

export const metadata: Metadata = {
  title: 'Контакты — L2Realm',
  description: 'Связь с редакцией L2Realm: вопросы по каталогу и размещению проекта.',
};

const TELEGRAM = 'https://t.me/ManaboRi';

export default function ContactsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}>Все проекты</Link>
        <h1>Контакты</h1>
        <p>По любым вопросам о каталоге, а также по размещению проекта на L2Realm — пишите в Telegram. Отвечаем обычно в течение дня.</p>
      </header>

      <section className={styles.grid}>
        <article className={styles.card}>
          <h2>Связь с редакцией</h2>
          <p>Самый быстрый способ — Telegram. Там же можно обсудить добавление проекта в каталог и его размещение.</p>
          <div className={styles.chips}>
            <a className={`${styles.chip} ${styles.trustA}`} href={TELEGRAM} target="_blank" rel="noopener">
              Telegram — написать
            </a>
          </div>
        </article>

        <article className={styles.card}>
          <h2>Размещение проекта</h2>
          <p>Хотите видеть свой сервер в каталоге или обсудить его место в списке — напишите в Telegram, подскажем условия.</p>
        </article>
      </section>
    </div>
  );
}
