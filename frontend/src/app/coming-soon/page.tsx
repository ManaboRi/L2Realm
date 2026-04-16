'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Server } from '@/lib/types';
import styles from './page.module.css';

type Group = { label: string; emoji: string; servers: Server[] };

function groupByOpenDate(servers: Server[]): Group[] {
  const now   = new Date();
  const today = new Date(now); today.setHours(23, 59, 59, 999);
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(23, 59, 59, 999);
  const week  = new Date(now); week.setDate(week.getDate() + 7);
  const month = new Date(now); month.setDate(month.getDate() + 30);

  const groups: Group[] = [
    { label: 'Сегодня',       emoji: '🔥', servers: [] },
    { label: 'Завтра',        emoji: '⚡', servers: [] },
    { label: 'На этой неделе',emoji: '📅', servers: [] },
    { label: 'В этом месяце', emoji: '📆', servers: [] },
    { label: 'Позже',         emoji: '⏳', servers: [] },
  ];

  for (const s of servers) {
    if (!s.openedDate) continue;
    const d = new Date(s.openedDate);
    if (d <= today)    groups[0].servers.push(s);
    else if (d <= tomorrow) groups[1].servers.push(s);
    else if (d <= week)     groups[2].servers.push(s);
    else if (d <= month)    groups[3].servers.push(s);
    else                    groups[4].servers.push(s);
  }

  return groups.filter(g => g.servers.length > 0);
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days <= 0)  return 'Открывается сегодня';
  if (days === 1) return 'Завтра';
  return `Через ${days} дн.`;
}

export default function ComingSoonPage() {
  const [servers,  setServers]  = useState<Server[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    api.servers.comingSoon()
      .then(setServers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const groups = groupByOpenDate(servers);

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.heroEye}>◆ Скоро открытие ◆</p>
        <h1 className={styles.heroTitle}>Ожидаемые <em>серверы</em></h1>
        <p className={styles.heroSub}>Серверы которые откроются в ближайшее время — следите и не пропустите</p>
      </div>

      <div className={styles.wrap}>
        {loading ? (
          <div className={styles.loadWrap}><span className="spin" /> Загружаем...</div>
        ) : servers.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>⏳</div>
            <div className={styles.emptyTitle}>Пока нет ожидаемых серверов</div>
            <p className={styles.emptySub}>Когда владельцы добавят серверы с датой открытия — они появятся здесь</p>
            <Link href="/" className="btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>← Все серверы</Link>
          </div>
        ) : (
          groups.map(group => (
            <div key={group.label} className={styles.group}>
              <div className={styles.groupTitle}>
                <span>{group.emoji}</span> {group.label}
                <span className={styles.groupCount}>{group.servers.length}</span>
              </div>
              <div className={styles.cards}>
                {group.servers.map(s => (
                  <Link key={s.id} href={`/servers/${s.id}`} className={styles.card}>
                    <div className={styles.cardLeft}>
                      {s.icon
                        ? <img src={s.icon} alt={s.name} className={styles.icon} />
                        : <div className={styles.iconFallback}>{(s.abbr || s.name.slice(0,2)).toUpperCase()}</div>
                      }
                      <div>
                        <div className={styles.cardName}>{s.name}</div>
                        <div className={styles.cardMeta}>
                          <span className="tag tc">{s.chronicle}</span>
                          <span className="tag tn">{s.rates}</span>
                        </div>
                        {s.shortDesc && <div className={styles.cardDesc}>{s.shortDesc}</div>}
                      </div>
                    </div>
                    <div className={styles.cardRight}>
                      <div className={styles.countdown}>{daysUntil(s.openedDate!)}</div>
                      {s.openedDate && (
                        <div className={styles.openDate}>
                          {new Date(s.openedDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
