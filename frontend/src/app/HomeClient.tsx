'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Server, Stats } from '@/lib/types';
import { CHRONICLES, RATES, SERVER_TYPES } from '@/lib/types';
import { formatOnline, onlineChartPath, serverOnlineDisclosure, serverOnlineLast24Hours, serverOnlineValue } from '@/lib/online';
import { currentProjectWorlds, formatTraffic, latestProjectOpening, projectTrafficTrend, projectWorldCount } from '@/lib/project-metrics';
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

const SORT_OPTIONS = [
  { value: '', label: 'По умолчанию' },
  { value: 'opened', label: 'Дата открытия' },
  { value: 'votes', label: 'Голоса' },
  { value: 'rating', label: 'Рейтинг' },
] as const;

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
  const totalVotes = stats?.totalVotes ?? servers.reduce((sum, server) => sum + (server.totalVotes ?? 0), 0);
  const loadedOnline = servers
    .map(serverOnlineValue)
    .filter((value): value is number => value != null)
    .reduce((sum, value) => sum + value, 0);
  const totalOnline = stats?.onlineTotal && stats.onlineTotal > 0 ? stats.onlineTotal : loadedOnline;

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
                <h1>Твой главный навигатор <br /><span>в мире Lineage 2</span></h1>
                <p>Каталог приватных серверов с фильтрами, отзывами, голосованием и честной статистикой проектов.</p>

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

                  <div className={styles.sortPills} aria-label="Сортировка серверов">
                    {SORT_OPTIONS.map(option => (
                      <button
                        key={option.value || 'default'}
                        type="button"
                        className={`${styles.sortPill} ${sort === option.value ? styles.sortPillActive : ''}`}
                        onClick={() => { setSort(option.value); setPage(1); }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.heroStatsWrap}>
                <div className={styles.heroStats}>
                  <Metric tone="gold" label="Миров" value={totalServers} />
                  <Metric tone="online" label="Игроков" value={totalOnline} />
                  <Metric tone="amber" label="Голосов" value={totalVotes} />
                  <Metric tone="red" label="Проектов" value={totalProjects} />
                </div>
                <div className={styles.heroStatsActions}>
                  <Link href="/methodology" className={styles.metricMethodology}>
                    <span aria-hidden="true">?</span>
                    Методика
                  </Link>
                </div>
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

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'gold' | 'online' | 'amber' | 'red';
}) {
  return (
    <div className={`${styles.metric} ${styles[`metric_${tone}`]}`}>
      <span className={styles.metricText}>
        <strong>{value.toLocaleString('ru-RU')}</strong>
        <em>{label}</em>
      </span>
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
  const projectMeta = collectCardMeta(s);
  const online = serverOnlineValue(s);
  const onlineDisclosure = serverOnlineDisclosure(s);
  const worlds = projectWorldCount(s);
  const latestOpening = latestProjectOpening(s);
  const trafficTrend = projectTrafficTrend(s);
  const votes = s.totalVotes ?? s.weeklyVotes ?? 0;
  const onlinePulse = serverOnlineLast24Hours(s);
  const onlinePulsePath = onlinePulse.length >= 2 ? onlineChartPath(onlinePulse, 292, 34) : '';
  const onlinePulseFillPath = onlinePulsePath ? `${onlinePulsePath} L 292 34 L 0 34 Z` : '';
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
      <Link href={`/servers/${s.id}`} className={styles.cardLink} aria-label={`Открыть сервер ${s.name}`} />
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
          {isFavorite ? '★' : '♡'}
        </button>
        <div className={styles.cardIdentity}>
          <ServerIcon server={s} />
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
        <div className={styles.cardLiveRow} title={onlineDisclosure?.title}>
          {online != null ? (
            <>
              <i className={styles.liveDot} aria-hidden="true" />
              <strong>{formatOnline(online, onlineDisclosure?.estimated ?? false)} <small>онлайн</small></strong>
            </>
          ) : <span className={styles.onlineUnavailable}>Нет данных онлайн</span>}
          <i className={styles.liveSeparator} aria-hidden="true" />
          <span className={styles.worldSummary}>
            {onlineDisclosure ? `${onlineDisclosure.tracked} из ${worlds}` : worlds} {worldWord(worlds)}
          </span>
        </div>
        <div className={styles.cardSparkline} aria-hidden="true">
          {onlinePulsePath && (
            <svg viewBox="0 0 292 34" preserveAspectRatio="none">
              <defs>
                <linearGradient id={`cardOnlineFill-${s.id}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(62,205,119,.2)" />
                  <stop offset="100%" stopColor="rgba(62,205,119,0)" />
                </linearGradient>
              </defs>
              {onlinePulseFillPath && <path className={styles.sparkFill} style={{ fill: `url(#cardOnlineFill-${s.id})` }} d={onlinePulseFillPath} />}
              <path className={styles.sparkLine} d={onlinePulsePath} />
            </svg>
          )}
        </div>
        <div className={styles.cardFacts}>
          <span>
            <small>Трафик, до 3 мес.</small>
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
            <small>Последний старт</small>
            <strong>{latestOpening ? formatDate(latestOpening) : '-'}</strong>
          </span>
          <span>
            <small>Голосов</small>
            <strong className={styles.votes}>★ {votes.toLocaleString('ru-RU')}</strong>
          </span>
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
  if (server._isVip || server.vip) return 'VIP';
  if (server._isSod) return 'СЕРВЕР НЕДЕЛИ';
  if (server._isBoosted) return 'БУСТ';
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

function worldWord(value: number): string {
  const mod100 = value % 100;
  const mod10 = value % 10;
  if (mod100 >= 11 && mod100 <= 14) return 'миров';
  if (mod10 === 1) return 'мир';
  if (mod10 >= 2 && mod10 <= 4) return 'мира';
  return 'миров';
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
