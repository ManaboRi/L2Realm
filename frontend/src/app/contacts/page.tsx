import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../methodology/page.module.css';
import c from './contacts.module.css';

const SITE = 'https://l2realm.ru';

export const metadata: Metadata = {
  title: 'Контакты — L2Realm',
  description: 'Контакты L2Realm: добавление сервера Lineage 2, размещение проекта, вопросы по каталогу, обзорам и открытию новых миров.',
  alternates: { canonical: `${SITE}/contacts` },
};

const TELEGRAM = 'https://t.me/l2realm_admin';

function TgButton({ label }: { label: string }) {
  return (
    <a className={c.tgBtn} href={TELEGRAM} target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21.94 4.5 18.9 19.2c-.23 1.02-.84 1.27-1.7.79l-4.7-3.46-2.27 2.18c-.25.25-.46.46-.94.46l.34-4.78L18.32 6.6c.38-.34-.08-.53-.59-.19L6.96 13.4l-4.66-1.46c-1.01-.32-1.03-1.01.21-1.5L20.64 3.2c.84-.31 1.58.2 1.3 1.3Z" />
      </svg>
      {label}
    </a>
  );
}

export default function ContactsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}>Все проекты</Link>
        <h1>Контакты</h1>
        <p>По вопросам каталога, размещения проекта и редакционных материалов L2Realm пишите в Telegram. Отвечаем обычно в течение дня.</p>
      </header>

      <section className={styles.grid}>
        <article className={styles.card}>
          <h2>Связь с редакцией</h2>
          <p>Самый быстрый способ — Telegram. Там же можно обсудить добавление проекта в каталог и его размещение.</p>
          <TgButton label="Написать в Telegram" />
          <p className={c.muted}>Обычно отвечаем в течение дня.</p>
        </article>

        <article className={styles.card}>
          <h2>Размещение проекта</h2>
          <p>Хотите видеть свой сервер в каталоге или обсудить его место в списке — напишите, подскажем условия и поможем оформить карточку.</p>
          <TgButton label="Обсудить размещение" />
        </article>
      </section>
    </div>
  );
}
