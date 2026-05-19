'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Server, Stats } from '@/lib/types';
import { CHRONICLES, RATES, SERVER_TYPES } from '@/lib/types';
import styles from './page.module.css';

export type FilterCounts = {
  chronicles: Record<string, number>;
  rates: Record<string, number>;
  donates: Record<string, number>;
  types: Record<string, number>;
};

type HomeClientProps = {
  initialServers: Server[];
  initialStats: Stats | null;
  initialCounts: FilterCounts | null;
  initialPages: number;
  initialOk: boolean;
};

const typeLabels = new Map(SERVER_TYPES.map(t => [t.v, t.l]));

type CardTagTone = 'chronicle' | 'rate' | 'type';
type CardTag = { label: string; tone: CardTagTone };

export function HomeClient(props: HomeClientProps) {
  return (
    <Suspense>
      <HomeContent {...props} />
    </Suspense>
  );
}

function HomeContent({ initialServers, initialStats, initialCounts, initialPages, initialOk }: HomeClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { token } = useAuth();

  const [servers, setServers] = useState<Server[]>(initialServers);
  const [stats, setStats] = useState<Stats | null>(initialStats);
  const [counts, setCounts] = useState<FilterCounts | null>(initialCounts);
  const [loading, setLoading] = useState(!initialOk);
  const [pages, setPages] = useState(initialPages);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoriteBusyId, setFavoriteBusyId] = useState('');
  const firstListEffect = useRef(true);
  const firstCountsEffect = useRef(true);

  const [search, setSearch] = useState(() => sp.get('q') ?? '');
  const [sort, setSort] = useState(() => sp.get('sort') ?? '');
  const [page, setPage] = useState(() => Number(sp.get('page') ?? 1));
  const [filters, setFilters] = useState<Record<string, string>>(() => ({
    chr: sp.get('chr') ?? '',
    rate: sp.get('rate') ?? '',
    type: sp.get('type') ?? '',
  }));

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;
  const totalProjects = stats?.total ?? servers.length;
  const totalServers = stats?.launchCount ?? totalProjects;
  const addedThisWeek = stats?.newCount ?? 0;

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (sort) params.set('sort', sort);
    if (filters.chr) params.set('chr', filters.chr);
    if (filters.rate) params.set('rate', filters.rate);
    if (filters.type) params.set('type', filters.type);
    if (page > 1) params.set('page', String(page));
    const query = params.toString();
    router.replace(`${pathname}${query ? '?' + query : ''}`, { scroll: false } as any);
  }, [search, sort, filters, page, pathname, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '30' };
      if (sort) params.sort = sort;
      if (search) params.search = search;
      if (filters.chr) params.chronicle = filters.chr;
      if (filters.rate) params.rate = filters.rate;
      if (filters.type) params.type = filters.type;

      const res = await api.servers.list(params);
      setServers(res.data);
      setPages(res.pages);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [search, sort, filters, page]);

  useEffect(() => {
    if (firstListEffect.current) {
      firstListEffect.current = false;
      if (initialOk) return;
    }
    load();
  }, [load, initialOk]);

  useEffect(() => {
    if (!initialStats) api.servers.stats().then(setStats).catch(() => {});
    if (!initialCounts) api.servers.counts().then(setCounts).catch(() => {});
  }, [initialStats, initialCounts]);

  useEffect(() => {
    if (!token) {
      setFavoriteIds(new Set());
      return;
    }
    api.favorites.ids(token)
      .then(ids => setFavoriteIds(new Set(ids)))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (firstCountsEffect.current) {
      firstCountsEffect.current = false;
      if (initialCounts) return;
    }
    const params: Record<string, string> = {};
    if (filters.chr) params.chronicle = filters.chr;
    if (filters.rate) params.rate = filters.rate;
    if (filters.type) params.type = filters.type;
    api.servers.counts(params).then(setCounts).catch(() => {});
  }, [filters, initialCounts]);

  function toggleFilter(group: string, value: string) {
    setFilters(prev => ({ ...prev, [group]: prev[group] === value ? '' : value }));
    setPage(1);
  }

  function resetFilters() {
    setFilters({ chr: '', rate: '', type: '' });
    setSearch('');
    setSort('');
    setPage(1);
  }

  async function toggleFavorite(serverId: string) {
    if (!token || favoriteBusyId) return;
    const wasFavorite = favoriteIds.has(serverId);
    setFavoriteBusyId(serverId);
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (wasFavorite) next.delete(serverId);
      else next.add(serverId);
      return next;
    });
    try {
      if (wasFavorite) await api.favorites.remove(serverId, token);
      else await api.favorites.add(serverId, token);
    } catch {
      setFavoriteIds(prev => {
        const next = new Set(prev);
        if (wasFavorite) next.add(serverId);
        else next.delete(serverId);
        return next;
      });
    } finally {
      setFavoriteBusyId('');
    }
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

            <FilterFooter />
          </aside>

          <section className={styles.content}>
            <section className={styles.hero}>
              <div className={styles.heroCopy}>
                <h1>Найди свой мир <span>Lineage 2</span></h1>
                <p>Каталог приватных серверов с фильтрами, отзывами, голосованием и живыми страницами проектов.</p>

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

                  <select className={styles.sortSelect} value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}>
                    <option value="">По умолчанию</option>
                    <option value="opened">По дате открытия</option>
                    <option value="name">По алфавиту</option>
                    <option value="rating">По рейтингу</option>
                    <option value="votes">По голосам</option>
                  </select>
                </div>
              </div>

              <div className={styles.heroStats}>
                <Metric label="Всего серверов" value={totalServers} note={`+${addedThisWeek} за неделю`} />
                <Metric label="Всего проектов" value={totalProjects} note="карточек в каталоге" />
              </div>
            </section>

            {loading ? (
              <div className={styles.grid}>
                {Array.from({ length: 6 }).map((_, i) => <div className={styles.cardSkeleton} key={i} />)}
              </div>
            ) : servers.length === 0 ? (
              <div className={styles.empty}>По выбранным фильтрам серверов не найдено</div>
            ) : (
              <div className={styles.grid}>
                {servers.map(s => (
                  <HomeServerCard
                    key={s.id}
                    server={s}
                    isFavorite={favoriteIds.has(s.id)}
                    favoriteBusy={favoriteBusyId === s.id}
                    canFavorite={!!token}
                    onFavorite={() => toggleFavorite(s.id)}
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

function FilterItem({ label, active, count, onClick }: { label: string; active: boolean; count?: number; onClick: () => void }) {
  return (
    <button type="button" className={`${styles.filterItem} ${active ? styles.filterItemActive : ''}`} onClick={onClick}>
      <span className={styles.filterDot} />
      <span>{label}</span>
      {typeof count === 'number' && <em>{count}</em>}
    </button>
  );
}

function Metric({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className={styles.metric}>
      <span>{label}</span>
      <strong>{value.toLocaleString('ru-RU')}</strong>
      <small>{note}</small>
    </div>
  );
}

function HomeServerCard({
  server: s,
  isFavorite,
  favoriteBusy,
  canFavorite,
  onFavorite,
}: {
  server: Server;
  isFavorite: boolean;
  favoriteBusy: boolean;
  canFavorite: boolean;
  onFavorite: () => void;
}) {
  const tags = collectTags(s);
  const visibleTags = tags.slice(0, 7);
  const hiddenTagsCount = Math.max(0, tags.length - visibleTags.length);
  const votes = s.totalVotes ?? s.weeklyVotes ?? 0;
  const isVip = !!s._isVip || !!s.vip;
  const isBoosted = !!s._isBoosted;
  const isWeek = !!s._isSod;
  const badge = getServerBadge(s);

  return (
    <article className={[
      styles.serverCard,
      isVip ? styles.serverCardVip : '',
      isBoosted ? styles.serverCardBoost : '',
      isWeek ? styles.serverCardWeek : '',
    ].filter(Boolean).join(' ')}>
      <div className={styles.cardMedia}>
        {s.banner ? (
          <img src={s.banner} alt="" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <span className={styles.cardMediaFallback} />
        )}
        <span className={styles.cardShade} />
        <span className={styles.cardBottomFade} />
        {badge && <span className={styles.cardBadge}>{badge}</span>}
        <button
          type="button"
          className={`${styles.favoriteBtn} ${isFavorite ? styles.favoriteBtnActive : ''}`}
          onClick={onFavorite}
          disabled={favoriteBusy}
          title={canFavorite ? (isFavorite ? 'Убрать из избранного' : 'Добавить в избранное') : 'Войдите, чтобы добавить в избранное'}
          aria-label={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
        >
          {isFavorite ? '♥' : '♡'}
        </button>
        <Link href={`/servers/${s.id}`} className={styles.cardIdentity} aria-label={`Открыть сервер ${s.name}`}>
          <ServerIcon server={s} />
          <div>
            <h2>{s.name}</h2>
            <div className={styles.cardTags}>
              {visibleTags.map(tag => <span key={`${tag.tone}-${tag.label}`} className={styles[`tag${capitalize(tag.tone)}`]}>{tag.label}</span>)}
              {hiddenTagsCount > 0 && <span className={styles.tagMore}>+{hiddenTagsCount}</span>}
            </div>
          </div>
        </Link>
      </div>

      <div className={styles.cardBody}>
        <p>{s.shortDesc || 'Проект Lineage 2 с отдельной страницей, голосами, описанием и ссылками для старта.'}</p>

        <div className={styles.cardFooter}>
          <div className={styles.cardMeta}>
            <span>
              <small>Голоса</small>
              <strong className={styles.online}>{votes.toLocaleString('ru-RU')}</strong>
            </span>
            <span>
              <small>Старт</small>
              <strong>{formatDate(s.openedDate)}</strong>
            </span>
          </div>

          <Link href={`/servers/${s.id}`} className={styles.detailsBtn}>Подробнее</Link>
        </div>
      </div>
    </article>
  );
}

function ServerIcon({ server, small }: { server: Server; small?: boolean }) {
  return (
    <span className={`${styles.serverIcon} ${small ? styles.serverIconSmall : ''}`}>
      {server.icon
        ? <img src={server.icon} alt="" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        : <span>{server.abbr ?? server.name.slice(0, 2).toUpperCase()}</span>}
    </span>
  );
}

function getServerBadge(server: Server) {
  if (server._isVip || server.vip) return '★ VIP';
  if (server._isSod) return 'СЕРВЕР НЕДЕЛИ';
  if (server._isBoosted) return '🔥 БУСТ';
  return '';
}

function collectTags(server: Server): CardTag[] {
  const tags: CardTag[] = [];
  const seen = new Set<string>();
  const instances = server.instances ?? [];

  const add = (tone: CardTagTone, value?: string | null) => {
    const clean = value?.trim();
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    tags.push({ label: clean, tone });
  };

  add('chronicle', server.chronicle);
  for (const instance of instances) add('chronicle', instance.chronicle);

  add('rate', server.rates);
  for (const instance of instances) add('rate', instance.rates);

  for (const type of server.type ?? []) add('type', typeLabels.get(type as any));
  for (const instance of instances) {
    if (instance.type) add('type', typeLabels.get(instance.type as any));
  }

  return tags;
}

function capitalize(value: CardTagTone) {
  return (value.charAt(0).toUpperCase() + value.slice(1)) as Capitalize<CardTagTone>;
}

function FilterFooter() {
  return (
    <div className={styles.filterFooter}>
      <Link href="/pricing" className={styles.filterAddBtn}>Добавить сервер</Link>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value)
    .toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    .replace(/\s?г\.$/, '');
}
