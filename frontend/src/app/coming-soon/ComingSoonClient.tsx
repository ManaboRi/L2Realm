'use client';
import React, { useMemo } from 'react';
import Link from 'next/link';
import type { Server, ServerInstance } from '@/lib/types';
import styles from './page.module.css';

// «Опенинг» — атомная сущность для /coming-soon. Один проект может породить
// несколько опенингов (по одному на каждый future-instance), либо один
// опенинг по самому серверу (если у него есть собственный openedDate без instances).
type Opening = {
  key:        string;            // уникальный ключ для React
  serverId:   string;            // куда вести по клику (/servers/{id})
  projectName:string;            // название проекта-родителя
  icon:       string | null | undefined;
  abbr:       string | null | undefined;
  chronicle:  string;
  rates:      string;
  label?:     string;             // лейбл instance, если есть
  shortDesc?: string;             // описание instance или сервера
  openedAt:   string;
};

type Group = { label: string; emoji: string; openings: Opening[] };

function flattenOpenings(servers: Server[]): Opening[] {
  const now = Date.now();
  const result: Opening[] = [];
  for (const s of servers) {
    const insts: ServerInstance[] = Array.isArray(s.instances) ? s.instances : [];
    const futureInsts = insts.filter(i => i.openedDate && new Date(i.openedDate).getTime() > now);

    if (futureInsts.length > 0) {
      // Проект с future-instance: каждый запуск — отдельная карточка
      for (const i of futureInsts) {
        result.push({
          key:         `${s.id}::${i.id}`,
          serverId:    s.id,
          projectName: s.name,
          icon:        s.icon,
          abbr:        s.abbr,
          chronicle:   i.chronicle,
          rates:       i.rates,
          label:       i.label,
          shortDesc:   i.shortDesc || s.shortDesc || undefined,
          openedAt:    i.openedDate!,
        });
      }
    } else if (s.openedDate && new Date(s.openedDate).getTime() > now) {
      // Одиночный сервер с собственной датой открытия
      result.push({
        key:         s.id,
        serverId:    s.id,
        projectName: s.name,
        icon:        s.icon,
        abbr:        s.abbr,
        chronicle:   s.chronicle,
        rates:       s.rates,
        shortDesc:   s.shortDesc || undefined,
        openedAt:    s.openedDate,
      });
    }
  }
  // Сортируем по ближайшей дате
  result.sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime());
  return result;
}

function groupByOpenDate(openings: Opening[]): Group[] {
  const now      = new Date();
  const today    = new Date(now); today.setHours(23, 59, 59, 999);
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(23, 59, 59, 999);
  const week     = new Date(now); week.setDate(week.getDate() + 7);
  const month    = new Date(now); month.setDate(month.getDate() + 30);

  const groups: Group[] = [
    { label: 'Сегодня',        emoji: '🔥', openings: [] },
    { label: 'Завтра',         emoji: '⚡', openings: [] },
    { label: 'На этой неделе', emoji: '📅', openings: [] },
    { label: 'В этом месяце',  emoji: '📆', openings: [] },
    { label: 'Позже',          emoji: '⏳', openings: [] },
  ];

  for (const o of openings) {
    const d = new Date(o.openedAt);
    if (d <= today)         groups[0].openings.push(o);
    else if (d <= tomorrow) groups[1].openings.push(o);
    else if (d <= week)     groups[2].openings.push(o);
    else if (d <= month)    groups[3].openings.push(o);
    else                    groups[4].openings.push(o);
  }

  return groups.filter(g => g.openings.length > 0);
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days <= 0)  return 'Открывается сегодня';
  if (days === 1) return 'Завтра';
  return `Через ${days} дн.`;
}

export function ComingSoonClient({ initialServers }: { initialServers: Server[] }) {
  const servers = initialServers;
  const openings = useMemo(() => flattenOpenings(servers), [servers]);
  const groups   = useMemo(() => groupByOpenDate(openings), [openings]);

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.heroEye}>◆ Скоро открытие ◆</p>
        <h1 className={styles.heroTitle}>Ожидаемые <em>серверы</em></h1>
        <p className={styles.heroSub}>Серверы которые откроются в ближайшее время — следите и не пропустите</p>
      </div>

      <div className={styles.wrap}>
        {openings.length === 0 ? (
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
                <span className={styles.groupCount}>{group.openings.length}</span>
              </div>
              <div className={styles.cards}>
                {group.openings.map(o => (
                  <Link key={o.key} href={`/servers/${o.serverId}`} className={styles.card}>
                    <div className={styles.cardLeft}>
                      {o.icon
                        ? <img src={o.icon} alt={o.projectName} className={styles.icon} />
                        : <div className={styles.iconFallback}>{(o.abbr || o.projectName.slice(0,2)).toUpperCase()}</div>
                      }
                      <div>
                        <div className={styles.cardName}>
                          {o.projectName}
                          {o.label && <span className={styles.cardLabel}> · {o.label}</span>}
                        </div>
                        <div className={styles.cardMeta}>
                          <span className="tag tc">{o.chronicle}</span>
                          <span className="tag tn">{o.rates}</span>
                        </div>
                        {o.shortDesc && <div className={styles.cardDesc}>{o.shortDesc}</div>}
                      </div>
                    </div>
                    <div className={styles.cardRight}>
                      <div className={styles.countdown}>{daysUntil(o.openedAt)}</div>
                      <div className={styles.openDate}>
                        {new Date(o.openedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                      </div>
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
