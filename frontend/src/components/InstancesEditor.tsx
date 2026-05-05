'use client';
import { useId, useMemo } from 'react';
import type { ServerInstance } from '@/lib/types';
import { CHRONICLES } from '@/lib/types';
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
    url:        '',
    openedDate: null,
  };
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
        <span className={styles.title}>Сервера в проекте ({list.length})</span>
        <button type="button" className={styles.addBtn} onClick={add}>
          + Добавить запуск
        </button>
      </div>

      {list.length === 0 ? (
        <p className={styles.empty}>
          Нет внутренних запусков. Это будет обычный одиночный сервер. Добавь
          запуски если у проекта несколько ответвлений (x10, x100, x1000 и т.п.).
        </p>
      ) : (
        <ul className={styles.list}>
          {list.map((inst, idx) => (
            <li key={inst.id} className={styles.item}>
              <div className={styles.itemHead}>
                <span className={styles.itemNum}>#{idx + 1}</span>
                <div className={styles.itemActions}>
                  <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} title="Выше">↑</button>
                  <button type="button" onClick={() => move(idx, 1)} disabled={idx === list.length - 1} title="Ниже">↓</button>
                  <button type="button" onClick={() => remove(idx)} className={styles.removeBtn} title="Удалить">✕</button>
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
                  <span>Дата открытия (если в будущем — попадёт в «Скоро»)</span>
                  <input
                    className="input"
                    type="date"
                    value={inst.openedDate ? String(inst.openedDate).slice(0, 10) : ''}
                    onChange={e => update(idx, { openedDate: e.target.value || null })}
                  />
                </label>
              </div>

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
          ))}
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
