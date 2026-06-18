'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Guide } from '@/lib/types';
import { formatGuideChronicle, guideChronicleMatches, GUIDE_CHRONICLES, splitGuideChronicles } from '../guides';
import { GUIDE_RACES } from '../races';
import { GUIDE_TYPE_COLOR, GUIDE_TYPES_BY_CATEGORY, gradeColor } from '../questTypes';
import { RewardIconRow } from '../reward';
import styles from './page.module.css';

type SortKey = 'level' | 'title';
type GuideCategorySlug = 'quests' | 'items' | 'npc' | 'locations' | 'classes' | 'skills' | 'raid-bosses' | string;

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

function countText(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ${forms[0]}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} ${forms[1]}`;
  return `${n} ${forms[2]}`;
}

const MAIN_LOCATION_ALIASES: Array<[RegExp, string]> = [
  [/глудио|gludio/i, 'Глудио'],
  [/глудин|gludin/i, 'Глудин'],
  [/дион|dion/i, 'Дион'],
  [/гиран|giran/i, 'Гиран'],
  [/орен|oren/i, 'Орен'],
  [/аден|aden/i, 'Аден'],
  [/хейн|heine/i, 'Хейн'],
  [/годдард|goddard/i, 'Годдард'],
  [/руна|rune/i, 'Руна'],
  [/шутгарт|schuttgart/i, 'Шутгарт'],
];

function mainLocation(value?: string | null): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const normalized = raw.toLowerCase();
  for (const [re, label] of MAIN_LOCATION_ALIASES) {
    if (re.test(normalized)) return label;
  }
  return raw
    .replace(/\b(?:замок|земли|территория|город|town|castle|territory)\b/gi, '')
    .replace(/\s*[/,].*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function categoryConfig(category: GuideCategorySlug) {
  if (category === 'items') {
    return {
      nav: 'Фильтры предметов',
      count: ['предмет', 'предмета', 'предметов'] as [string, string, string],
      search: 'Поиск предмета, типа, грейда…',
      titleCol: 'Предмет',
      levelCol: 'Ур.',
      typeCol: 'Тип',
      placeCol: 'Источник',
      rewardCol: 'Кратко',
      noResults: 'Предметы не нашлись — измени фильтры или запрос.',
      showRace: false,
      showRepeatable: false,
      showChronicle: false,
      showLevel: false,
      showReward: false,
      showThumb: true,
      pageSize: 40,
    };
  }
  if (category === 'npc') {
    return {
      nav: 'Фильтры NPC',
      count: ['NPC', 'NPC', 'NPC'] as [string, string, string],
      search: 'Поиск NPC, локации, роли…',
      titleCol: 'NPC',
      levelCol: 'Ур.',
      typeCol: 'Тип NPC',
      placeCol: 'Локация',
      rewardCol: 'Квесты / роль',
      noResults: 'NPC не нашлись — измени фильтры или запрос.',
      showRace: false,
      showRepeatable: false,
      showChronicle: false,
      showLevel: false,
      showReward: false,
      showThumb: true,
      pageSize: 40,
    };
  }
  if (category === 'monsters') {
    return {
      nav: 'Фильтры монстров',
      count: ['монстр', 'монстра', 'монстров'] as [string, string, string],
      search: 'Поиск монстра, локации, дропа…',
      titleCol: 'Монстр',
      levelCol: 'Ур.',
      typeCol: 'Тип',
      placeCol: 'Локация',
      rewardCol: 'Дроп / спойл',
      noResults: 'Монстры не нашлись — измени фильтры или запрос.',
      showRace: false,
      showRepeatable: false,
      showChronicle: true,
      showLevel: true,
      showReward: true,
      showThumb: true,
      pageSize: 40,
    };
  }
  if (category === 'raid-bosses') {
    return {
      nav: 'Фильтры рейд-боссов',
      count: ['рейд-босс', 'рейд-босса', 'рейд-боссов'] as [string, string, string],
      search: 'Поиск босса, уровня, локации, дропа…',
      titleCol: 'Рейд-босс',
      levelCol: 'Ур.',
      typeCol: 'Тип',
      placeCol: 'Локация',
      rewardCol: 'Дроп',
      noResults: 'Рейд-боссы не нашлись — измени фильтры или запрос.',
      showRace: false,
      showRepeatable: false,
      showChronicle: true,
      showLevel: true,
      showReward: true,
      showThumb: true,
      pageSize: 30,
    };
  }
  if (category === 'locations') {
    return {
      nav: 'Фильтры локаций',
      count: ['локация', 'локации', 'локаций'] as [string, string, string],
      search: 'Поиск локации, NPC, награды…',
      titleCol: 'Локация',
      levelCol: 'Ур.',
      typeCol: 'Тип',
      placeCol: 'Регион',
      rewardCol: 'Кратко',
      noResults: 'Локации не нашлись — измени фильтры или запрос.',
      showRace: false,
      showRepeatable: false,
      showChronicle: true,
      showLevel: true,
      showReward: true,
      showThumb: true,
      pageSize: 40,
    };
  }
  return {
    nav: 'Навигация по квестам',
    count: ['квест', 'квеста', 'квестов'] as [string, string, string],
    search: 'Поиск квеста, NPC, награды…',
    titleCol: 'Квест',
    levelCol: 'Ур.',
    typeCol: 'Тип',
    placeCol: 'Локация',
    rewardCol: 'Награда',
    noResults: 'Ничего не нашлось — измени фильтры или запрос.',
    showRace: true,
    showRepeatable: true,
    showChronicle: false,
    showLevel: true,
    showReward: true,
    showThumb: false,
    pageSize: 30,
  };
}

function RewardCell({ reward }: { reward?: string | null }) {
  if (!reward) return <span className={styles.dash}>—</span>;
  const row = <RewardIconRow reward={reward} imgClass={styles.rewardIco} fallbackClass={styles.rewardFallback} />;
  return <span className={styles.rewardCell}>{row ?? <span className={styles.dash}>—</span>}</span>;
}

function TypeCell({ types }: { types?: string[] }) {
  const list = (types ?? []).filter(Boolean);
  if (list.length === 0) return <span className={styles.dash}>—</span>;
  return (
    <span className={styles.typeTags}>
      {list.map(t => (
        <span
          key={t}
          className={styles.typeTag}
          style={{ '--tc': GUIDE_TYPE_COLOR[t] ?? '#7e96a0' } as React.CSSProperties}
        >
          {t}
        </span>
      ))}
    </span>
  );
}

export function QuestList({
  guides,
  category,
  defaultChronicle,
  initialLevel = 'all',
  initialType = '',
}: {
  guides: Guide[];
  category: GuideCategorySlug;
  defaultChronicle: string;
  initialLevel?: string;
  initialType?: string;
}) {
  const [q, setQ] = useState('');
  const [chr, setChr] = useState(defaultChronicle);
  const [br, setBr] = useState(initialLevel);
  const [race, setRace] = useState('');
  const [loc, setLoc] = useState('');
  const [typeTag, setTypeTag] = useState(initialType);
  const [sortKey, setSortKey] = useState<SortKey>('level');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const cfg = categoryConfig(category);

  const locations = useMemo(
    () => [...new Set(guides.map(g => mainLocation(g.location)).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'ru')),
    [guides],
  );

  const hasAllChronicle = useMemo(() => guides.some(g => splitGuideChronicles(g.chronicle).includes('all')), [guides]);

  // показываем в фильтре только реально встречающиеся типы, но сохраняем кастомные теги
  const usedTypes = useMemo(() => {
    const set = new Set<string>();
    guides.forEach(g => (g.types ?? []).forEach(t => set.add(t)));
    const base = GUIDE_TYPES_BY_CATEGORY[category] ?? [];
    const known = base.filter(t => set.has(t.label));
    const custom = [...set]
      .filter(label => !known.some(t => t.label === label))
      .map(label => ({ label, color: GUIDE_TYPE_COLOR[label] ?? '#7e96a0' }));
    return [...known, ...custom];
  }, [category, guides]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
  }

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    const bracket = BRACKETS.find(b => b.id === br) ?? BRACKETS[0];
    const arr = guides.filter(g => {
      if (!guideChronicleMatches(g.chronicle, chr)) return false;
      const okQ = !query
        || g.title.toLowerCase().includes(query)
        || (g.titleEn ?? '').toLowerCase().includes(query)
        || (g.npc ?? '').toLowerCase().includes(query)
        || (g.location ?? '').toLowerCase().includes(query)
        || mainLocation(g.location).toLowerCase().includes(query)
        || (g.reward ?? '').toLowerCase().includes(query)
        || (g.types ?? []).some(t => t.toLowerCase().includes(query));
      if (!okQ) return false;
      if (br !== 'all') {
        const lvl = g.levelMin ?? g.levelMax ?? -1;
        if (!(lvl >= bracket.min && lvl <= bracket.max)) return false;
      }
      if (cfg.showRace && race && g.race && g.race !== race) return false;
      if (loc && mainLocation(g.location) !== loc) return false;
      if (typeTag && !(g.types ?? []).includes(typeTag)) return false;
      return true;
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...arr].sort((a, b) => {
      const r = sortKey === 'title'
        ? a.title.localeCompare(b.title, 'ru')
        : (a.levelMin ?? 999) - (b.levelMin ?? 999);
      return r * dir;
    });
  }, [guides, q, chr, br, race, loc, typeTag, sortKey, sortDir, cfg.showRace]);

  useEffect(() => {
    setPage(1);
  }, [q, chr, br, race, loc, typeTag, sortKey, sortDir]);

  const pageSize = cfg.pageSize;
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedList = useMemo(
    () => list.slice((safePage - 1) * pageSize, safePage * pageSize),
    [list, pageSize, safePage],
  );

  const arrow = (k: SortKey) => (sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : '');

  return (
    <>
      <div className={styles.filterCard}>
        <div className={styles.filterTop}>
          <span>{cfg.nav}</span>
          <strong>{countText(list.length, cfg.count)}</strong>
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
              placeholder={cfg.search}
              aria-label={cfg.nav}
            />
          </div>
          <div className={styles.selRow}>
            <select className={styles.sel} value={chr} onChange={e => setChr(e.target.value)} aria-label="Хроника">
              <option value="">Все хроники</option>
              {hasAllChronicle && <option value="all">Общие для всех</option>}
              {GUIDE_CHRONICLES.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
            <select className={styles.sel} value={br} onChange={e => setBr(e.target.value)} aria-label="Уровень">
              {BRACKETS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
            <select className={styles.sel} value={typeTag} onChange={e => setTypeTag(e.target.value)} aria-label={cfg.typeCol}>
              <option value="">Все типы</option>
              {usedTypes.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
            </select>
            {cfg.showRace && (
              <select className={styles.sel} value={race} onChange={e => setRace(e.target.value)} aria-label="Раса">
                <option value="">Все расы</option>
                {GUIDE_RACES.map(r => <option key={r.slug} value={r.slug}>{r.label}</option>)}
              </select>
            )}
            <select className={styles.sel} value={loc} onChange={e => setLoc(e.target.value)} aria-label="Локация">
              <option value="">Все локации</option>
              {locations.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <div className={styles.empty}>
          <p>{cfg.noResults}</p>
        </div>
      ) : (
        <div className={styles.questList}>
          <div className={`${styles.questListHead} ${category === 'npc' ? styles.npcListHead : ''} ${category === 'items' ? styles.itemListHead : ''}`}>
            <button type="button" className={`${styles.sortTh} ${sortKey === 'title' ? styles.sortThActive : ''}`} onClick={() => toggleSort('title')}>
              {cfg.titleCol} <i>{arrow('title')}</i>
            </button>
            {cfg.showLevel && (
              <button type="button" className={`${styles.sortTh} ${sortKey === 'level' ? styles.sortThActive : ''}`} onClick={() => toggleSort('level')}>
                {cfg.levelCol} <i>{arrow('level')}</i>
              </button>
            )}
            {category === 'items' && <span>Грейд</span>}
            <span>{cfg.typeCol}</span>
            <span>{cfg.placeCol}</span>
            {cfg.showReward && <span>{cfg.rewardCol}</span>}
          </div>
          <div className={styles.questRows}>
            {pagedList.map(g => {
              const href = `/guides/${g.category}/${g.slug}`;
              const subtitle = category === 'quests'
                ? g.titleEn
                : (category === 'npc' ? g.titleEn : (g.titleEn || g.description));
              const displayLocation = mainLocation(g.location);
              return (
                <article
                  key={g.id}
                  className={`${styles.questRow} ${category === 'npc' ? styles.npcRow : ''} ${category === 'items' ? styles.itemRow : ''}`}
                >
                  <Link href={href} className={`${styles.questMain} ${cfg.showThumb ? '' : styles.questMainNoThumb}`}>
                    {cfg.showThumb && (
                      <span className={styles.questThumb}>
                        {g.image ? <img src={g.image} alt="" loading="lazy" decoding="async" /> : <span>{g.title.slice(0, 1)}</span>}
                      </span>
                    )}
                    <span className={styles.questTitleBlock}>
                      <strong>
                        {g.title}
                        {cfg.showRepeatable && g.repeatable && <span className={styles.repBadge} title="Повторяемый квест">∞</span>}
                      </strong>
                      {subtitle && <em>{subtitle}</em>}
                      {cfg.showChronicle && <span className={styles.chronicleMini}>{formatGuideChronicle(g.chronicle)}</span>}
                    </span>
                  </Link>
                  {cfg.showLevel && (
                    <div className={styles.questMetric}>
                      <small>{cfg.levelCol}</small>
                      <span className={styles.lvl}>{levelText(g)}</span>
                    </div>
                  )}
                  {category === 'items' && (
                    <div className={styles.questMetric}>
                      <small>Грейд</small>
                      {g.grade
                        ? <span className={styles.gradeBadge} style={{ ['--gc' as string]: gradeColor(g.grade) }}>{g.grade}</span>
                        : <span className={styles.dash}>—</span>}
                    </div>
                  )}
                  <div className={styles.questMetric}>
                    <small>{cfg.typeCol}</small>
                    <TypeCell types={g.types} />
                  </div>
                  <div className={styles.questMetric}>
                    <small>{cfg.placeCol}</small>
                    {displayLocation ? <span className={styles.loc}>{displayLocation}</span> : <span className={styles.dash}>—</span>}
                    {g.npc && <span className={styles.npc}>{g.npc}</span>}
                  </div>
                  {cfg.showReward && (
                    <div className={styles.questMetric}>
                      <small>{cfg.rewardCol}</small>
                      <RewardCell reward={g.reward} />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          {totalPages > 1 && (
            <nav className={styles.pager} aria-label="Страницы раздела">
              <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>←</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
                .map((n, i, arr) => (
                  <span key={n} className={styles.pageSlot}>
                    {i > 0 && n - arr[i - 1] > 1 && <i aria-hidden="true">…</i>}
                    <button
                      type="button"
                      className={n === safePage ? styles.pageActive : ''}
                      onClick={() => setPage(n)}
                      aria-current={n === safePage ? 'page' : undefined}
                    >
                      {n}
                    </button>
                  </span>
                ))}
              <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>→</button>
            </nav>
          )}
        </div>
      )}
    </>
  );
}
