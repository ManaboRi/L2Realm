'use client';
import { useId, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { ServerInstance } from '@/lib/types';
import { CHRONICLES, DONATE_OPTIONS, SERVER_TYPES } from '@/lib/types';
import styles from './InstancesEditor.module.css';

interface Props {
  value:    ServerInstance[];
  onChange: (next: ServerInstance[]) => void;
  token?:   string | null;
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
    donate:     'cosmetic',
    url:        '',
    openedDate: null,
    lifecycleStatus: 'active',
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

export function InstancesEditor({ value, onChange, token }: Props) {
  const uid = useId();
  const [checking, setChecking] = useState<Record<string, boolean>>({});
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

  async function checkOnline(idx: number) {
    const inst = list[idx];
    if (!inst) return;
    const mode = inst.onlineMode || 'off';
    if (mode === 'off') return;

    if (!token) {
      update(idx, { onlineStatus: 'error', onlineError: 'Нужно войти админом' });
      return;
    }

    const key = inst.id || String(idx);
    setChecking(prev => ({ ...prev, [key]: true }));
    try {
      const result = await api.servers.testOnlineSource({
        mode,
        manual: inst.onlineManual ?? null,
        chronicle: inst.chronicle,
        rates: inst.rates,
        rateNum: inst.rateNum,
        instanceId: inst.id,
        observedAt: inst.onlineEstimatedAt ?? null,
        sourceUrl: inst.onlineSourceUrl || inst.url,
        listPath: inst.onlineListPath || 'props.pageProps.home.servers',
        matchField: inst.onlineMatchField || 'name',
        matchValue: inst.onlineMatchValue || inst.label || inst.rates,
        valuePath: inst.onlineValuePath || 'online',
        jsonVar: inst.onlineJsonVar || '__promoServerOnline',
        itemIndex: inst.onlineItemIndex ?? 0,
        regex: inst.onlineRegex || '',
        regexGroup: inst.onlineRegexGroup ?? 1,
      }, token);

      update(idx, {
        onlineValue: result.online,
        onlineUpdatedAt: result.checkedAt,
        onlineStatus: 'ok',
        onlineError: null,
        ...(result.usedListPath ? { onlineListPath: result.usedListPath } : {}),
        ...(result.valuePath ? { onlineValuePath: result.valuePath } : {}),
      });
    } catch (error) {
      update(idx, {
        onlineStatus: 'error',
        onlineError: error instanceof Error ? error.message : 'Не удалось проверить онлайн',
      });
    } finally {
      setChecking(prev => ({ ...prev, [key]: false }));
    }
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
                <label className={styles.field}>
                  <span>Донат *</span>
                  <select
                    className="input"
                    value={inst.donate === 'free' ? '' : (inst.donate ?? '')}
                    onChange={e => update(idx, { donate: (e.target.value || undefined) as ServerInstance['donate'] })}
                  >
                    <option value="">Не указан</option>
                    {DONATE_OPTIONS.map(d => <option key={d.v} value={d.v}>{d.l}</option>)}
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

              <div className={styles.row}>
                <label className={styles.field}>
                  <span>Состояние мира</span>
                  <select
                    className="input"
                    value={inst.lifecycleStatus ?? 'active'}
                    onChange={e => update(idx, { lifecycleStatus: e.target.value as ServerInstance['lifecycleStatus'] })}
                  >
                    <option value="active">Открыт</option>
                    <option value="upcoming">Скоро открытие</option>
                    <option value="merged">Объединён</option>
                    <option value="closed">Закрыт</option>
                    <option value="archived">Архив</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Примечание к статусу</span>
                  <input
                    className="input"
                    value={inst.statusNote ?? ''}
                    onChange={e => update(idx, { statusNote: e.target.value })}
                    placeholder="Например: объединён с Essence x20"
                    maxLength={160}
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

              <div className={styles.onlineBox}>
                <div className={styles.onlineHead}>
                  <span>Онлайн запуска</span>
                  {inst.onlineValue != null && <strong>{Number(inst.onlineValue).toLocaleString('ru-RU')}</strong>}
                </div>

                <div className={styles.row}>
                  <label className={styles.field}>
                    <span>Источник онлайна</span>
                    <select
                      className="input"
                      value={inst.onlineMode || 'off'}
                      onChange={e => {
                        const mode = e.target.value as ServerInstance['onlineMode'];
                        update(idx, {
                          onlineMode: mode,
                          ...(mode === 'estimated' ? {
                            onlineEstimatedAt: inst.onlineEstimatedAt || new Date().toISOString(),
                          } : {}),
                          ...(mode === 'next-json' ? {
                            onlineSourceUrl: inst.onlineSourceUrl || inst.url,
                            onlineListPath: inst.onlineListPath || 'props.pageProps.home.servers',
                            onlineMatchField: inst.onlineMatchField || 'name',
                            onlineMatchValue: inst.onlineMatchValue || inst.label || '',
                            onlineValuePath: inst.onlineValuePath || 'online',
                          } : {}),
                          ...(mode === 'html-json-var' ? {
                            onlineSourceUrl: inst.onlineSourceUrl || inst.url,
                            onlineJsonVar: inst.onlineJsonVar || '__promoServerOnline',
                            onlineItemIndex: inst.onlineItemIndex ?? 0,
                            onlineValuePath: inst.onlineValuePath || 'onlineCount',
                          } : {}),
                          ...(mode === 'html-regex' ? {
                            onlineSourceUrl: inst.onlineSourceUrl || inst.url,
                            onlineRegexGroup: inst.onlineRegexGroup ?? 1,
                          } : {}),
                        });
                      }}
                    >
                      <option value="off">Выключено</option>
                      <option value="manual">Ручной онлайн</option>
                      <option value="estimated">Оценочный онлайн</option>
                      <option value="next-json">Next.js / JSON</option>
                      <option value="html-json-var">HTML JSON-переменная</option>
                      <option value="html-regex">HTML / regex</option>
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span>{(inst.onlineMode || 'off') === 'estimated' ? 'Онлайн при оценке' : 'Ручное значение'}</span>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      value={inst.onlineManual ?? ''}
                      onChange={e => {
                        const checkedAt = new Date().toISOString();
                        update(idx, {
                          onlineManual: e.target.value === '' ? null : Number(e.target.value),
                          onlineValue: e.target.value === '' ? null : Number(e.target.value),
                          onlineUpdatedAt: checkedAt,
                          ...((inst.onlineMode || 'off') === 'estimated' ? { onlineEstimatedAt: checkedAt } : {}),
                        });
                      }}
                      placeholder="8663"
                      disabled={!['manual', 'estimated'].includes(inst.onlineMode || 'off')}
                    />
                  </label>
                </div>

                {(inst.onlineMode || 'off') === 'next-json' && (
                  <>
                    <label className={styles.field}>
                      <span>URL страницы или JSON</span>
                      <input
                        className="input"
                        type="url"
                        value={inst.onlineSourceUrl ?? ''}
                        onChange={e => update(idx, { onlineSourceUrl: e.target.value })}
                        placeholder="https://ru.scryde.game/"
                      />
                    </label>

                    <div className={styles.row}>
                      <label className={styles.field}>
                        <span>Путь к списку</span>
                        <input
                          className="input"
                          value={inst.onlineListPath ?? 'props.pageProps.home.servers'}
                          onChange={e => update(idx, { onlineListPath: e.target.value })}
                          placeholder="props.pageProps.home.servers"
                        />
                      </label>
                      <label className={styles.field}>
                        <span>Поле онлайна</span>
                        <input
                          className="input"
                          value={inst.onlineValuePath ?? 'online'}
                          onChange={e => update(idx, { onlineValuePath: e.target.value })}
                          placeholder="online"
                        />
                      </label>
                    </div>

                    <div className={styles.row}>
                      <label className={styles.field}>
                        <span>Искать по полю</span>
                        <input
                          className="input"
                          value={inst.onlineMatchField ?? 'name'}
                          onChange={e => update(idx, { onlineMatchField: e.target.value })}
                          placeholder="name или id"
                        />
                      </label>
                      <label className={styles.field}>
                        <span>Значение для поиска</span>
                        <input
                          className="input"
                          value={inst.onlineMatchValue ?? ''}
                          onChange={e => update(idx, { onlineMatchValue: e.target.value })}
                          placeholder="Скрайд Х50 или 51"
                        />
                      </label>
                    </div>
                  </>
                )}

                {(inst.onlineMode || 'off') === 'html-json-var' && (
                  <>
                    <label className={styles.field}>
                      <span>URL страницы</span>
                      <input
                        className="input"
                        type="url"
                        value={inst.onlineSourceUrl ?? ''}
                        onChange={e => update(idx, { onlineSourceUrl: e.target.value })}
                        placeholder="https://arcaneworld.biz/ru"
                      />
                    </label>

                    <div className={styles.row}>
                      <label className={styles.field}>
                        <span>JS переменная</span>
                        <input
                          className="input"
                          value={inst.onlineJsonVar ?? '__promoServerOnline'}
                          onChange={e => update(idx, { onlineJsonVar: e.target.value })}
                          placeholder="__promoServerOnline"
                        />
                      </label>
                      <label className={styles.field}>
                        <span>Номер в списке</span>
                        <input
                          className="input"
                          type="number"
                          min={0}
                          value={inst.onlineItemIndex ?? 0}
                          onChange={e => update(idx, { onlineItemIndex: Number(e.target.value) || 0 })}
                          placeholder="0"
                        />
                      </label>
                    </div>

                    <label className={styles.field}>
                      <span>Поле онлайна</span>
                      <input
                        className="input"
                        value={inst.onlineValuePath ?? 'onlineCount'}
                        onChange={e => update(idx, { onlineValuePath: e.target.value })}
                        placeholder="onlineCount"
                      />
                    </label>
                  </>
                )}

                {(inst.onlineMode || 'off') === 'html-regex' && (
                  <>
                    <label className={styles.field}>
                      <span>URL страницы</span>
                      <input
                        className="input"
                        type="url"
                        value={inst.onlineSourceUrl ?? ''}
                        onChange={e => update(idx, { onlineSourceUrl: e.target.value })}
                        placeholder="https://site.ru/"
                      />
                    </label>

                    <label className={styles.field}>
                      <span>Regex с числом в группе</span>
                      <input
                        className="input"
                        value={inst.onlineRegex ?? ''}
                        onChange={e => update(idx, { onlineRegex: e.target.value })}
                        placeholder="Онлайн:\\s*([0-9 ]+)"
                      />
                    </label>

                    <label className={styles.field}>
                      <span>Номер группы</span>
                      <input
                        className="input"
                        type="number"
                        min={0}
                        value={inst.onlineRegexGroup ?? 1}
                        onChange={e => update(idx, { onlineRegexGroup: Number(e.target.value) || 1 })}
                      />
                    </label>
                  </>
                )}

                <div className={styles.onlineActions}>
                  <button
                    type="button"
                    className={styles.checkBtn}
                    onClick={() => checkOnline(idx)}
                    disabled={(inst.onlineMode || 'off') === 'off' || checking[inst.id || String(idx)]}
                  >
                    {checking[inst.id || String(idx)] ? 'Проверяю...' : 'Проверить онлайн'}
                  </button>
                  {inst.onlineStatus === 'ok' && <span className={styles.onlineOk}>Источник работает</span>}
                  {inst.onlineStatus === 'error' && <span className={styles.onlineError}>{inst.onlineError || 'Ошибка источника'}</span>}
                  {inst.onlineUpdatedAt && <span className={styles.onlineMeta}>Обновлено: {new Date(inst.onlineUpdatedAt).toLocaleString('ru-RU')}</span>}
                </div>
              </div>

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
