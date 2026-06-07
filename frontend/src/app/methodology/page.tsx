import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';

const SITE = 'https://l2realm.ru';

export const metadata: Metadata = {
  title: 'Как L2Realm проверяет серверы Lineage 2',
  description: 'Методика L2Realm: ручная проверка и доверие A/B/C, активность проекта, посещаемость сайта, голоса игроков и история открытий.',
  alternates: { canonical: `${SITE}/methodology` },
};

export default function MethodologyPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}>Все проекты</Link>
        <h1>Как мы проверяем серверы</h1>
        <p>Мы не показываем «точный онлайн». Вместо непроверенного счётчика игроков мы даём набор понятных сигналов: ручную проверку и уровень доверия, редакционную оценку активности, посещаемость сайта, голоса игроков и историю открытий проекта.</p>
      </header>

      <section className={styles.grid}>
        <article id="trust" className={`${styles.card} ${styles.cardTrust}`}>
          <h2>Ручная проверка и доверие</h2>
          <p>Редакция заходит на сайт проекта и проверяет основные ссылки, регистрацию, скачивание клиента или патча, понятность старта, контакты и доступность сервера. По итогам выставляем уровень доверия.</p>
          <div className={styles.chips}>
            <span className={`${styles.chip} ${styles.trustA}`}>A — проверено, вопросов нет</span>
            <span className={`${styles.chip} ${styles.trustB}`}>B — есть мелкие вопросы</span>
            <span className={`${styles.chip} ${styles.trustC}`}>C — доверие низкое</span>
          </div>
          <div className={styles.metricRow}>
            <span>Где показывается</span>
            <strong>Тег на карточке проекта</strong>
          </div>
          <div className={styles.metricRow}>
            <span>Дата проверки</span>
            <strong>Рядом с тегом доверия</strong>
          </div>
          <p className={styles.note}>Проверка не является гарантией безопасности, но помогает быстрее отличить живой и аккуратно оформленный проект от заброшенного или сомнительного.</p>
        </article>

        <article id="activity" className={styles.card}>
          <h2>Активность проекта</h2>
          <p>Редакционная оценка того, насколько живым выглядит проект во время проверки: игроки в городах и локациях, движение в сообществе, новости и ответы администрации. Это оценка, а не точное число игроков.</p>
          <div className={styles.chips}>
            <span className={`${styles.chip} ${styles.actHigh}`}>Высокая</span>
            <span className={`${styles.chip} ${styles.actMedium}`}>Средняя</span>
            <span className={`${styles.chip} ${styles.actLow}`}>Низкая</span>
            <span className={`${styles.chip} ${styles.actVeryLow}`}>Очень низкая</span>
          </div>
          <p className={styles.note}>Цвет от зелёного к красному подсказывает, насколько уверенно проект выглядел живым. Уровень виден на карточке и на странице проекта.</p>
        </article>

        <article className={`${styles.card} ${styles.cardTraffic}`}>
          <h2>Посещаемость сайта</h2>
          <p>Трафик показывает интерес к сайту проекта, но не равен количеству игроков в игре. Один раз в месяц редакция вручную переносит показатель Total Visits из публичного отчёта внешнего сервиса.</p>
          <div className={styles.metricRow}>
            <span>Основной источник</span>
            <strong>Similarweb, вручную</strong>
          </div>
          <div className={styles.metricRow}>
            <span>На графике проекта</span>
            <strong>До 12 месяцев</strong>
          </div>
        </article>

        <article className={styles.card}>
          <h2>Голоса и Vote Manager</h2>
          <p>Голосование на L2Realm ограничено по IP на 24 часа. Голоса формируют активность проекта в каталоге.</p>
          <div className={styles.metricRow}>
            <span>Бонусы за голос</span>
            <strong>Только при подключённом API</strong>
          </div>
          <p className={styles.note}>Администратор сервера может подключить Vote Manager: напишите в Telegram владельцу L2Realm, после чего мы включим флаг в админке и дадим ссылку API для проверки голосов.</p>
        </article>

        <article className={styles.card}>
          <h2>Миры и открытия</h2>
          <p>У проекта может быть несколько миров с разными хрониками и рейтами. Статус мира определяется автоматически по дате открытия, а закрытые и объединённые миры остаются в истории проекта.</p>
          <div className={styles.statuses}>
            <span className={styles.open}>Открыт</span>
            <span className={styles.soon}>Скоро</span>
            <span className={styles.archive}>Архив</span>
          </div>
        </article>
      </section>
    </div>
  );
}
