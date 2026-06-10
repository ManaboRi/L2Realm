'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Guide } from '@/lib/types';
import { GUIDE_RACES } from '../../races';
import styles from './page.module.css';

type Bracket = { id: string; label: string; min: number; max: number };
type SortKey = 'level' | 'title' | 'new' | 'views';

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

// Иконки-заглушки наград (Адена / Опыт / SP) — по ключевым словам в тексте.
const CoinSvg = (
  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5.5" /></svg>
);
const ExpSvg = (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.4 5.8L20.5 9l-4.5 4 1.3 6.2L12 16l-5.3 3.2L8 13 3.5 9l6.1-.2z" /></svg>
);
const SpSvg = (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2 5 5 .5-3.8 3.4 1.2 5.1L12 19l-4.4 3 1.2-5.1L5 13.5 10 13z" /></svg>
);

function RewardCell({ reward }: { reward?: string | null }) {
  if (!reward) return <span className={styles.dash}>—</span>;
  const low = reward.toLowerCase();
  return (
    <span className={styles.rewardCell}>
      {/(аден|adena)/.test(low) && <span className={`${styles.rIco} ${styles.rAdena}`} title="Адена">{CoinSvg}</span>}
      {/(exp|опыт|эксп|exp)/.test(low) && <span className={`${styles.rIco} ${styles.rExp}`} title="Опыт">{ExpSvg}</span>}
      {/\bsp\b/.test(low) && <span className={`${styles.rIco} ${styles.rSp}`} title="SP">{SpSvg}</span>}
      <span className={styles.rewardText}>{reward}</span>
    </span>
  );
}

export function QuestList({ guides, base }: { guides: Guide[]; base: string }) {
  const [q, setQ] = useState('');
  const [br, setBr] = useState('all');
  const [race, setRace] = useState('');
  const [rep, setRep] = useState<'all' | 'rep' | 'once'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('level');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  function toggleSort(k: SortKey) {
    if (sortKey === k) { setSortDir(d => (d === 'asc' ? 'desc' : 'asc')); }
    else { setSortKey(k); setSortDir(k === 'new' || k === 'views' ? 'desc' : 'asc'); }
  }

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
      if (br !== 'all') {
        const lvl = g.levelMin ?? g.levelMax ?? -1;
        if (!(lvl >= bracket.min && lvl <= bracket.max)) return false;
      }
      if (race && g.race && g.race !== race) return false; // null-раса = для всех
      if (rep === 'rep' && !g.repeatable) return false;
      if (rep === 'once' && g.repeatable) return false;
      return true;
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...arr].sort((a, b) => {
      let r = 0;
      if (sortKey === 'title') r = a.title.localeCompare(b.title, 'ru');
      else if (sortKey === 'views') r = (a.views ?? 0) - (b.views ?? 0);
      else if (sortKey === 'new') r = (a.publishedAt ? Date.parse(a.publishedAt) : 0) - (b.publishedAt ? Date.parse(b.publishedAt) : 0);
      else r = (a.levelMin ?? 999) - (b.levelMin ?? 999);
      return r * dir;
    });
  }, [guides, q, br, race, rep, sortKey, sortDir]);

  const arrow = (k: SortKey) => (sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : '');

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
        <select
          className={styles.sortSel}
          value={race}
          onChange={e => setRace(e.target.value)}
          aria-label="Раса"
        >
          <option value="">Все расы</option>
          {GUIDE_RACES.map(r => <option key={r.slug} value={r.slug}>{r.label}</option>)}
        </select>
        <div className={styles.levelChips}>
          <button type="button" className={`${styles.levelChip} ${rep === 'all' ? styles.levelChipActive : ''}`} onClick={() => setRep('all')}>Любой</button>
          <button type="button" className={`${styles.levelChip} ${rep === 'rep' ? styles.levelChipActive : ''}`} onClick={() => setRep('rep')} title="Повторяемые">∞</button>
          <button type="button" className={`${styles.levelChip} ${rep === 'once' ? styles.levelChipActive : ''}`} onClick={() => setRep('once')} title="Одноразовые">1×</button>
        </div>
        <select
          className={styles.sortSel}
          value={sortKey}
          onChange={e => toggleSort(e.target.value as SortKey)}
          aria-label="Сортировка"
        >
          <option value="level">По уровню</option>
          <option value="title">По названию</option>
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
                <th>
                  <button type="button" className={`${styles.sortTh} ${sortKey === 'title' ? styles.sortThActive : ''}`} onClick={() => toggleSort('title')}>
                    Квест <i>{arrow('title')}</i>
                  </button>
                </th>
                <th className={styles.colLevel}>
                  <button type="button" className={`${styles.sortTh} ${sortKey === 'level' ? styles.sortThActive : ''}`} onClick={() => toggleSort('level')}>
                    Уровень <i>{arrow('level')}</i>
                  </button>
                </th>
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
                        <strong>
                          {g.title}
                          {g.repeatable && <span className={styles.repBadge} title="Повторяемый квест">∞</span>}
                        </strong>
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
                  <td className={styles.colReward}><RewardCell reward={g.reward} /></td>
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
