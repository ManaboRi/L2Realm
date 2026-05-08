'use client';
import Link from 'next/link';
import type { Server } from '@/lib/types';
import { DONATE_OPTIONS, SERVER_TYPES } from '@/lib/types';
import styles from './ServerCard.module.css';

const typeLabels = new Map(SERVER_TYPES.map(t => [t.v, t.l]));
const donateLabels = new Map(DONATE_OPTIONS.map(d => [d.v, d.l]));

function normalizedDonate(value?: string | null) {
  return value && value !== 'free' && donateLabels.has(value as any) ? value : null;
}

function voteWord(value: number) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return 'голос';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'голоса';
  return 'голосов';
}

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
  const isVip     = plan === 'VIP' && !isSoon;
  const isBoosted = !!s._isBoosted;
  const isSod     = !!s._isSod;
  const insts     = s.instances ?? [];
  const chronSet  = new Set<string>();
  const rateSet   = new Set<string>();
  const typeSet   = new Set<string>();
  const donateSet = new Set<string>();

  if (insts.length > 0) {
    for (const i of insts) {
      if (i.chronicle) chronSet.add(i.chronicle);
      if (i.rates)     rateSet.add(i.rates);
      if (i.type)      typeSet.add(i.type);
      const instDonate = normalizedDonate(i.donate);
      if (instDonate) donateSet.add(instDonate);
    }
  }
  if (chronSet.size === 0 && s.chronicle) chronSet.add(s.chronicle);
  if (rateSet.size === 0 && s.rates) rateSet.add(s.rates);
  if (typeSet.size === 0) {
    for (const t of s.type ?? []) {
      if (typeLabels.has(t as any)) typeSet.add(t);
    }
  }
  if (donateSet.size === 0) {
    const ownDonate = normalizedDonate(s.donate);
    if (ownDonate) donateSet.add(ownDonate);
  }
  const chronTags = [...chronSet];
  const rateTags = [...rateSet];
  const typeTags = [...typeSet];
  const donateTags = [...donateSet];
  const votes = s.weeklyVotes ?? 0;

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
          ? <img src={s.icon} alt={s.name} width={48} height={48} loading="lazy" decoding="async" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          : <span>{s.abbr ?? s.name.slice(0, 2).toUpperCase()}</span>}
      </div>

      {/* Основная информация — клик ведёт на страницу сервера */}
      <Link href={`/servers/${s.id}`} className={styles.main}>
        <div className={styles.head}>
          <div className={styles.titleRow}>
            <span className={styles.name}>{s.name}</span>
            {chronTags.map(c => <span key={`c-head-${c}`} className={`${styles.titleTag} tag tc`}>{c}</span>)}
            {isVip && <span className={styles.starVip} title="VIP">★</span>}
            {isBoosted && <span className={styles.fire} title="В огне — буст активен">🔥</span>}
            {isSod && <span className={styles.sodBadge} title="Проект с наибольшим числом голосов за текущую неделю.">★ Сервер недели</span>}
            {isVip && <span className={styles.vipBadge}>VIP</span>}
          </div>
          <div className={styles.tagStack}>
            <div className={styles.tagLine}>{rateTags.map(r => <span key={`r-${r}`} className="tag tr">{r}</span>)}</div>
            {(typeTags.length > 0 || donateTags.length > 0 || isSoon) && (
              <div className={styles.tagLine}>
                {typeTags.map(t => <span key={`t-${t}`} className="tag tn">{typeLabels.get(t as any) ?? t}</span>)}
                {donateTags.map(d => <span key={`d-${d}`} className="tag tn">{donateLabels.get(d as any) ?? d}</span>)}
                {isSoon && <span className={styles.soonBadge}>⏳ Скоро</span>}
              </div>
            )}
          </div>
        </div>
        <div className={styles.desc}>{s.shortDesc}</div>
      </Link>

      {/* Правая часть. Дата: основная — последний открывшийся сервер проекта
          (effective opened из instances), под ней мелким серым — год создания
          самого проекта, если он отличается. Для одиночных серверов (без
          instances) показываем только основную дату. */}
      <div className={styles.right}>
        {(() => {
          const insts = s.instances ?? [];
          // эффективная дата = max(server.openedDate, max(instance.openedDate)) в прошлом
          const now = Date.now();
          const candidates: number[] = [];
          if (s.openedDate) {
            const t = new Date(s.openedDate).getTime();
            if (!isNaN(t) && t <= now) candidates.push(t);
          }
          for (const i of insts) {
            if (i.openedDate) {
              const t = new Date(i.openedDate).getTime();
              if (!isNaN(t) && t <= now) candidates.push(t);
            }
          }
          const effTs = candidates.length ? Math.max(...candidates) : null;
          const effIso = effTs ? new Date(effTs).toISOString() : s.openedDate;
          // Год проекта показываем только если он отличается от effective
          const projYear = s.openedDate ? new Date(s.openedDate).getFullYear() : null;
          const effYear  = effTs ? new Date(effTs).getFullYear() : null;
          const showProjLine = insts.length > 0 && projYear && effYear && projYear !== effYear;
          return (
            <>
              <span className={styles.date} title={fmtDate(effIso)}>{relativeOpened(effIso)}</span>
              {showProjLine && (
                <span className={styles.dateSub} title={`Проект существует с ${fmtDate(s.openedDate)}`}>
                  проект с {projYear}
                </span>
              )}
            </>
          );
        })()}

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
            <img src="/images/vote-icon.png" alt="Голоса сервера" width={16} height={16} loading="lazy" decoding="async" className={styles.voteIco} />
            <span>{votes}</span>
            <span>{voteWord(votes)}</span>
          </span>
        </div>

        <div className={styles.btns}>
          <Link href={`/servers/${s.id}`} className="btn-gold">На сервер ›</Link>
        </div>
      </div>
    </div>
  );
}
