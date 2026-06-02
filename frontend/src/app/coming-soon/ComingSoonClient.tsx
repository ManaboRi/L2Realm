'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Article, Server, ServerInstance, ServerType } from '@/lib/types';
import { api } from '@/lib/api';
import { CHRONICLES, RATES, SERVER_TYPES } from '@/lib/types';
import { isOpeningStillSoon } from '@/lib/opening';
import styles from './page.module.css';

type Opening = {
  key: string;
  serverId: string;
  instanceId?: string | null;
  projectName: string;
  icon?: string | null;
  abbr?: string | null;
  chronicle: string;
  rates: string;
  rateNum: number;
  type: string[];
  label?: string;
  shortDesc?: string;
  openedAt: string;
  isVip: boolean;
  waitsWeek: number;
};

type Filters = {
  chronicle: string;
  rate: string;
  type: string;
  opens: string;
};

const typeLabels = new Map(SERVER_TYPES.map(t => [t.v, t.l]));
const PUBLIC_SITE = 'https://l2realm.ru';
const TELEGRAM_URL = 'https://t.me/l2realm_ru';
const VK_URL = 'https://vk.com/l2realmru';

function reminderKey(serverId: string, instanceId?: string | null) {
  return instanceId ? `${serverId}::${instanceId}` : serverId;
}

function flattenOpenings(servers: Server[]): Opening[] {
  const now = Date.now();
  const result: Opening[] = [];

  for (const s of servers) {
    const insts: ServerInstance[] = Array.isArray(s.instances) ? s.instances : [];
    const futureInsts = insts.filter(i => isOpeningStillSoon(i.openedDate, now));
    const serverVip = s.subscription?.plan === 'VIP' && !!s.subscription.endDate && new Date(s.subscription.endDate).getTime() > now;

    if (futureInsts.length > 0) {
      for (const i of futureInsts) {
        result.push({
          key: reminderKey(s.id, i.id),
          serverId: s.id,
          instanceId: i.id,
          projectName: s.name,
          icon: s.icon,
          abbr: s.abbr,
          chronicle: i.chronicle,
          rates: i.rates,
          rateNum: i.rateNum,
          type: i.type ? [i.type] : [],
          label: i.label,
          shortDesc: i.shortDesc || s.shortDesc || undefined,
          openedAt: i.openedDate!,
          isVip: !!i.soonVipUntil && new Date(i.soonVipUntil).getTime() > now,
          waitsWeek: Math.max(0, Number(i.waitsWeek ?? 0)),
        });
      }
    } else if (isOpeningStillSoon(s.openedDate, now)) {
      result.push({
        key: reminderKey(s.id),
        serverId: s.id,
        instanceId: null,
        projectName: s.name,
        icon: s.icon,
        abbr: s.abbr,
        chronicle: s.chronicle,
        rates: s.rates,
        rateNum: s.rateNum,
        type: s.type ?? [],
        shortDesc: s.shortDesc || undefined,
        openedAt: s.openedDate!,
        isVip: serverVip,
        waitsWeek: Math.max(0, Number(s.waitsWeek ?? 0)),
      });
    }
  }

  return result.sort((a, b) => {
    if (a.isVip !== b.isVip) return a.isVip ? -1 : 1;
    return new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime();
  });
}

function rateRange(rateNum: number) {
  if (rateNum <= 5) return 'low';
  if (rateNum <= 30) return 'mid';
  if (rateNum <= 100) return 'high';
  if (rateNum <= 999) return 'ultra';
  if (rateNum <= 9999) return 'mega';
  return 'extreme';
}

function daysUntilValue(openedAt: string, now: number) {
  return Math.max(0, Math.ceil((new Date(openedAt).getTime() - now) / 86400000));
}

function isOpened(openedAt: string, now: number) {
  return new Date(openedAt).getTime() <= now;
}

function openingBucket(openedAt: string, now: number) {
  if (isOpened(openedAt, now)) return 'opened';
  const days = daysUntilValue(openedAt, now);
  if (days <= 3) return '3';
  if (days <= 7) return '7';
  if (days <= 14) return '14';
  return 'more';
}

function typeMatches(types: string[], value: string) {
  if (!value) return true;
  if (value === 'craft') return types.includes('multicraft');
  return types.includes(value);
}

