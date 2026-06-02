'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Article, Server } from '@/lib/types';
import { CHRONICLES, RATES, SERVER_TYPES } from '@/lib/types';
import { activityMeta, currentProjectWorlds, formatTraffic, latestProjectOpening, nextProjectOpening, projectTrafficTrend, projectWorldCount, trustMeta } from '@/lib/project-metrics';
import styles from './page.module.css';

export type FilterCounts = {
  chronicles: Record<string, number>;
  rates: Record<string, number>;
  donates: Record<string, number>;
  types: Record<string, number>;
  activities: Record<string, number>;
  trusts: Record<string, number>;
};

// Уровни активности и доверия для фильтров (значение → подпись), в порядке убывания.
const ACTIVITY_FILTERS: Array<{ v: string; l: string }> = [
  { v: 'high', l: 'Высокая' },
  { v: 'medium', l: 'Средняя' },
  { v: 'low', l: 'Низкая' },
  { v: 'very_low', l: 'Очень низкая' },
];
const TRUST_FILTERS: Array<{ v: string; l: string }> = [
  { v: 'A', l: 'A — высокое' },
  { v: 'B', l: 'B — среднее' },
  { v: 'C', l: 'C — низкое' },
];

type HomeClientProps = {
  initialServers: Server[];
  initialCounts: FilterCounts | null;
  initialPages: number;
  initialOk: boolean;
  initialComingSoon?: Server[];
  initialTopVotes?: Server[];
  initialArticles?: Article[];
  initialRailOk?: boolean;
};

const PUBLIC_SITE = 'https://l2realm.ru';
type ViewMode = 'cards' | 'list';
type SortDirection = 'asc' | 'desc';
type ListSortKey = 'trust' | 'worlds' | 'activity' | 'traffic' | 'start' | 'votes' | 'name';
type ListSortState = { key: ListSortKey; dir: SortDirection } | null;

const LIST_SORT_OPTIONS: Array<{ key: ListSortKey; label: string; defaultDir: SortDirection }> = [
  { key: 'trust', label: 'Доверие', defaultDir: 'desc' },
  { key: 'worlds', label: 'Миры', defaultDir: 'desc' },
  { key: 'activity', label: 'Активность', defaultDir: 'desc' },
  { key: 'traffic', label: 'Трафик', defaultDir: 'desc' },
  { key: 'start', label: 'Старт', defaultDir: 'desc' },
  { key: 'votes', label: 'Голоса', defaultDir: 'desc' },
  { key: 'name', label: 'Название', defaultDir: 'asc' },
];

const LIST_SORT_KEYS = new Set<ListSortKey>(LIST_SORT_OPTIONS.map(option => option.key));

type SearchParamReader = { get: (name: string) => string | null };

function readListSortFromParams(params: SearchParamReader): ListSortState {
  const key = parseListSortKey(params.get('lsort'));
  if (!key) return null;
  return { key, dir: parseSortDirection(params.get('ldir')) };
}

function readListSortFromStorage(): ListSortState {
  const saved = localStorage.getItem('l2r_catalog_list_sort');
  if (!saved) return null;
  const [rawKey, rawDir] = saved.split(':');
  const key = parseListSortKey(rawKey);
  if (!key) return null;
  return { key, dir: parseSortDirection(rawDir) };
}

function parseListSortKey(value?: string | null): ListSortKey | null {
  if (!value) return null;
  return LIST_SORT_KEYS.has(value as ListSortKey) ? value as ListSortKey : null;
}

function parseSortDirection(value?: string | null): SortDirection {
  return value === 'asc' ? 'asc' : 'desc';
}

export function HomeClient(props: HomeClientProps) {
  return (
    <Suspense>
      <HomeContent {...props} />
    </Suspense>
  );
}

