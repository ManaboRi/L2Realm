'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Guide } from '@/lib/types';
import { GUIDE_CHRONICLES } from '../guides';
import { GUIDE_RACES } from '../races';
import styles from './page.module.css';

type SortKey = 'level' | 'title';

const BRACKETS = [
  { id: 'all', label: 'Любой уровень', min: -1, max: 999 },
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

function questCountText(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} квест`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} квеста`;
  return `${n} квестов`;
}

// Иконки наград вставляются в текст шорткодами :adena: :exp: :sp:
const REWARD_ICONS: Record<string, string> = {
  adena: '/images/icon-adena.webp',
  exp: '/images/icon-exp.webp',
  sp: '/images/icon-sp.webp',
};

function RewardCell({ reward }: { reward?: string | null }) {
  if (!reward) return <span className={styles.dash}>—</span>;
  const parts = reward.split(/(:(?:adena|exp|sp):)/gi);
  return (
    <span className={styles.rewardCell}>
      {parts.map((p, i) => {
        const m = /^:(adena|exp|sp):$/i.exec(p);
        if (m) {
          const key = m[1].toLowerCase();
          return <img key={i} className={styles.rewardIco} src={REWARD_ICONS[key]} alt={key} title={key.toUpperCase()} loading="lazy" />;
        }
        return p ? <span key={i} className={styles.rewardText}>{p}</span> : null;
      })}
    </span>
  );
}

export function QuestList({ guides, defaultChronicle, initialLevel = 'all' }: { guides: Guide[]; defaultChronicle: string; initialLevel?: string }) {
  const [q, setQ] = useState('');
  const [chr, setChr] = useState(defaultChronicle);
  const [br, setBr] = useState(initialLevel);
  const [race, setRace] = useState('');
  const [loc, setLoc] = useState('');
  const [type, setType] = useState<'all' | 'rep' | 'once'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('level');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const locations = useMemo(
    () => [...new Set(guides.map(g => g.location).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'ru')),
    [guides],
  );

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
  }

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    const bracket = BRACKETS.find(b => b.id === br) ?? BRACKETS[0];
    const arr = guides.filter(g => {
      if (chr && g.chronicle !== chr) return false;
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
      if (race && g.race && g.race !== race) return false;
      if (loc && g.location !== loc) return false;
      if (type === 'rep' && !g.repeatable) return false;
      if (type === 'once' && g.repeatable) return false;
      return true;
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...arr].sort((a, b) => {
      const r = sortKey === 'title'
        ? a.title.localeCompare(b.title, 'ru')
        : (a.levelMin ?? 999) - (b.levelMin ?? 999);
      return r * dir;
    });
  }, [guides, q, chr, br, race, loc, type, sortKey, sortDir]);

  const arrow = (k: SortKey) => (sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : '');

  return (
    <>
      <div className={styles.filterCard}>
        <div className={styles.filterTop}>
          <span>Навигация по квестам</span>
          <strong>{questCountText(list.length)}</strong>
        </div>
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
          <div className={styles.selRow}>
            <select className={styles.sel} value={chr} onChange={e => setChr(e.target.value)} aria-label="Хроника">
              <option value="">Все хроники</option>
              {GUIDE_CHRONICLES.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
            <select className={styles.sel} value={br} onChange={e => setBr(e.target.value)} aria-label="Уровень">
              {BRACKETS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
            <select className={styles.sel} value={race} onChange={e => setRace(e.target.value)} aria-label="Раса">
              <option value="">Все расы</option>
              {GUIDE_RACES.map(r => <option key={r.slug} value={r.slug}>{r.label}</option>)}
            </select>
            <select className={styles.sel} value={loc} onChange={e => setLoc(e.target.value)} aria-label="Локация">
              <option value="">Все локации</option>
              {locations.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select className={styles.sel} value={type} onChange={e => setType(e.target.value as 'all' | 'rep' | 'once')} aria-label="Тип квеста">
              <option value="all">Любой тип</option>
              <option value="rep">Повторяемые ∞</option>
              <option value="once">Одноразовые</option>
            </select>
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <div className={styles.empty}>
          <p>Ничего не нашлось — измени фильтры или запрос.</p>
        </div>
      ) : (
        <div className={styles.questList}>
          <div className={styles.questListHead}>
            <button type="button" className={`${styles.sortTh} ${sortKey === 'title' ? styles.sortThActive : ''}`} onClick={() => toggleSort('title')}>
              Квест <i>{arrow('title')}</i>
            </button>
            <button type="button" className={`${styles.sortTh} ${sortKey === 'level' ? styles.sortThActive : ''}`} onClick={() => toggleSort('level')}>
              Уровень <i>{arrow('level')}</i>
            </button>
            <span>NPC / локация</span>
            <span>Награда</span>
            <span></span>
          </div>
          <div className={styles.questRows}>
            {list.map(g => {
              const href = `/guides/${g.category}/${g.slug}`;
              return (
                <article key={g.id} className={styles.questRow}>
                  <Link href={href} className={styles.questMain}>
                    <span className={styles.questThumb}>
                      {g.image ? <img src={g.image} alt="" loading="lazy" decoding="async" /> : <span>{g.title.slice(0, 1)}</span>}
                    </span>
                    <span className={styles.questTitleBlock}>
                      <strong>
                        {g.title}
                        {g.repeatable && <span className={styles.repBadge} title="Повторяемый квест">∞</span>}
                      </strong>
                      {g.description && <em>{g.description}</em>}
                    </span>
                  </Link>
                  <div className={styles.questMetric}>
                    <small>Уровень</small>
                    <span className={styles.lvl}>{levelText(g)}</span>
                  </div>
                  <div className={styles.questMetric}>
                    <small>NPC / локация</small>
                    {g.npc && <span className={styles.npc}>{g.npc}</span>}
                    {g.location && <span className={styles.loc}>{g.location}</span>}
                    {!g.npc && !g.location && <span className={styles.dash}>—</span>}
                  </div>
                  <div className={styles.questMetric}>
                    <small>Награда</small>
                    <RewardCell reward={g.reward} />
                  </div>
                  <Link href={href} className={styles.openBtn}>Открыть</Link>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
