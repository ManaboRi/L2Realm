'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { Server, ServerInstance, ServerType } from '@/lib/types';
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
};

type Filters = {
  chronicle: string;
  rate: string;
  type: string;
  opens: string;
};

const typeLabels = new Map(SERVER_TYPES.map(t => [t.v, t.l]));

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

function FilterFooter() {
  return (
    <div className={styles.filterFooter}>
      <Link href="/pricing" className={styles.filterAddBtn}>Добавить сервер</Link>
    </div>
  );
}

function OpeningRow({
  opening,
  now,
  reminderActive,
  reminderBusy,
  onToggleReminder,
}: {
  opening: Opening;
  now: number;
  reminderActive: boolean;
  reminderBusy: boolean;
  onToggleReminder: (opening: Opening) => void;
}) {
  const parts = countdownParts(opening.openedAt, now);
  const opened = isOpened(opening.openedAt, now);
  const types = opening.type.map(t => typeLabels.get(t as ServerType)).filter(Boolean).slice(0, 2);

  return (
    <article className={`${styles.rowCard} ${opening.isVip ? styles.vipRow : ''} ${opened ? styles.openedRow : ''}`}>
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
          <Link href={`/servers/${opening.serverId}`} className={styles.followBtn}>Подробнее</Link>
          {opened ? (
            <span className={styles.openedAction} title="Открытие уже состоялось">✓</span>
          ) : (
            <button
              type="button"
              className={`${styles.bellBtn} ${reminderActive ? styles.bellBtnActive : ''}`}
              title={reminderActive ? 'Напоминание включено' : 'Напомнить за час до открытия'}
              aria-label={reminderActive ? 'Отключить напоминание' : 'Напомнить за час до открытия'}
              disabled={reminderBusy}
              onClick={() => onToggleReminder(opening)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function ComingSoonClient({ initialServers }: { initialServers: Server[] }) {
  const openings = useMemo(() => flattenOpenings(initialServers), [initialServers]);
  const { token } = useAuth();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(8);
  const [sort, setSort] = useState('date');
  const [filters, setFilters] = useState<Filters>({ chronicle: '', rate: '', type: '', opens: '' });
  const [now, setNow] = useState(Date.now());
  const [reminderKeys, setReminderKeys] = useState<Set<string>>(new Set());
  const [reminderBusy, setReminderBusy] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!token) {
      setReminderKeys(new Set());
      return;
    }
    api.openingReminders.keys(token)
      .then(keys => setReminderKeys(new Set(keys)))
      .catch(() => {});
  }, [token]);

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

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  }

  function toggleFilter(group: keyof Filters, value: string) {
    setFilters(prev => ({ ...prev, [group]: prev[group] === value ? '' : value }));
    setVisibleCount(8);
  }

  function resetFilters() {
    setFilters({ chronicle: '', rate: '', type: '', opens: '' });
    setVisibleCount(8);
  }

  async function toggleReminder(opening: Opening) {
    if (!token) {
      showToast('Войдите, чтобы включить напоминание');
      return;
    }
    if (reminderBusy) return;
    const key = opening.key;
    const active = reminderKeys.has(key);
    setReminderBusy(key);
    try {
      if (active) {
        await api.openingReminders.remove(opening.serverId, opening.instanceId, token);
        setReminderKeys(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        showToast('Напоминание отключено');
      } else {
        await api.openingReminders.add({ serverId: opening.serverId, instanceId: opening.instanceId }, token);
        setReminderKeys(prev => new Set(prev).add(key));
        showToast('Напомним за час до открытия');
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Не удалось сохранить напоминание');
    } finally {
      setReminderBusy('');
    }
  }

  return (
    <main className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}
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

            <FilterFooter />
          </aside>

          <section className={styles.content}>
            <section className={styles.hero}>
              <div className={styles.heroCopy}>
                <h1>Скоро открытие серверов <span>Lineage 2</span></h1>
                <p>Новые миры уже на подходе. Выбери сервер, следи за новостями и стань одним из первых!</p>
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
                <div className={styles.rows}>
                  {visible.map(opening => (
                    <OpeningRow
                      key={opening.key}
                      opening={opening}
                      now={now}
                      reminderActive={reminderKeys.has(opening.key)}
                      reminderBusy={reminderBusy === opening.key}
                      onToggleReminder={toggleReminder}
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
        </div>
      </div>
    </main>
  );
}