function HomeContent({ initialServers, initialCounts, initialPages, initialOk, initialComingSoon = [], initialTopVotes = [], initialArticles = [], initialRailOk = false }: HomeClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [servers, setServers] = useState<Server[]>(initialServers);
  const [counts, setCounts] = useState<FilterCounts | null>(initialCounts);
  const [loading, setLoading] = useState(!initialOk);
  const [pages, setPages] = useState(initialPages);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [comingSoon, setComingSoon] = useState<Server[]>(initialComingSoon);
  const [topVotes, setTopVotes] = useState<Server[]>(initialTopVotes);
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const firstListEffect = useRef(true);
  const firstCountsEffect = useRef(true);

  const [search, setSearch] = useState(() => sp.get('q') ?? '');
  const [sort, setSort] = useState(() => sp.get('sort') ?? '');
  const [viewMode, setViewMode] = useState<ViewMode>(() => sp.get('view') === 'list' ? 'list' : 'cards');
  const [listSort, setListSort] = useState<ListSortState>(() => readListSortFromParams(sp));
  const [page, setPage] = useState(() => Number(sp.get('page') ?? 1));
  const [filters, setFilters] = useState<Record<string, string>>(() => ({
    chr: sp.get('chr') ?? '',
    rate: sp.get('rate') ?? '',
    type: sp.get('type') ?? '',
    activity: sp.get('activity') ?? '',
    trust: sp.get('trust') ?? '',
  }));

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  useEffect(() => {
    if (initialRailOk) return;
    let cancelled = false;

    api.servers.comingSoon()
      .then(data => {
        if (!cancelled) setComingSoon(data.slice(0, 5));
      })
      .catch(() => {});

    api.servers.list({ page: '1', limit: '100', compact: 'true' })
      .then(res => {
        if (cancelled) return;
        setTopVotes(selectWeeklyRailServers(res.data));
      })
      .catch(() => {});

    api.articles.list()
      .then(data => {
        if (!cancelled) setArticles(data.filter(article => article.publishedAt).slice(0, 4));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [initialRailOk]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (sort) params.set('sort', sort);
    if (filters.chr) params.set('chr', filters.chr);
    if (filters.rate) params.set('rate', filters.rate);
    if (filters.type) params.set('type', filters.type);
    if (filters.activity) params.set('activity', filters.activity);
    if (filters.trust) params.set('trust', filters.trust);
    if (viewMode === 'list') {
      params.set('view', 'list');
      if (listSort) {
        params.set('lsort', listSort.key);
        params.set('ldir', listSort.dir);
      }
    }
    if (page > 1) params.set('page', String(page));
    const query = params.toString();
    router.replace(`${pathname}${query ? '?' + query : ''}`, { scroll: false } as any);
  }, [search, sort, filters, viewMode, listSort, page, pathname, router]);

  useEffect(() => {
    if (sp.get('view')) return;
    try {
      const saved = localStorage.getItem('l2r_catalog_view');
      if (saved === 'list' || saved === 'cards') setViewMode(saved);
    } catch {}
    // Читаем сохранённый вид только на первом клиентском проходе.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('l2r_catalog_view', viewMode);
    } catch {}
  }, [viewMode]);

  useEffect(() => {
    if (sp.get('lsort')) return;
    try {
      const saved = readListSortFromStorage();
      if (saved) setListSort(saved);
    } catch {}
    // Читаем сохранённую сортировку только на первом клиентском проходе.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      if (listSort) localStorage.setItem('l2r_catalog_list_sort', `${listSort.key}:${listSort.dir}`);
      else localStorage.removeItem('l2r_catalog_list_sort');
    } catch {}
  }, [listSort]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: '30',
        compact: 'true',
      };
      if (sort) params.sort = sort;
      if (search) params.search = search;
      if (filters.chr) params.chronicle = filters.chr;
      if (filters.rate) params.rate = filters.rate;
      if (filters.type) params.type = filters.type;
      if (filters.activity) params.activity = filters.activity;
      if (filters.trust) params.trust = filters.trust;
      if (viewMode === 'list' && listSort) {
        params.lsort = listSort.key;
        params.ldir = listSort.dir;
      }

      const res = await api.servers.list(params);
      setServers(res.data);
      setPages(res.pages);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [search, sort, filters, page, viewMode, listSort]);

  useEffect(() => {
    if (firstListEffect.current) {
      firstListEffect.current = false;
      if (initialOk) return;
    }
    load();
  }, [load, initialOk]);

  useEffect(() => {
    if (!initialCounts) api.servers.counts().then(setCounts).catch(() => {});
  }, [initialCounts]);

  useEffect(() => {
    if (firstCountsEffect.current) {
      firstCountsEffect.current = false;
      if (initialCounts) return;
    }
    const params: Record<string, string> = {};
    if (filters.chr) params.chronicle = filters.chr;
    if (filters.rate) params.rate = filters.rate;
    if (filters.type) params.type = filters.type;
    if (filters.activity) params.activity = filters.activity;
    if (filters.trust) params.trust = filters.trust;
    api.servers.counts(params).then(setCounts).catch(() => {});
  }, [filters, initialCounts]);

  function toggleFilter(group: string, value: string) {
    setFilters(prev => ({ ...prev, [group]: prev[group] === value ? '' : value }));
    setPage(1);
  }

  function resetFilters() {
    setFilters({ chr: '', rate: '', type: '', activity: '', trust: '' });
    setSearch('');
    setSort('');
    setPage(1);
  }

  function changeViewMode(next: ViewMode) {
    setViewMode(next);
    setPage(1);
  }

  function toggleListSort(key: ListSortKey) {
    setListSort(prev => {
      const option = LIST_SORT_OPTIONS.find(item => item.key === key);
      const defaultDir = option?.defaultDir ?? 'desc';
      if (!prev || prev.key !== key) return { key, dir: defaultDir };
      return { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' };
    });
    setPage(1);
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <button
          type="button"
          className={`${styles.filtersToggle} ${mobileFiltersOpen ? styles.filtersToggleOpen : ''}`}
          onClick={() => setMobileFiltersOpen(v => !v)}
          aria-expanded={mobileFiltersOpen}
        >
          <span>Фильтры</span>
          {activeFiltersCount > 0 && <span className={styles.filtersCount}>{activeFiltersCount}</span>}
          <span className={styles.filtersToggleIcon}>▾</span>
        </button>

        <div className={styles.layout}>
          <aside className={`${styles.sidebar} ${mobileFiltersOpen ? styles.sidebarOpen : ''}`}>
            <div className={styles.sidebarHead}>
              {(activeFiltersCount > 0 || search || sort) && (
                <button type="button" onClick={resetFilters}>Сбросить</button>
              )}
            </div>

            <FilterGroup label="Хроники">
              {CHRONICLES
                .filter(v => (counts?.chronicles[v] ?? 0) > 0 || filters.chr === v)
                .slice(0, 8)
                .map(v => (
                  <FilterItem key={v} label={v} active={filters.chr === v} count={counts?.chronicles[v]} onClick={() => toggleFilter('chr', v)} />
                ))}
            </FilterGroup>

            <FilterGroup label="Рейты">
              {RATES
                .filter(({ v }) => (counts?.rates[v] ?? 0) > 0 || filters.rate === v)
                .map(({ v, l }) => (
                  <FilterItem key={v} label={l} active={filters.rate === v} count={counts?.rates[v]} onClick={() => toggleFilter('rate', v)} />
                ))}
            </FilterGroup>

            <FilterGroup label="Тип сервера">
              {SERVER_TYPES
                .filter(({ v }) => v !== 'pvp-pve' && ((counts?.types[v] ?? 0) > 0 || filters.type === v))
                .map(({ v, l }) => (
                  <FilterItem key={v} label={l} active={filters.type === v} count={counts?.types[v]} onClick={() => toggleFilter('type', v)} />
                ))}
            </FilterGroup>

            <CollapsibleFilterGroup label="Активность" activeHint={ACTIVITY_FILTERS.find(f => f.v === filters.activity)?.l}>
              {ACTIVITY_FILTERS
                .filter(({ v }) => (counts?.activities[v] ?? 0) > 0 || filters.activity === v)
                .map(({ v, l }) => (
                  <FilterItem key={v} label={l} active={filters.activity === v} count={counts?.activities[v]} dotColor={activityMeta(v).color} onClick={() => toggleFilter('activity', v)} />
                ))}
            </CollapsibleFilterGroup>

            <CollapsibleFilterGroup label="Доверие" activeHint={TRUST_FILTERS.find(f => f.v === filters.trust)?.l}>
              {TRUST_FILTERS
                .filter(({ v }) => (counts?.trusts[v] ?? 0) > 0 || filters.trust === v)
                .map(({ v, l }) => (
                  <FilterItem key={v} label={l} active={filters.trust === v} count={counts?.trusts[v]} dotColor={trustMeta(v).color} onClick={() => toggleFilter('trust', v)} />
                ))}
            </CollapsibleFilterGroup>
          </aside>

          <section className={styles.content}>
            <section className={styles.hero}>
              <div className={styles.heroCopy}>
                <h1>Каталог серверов <span>Lineage 2</span></h1>
                <p>Открытия, голоса, проверка проектов и свежие новости в одном месте.</p>

                <div className={styles.searchControls}>
                  <div className={styles.searchWrap}>
                    <span className={styles.searchIcon}>⌕</span>
                    <input
                      className={styles.searchInput}
                      placeholder="Поиск серверов, хроник, рейтов..."
                      value={search}
                      onChange={e => { setSearch(e.target.value); setPage(1); }}
                    />
                    {search && <button type="button" className={styles.searchClear} onClick={() => setSearch('')}>×</button>}
                  </div>

                  <div className={styles.viewSwitch} aria-label="Вид каталога">
                    <button
                      type="button"
                      className={`${styles.viewButton} ${viewMode === 'cards' ? styles.viewButtonActive : ''}`}
                      title="Карточки"
                      aria-label="Показать карточками"
                      aria-pressed={viewMode === 'cards'}
                      onClick={() => changeViewMode('cards')}
                    >
                      <span className={styles.viewButtonIcon} aria-hidden="true">▦</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.viewButton} ${viewMode === 'list' ? styles.viewButtonActive : ''}`}
                      title="Список"
                      aria-label="Показать списком"
                      aria-pressed={viewMode === 'list'}
                      onClick={() => changeViewMode('list')}
                    >
                      <span className={styles.viewButtonIcon} aria-hidden="true">☰</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {viewMode === 'list' && (loading || servers.length > 0) && (
              <div className={styles.listSortHeader} aria-label="Сортировка списка серверов">
                <ListSortButton sortKey="name" label="Сервер" activeSort={listSort} onClick={toggleListSort} />
                <ListSortButton sortKey="trust" label="Доверие" activeSort={listSort} onClick={toggleListSort} />
                <ListSortButton sortKey="worlds" label="Миры" activeSort={listSort} onClick={toggleListSort} />
                <ListSortButton sortKey="activity" label="Активность" activeSort={listSort} onClick={toggleListSort} />
                <ListSortButton sortKey="traffic" label="Трафик" activeSort={listSort} onClick={toggleListSort} className={styles.listSortHeaderTraffic} />
                <ListSortButton sortKey="start" label="Старт" activeSort={listSort} onClick={toggleListSort} />
                <ListSortButton sortKey="votes" label="Голоса" activeSort={listSort} onClick={toggleListSort} className={styles.listSortHeaderVotes} />
                <span className={styles.listSortHeaderSpacer} aria-hidden="true" />
              </div>
            )}

            {loading ? (
              <div className={viewMode === 'list' ? styles.serverList : styles.grid}>
                {Array.from({ length: viewMode === 'list' ? 8 : 6 }).map((_, i) => (
                  <div className={viewMode === 'list' ? styles.listSkeleton : styles.cardSkeleton} key={i} />
                ))}
              </div>
            ) : servers.length === 0 ? (
              <div className={styles.empty}>По выбранным фильтрам серверов не найдено</div>
            ) : viewMode === 'list' ? (
              <div className={styles.serverList}>
                {servers.map((s, index) => (
                  <HomeServerRow
                    key={s.id}
                    server={s}
                    eagerImage={index < 8}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.grid}>
                {servers.map((s, index) => (
                  <HomeServerCard
                    key={s.id}
                    server={s}
                    eagerImage={index < 5}
                  />
                ))}
              </div>
            )}

            {pages > 1 && (
              <div className={styles.pagination}>
                {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                  <button key={p} className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`} onClick={() => setPage(p)}>{p}</button>
                ))}
              </div>
            )}
          </section>

          <HomeRightRail comingSoon={comingSoon} topVotes={topVotes} articles={articles} />
        </div>
      </div>
    </main>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.filterGroup}>
      <span className={styles.filterLabel}>{label}</span>
      <div className={styles.filterList}>{children}</div>
    </div>
  );
}

