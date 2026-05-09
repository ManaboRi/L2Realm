'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ServerCard } from '@/components/ServerCard';
import { ServerCardSkeleton } from '@/components/ServerCardSkeleton';
import type { Server, Stats } from '@/lib/types';
import { CHRONICLES, DONATE_OPTIONS, RATES, SERVER_TYPES } from '@/lib/types';
import styles from './page.module.css';

export type FilterCounts = { chronicles: Record<string,number>; rates: Record<string,number>; donates: Record<string,number>; types: Record<string,number> };

type HomeClientProps = {
  initialServers: Server[];
  initialStats: Stats | null;
  initialCounts: FilterCounts | null;
  initialPages: number;
  initialOk: boolean;
};

export function HomeClient(props: HomeClientProps) {
  return (
    <Suspense>
      <HomeContent {...props} />
    </Suspense>
  );
}

function HomeContent({ initialServers, initialStats, initialCounts, initialPages, initialOk }: HomeClientProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const sp       = useSearchParams();

  const [servers,  setServers]  = useState<Server[]>(initialServers);
  const [stats,    setStats]    = useState<Stats | null>(initialStats);
  const [counts,   setCounts]   = useState<FilterCounts | null>(initialCounts);
  const [loading,  setLoading]  = useState(!initialOk);
  const [pages,    setPages]    = useState(initialPages);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Автодополнение поиска
  const [suggestions, setSuggestions] = useState<Server[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const firstListEffect = useRef(true);

  // Инициализация состояния из URL
  const [search,  setSearch]  = useState(() => sp.get('q')      ?? '');
  // sort = '' (default) даёт пьедестал VIP → СоД → Буст → остальные.
  // Любое явное значение ('opened'/'name'/'rating'/'votes') пиннит только VIP.
  const [sort,    setSort]    = useState(() => sp.get('sort')   ?? '');
  const [page,    setPage]    = useState(() => Number(sp.get('page') ?? 1));
  const [filters, setFilters] = useState<Record<string, string>>(() => ({
    chr:    sp.get('chr')    ?? '',
    rate:   sp.get('rate')   ?? '',
    donate: sp.get('donate') ?? '',
    type:   sp.get('type')   ?? '',
  }));

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  // Синхронизация состояния → URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (search)           params.set('q',      search);
    if (sort)             params.set('sort',   sort);
    if (filters.chr)      params.set('chr',    filters.chr);
    if (filters.rate)     params.set('rate',   filters.rate);
    if (filters.donate)   params.set('donate', filters.donate);
    if (filters.type)     params.set('type',   filters.type);
    if (page > 1)         params.set('page',   String(page));
    const query = params.toString();
    router.replace(`${pathname}${query ? '?' + query : ''}`, { scroll: false } as any);
  }, [search, sort, filters, page, pathname, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '30' };
      if (sort)            params.sort        = sort;
      if (search)          params.search      = search;
      if (filters.chr)     params.chronicle   = filters.chr;
      if (filters.rate)    params.rate        = filters.rate;
      if (filters.donate)  params.donate      = filters.donate;
      if (filters.type)    params.type        = filters.type;

      const res = await api.servers.list(params);
      setServers(res.data);
      setPages(res.pages);
    } catch {}
    finally { setLoading(false); }
  }, [search, sort, filters, page]);

  useEffect(() => {
    if (firstListEffect.current) {
      firstListEffect.current = false;
      if (initialOk) return;
    }
    load();
  }, [load, initialOk]);

  useEffect(() => {
    if (!initialStats) {
      api.servers.stats().then(setStats).catch(() => {});
    }
    if (!initialCounts) {
      api.servers.counts().then(setCounts).catch(() => {});
    }
  }, [initialStats, initialCounts]);

  // Зависимые фильтры: при изменении любого из выбранных значений пересчитываем
  // counts с учётом активных фильтров. Для каждой dimension backend исключает
  // её собственный фильтр — иначе при выборе хроники Interlude в фильтре хроник
  // осталась бы только она. Skip первый рендер если initialCounts уже пришёл с SSR.
  const firstCountsEffect = useRef(true);
  useEffect(() => {
    if (firstCountsEffect.current) {
      firstCountsEffect.current = false;
      if (initialCounts) return;
    }
    const params: Record<string, string> = {};
    if (filters.chr)    params.chronicle    = filters.chr;
    if (filters.rate)   params.rate         = filters.rate;
    if (filters.donate) params.donate       = filters.donate;
    if (filters.type)   params.type         = filters.type;
    if (filters.opened) params.openedWithin = filters.opened;
    api.servers.counts(params).then(setCounts).catch(() => {});
  }, [filters, initialCounts]);

  function toggleFilter(group: string, value: string) {
    setFilters(prev => ({ ...prev, [group]: prev[group] === value ? '' : value }));
    setPage(1);
  }

  // Автодополнение: дёргаем API при изменении текста (debounce 200ms)
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) { setSuggestions([]); return; }
    const t = setTimeout(() => {
      api.servers.list({ search: q, limit: '6' })
        .then(r => setSuggestions(r.data.slice(0, 6)))
        .catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [search]);

  // Скрываем подсказки по клику вне блока поиска
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSuggest(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.pageInner}>

      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          <h1 className={styles.heroTitle}>Каталог Серверов <em>Lineage 2</em></h1>
          {stats && (
            <div className={styles.heroStats}>
              <div className={styles.statItem}><span className={styles.statNum}>{stats.total}</span><span className={styles.statLbl}>Проектов</span></div>
              <div className={styles.statDivider} />
              <div className={styles.statItem}><span className={styles.statNum}>{stats.launchCount ?? stats.total}</span><span className={styles.statLbl}>Серверов</span></div>
            </div>
          )}
          <p className={styles.heroSub}>
            Твой главный навигатор в мире Адена. Мы собираем и обновляем данные в реальном времени,
            чтобы ты видел реальную картину. Выбирай сервер с умом, а не по рекламному баннеру.
          </p>
        </div>
      </section>

      <div className={styles.quizHint}>
        <span>Не знаешь что выбрать? →</span>
        <Link href="/quiz">Тест за 1 минуту</Link>
      </div>

      <button
        type="button"
        className={`${styles.filtersToggle} ${mobileFiltersOpen ? styles.filtersToggleOpen : ''}`}
        onClick={() => setMobileFiltersOpen(v => !v)}
        aria-expanded={mobileFiltersOpen}
      >
        <span>Фильтры</span>
        {activeFiltersCount > 0 && <span className={styles.filtersCount}>{activeFiltersCount}</span>}
        <span className={styles.filtersToggleIcon} style={{ marginLeft: activeFiltersCount > 0 ? 0 : 'auto' }}>▾</span>
      </button>

      <div className={styles.layout}>

        {/* Сайдбар фильтров */}
        <aside className={`${styles.sidebar} ${mobileFiltersOpen ? styles.sidebarOpen : ''}`}>
          <div className={styles.sidebarHead}><span className={styles.sideLabel}>Фильтры</span></div>

          <FilterGroup label="Хроника">
            {/* Хроники: показываем только те, у которых хотя бы 1 сервер,
                плюс активную (если выбрана и серверов сейчас 0). */}
            {CHRONICLES
              .filter(v => (counts?.chronicles[v] ?? 0) > 0 || filters.chr === v)
              .map(v => <FilterChip key={v} label={v} active={filters.chr === v} count={counts?.chronicles[v]} onClick={() => toggleFilter('chr', v)} />)}
          </FilterGroup>
          <FilterGroup label="Рейты">
            {RATES
              .filter(({ v }) => (counts?.rates[v] ?? 0) > 0 || filters.rate === v)
              .map(({ v, l }) => <FilterChip key={v} label={l} active={filters.rate === v} count={counts?.rates[v]} onClick={() => toggleFilter('rate', v)} />)}
          </FilterGroup>
          <FilterGroup label="Тип сервера">
            {SERVER_TYPES
              .filter(({ v }) => v !== 'pvp-pve' && ((counts?.types[v] ?? 0) > 0 || filters.type === v))
              .map(({ v, l }) => <FilterChip key={v} label={l} active={filters.type === v} count={counts?.types[v]} onClick={() => toggleFilter('type', v)} />)}
          </FilterGroup>
          <FilterGroup label="Донат">
            {DONATE_OPTIONS
              .filter(({ v }) => (counts?.donates[v] ?? 0) > 0 || filters.donate === v)
              .map(({ v, l }) => <FilterChip key={v} label={l} active={filters.donate === v} count={counts?.donates[v]} onClick={() => toggleFilter('donate', v)} />)}
          </FilterGroup>

          {Object.values(filters).some(Boolean) && (
            <button className={styles.clearBtn} onClick={() => { setFilters({ chr: '', rate: '', donate: '', type: '' }); setPage(1); }}>
              ✕ Сбросить фильтры
            </button>
          )}
        </aside>

        {/* Контент */}
        <div className={styles.content}>
          <div className={styles.searchBar}>
            <div className={styles.searchWrap} ref={searchBoxRef}>
              <span className={styles.searchIcon}>⌕</span>
              <input
                className={styles.searchInput}
                placeholder="Поиск по названию сервера..."
                value={search}
                onFocus={() => setShowSuggest(true)}
                onChange={e => { setSearch(e.target.value); setPage(1); setShowSuggest(true); }}
                onKeyDown={e => { if (e.key === 'Escape') setShowSuggest(false); }}
              />
              {search && <button className={styles.searchClear} onClick={() => { setSearch(''); setShowSuggest(false); }}>✕</button>}

              {showSuggest && suggestions.length > 0 && (
                <div className={styles.suggestList}>
                  {suggestions.map(s => (
                    <Link
                      key={s.id}
                      href={`/servers/${s.id}`}
                      className={styles.suggestItem}
                      onClick={() => setShowSuggest(false)}
                    >
                      <span className={styles.suggestIcon}>
                        {s.icon
                          ? <img src={s.icon} alt={`Иконка сервера ${s.name}`} />
                          : <span>{s.abbr ?? s.name.slice(0, 2).toUpperCase()}</span>}
                      </span>
                      <span className={styles.suggestMain}>
                        <span className={styles.suggestName}>{s.name}</span>
                        <span className={styles.suggestMeta}>{s.chronicle} · {s.rates}</span>
                      </span>
                      <span className={styles.suggestArr}>›</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className={styles.sortWrap}>
              <span className={styles.sortLabel}>Сортировка</span>
              <select className="input" style={{ width: 'auto' }} value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}>
                <option value="">По умолчанию</option>
                <option value="opened">По дате открытия</option>
                <option value="name">По алфавиту</option>
                <option value="rating">По рейтингу</option>
                <option value="votes">По голосам</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className={styles.list}>
              {Array.from({ length: 5 }).map((_, i) => <ServerCardSkeleton key={i} />)}
            </div>
          ) : (() => {
            const vipServers  = servers.filter(s => s._isVip);
            const mainServers = servers.filter(s => !s._isVip);
            return (
              <>
                {/* VIP-блок — показываем только когда есть хотя бы один активный VIP.
                    Свободные места показываются как «занять место», но не перетягивают
                    внимание когда никто ещё не купил. */}
                {vipServers.length > 0 && (
                  <div className={styles.vipSection}>
                    <div className={styles.vipHeader}>
                      <span className={styles.vipHeaderStar}>★</span>
                      <span className={styles.vipHeaderTitle}>VIP Серверы</span>
                      <span className={styles.vipHeaderSlots}>
                        {vipServers.length} активн{vipServers.length === 1 ? 'ый' : 'ых'}
                      </span>
                    </div>
                    <div className={styles.list}>
                      {vipServers.map(s => <ServerCard key={s.id} server={s} vipBlock />)}
                    </div>
                  </div>
                )}

                {/* Основной список */}
                {mainServers.length === 0 ? (
                  <div className={styles.empty}>По выбранным фильтрам серверов не найдено</div>
                ) : (
                  <div className={styles.list}>
                    {mainServers.map(s => <ServerCard key={s.id} server={s} />)}
                  </div>
                )}
              </>
            );
          })()}

          {pages > 1 && (
            <div className={styles.pagination}>
              {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                <button key={p} className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.filterGroup}>
      <span className={styles.filterLabel}>{label}</span>
      <div className={styles.chips}>{children}</div>
    </div>
  );
}
function FilterChip({ label, active, count, onClick }: { label: string; active: boolean; count?: number; onClick: () => void }) {
  return (
    <button className={`${styles.chip} ${active ? styles.chipActive : ''}`} onClick={onClick}>
      <span className={styles.chipDot} />{label}
      {count !== undefined && count > 0 && <span className={styles.chipCount}>{count}</span>}
    </button>
  );
}
