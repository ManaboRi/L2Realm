'use client';
import Link from 'next/link';
import type { Server } from '@/lib/types';
import styles from './ServerCard.module.css';

function dlbl(d: string) {
  return { free: 'Без доната', cosmetic: 'Косметика', p2w: 'Pay-to-win' }[d] ?? d;
}
function fmtDate(s?: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

interface Props { server: Server; vipBlock?: boolean; }

const PLAN_STAR: Record<string, { cls: string; icon: string }> = {
  VIP:      { cls: 'planVip',      icon: '★' },
  PREMIUM:  { cls: 'planPremium',  icon: '★' },
  STANDARD: { cls: 'planStandard', icon: '★' },
};

export function ServerCard({ server: s, vipBlock }: Props) {
  const isSoon = s.openedDate ? new Date(s.openedDate) > new Date() : false;
  const plan   = s.subscription?.plan ?? 'FREE';
  const star   = PLAN_STAR[plan];

  return (
    <div className={[styles.row, star ? styles[star.cls] : '', isSoon ? styles.soon : '', vipBlock ? styles.vipBlock : ''].filter(Boolean).join(' ')}>

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
          {star && <span className={styles[`star${plan.charAt(0) + plan.slice(1).toLowerCase()}`]}>★</span>}
          {s.type.includes('featured') && <span className={styles.fire}>🔥</span>}
          {plan === 'VIP' && <span className={styles.vipBadge}>VIP</span>}
          <div className={styles.tags}>
            <span className="tag tc">{s.chronicle}</span>
            <span className="tag tr">{s.rates}</span>
            <span className="tag tg">{dlbl(s.donate)}</span>
            {isSoon && <span className={styles.soonBadge}>⏳ Скоро</span>}
            {s.type.includes('pvp') && <span className="tag tp">PvP</span>}
            {s.type.includes('pve') && <span className="tag tn">PvE</span>}
          </div>
        </div>
        <div className={styles.desc}>{s.shortDesc}</div>
      </Link>

      {/* Правая часть */}
      <div className={styles.right}>
        <span className={styles.date}>{fmtDate(s.openedDate)}</span>
        <div className={styles.meta}>
          {s.status && (
            <span className={s.status === 'online' ? styles.online : styles.offline}>
              {s.status === 'online' ? '● Online' : '● Offline'}
            </span>
          )}
          {s.ratingCount > 0 && (
            <span className={styles.rating}>★ {s.rating.toFixed(1)} ({s.ratingCount})</span>
          )}
        </div>
        <div className={styles.btns}>
          <a href={s.url} target="_blank" rel="noopener" className="btn-gold">На сервер →</a>
          <Link href={`/servers/${s.id}`} className={styles.btnMore}>Подробнее</Link>
        </div>
      </div>
    </div>
  );
}