// Сворачиваемая группа: по умолчанию скрыта, клик по заголовку раскрывает список.
// Используется для Активности и Доверия, чтобы сайдбар оставался компактным.
function CollapsibleFilterGroup({ label, activeHint, children }: { label: string; activeHint?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.filterGroup}>
      <button type="button" className={styles.filterGroupToggle} onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className={styles.filterLabel}>{label}</span>
        {!open && activeHint && <span className={styles.filterActiveHint}>{activeHint}</span>}
        <span className={styles.filterChevron}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className={styles.filterList}>{children}</div>}
    </div>
  );
}

function FilterItem({ label, active, count, dotColor, onClick }: { label: string; active: boolean; count?: number; dotColor?: string; onClick: () => void }) {
  return (
    <button type="button" className={`${styles.filterItem} ${active ? styles.filterItemActive : ''}`} onClick={onClick}>
      <span className={styles.filterDot} style={dotColor ? { background: dotColor, boxShadow: `0 0 6px ${dotColor}` } : undefined} />
      <span>{label}</span>
      {typeof count === 'number' && <em>{count}</em>}
    </button>
  );
}

function HomeRightRail({ comingSoon, topVotes, articles }: { comingSoon: Server[]; topVotes: Server[]; articles: Article[] }) {
  const hasWeeklyVotes = topVotes.some(server => weeklyVoteCount(server) > 0);
  return (
    <aside className={styles.rightRail} aria-label="Сводка каталога">
      <section className={styles.railSection}>
        <div className={styles.railHead}>
          <h2>Скоро открытие</h2>
          <Link href="/coming-soon">Все</Link>
        </div>
        <div className={styles.railList}>
          {comingSoon.length > 0 ? comingSoon.map(server => {
            const opening = nextProjectOpening(server) || server.openedDate;
            const meta = collectCardMeta(server);
            return (
              <Link key={server.id} href={`/servers/${server.id}`} className={styles.railServerItem}>
                <span className={styles.railLogo}><ServerIcon server={server} small /></span>
                <span className={styles.railText}>
                  <strong>{server.name}</strong>
                  <em>{meta.chronicles} · {meta.rates}</em>
                </span>
                <span className={styles.railDate}>{opening ? formatShortDate(opening) : 'скоро'}</span>
              </Link>
            );
          }) : (
            <span className={styles.railEmpty}>Открытия появятся после обновления каталога</span>
          )}
        </div>
      </section>

      <section className={styles.railSection}>
        <div className={styles.railHead}>
          <h2>Топ голосов за неделю</h2>
        </div>
        <div className={styles.railList}>
          {topVotes.length > 0 ? topVotes.map((server, index) => (
            <Link key={server.id} href={`/servers/${server.id}`} className={styles.railVoteItem}>
              <span className={styles.railRank}>{index + 1}</span>
              <span className={styles.railLogo}><ServerIcon server={server} small /></span>
              <span className={styles.railText}>
                <strong>{server.name}</strong>
                <em>{collectCardMeta(server).chronicles}</em>
              </span>
              <span className={styles.railVotes}>{hasWeeklyVotes ? `+ ${weeklyVoteCount(server).toLocaleString('ru-RU')}` : '→'}</span>
            </Link>
          )) : (
            <span className={styles.railEmpty}>Голоса появятся после первых голосований на этой неделе</span>
          )}
        </div>
      </section>

      <section className={styles.railSection}>
        <div className={styles.railHead}>
          <h2>Статьи</h2>
          <Link href="/blog">Все статьи</Link>
        </div>
        <div className={styles.railList}>
          {articles.length > 0 ? articles.map(article => (
            <Link key={article.id} href={`/blog/${article.slug}`} className={styles.railArticleItem}>
              <span className={styles.railArticleThumb}>
                {article.image && <img src={catalogAssetSrc(article.image)} alt="" loading="lazy" decoding="async" onError={e => handleCatalogImageError(e.currentTarget as HTMLImageElement)} />}
              </span>
              <span className={styles.railText}>
                <strong>{article.title}</strong>
                <em>{formatShortDate(article.publishedAt || article.createdAt)}</em>
              </span>
            </Link>
          )) : (
            <span className={styles.railEmpty}>Свежие статьи скоро появятся здесь</span>
          )}
        </div>
      </section>
    </aside>
  );
}

