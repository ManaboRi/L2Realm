import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../methodology/page.module.css';
import c from './contacts.module.css';

const SITE = 'https://l2realm.ru';

export const metadata: Metadata = {
  title: 'Добавить сервер и контакты — L2Realm',
  description: 'Добавить сервер Lineage 2 в каталог L2Realm можно бесплатно. Здесь же — контакты редакции и форматы продвижения проекта.',
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

type Tariff = { icon: string; title: string; meta: string; price: string; period: string };

const TARIFFS: Tariff[] = [
  { icon: '🔝', title: 'Рекомендуем', meta: 'В топе каталога на главной', price: '2000 ₽', period: '30 дней' },
  { icon: '⏳', title: 'Рекомендуем · Скоро', meta: 'Топ среди ближайших открытий', price: '1000 ₽', period: 'до открытия' },
  { icon: '🖼', title: 'Баннер сверху', meta: 'Самое видное место — премиум-баннер с картинкой', price: '2500 ₽', period: '30 дней' },
  { icon: '🪧', title: 'Баннер снизу', meta: 'Баннер под блоками каталога — дешевле', price: '1200 ₽', period: '30 дней' },
];

export default function ContactsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}>Все проекты</Link>
        <h1>Добавить сервер и контакты</h1>
        <p>Добавить проект в каталог можно бесплатно. По вопросам размещения, продвижения и редакционных материалов пишите в Telegram — обычно отвечаем в течение дня.</p>
      </header>

      <section className={styles.grid}>
        <article className={styles.card}>
          <h2>Добавить сервер</h2>
          <p>Размещение в каталоге — <strong>бесплатно</strong>. Пришлите ссылку на проект, хронику и рейты — поможем оформить карточку и опубликуем после короткой проверки.</p>
          <TgButton label="Добавить сервер" />
          <p className={c.muted}>Обычно отвечаем в течение дня.</p>
        </article>

        <article className={styles.card}>
          <h2>Связь с редакцией</h2>
          <p>Вопросы по каталогу, методике оценки, обзорам и открытиям — всё в Telegram. Там же — правки по уже опубликованным карточкам.</p>
          <TgButton label="Написать в Telegram" />
        </article>
      </section>

      <section className={c.promo}>
        <div className={c.promoHead}>
          <h2>Продвижение — по желанию</h2>
          <p>Базовое размещение ничего не стоит. Если хочется больше внимания к проекту — есть платные форматы. Цены стартовые, под небольшой трафик.</p>
        </div>

        <ul className={c.tariffs}>
          {TARIFFS.map(t => (
            <li key={t.title} className={c.tariff}>
              <span className={c.tariffName}>
                <span className={c.tariffTitle}><span aria-hidden="true">{t.icon}</span> {t.title}</span>
                <span className={c.tariffMeta}>{t.meta}</span>
              </span>
              <span className={c.tariffPrice}>{t.price}<i>/ {t.period}</i></span>
            </li>
          ))}
        </ul>

        <div className={c.promoFoot}>
          <TgButton label="Обсудить размещение" />
          <p className={c.promoNote}>Платные форматы помечаются «Реклама» — так положено по закону. Пакеты и оплату обсуждаем индивидуально в Telegram.</p>
        </div>
      </section>
    </div>
  );
}
