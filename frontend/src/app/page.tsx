'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ServerCard } from '@/components/ServerCard';
import type { Server, Stats } from '@/lib/types';

const VIP_MAX = 3;
import styles from './page.module.css';

const CHRONICLES = ['Essence', 'Classic', 'Interlude', 'High Five', 'Gracia'];
const RATES      = [{ v: 'low', l: 'x1–x5' }, { v: 'mid', l: 'x7–x30' }, { v: 'high', l: 'x50–x100' }, { v: 'ultra', l: 'x100+' }];
const DONATES    = [{ v: 'free', l: 'Без доната' }, { v: 'cosmetic', l: 'Косметика' }, { v: 'p2w', l: 'Pay-to-win' }];
const TYPES      = [{ v: 'pvp', l: 'PvP' }, { v: 'pve', l: 'PvE' }, { v: 'featured', l: '🔥 Популярные' }];

type FilterCounts = { chronicles: Record<string,number>; rates: Record<string,number>; donates: Record<string,number>; types: Record<string,number> };

export default function HomePage() {
  const [servers,  setServers]  = useState<Server[]>([]);
  const [stats,    setStats]    = useState<Stats | null>(null);
  const [counts,   setCounts]   = useState<FilterCounts | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [sort,     setSort]     = useState('opened');
  const [filters,  setFilters]  = useState<Record<string, string>>({});
  const [page,     setPage]     = useState(1);

  const [pages,    setPages]    = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { sort, page: String(page), limit: '30' };
      if (search)         params.search    = search;
      if (filters.chr)    params.chronicle = filters.chr;
      if (filters.rate)   params.rate      = filters.rate;
      if (filters.donate) params.donate    = filters.donate;
      if (filters.type)   params.type      = filters.type;

      const res = await api.servers.list(params);
      setServers(res.data);
      setPages(res.pages);
    } catch {}
    finally { setLoading(false); }
  }, [search, sort, filters, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.servers.stats().then(setStats).catch(() => {});
    api.servers.counts().then(setCounts).catch(() => {});
  }, []);

  function toggleFilter(group: string, value: string) {
    setFilters(prev => ({ ...prev, [group]: prev[group] === value ? '' : value }));
    setPage(1);
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageInner}>

      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          <h1 className={styles.heroTitle}>Каталог Серверов <em>Lineage 2</em></h1>
          {stats && (
            <div className={styles.heroStats}>
              <div className={styles.statItem}><span className={styles.statNum}>{stats.total}</span><span className={styles.statLbl}>Серверов</span></div>
              <div className={styles.statDivider} />
              <div className={styles.statItem}><span className={styles.statNum}>{stats.reviewCount}</span><span className={styles.statLbl}>Отзывов</span></div>
            </div>
          )}
          <p className={styles.heroSub}>
            Твой главный навигатор в мире Адена. Мы собираем и обновляем данные в реальном времени,
            чтобы ты видел реальную картину. Выбирай сервер с умом, а не по рекламному баннеру.
          </p>
        </div>
      </section>

      <div className={styles.layout}>

        {/* Сайдбар фильтров */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHead}><span className={styles.sideLabel}>Фильтры</span></div>

          <FilterGroup label="Хроника">
            {CHRONICLES.map(v => <FilterChip key={v} label={v} active={filters.chr === v} count={counts?.chronicles[v]} onClick={() => toggleFilter('chr', v)} />)}
          </FilterGroup>
          <FilterGroup label="Рейты">
            {RATES.map(({ v, l }) => <FilterChip key={v} label={l} active={filters.rate === v} count={counts?.rates[v]} onClick={() => toggleFilter('rate', v)} />)}
          </FilterGroup>
          <FilterGroup label="Тип доната">
            {DONATES.map(({ v, l }) => <FilterChip key={v} label={l} active={filters.donate === v} count={counts?.donates[v]} onClick={() => toggleFilter('donate', v)} />)}
          </FilterGroup>
          <FilterGroup label="Тип сервера">
            {TYPES.map(({ v, l }) => <FilterChip key={v} label={l} active={filters.type === v} count={counts?.types[v]} onClick={() => toggleFilter('type', v)} />)}
          </FilterGroup>

          {Object.values(filters).some(Boolean) && (
            <button className={styles.clearBtn} onClick={() => { setFilters({}); setPage(1); }}>
              ✕ Сбросить фильтры
            </button>
          )}
        </aside>

        {/* Контент */}
        <div className={styles.content}>
          <div className={styles.searchBar}>
            <div className={styles.searchWrap}>
              <span className={styles.searchIcon}>⌕</span>
              <input
                className={styles.searchInput}
                placeholder="Поиск по названию сервера..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
              {search && <button className={styles.searchClear} onClick={() => setSearch('')}>✕</button>}
            </div>
            <div className={styles.sortWrap}>
              <span className={styles.sortLabel}>Сортировка</span>
              <select className="input" style={{ width: 'auto' }} value={sort} onChange={e => setSort(e.target.value)}>
                <option value="opened">По дате открытия</option>
                <option value="name">По алфавиту</option>
                <option value="rating">По рейтингу</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className={styles.loadWrap}><span className="spin" /> Загружаем серверы...</div>
          ) : (() => {
            const vipServers  = servers.filter(s => s.subscription?.plan === 'VIP');
            const mainServers = servers.filter(s => s.subscription?.plan !== 'VIP');
            const freeSlots   = VIP_MAX - vipServers.length;
            return (
              <>
                {/* VIP-блок */}
                {(vipServers.length > 0 || freeSlots > 0) && (
                  <div className={styles.vipSection}>
                    <div className={styles.vipHeader}>
                      <span className={styles.vipHeaderStar}>★</span>
                      <span className={styles.vipHeaderTitle}>VIP Серверы</span>
                      <span className={styles.vipHeaderSlots}>
                        {freeSlots > 0
                          ? `${vipServers.length} / ${VIP_MAX} мест занято`
                          : 'Все места заняты'}
                      </span>
                    </div>
                    <div className={styles.list}>
                      {vipServers.map(s => <ServerCard key={s.id} server={s} vipBlock />)}
                      {freeSlots > 0 && Array.from({ length: freeSlots }).map((_, i) => (
                        <Link key={`slot-${i}`} href="/add" className={styles.vipSlot}>
                          <span className={styles.vipSlotPlus}>+</span>
                          <span className={styles.vipSlotText}>Свободное VIP место</span>
                          <span className={styles.vipSlotBtn}>Занять место →</span>
                        </Link>
                      ))}
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
