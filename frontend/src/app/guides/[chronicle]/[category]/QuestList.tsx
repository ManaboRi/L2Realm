'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Guide } from '@/lib/types';
import styles from './page.module.css';

type Bracket = { id: string; label: string; min: number; max: number };

const BRACKETS: Bracket[] = [
  { id: 'all', label: 'Все', min: -1, max: 999 },
  { id: 'b1', label: '1–20', min: 1, max: 19 },
  { id: 'b2', label: '20–40', min: 20, max: 39 },
  { id: 'b3', label: '40–76', min: 40, max: 75 },
  { id: 'b4', label: '76+', min: 76, max: 999 },
];

function levelText(g: Guide): string {
  if (g.levelMin != null && g.levelMax != null) return `${g.levelMin}–${g.levelMax}`;
  if (g.levelMin != null) return `${g.levelMin}+`;
  if (g.levelMax != null) return `до ${g.levelMax}`;
  return '—';
}

export function QuestList({ guides, base }: { guides: Guide[]; base: string }) {
  const [q, setQ] = useState('');
  const [br, setBr] = useState('all');
  const [sort, setSort] = useState<'level' | 'new' | 'views'>('level');

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    const bracket = BRACKETS.find(b => b.id === br) ?? BRACKETS[0];
    const arr = guides.filter(g => {
      const okQ = !query
        || g.title.toLowerCase().includes(query)
        || (g.npc ?? '').toLowerCase().includes(query)
        || (g.location ?? '').toLowerCase().includes(query)
        || (g.reward ?? '').toLowerCase().includes(query);
      if (!okQ) return false;
      if (br === 'all') return true;
      const lvl = g.levelMin ?? g.levelMax ?? -1;
      return lvl >= bracket.min && lvl <= bracket.max;
    });
    return [...arr].sort((a, b) => {
      if (sort === 'views') return (b.views ?? 0) - (a.views ?? 0);
      if (sort === 'new') return (b.publishedAt ? Date.parse(b.publishedAt) : 0) - (a.publishedAt ? Date.parse(a.publishedAt) : 0);
      return (a.levelMin ?? 999) - (b.levelMin ?? 999);
    });
  }, [guides, q, br, sort]);

  return (
    <>
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            className={styles.search}
            type="search"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Поиск квеста, NPC, награды…"
            aria-label="Поиск по квестам"
          />
        </div>
        <div className={styles.levelChips}>
          {BRACKETS.map(b => (
            <button
              key={b.id}
              type="button"
              className={`${styles.levelChip} ${br === b.id ? styles.levelChipActive : ''}`}
              onClick={() => setBr(b.id)}
            >
              {b.label}
            </button>
          ))}
        </div>
        <select className={styles.sortSel} value={sort} onChange={e => setSort(e.target.value as 'level' | 'new' | 'views')} aria-label="Сортировка">
          <option value="level">По уровню</option>
          <option value="new">Сначала новые</option>
          <option value="views">Популярные</option>
        </select>
      </div>

      <div className={styles.countRow}>Найдено: <strong>{list.length}</strong></div>

      {list.length === 0 ? (
        <div className={styles.empty}>
          <p>Ничего не нашлось — измени запрос или сбрось уровень.</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Квест</th>
                <th className={styles.colLevel}>Уровень</th>
                <th className={styles.colNpc}>NPC / Локация</th>
                <th className={styles.colReward}>Награда</th>
                <th className={styles.colAction}></th>
              </tr>
            </thead>
            <tbody>
              {list.map(g => (
                <tr key={g.id}>
                  <td>
                    <Link href={`${base}/${g.slug}`} className={styles.gName}>
                      {g.image && <img src={g.image} alt="" loading="lazy" decoding="async" />}
                      <span>
                        <strong>{g.title}</strong>
                        {g.description && <em>{g.description}</em>}
                      </span>
                    </Link>
                  </td>
                  <td className={styles.colLevel}><span className={styles.lvl}>{levelText(g)}</span></td>
                  <td className={styles.colNpc}>
                    {g.npc && <span className={styles.npc}>{g.npc}</span>}
                    {g.location && <span className={styles.loc}>{g.location}</span>}
                    {!g.npc && !g.location && <span className={styles.dash}>—</span>}
                  </td>
                  <td className={styles.colReward}>{g.reward || <span className={styles.dash}>—</span>}</td>
                  <td className={styles.colAction}>
                    <Link href={`${base}/${g.slug}`} className={styles.openBtn}>Открыть →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
