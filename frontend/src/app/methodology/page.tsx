import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Методика показателей',
  description: 'Как L2Realm показывает онлайн проектов, посещаемость сайтов и историю открытий.',
};

export default function MethodologyPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}>Все проекты</Link>
        <h1>Методика показателей</h1>
        <p>Онлайн игроков, посещаемость сайта и открытия миров - разные показатели. Здесь прозрачно описано, откуда каждый из них берётся.</p>
      </header>

      <section className={styles.grid}>
        <article className={styles.card}>
          <h2>Онлайн сейчас</h2>
          <div className={styles.legend}>
            <div>
              <strong className={styles.site}>С сайта проекта</strong>
              <p>Если у проекта есть публичный счётчик, число берётся с его сайта или API. Это показатель владельца сервера, поэтому он зависит от его способа подсчёта.</p>
            </div>
            <div>
              <strong className={styles.estimated}>Оценка L2Realm</strong>
              <p>Если счётчика нет, редакция заходит в игру, смотрит активность и вручную вносит ориентировочный онлайн. Такой показатель отмечается знаком ≈ и не является подтверждённым счётчиком игроков.</p>
            </div>
          </div>
          <div className={styles.smartModel}>
            <strong>Умный суточный профиль оценки</strong>
            <p>Только для оценочного онлайна: ночью значение снижается, вечером выходит к пику; выходные усиливают активность. Для Essence и Main спад мягче из-за автоохоты. Небольшой шум 5-15% делает график живым, но стабильным внутри одного часа.</p>
          </div>
          <p className={styles.note}>Общий онлайн проекта складывается только из активных миров, для которых есть данные. Числа, полученные с сайта, искусственно не меняются.</p>
        </article>

        <article className={styles.card}>
          <h2>Посещаемость сайта</h2>
          <p>Это оценка визитов на домен проекта, а не число игроков в игре. Один раз в месяц редакция переносит показатель Total Visits из публичного отчёта внешнего сервиса.</p>
          <div className={styles.metricRow}>
            <span>Основной источник</span>
            <strong>Similarweb, вручную</strong>
          </div>
          <div className={styles.metricRow}>
            <span>На графике</span>
            <strong>До 6 месяцев</strong>
          </div>
          <p className={styles.note}>Высокая посещаемость говорит об интересе к проекту, но не доказывает высокий онлайн. Это внешняя оценка, поэтому проект без доступных данных показывается без цифры.</p>
        </article>

        <article className={styles.card}>
          <h2>Миры и открытия</h2>
          <p>У проекта может быть несколько миров с разными хрониками и рейтами. Активные и анонсированные открытия участвуют в карточке проекта, а закрытые и объединённые остаются в истории.</p>
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
