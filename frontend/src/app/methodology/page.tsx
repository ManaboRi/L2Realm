import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Как L2Realm проверяет серверы Lineage 2',
  description: 'Методика ручной проверки серверов L2Realm: доверие A/B/C, активность проекта, трафик сайта, голоса игроков и Vote Manager.',
};

export default function MethodologyPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}>Все проекты</Link>
        <h1>Как мы проверяем серверы</h1>
        <p>Мы не показываем точный онлайн, если не можем честно подтвердить его сами. Вместо этого собираем понятные сигналы: ручная проверка, уровень доверия, активность, трафик сайта, голоса игроков и история открытий.</p>
      </header>

      <section className={styles.grid}>
        <article className={styles.card}>
          <h2>Ручная проверка</h2>
          <p>Редакция заходит на сайт проекта, проверяет основные ссылки, регистрацию, скачивание клиента или патча, понятность старта, контакты, визуальное состояние проекта и доступность сервера.</p>
          <div className={styles.metricRow}>
            <span>Дата проверки</span>
            <strong>Указывается на карточке</strong>
          </div>
          <div className={styles.metricRow}>
            <span>Доверие A/B/C</span>
            <strong>A - хорошо, C - есть риски</strong>
          </div>
          <p className={styles.note}>Проверка не является гарантией безопасности, но помогает быстрее отличить живой и аккуратно оформленный проект от сомнительного или заброшенного.</p>
        </article>

        <article className={styles.card}>
          <h2>Активность проекта</h2>
          <div className={styles.legend}>
            <div>
              <strong className={styles.site}>Высокая / средняя</strong>
              <p>Во время проверки заметны игроки, движение в городах или локациях, живое сообщество, новости, ответы администрации и понятные инструкции для старта.</p>
            </div>
            <div>
              <strong className={styles.estimated}>Низкая / очень низкая</strong>
              <p>Игроков почти не видно, активность в сообществе слабая, часть ссылок или инструкций требует перепроверки. Такой проект лучше изучить внимательнее перед стартом.</p>
            </div>
          </div>
          <p className={styles.note}>Это редакционная оценка, а не число игроков. Она нужна, чтобы не подменять доверие красивыми, но непроверенными цифрами.</p>
        </article>

        <article className={styles.card}>
          <h2>Посещаемость сайта</h2>
          <p>Трафик показывает интерес к сайту проекта, но не равен количеству игроков в игре. Один раз в месяц редакция вручную переносит показатель Total Visits из публичного отчета внешнего сервиса.</p>
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
          <p>Голосование на L2Realm ограничено по аккаунту и IP на 24 часа. Голоса помогают формировать активность в каталоге и гонку за сервер недели.</p>
          <div className={styles.metricRow}>
            <span>Бонусы за голос</span>
            <strong>Только если подключен API</strong>
          </div>
          <p className={styles.note}>Администратор сервера может подключить Vote Manager: нужно написать в Telegram владельцу L2Realm, после чего мы включим флаг в админке и дадим ссылку API для проверки голосов.</p>
        </article>

        <article className={styles.card}>
          <h2>Миры и открытия</h2>
          <p>У проекта может быть несколько миров с разными хрониками и рейтами. Активные и будущие открытия показываются в основной вкладке, а закрытые, объединенные и архивные остаются в истории проекта.</p>
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