function applyFilters(openings: Opening[], filters: Filters, now: number) {
  return openings.filter(o => {
    if (filters.chronicle && o.chronicle !== filters.chronicle) return false;
    if (filters.rate && rateRange(o.rateNum) !== filters.rate) return false;
    if (filters.type && !typeMatches(o.type, filters.type)) return false;
    if (filters.opens && openingBucket(o.openedAt, now) !== filters.opens) return false;
    return true;
  });
}

function countBy(openings: Opening[], getKey: (o: Opening) => string | string[] | null | undefined) {
  const counts: Record<string, number> = {};
  for (const o of openings) {
    const raw = getKey(o);
    const keys = Array.isArray(raw) ? raw : raw ? [raw] : [];
    for (const key of new Set(keys)) counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function countdownParts(openedAt: string, now: number) {
  const total = Math.max(0, Math.floor((new Date(openedAt).getTime() - now) / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [days, hours, minutes, seconds].map(v => String(v).padStart(2, '0'));
}

function formatOpenDate(value: string) {
  return new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/\s?г\.$/, '');
}

function formatShortDate(value?: string | null) {
  if (!value) return 'скоро';
  return new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');
}

function waitWord(value: number) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return 'ждет';
  return 'ждут';
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

function weekSalt() {
  const now = new Date();
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${now.getUTCFullYear()}-${week}`;
}

function stableShuffleOpenings<T extends { key: string }>(items: T[], salt: string): T[] {
  return [...items].sort((left, right) => stableHash(`${salt}:${left.key}`) - stableHash(`${salt}:${right.key}`));
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.filterGroup}>
      <span className={styles.filterLabel}>{label}</span>
      <div className={styles.filterList}>{children}</div>
    </div>
  );
}

function FilterItem({ label, count, active, onClick }: { label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`${styles.filterItem} ${active ? styles.filterItemActive : ''}`} onClick={onClick}>
      <span className={styles.filterDot} />
      <span>{label}</span>
      {typeof count === 'number' && <em>{count}</em>}
    </button>
  );
}

function OpeningRow({
  opening,
  now,
  featured = false,
  waitCount,
  waited,
  waiting,
  onWait,
}: {
  opening: Opening;
  now: number;
  featured?: boolean;
  waitCount: number;
  waited: boolean;
  waiting: boolean;
  onWait: (opening: Opening) => void;
}) {
  const parts = countdownParts(opening.openedAt, now);
  const opened = isOpened(opening.openedAt, now);
  const types = opening.type.map(t => typeLabels.get(t as ServerType)).filter(Boolean).slice(0, 2);
  const waitDisabled = opened || waited || waiting;

  return (
    <article className={`${styles.rowCard} ${featured ? styles.featuredRow : ''} ${opening.isVip ? styles.vipRow : ''} ${opened ? styles.openedRow : ''}`}>
      {opening.isVip && <div className={styles.vipBadge}>VIP</div>}
      <Link href={`/servers/${opening.serverId}`} className={styles.identity}>
        <span className={styles.iconBox}>
          {opening.icon
            ? <img src={opening.icon} alt="" />
            : <span>{(opening.abbr || opening.projectName.slice(0, 2)).toUpperCase()}</span>}
        </span>
        <span className={styles.copy}>
          <strong>{opening.projectName}{opening.label ? <em> · {opening.label}</em> : null}</strong>
          <span className={styles.tags}>
            <i className={styles.tagChronicle}>{opening.chronicle}</i>
            <i className={styles.tagRate}>{opening.rates}</i>
            {types.map(type => <i key={type} className={styles.tagType}>{type}</i>)}
          </span>
          {opening.shortDesc && <small>{opening.shortDesc}</small>}
          <span className={styles.waitInline}>
            <i />
            <b>{waitCount.toLocaleString('ru-RU')}</b>
            <span>{waitWord(waitCount)}</span>
          </span>
        </span>
      </Link>

      <div className={`${styles.countdown} ${opened ? styles.openedCountdown : ''}`}>
        <span className={styles.miniTitle}>{opened ? 'Статус' : 'До открытия'}</span>
        {opened ? (
          <div className={styles.openedState}>
            <strong>Открылся</strong>
            <span>Запуск уже доступен</span>
          </div>
        ) : (
          <div className={styles.timeGrid}>
            {[
              ['дня', parts[0]],
              ['часов', parts[1]],
              ['минут', parts[2]],
              ['секунд', parts[3]],
            ].map(([label, value]) => (
              <span key={label} className={styles.timeCell}>
                <strong>{value}</strong>
                <small>{label}</small>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className={styles.openInfo}>
        <span className={styles.miniTitle}>Дата старта</span>
        <strong>{formatOpenDate(opening.openedAt)}</strong>
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.waitBtn} ${waited ? styles.waitBtnActive : ''}`}
            disabled={waitDisabled}
            onClick={() => onWait(opening)}
          >
            {opened ? 'Открылся' : waiting ? '...' : waited ? 'Жду' : 'Жду'}
          </button>
          <Link href={`/servers/${opening.serverId}`} className={styles.followBtn}>Подробнее</Link>
          {opened && <span className={styles.openedAction} title="Открытие уже состоялось">✓</span>}
        </div>
      </div>
    </article>
  );
}

function RailOpeningIcon({ opening }: { opening: Pick<Opening, 'icon' | 'abbr' | 'projectName'> }) {
  return (
    <span className={styles.railLogo}>
      {opening.icon
        ? <img src={catalogAssetSrc(opening.icon)} alt="" loading="lazy" decoding="async" onError={e => handleCatalogImageError(e.currentTarget as HTMLImageElement)} />
        : <span>{(opening.abbr || opening.projectName.slice(0, 2)).toUpperCase()}</span>}
    </span>
  );
}

function ComingSoonRail({
  topExpected,
  articles,
}: {
  topExpected: Array<Opening & { waitCount: number }>;
  articles: Article[];
}) {
  return (
    <aside className={styles.rightRail} aria-label="Сводка открытий">
      <section className={styles.railSection}>
        <div className={styles.railHead}>
          <h2>Топ ожидаемых</h2>
          <span>за неделю</span>
        </div>
        <div className={styles.railList}>
          {topExpected.length > 0 ? topExpected.map((opening, index) => (
            <Link key={opening.key} href={`/servers/${opening.serverId}`} className={styles.railVoteItem}>
              <span className={styles.railRank}>{index + 1}</span>
              <RailOpeningIcon opening={opening} />
              <span className={styles.railText}>
                <strong>{opening.projectName}</strong>
                <em>{opening.chronicle} · {opening.rates}</em>
              </span>
              <span className={styles.railVotes}>{opening.waitCount > 0 ? opening.waitCount.toLocaleString('ru-RU') : formatShortDate(opening.openedAt)}</span>
            </Link>
          )) : (
            <span className={styles.railEmpty}>Здесь появятся серверы, которые игроки чаще всего ждут на этой неделе.</span>
          )}
        </div>
      </section>

      <section className={`${styles.railSection} ${styles.notifySection}`}>
        <div className={styles.railHead}>
          <h2>Следить за стартами</h2>
        </div>
        <p>Короткие новости об открытиях будем дублировать в соцсетях L2Realm.</p>
        <div className={styles.notifyLinks}>
          <a href={TELEGRAM_URL} target="_blank" rel="noopener">TG</a>
          <a href={VK_URL} target="_blank" rel="noopener">VK</a>
          <Link href="/contacts">Добавить</Link>
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
            <span className={styles.railEmpty}>Свежие статьи скоро появятся здесь.</span>
          )}
        </div>
      </section>
    </aside>
  );
}

