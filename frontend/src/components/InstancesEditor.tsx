'use client';
import { useId, useMemo } from 'react';
import type { ServerInstance } from '@/lib/types';
import { CHRONICLES, SERVER_TYPES } from '@/lib/types';
import { worldLifecycle, worldLifecycleLabel } from '@/lib/project-metrics';
import styles from './InstancesEditor.module.css';

interface Props {
  value:    ServerInstance[];
  onChange: (next: ServerInstance[]) => void;
}

function newId(): string {
  // Простой uuid не нужен — главное стабильность для key. Date+random хватает.
  return `inst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyInstance(): ServerInstance {
  return {
    id:         newId(),
    label:      '',
    shortDesc:  '',
    chronicle:  '',
    rates:      '',
    rateNum:    0,
    type:       'pvp-pve',
    url:        '',
    openedDate: null,
    // Состояние не задаётся вручную: «Скоро»/«Открыт» считаются от даты открытия,
    // а «Архив» выставляется кнопкой архивации.
    lifecycleStatus: undefined,
    statusNote: '',
  };
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, '0');
  const utcMidnight = date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0;
  if (utcMidnight) {
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T00:00`;
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDateTimeLocal(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export function InstancesEditor({ value, onChange }: Props) {
  const uid = useId();
  const list = useMemo(() => Array.isArray(value) ? value : [], [value]);

  function update(idx: number, patch: Partial<ServerInstance>) {
    const next = list.map((it, i) => i === idx ? { ...it, ...patch } : it);
    onChange(next);
  }
  function remove(idx: number) {
    onChange(list.filter((_, i) => i !== idx));
  }
  function archive(idx: number) {
    update(idx, { lifecycleStatus: 'archived' });
  }
  function restore(idx: number) {
    update(idx, { lifecycleStatus: undefined });
  }
  function add() {
    onChange([...list, emptyInstance()]);
  }
  function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.title}>Миры и открытия ({list.length})</span>
        <button type="button" className={styles.addBtn} onClick={add}>
          + Добавить мир
        </button>
      </div>

      {list.length === 0 ? (
        <p className={styles.empty}>
          Нет отдельных миров. Проект будет показан как один запуск. Добавь миры,
          если нужно хранить текущие и прошлые открытия отдельно.
        </p>
      ) : (
        <ul className={styles.list}>
          {list.map((inst, idx) => {
            const lifecycle = worldLifecycle(inst);
            const isArchived = lifecycle === 'archived';
            const badgeColor = lifecycle === 'upcoming' ? '#d2ab52'
              : isArchived ? 'rgba(232,221,186,.5)'
              : '#6ee89e';
            return (
            <li key={inst.id} className={styles.item}>
              <div className={styles.itemHead}>
                <span className={styles.itemNum}>#{idx + 1}</span>
                <span
                  title="Статус считается автоматически по дате открытия (кроме архива)"
                  style={{
                    fontSize: '.66rem', fontWeight: 600, letterSpacing: '.02em',
                    padding: '.1rem .42rem', borderRadius: 999,
                    border: `1px solid ${badgeColor}`, color: badgeColor,
                    background: 'rgba(0,0,0,.18)',
                  }}
                >
                  {worldLifecycleLabel(inst)}
                </span>
                <div className={styles.itemActions}>
                  <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} title="Выше">↑</button>
                  <button type="button" onClick={() => move(idx, 1)} disabled={idx === list.length - 1} title="Ниже">↓</button>
                  {isArchived ? (
                    <>
                      <button type="button" onClick={() => restore(idx)} title="Вернуть из архива">↩</button>
                      <button type="button" onClick={() => remove(idx)} className={styles.removeBtn} title="Удалить навсегда">✕</button>
                    </>
                  ) : (
                    <button type="button" onClick={() => archive(idx)} className={styles.removeBtn} title="В архив (сохранить в истории проекта)">🗄</button>
                  )}
                </div>
              </div>

              <div className={styles.row}>
                <label className={styles.field}>
                  <span>Название (опционально)</span>
                  <input
                    className="input"
                    value={inst.label ?? ''}
                    onChange={e => update(idx, { label: e.target.value })}
                    placeholder='"Interlude PvP" или просто "x100"'
                  />
                </label>
                <label className={styles.field}>
                  <span>Хроника *</span>
                  <select
                    className="input"
                    value={inst.chronicle}
                    onChange={e => update(idx, { chronicle: e.target.value })}
                  >
                    <option value="">— Выбери —</option>
                    {CHRONICLES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </label>
              </div>

              <div className={styles.row}>
                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span>Тип сервера *</span>
                  <select
                    className="input"
                    value={inst.type ?? ''}
                    onChange={e => update(idx, { type: e.target.value as ServerInstance['type'] })}
                  >
                    <option value="">— Выбери —</option>
                    {SERVER_TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                  </select>
                </label>
              </div>

              <div className={styles.row}>
                <label className={styles.field}>
                  <span>Рейты (текст) *</span>
                  <input
                    className="input"
                    value={inst.rates}
                    onChange={e => update(idx, { rates: e.target.value })}
                    placeholder="x100"
                  />
                </label>
                <label className={styles.field}>
                  <span>rateNum (число) *</span>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    value={inst.rateNum || ''}
                    onChange={e => update(idx, { rateNum: Number(e.target.value) || 0 })}
                    placeholder="100"
                  />
                </label>
              </div>

              <div className={styles.row}>
                <label className={styles.field}>
                  <span>URL внешнего сайта *</span>
                  <input
                    className="input"
                    type="url"
                    value={inst.url}
                    onChange={e => update(idx, { url: e.target.value })}
                    placeholder="https://scryde.ru/x100"
                  />
                </label>
                <label className={styles.field}>
                  <span>Дата и время открытия (если в будущем — попадёт в «Скоро»)</span>
                  <input
                    className="input"
                    type="datetime-local"
                    value={toDateTimeLocal(inst.openedDate)}
                    onChange={e => update(idx, { openedDate: fromDateTimeLocal(e.target.value) })}
                  />
                </label>
              </div>

              {isArchived && (
                <label className={styles.field}>
                  <span>Примечание к архиву</span>
                  <input
                    className="input"
                    value={inst.statusNote ?? ''}
                    onChange={e => update(idx, { statusNote: e.target.value })}
                    placeholder="Например: объединён с Essence x20"
                    maxLength={160}
                  />
                </label>
              )}

              <label className={styles.field}>
                <span>Короткое описание (одна строка для карточки)</span>
                <input
                  className="input"
                  value={inst.shortDesc ?? ''}
                  onChange={e => update(idx, { shortDesc: e.target.value })}
                  placeholder="Хардкорный PvP с автофармом"
                  maxLength={140}
                />
              </label>

            </li>
            );
          })}
        </ul>
      )}

      <p className={styles.hint} id={`${uid}-hint`}>
        Каждый «запуск» — мини-карточка на странице проекта. Голоса/отзывы/рейтинг
        идут только проекту, у запусков своих нет. Клик по карточке ведёт на её
        внешний URL.
      </p>
    </div>
  );
}
