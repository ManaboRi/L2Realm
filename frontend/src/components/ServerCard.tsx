'use client';
import Link from 'next/link';
import type { Server } from '@/lib/types';
import styles from './ServerCard.module.css';

function fmtDate(s?: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}
function relativeOpened(s?: string | null): string {
  if (!s) return '—';
  const days = Math.floor((Date.now() - new Date(s).getTime()) / 86400000);
  if (days < 0) {
    const u = -days;
    if (u === 1) return 'Открытие завтра';
    return `Открытие через ${u} дн.`;
  }
  if (days === 0) return 'Открылся сегодня';
  if (days === 1) return 'Открылся вчера';
  if (days < 7)   return `Открылся ${days} дн. назад`;
  const w = Math.floor(days / 7);
  if (w < 5)      return w === 1 ? 'Открылся неделю назад' : `Открылся ${w} нед. назад`;
  const m = Math.floor(days / 30);
  if (m < 12)     return m === 1 ? 'Открылся месяц назад' : `Открылся ${m} мес. назад`;
  const y = Math.floor(days / 365);
  if (y === 1)    return 'Открылся год назад';
  if (y < 5)      return `Открылся ${y} года назад`;
  return `Открылся ${y} лет назад`;
}

interface Props { server: Server; vipBlock?: boolean; }

export function ServerCard({ server: s, vipBlock }: Props) {
  const isSoon    = s.openedDate ? new Date(s.openedDate) > new Date() : false;
  const plan      = s.subscription?.plan ?? 'FREE';
  const isVip     = plan === 'VIP';
  const isBoosted = !!s._isBoosted;
  const isSod     = !!s._isSod;

  const rowClass = [
    styles.row,
    isVip ? styles.planVip : '',
    isBoosted ? styles.boosted : '',
    isSod ? styles.sod : '',
    isSoon ? styles.soon : '',
    vipBlock ? styles.vipBlock : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={rowClass}>

      {/* Иконка */}
      <div className={styles.icon}>
        {s.icon
          ? <img src={s.icon} alt={s.name} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          : <span>{s.abbr ?? s.name.slice(0, 2).toUpperCase()}</span>}
      </div>

      {/* Основная информация — клик ведёт на страницу сервера */}
      <Link href={`/servers/${s.id}`} className={styles.main}>
        <div className={styles.top}>
          <span className={styles.name}>{s.name}</span>
          {isVip && <span className={styles.starVip} title="VIP">★</span>}
          {isBoosted && <span className={styles.fire} title="В огне — буст активен">🔥</span>}
          {isSod && <span className={styles.sodBadge} title="Сервер дня">★ Сервер дня</span>}
          {isVip && <span className={styles.vipBadge}>VIP</span>}
          <div className={styles.tags}>
            <span className="tag tc">{s.chronicle}</span>
            <span className="tag tr">{s.rates}</span>
            {isSoon && <span className={styles.soonBadge}>⏳ Скоро</span>}
          </div>
        </div>
        <div className={styles.desc}>{s.shortDesc}</div>
      </Link>

      {/* Правая часть */}
      <div className={styles.right}>
        <span className={styles.date} title={fmtDate(s.openedDate)}>{relativeOpened(s.openedDate)}</span>

        <div className={styles.meta}>
          {s.status && (
            <span className={s.status === 'online' ? styles.online : styles.offline}>
              {s.status === 'online' ? '● Online' : '● Offline'}
            </span>
          )}
          {/* Средняя оценка + число отзывов */}
          {s.ratingCount > 0
            ? <span className={styles.rating} title="Средняя оценка">★ {s.rating.toFixed(1)} ({s.ratingCount})</span>
            : <span className={styles.noRating}>Нет оценок</span>}
          {/* Счётчик голосов */}
          <span className={styles.voteCount} title="Голосов за месяц">
            <img src="/images/vote-icon.png" alt="" className={styles.voteIco} />
            {s.weeklyVotes ?? 0}
          </span>
        </div>

        <div className={styles.btns}>
          <a href={s.url} target="_blank" rel="noopener" className="btn-gold">На сервер →</a>
        </div>
      </div>
    </div>
  );
}