export function ComingSoonClient({ initialServers, initialArticles, initialNow }: { initialServers: Server[]; initialArticles: Article[]; initialNow: number }) {
  const openings = useMemo(() => flattenOpenings(initialServers), [initialServers]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(8);
  const [sort, setSort] = useState('date');
  const [filters, setFilters] = useState<Filters>({ chronicle: '', rate: '', type: '', opens: '' });
  const [now, setNow] = useState(initialNow);
  const [waitCounts, setWaitCounts] = useState<Record<string, number>>({});
  const [waitedKeys, setWaitedKeys] = useState<Record<string, boolean>>({});
  const [waitingKey, setWaitingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setWaitCounts(Object.fromEntries(openings.map(opening => [opening.key, opening.waitsWeek])));
  }, [openings]);

  useEffect(() => {
    const keys = openings.map(opening => opening.key);
    if (keys.length === 0) return;
    api.openingWaits.status(keys).then(setWaitedKeys).catch(() => {});
  }, [openings]);

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;
  const counts = useMemo(() => ({
    chronicle: countBy(openings, o => o.chronicle),
    rate: countBy(openings, o => rateRange(o.rateNum)),
    type: countBy(openings, o => o.type),
    opens: countBy(openings, o => openingBucket(o.openedAt, now)),
  }), [openings, now]);

  const filtered = useMemo(() => {
    const data = applyFilters(openings, filters, now);
    return [...data].sort((a, b) => {
      if (a.isVip !== b.isVip) return a.isVip ? -1 : 1;
      if (sort === 'name') return a.projectName.localeCompare(b.projectName, 'ru');
      return new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime();
    });
  }, [filters, now, openings, sort]);

  const visible = filtered.slice(0, visibleCount);
  const featured = visible.filter(opening => opening.isVip);
  const regular = visible.filter(opening => !opening.isVip);
  const totalWaits = openings.reduce((sum, opening) => sum + (waitCounts[opening.key] ?? opening.waitsWeek ?? 0), 0);
  const futureOpenings = openings.filter(opening => !isOpened(opening.openedAt, now));
  const nearestDays = futureOpenings.length > 0
    ? Math.min(...futureOpenings.map(opening => daysUntilValue(opening.openedAt, now)))
    : null;
  const topExpected = useMemo(() => {
    const withCounts = openings.map(opening => ({ ...opening, waitCount: waitCounts[opening.key] ?? opening.waitsWeek ?? 0 }));
    const ranked = withCounts
      .filter(opening => opening.waitCount > 0)
      .sort((a, b) => {
      if (b.waitCount !== a.waitCount) return b.waitCount - a.waitCount;
      return new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime();
    })
      .slice(0, 5);

    if (ranked.length > 0) return ranked;
    return stableShuffleOpenings(withCounts, weekSalt()).slice(0, 5);
  }, [openings, waitCounts]);

  function toggleFilter(group: keyof Filters, value: string) {
    setFilters(prev => ({ ...prev, [group]: prev[group] === value ? '' : value }));
    setVisibleCount(8);
  }

  function resetFilters() {
    setFilters({ chronicle: '', rate: '', type: '', opens: '' });
    setVisibleCount(8);
  }

  async function handleWait(opening: Opening) {
    if (isOpened(opening.openedAt, Date.now()) || waitedKeys[opening.key] || waitingKey) return;
    setWaitingKey(opening.key);
    try {
      const result = await api.openingWaits.wait({ serverId: opening.serverId, instanceId: opening.instanceId ?? null });
      setWaitCounts(prev => ({ ...prev, [opening.key]: result.count }));
      setWaitedKeys(prev => ({ ...prev, [opening.key]: true }));
      setToast(result.counted ? 'Отметили, что ты ждешь открытие.' : 'Ты уже ждешь это открытие на этой неделе.');
    } catch (error: any) {
      setToast(error?.message || 'Не получилось отметить ожидание. Попробуй позже.');
    } finally {
      setWaitingKey(null);
      window.setTimeout(() => setToast(null), 2800);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <button
          type="button"
          className={`${styles.filtersToggle} ${filtersOpen ? styles.filtersToggleOpen : ''}`}
          onClick={() => setFiltersOpen(v => !v)}
          aria-expanded={filtersOpen}
        >
          <span>Фильтры</span>
          {activeFiltersCount > 0 && <span className={styles.filtersCount}>{activeFiltersCount}</span>}
          <span className={styles.filtersToggleIcon}>▾</span>
        </button>

        <div className={styles.layout}>
          <aside className={`${styles.sidebar} ${filtersOpen ? styles.sidebarOpen : ''}`}>
            <div className={styles.sidebarHead}>
              {activeFiltersCount > 0 && <button type="button" onClick={resetFilters}>Сбросить</button>}
            </div>

            <FilterGroup label="Хроники">
              {CHRONICLES.filter(c => counts.chronicle[c] > 0).slice(0, 8).map(c => (
                <FilterItem key={c} label={c} count={counts.chronicle[c]} active={filters.chronicle === c} onClick={() => toggleFilter('chronicle', c)} />
              ))}
            </FilterGroup>

            <FilterGroup label="Рейты">
              {RATES.filter(r => counts.rate[r.v] > 0).map(r => (
                <FilterItem key={r.v} label={r.l} count={counts.rate[r.v]} active={filters.rate === r.v} onClick={() => toggleFilter('rate', r.v)} />
              ))}
            </FilterGroup>

            <FilterGroup label="Тип сервера">
              {[
                { v: 'pvp', l: 'PvP' },
                { v: 'pve', l: 'PvE' },
                { v: 'pvp-pve', l: 'PvP / PvE' },
                { v: 'multicraft', l: 'Craft-PvP' },
                { v: 'rvr', l: 'RolePlay' },
              ].filter(t => counts.type[t.v] > 0).map(t => (
                <FilterItem key={t.v} label={t.l} count={counts.type[t.v]} active={filters.type === t.v} onClick={() => toggleFilter('type', t.v)} />
              ))}
            </FilterGroup>

            <FilterGroup label="До даты открытия">
              {[
                { v: 'opened', l: 'Открылся' },
                { v: '3', l: 'До 3 дней' },
                { v: '7', l: '3 - 7 дней' },
                { v: '14', l: '7 - 14 дней' },
                { v: 'more', l: 'Больше 14 дней' },
              ].filter(o => counts.opens[o.v] > 0).map(o => (
                <FilterItem key={o.v} label={o.l} count={counts.opens[o.v]} active={filters.opens === o.v} onClick={() => toggleFilter('opens', o.v)} />
              ))}
            </FilterGroup>
          </aside>

          <section className={styles.content}>
            <section className={styles.hero}>
              <div className={styles.heroCopy}>
                <h1>Скоро открытие серверов <span>Lineage 2</span></h1>
                <p>Новые миры уже на подходе. Выбери сервер, следи за новостями и стань одним из первых!</p>
                <div className={styles.heroStats}>
                  <span><strong>{openings.length}</strong><em>открытий</em></span>
                  <span><strong>{openings.filter(opening => opening.isVip).length}</strong><em>рекомендуем</em></span>
                  <span><strong>{totalWaits.toLocaleString('ru-RU')}</strong><em>ждут</em></span>
                  <span><strong>{nearestDays === null ? '—' : nearestDays === 0 ? 'сегодня' : `${nearestDays} дн.`}</strong><em>ближайший старт</em></span>
                </div>
              </div>

              <label className={styles.sortWrap}>
                <span>Сортировать:</span>
                <select value={sort} onChange={e => setSort(e.target.value)}>
                  <option value="date">По дате открытия</option>
                  <option value="name">По названию</option>
                </select>
              </label>
            </section>

            {openings.length === 0 ? (
              <div className={styles.empty}>
                <strong>Пока нет ожидаемых серверов</strong>
                <span>Когда появятся будущие открытия, они будут здесь.</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className={styles.empty}>
                <strong>По фильтрам ничего не найдено</strong>
                <span>Измени параметры или убери активные фильтры сверху.</span>
              </div>
            ) : (
              <>
                {featured.length > 0 && (
                  <div className={styles.featuredRows}>
                    {featured.map(opening => (
                      <OpeningRow
                        key={opening.key}
                        opening={opening}
                        now={now}
                        featured
                        waitCount={waitCounts[opening.key] ?? opening.waitsWeek ?? 0}
                        waited={!!waitedKeys[opening.key]}
                        waiting={waitingKey === opening.key}
                        onWait={handleWait}
                      />
                    ))}
                  </div>
                )}

                <div className={styles.rows}>
                  {regular.map(opening => (
                    <OpeningRow
                      key={opening.key}
                      opening={opening}
                      now={now}
                      waitCount={waitCounts[opening.key] ?? opening.waitsWeek ?? 0}
                      waited={!!waitedKeys[opening.key]}
                      waiting={waitingKey === opening.key}
                      onWait={handleWait}
                    />
                  ))}
                </div>
                {visible.length < filtered.length && (
                  <button type="button" className={styles.moreBtn} onClick={() => setVisibleCount(v => v + 8)}>
                    Загрузить еще <span>⊙</span>
                  </button>
                )}
              </>
            )}
          </section>

          <ComingSoonRail topExpected={topExpected} articles={initialArticles} />
        </div>
      </div>
      {toast && <div className={styles.toast}>{toast}</div>}
    </main>
  );
}