function ListSortButton({
  sortKey,
  label,
  activeSort,
  className,
  onClick,
}: {
  sortKey: ListSortKey;
  label: string;
  activeSort: ListSortState;
  className?: string;
  onClick: (key: ListSortKey) => void;
}) {
  const active = activeSort?.key === sortKey;
  return (
    <button
      type="button"
      className={[styles.listSortHeaderButton, active ? styles.listSortHeaderButtonActive : '', className ?? ''].filter(Boolean).join(' ')}
      aria-pressed={active}
      onClick={() => onClick(sortKey)}
    >
      {label}
      {active && <em>{activeSort?.dir === 'desc' ? '↓' : '↑'}</em>}
    </button>
  );
}

function catalogAssetSrc(src?: string | null) {
  if (!src) return '';
  return src.startsWith('/uploads/') ? `${PUBLIC_SITE}${src}` : src;
}

function handleCatalogImageError(image: HTMLImageElement) {
  const src = image.getAttribute('src') || '';
  if (src.startsWith('/uploads/') && image.dataset.remoteFallback !== '1') {
    image.dataset.remoteFallback = '1';
    image.src = `${PUBLIC_SITE}${src}`;
    return;
  }
  image.style.display = 'none';
}

function HomeServerCard({
  server: s,
  eagerImage,
}: {
  server: Server;
  eagerImage: boolean;
}) {
  const projectMeta = collectCardMeta(s);
  const worlds = projectWorldCount(s);
  const trust = trustMeta(s.trustLevel);
  const activity = activityMeta(s.activityLevel);
  const checkedAt = s.manualCheckAt ? formatDate(s.manualCheckAt) : '';
  const latestOpening = latestProjectOpening(s);
  const trafficTrend = projectTrafficTrend(s);
  const votes = s.totalVotes ?? s.weeklyVotes ?? 0;
  const isVip = !!s._isVip || !!s.vip;
  const isBoosted = !!s._isBoosted;
  const badge = getServerBadge(s);

  return (
    <article className={[
      styles.serverCard,
      isVip ? styles.serverCardVip : '',
      isBoosted ? styles.serverCardBoost : '',
    ].filter(Boolean).join(' ')}>
      <Link href={`/servers/${s.id}`} className={styles.cardLink} aria-label={`Открыть сервер ${s.name}`} />
      <div className={styles.cardMedia}>
        {s.banner ? (
          <img src={catalogAssetSrc(s.banner)} alt="" loading={eagerImage ? 'eager' : 'lazy'} decoding="async" onError={e => handleCatalogImageError(e.currentTarget as HTMLImageElement)} />
        ) : (
          <span className={styles.cardMediaFallback} />
        )}
        <span className={styles.cardShade} />
        <span className={styles.cardBottomFade} />
        {badge && <span className={styles.cardBadge}>{badge}</span>}
        {(trust.known || checkedAt) && (
          <Link
            href="/methodology#trust"
            className={styles.trustBadge}
            style={{ borderColor: trust.color, color: trust.color }}
            title={`${trust.title}${checkedAt ? ` · Проверка: ${checkedAt}` : ''} — открыть методику`}
            aria-label="Как мы проверяем серверы — методика"
          >
            {trust.known ? `Доверие ${trust.label}` : 'Проверен'}
          </Link>
        )}
        <div className={styles.cardIdentity}>
          <ServerIcon server={s} eager={eagerImage} />
          <div>
            <h2>{s.name}</h2>
            <div className={styles.cardTags} title={`${projectMeta.chroniclesTitle} / ${projectMeta.ratesTitle}`}>
              <span className={styles.tagChronicle}>{projectMeta.chronicles}</span>
              <span className={styles.tagRate}>{projectMeta.rates}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.cardBody}>
        <div className={styles.cardLiveRow}>
          <span className={styles.worldSummary}>
            {worlds} {worldWord(worlds)}
          </span>
          {activity.known && (
            <span className={styles.activityChip} style={{ color: activity.color }} title={`Активность: ${activity.label}. ${activity.title}`}>
              <i aria-hidden="true" style={{ background: activity.color }} />
              {activity.label}
            </span>
          )}
        </div>
        <div className={styles.cardFacts}>
          <span>
            <small>Трафик / 3 мес.</small>
            <strong className={styles.trafficValue}>
              {formatTraffic(s.trafficThreeMonths)}
              {trafficTrend && (
                <em className={trafficTrend.direction === 'up' ? styles.trendUp : trafficTrend.direction === 'down' ? styles.trendDown : styles.trendFlat}>
                  {trafficTrend.direction === 'up' ? '↑' : trafficTrend.direction === 'down' ? '↓' : '•'} {trafficTrend.percent}%
                </em>
              )}
            </strong>
          </span>
          <span>
            <small>Старт</small>
            <strong>{latestOpening ? formatDate(latestOpening) : '-'}</strong>
          </span>
          <span>
            <small>Голоса</small>
            <strong className={styles.votes}>★ {votes.toLocaleString('ru-RU')}</strong>
          </span>
        </div>
        {checkedAt && (
          <div className={styles.cardChecked} title={`Редакция проверяла проект ${checkedAt}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span>Проверено редакцией · {checkedAt}</span>
          </div>
        )}
      </div>
    </article>
  );
}

function HomeServerRow({
  server: s,
  eagerImage,
}: {
  server: Server;
  eagerImage: boolean;
}) {
  const projectMeta = collectCardMeta(s);
  const worlds = projectWorldCount(s);
  const trust = trustMeta(s.trustLevel);
  const activity = activityMeta(s.activityLevel);
  const latestOpening = latestProjectOpening(s);
  const trafficTrend = projectTrafficTrend(s);
  const votes = s.totalVotes ?? s.weeklyVotes ?? 0;
  const isVip = !!s._isVip || !!s.vip;
  const isBoosted = !!s._isBoosted;
  const badge = getServerBadge(s);

  return (
    <Link
      href={`/servers/${s.id}`}
      className={[
        styles.serverListRow,
        isVip ? styles.serverListRowVip : '',
        isBoosted ? styles.serverListRowBoost : '',
      ].filter(Boolean).join(' ')}
      aria-label={`Открыть сервер ${s.name}`}
    >
      <span className={styles.listProject}>
        <span className={styles.listLogoBox}>
          <ServerIcon server={s} small eager={eagerImage} />
        </span>

        <span className={styles.listIdentity}>
          <span className={styles.listTitleRow}>
            <strong>{s.name}</strong>
            <span className={`${styles.cardTags} ${styles.listTags}`} title={`${projectMeta.chroniclesTitle} / ${projectMeta.ratesTitle}`}>
              <span className={styles.tagChronicle}>{projectMeta.chronicles}</span>
              <span className={styles.tagRate}>{projectMeta.rates}</span>
            </span>
            {badge && <em>{badge}</em>}
          </span>
        </span>
      </span>

      <span className={styles.listTrust}>
        <small>Доверие</small>
        <strong style={{ color: trust.color }}>
          {trust.known ? trust.label : '-'}
        </strong>
      </span>

      <span className={styles.listMetric}>
        <small>Миры</small>
        <strong>{worlds} {worldWord(worlds)}</strong>
      </span>

      <span className={styles.listMetric}>
        <small>Активность</small>
        {activity.known ? (
          <strong className={styles.listActivity} style={{ color: activity.color }}>
            <i aria-hidden="true" style={{ background: activity.color }} />
            {activity.label}
          </strong>
        ) : (
          <strong>-</strong>
        )}
      </span>

      <span className={`${styles.listMetric} ${styles.listMetricTraffic}`}>
        <small>Трафик / 3 мес.</small>
        <strong className={styles.trafficValue}>
          {formatTraffic(s.trafficThreeMonths)}
          {trafficTrend && (
            <em className={trafficTrend.direction === 'up' ? styles.trendUp : trafficTrend.direction === 'down' ? styles.trendDown : styles.trendFlat}>
              {trafficTrend.direction === 'up' ? '↑' : trafficTrend.direction === 'down' ? '↓' : '•'} {trafficTrend.percent}%
            </em>
          )}
        </strong>
      </span>

      <span className={styles.listMetric}>
        <small>Старт</small>
        <strong>{latestOpening ? formatDate(latestOpening) : '-'}</strong>
      </span>

      <span className={`${styles.listMetric} ${styles.listMetricVotes}`}>
        <small>Голоса</small>
        <strong className={styles.votes}>★ {votes.toLocaleString('ru-RU')}</strong>
      </span>

      <span className={styles.listArrow} aria-hidden="true">→</span>
    </Link>
  );
}

function ServerIcon({ server, small, eager = false }: { server: Server; small?: boolean; eager?: boolean }) {
  return (
    <span className={`${styles.serverIcon} ${small ? styles.serverIconSmall : ''}`}>
      {server.icon
        ? <img src={catalogAssetSrc(server.icon)} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" onError={e => handleCatalogImageError(e.currentTarget as HTMLImageElement)} />
        : <span>{server.abbr ?? server.name.slice(0, 2).toUpperCase()}</span>}
    </span>
  );
}

function getServerBadge(server: Server) {
  if (server._isVip || server.vip) return 'РЕКОМЕНДУЕМ';
  if (server._isBoosted) return 'В ФОКУСЕ';
  return '';
}

function collectCardMeta(server: Server): { chronicles: string; chroniclesTitle: string; rates: string; ratesTitle: string } {
  const instances = currentProjectWorlds(server);
  const unique = (values: Array<string | null | undefined>) => Array.from(new Set(
    values.map(value => value?.trim()).filter((value): value is string => Boolean(value)),
  ));
  const chronicles = unique([server.chronicle, ...instances.map(instance => instance.chronicle)]);
  const rates = unique([server.rates, ...instances.map(instance => instance.rates)]);
  const compact = (values: string[], visible: number) => values.length > visible
    ? `${values.slice(0, visible).join(' / ')} +${values.length - visible}`
    : values.join(' / ') || '-';
  return {
    chronicles: compact(chronicles, 2),
    chroniclesTitle: chronicles.join(' / ') || '-',
    rates: compact(rates, 3),
    ratesTitle: rates.join(' / ') || '-',
  };
}

function weeklyVoteCount(server: Server): number {
  return Math.max(0, Number(server.weeklyVotes ?? 0));
}

function selectWeeklyRailServers(servers: Server[]): Server[] {
  const ranked = [...servers]
    .filter(server => weeklyVoteCount(server) > 0)
    .sort((left, right) => weeklyVoteCount(right) - weeklyVoteCount(left))
    .slice(0, 5);

  if (ranked.length > 0) return ranked;
  return stableShuffleServers(servers, weekSalt()).slice(0, 5);
}

function weekSalt() {
  const now = new Date();
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${now.getUTCFullYear()}-${week}`;
}

function stableShuffleServers(servers: Server[], salt: string): Server[] {
  return [...servers].sort((left, right) => stableHash(`${salt}:${left.id}`) - stableHash(`${salt}:${right.id}`));
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function worldWord(value: number): string {
  const mod100 = value % 100;
  const mod10 = value % 10;
  if (mod100 >= 11 && mod100 <= 14) return 'миров';
  if (mod10 === 1) return 'мир';
  if (mod10 >= 2 && mod10 <= 4) return 'мира';
  return 'миров';
}

function formatShortDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value)
    .toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    .replace(/\s?г\.$/, '');
}
