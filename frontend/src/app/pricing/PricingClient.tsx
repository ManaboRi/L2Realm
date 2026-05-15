'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { isOpeningStillSoon } from '@/lib/opening';
import type { Server, ServerInstance, VipStatus } from '@/lib/types';
import { VIP_PRICE, VIP_DAYS, VIP_MAX, BOOST_PRICE, BOOST_DAYS, COMING_SOON_PRICE, SOON_VIP_PRICE, SOON_VIP_MAX } from '@/lib/types';
import styles from './page.module.css';

type SoonOpening = {
  key: string;
  serverId: string;
  instanceId?: string | null;
  projectName: string;
  label?: string;
  chronicle: string;
  rates: string;
  openedAt: string;
  isVip: boolean;
};

function hasOpenedLaunch(s: Server): boolean {
  const now = Date.now();
  if (s.openedDate) {
    const t = new Date(s.openedDate).getTime();
    if (!Number.isNaN(t) && !isOpeningStillSoon(s.openedDate, now)) return true;
  }

  const insts = s.instances ?? [];
  let hasDatedInstance = false;
  for (const i of insts) {
    if (!i.openedDate) continue;
    const t = new Date(i.openedDate).getTime();
    if (Number.isNaN(t)) continue;
    hasDatedInstance = true;
    if (!isOpeningStillSoon(i.openedDate, now)) return true;
  }

  if (insts.length === 0 && !s.openedDate) return true;
  if (insts.length > 0 && !s.openedDate && !hasDatedInstance) return true;
  return false;
}

function hasProjectLaunches(s: Server): boolean {
  return (s.instances?.length ?? 0) > 0;
}

function projectPickerLabel(s: Server): string {
  return hasProjectLaunches(s) ? s.name : `${s.name} (${s.chronicle} · ${s.rates})`;
}

function projectPickerMeta(s: Server): string {
  if (!hasProjectLaunches(s)) return `${s.chronicle} · ${s.rates}`;
  const count = s.instances?.length ?? 0;
  return `${count} запусков в проекте`;
}

function projectSearchText(s: Server): string {
  const insts = s.instances ?? [];
  return [
    s.id,
    s.name,
    s.chronicle,
    s.rates,
    ...insts.flatMap(i => [i.id, i.label, i.chronicle, i.rates]),
  ].filter(Boolean).join(' ').toLowerCase();
}

function flattenSoonOpenings(servers: Server[]): SoonOpening[] {
  const now = Date.now();
  const result: SoonOpening[] = [];
  for (const s of servers) {
    const insts: ServerInstance[] = Array.isArray(s.instances) ? s.instances : [];
    const futureInsts = insts.filter(i => isOpeningStillSoon(i.openedDate, now));
    const serverVip = s.subscription?.plan === 'VIP' && !!s.subscription.endDate && new Date(s.subscription.endDate).getTime() > now;

    if (futureInsts.length > 0) {
      for (const i of futureInsts) {
        result.push({
          key: `${s.id}::${i.id}`,
          serverId: s.id,
          instanceId: i.id,
          projectName: s.name,
          label: i.label,
          chronicle: i.chronicle,
          rates: i.rates,
          openedAt: i.openedDate!,
          isVip: !!i.soonVipUntil && new Date(i.soonVipUntil).getTime() > now,
        });
      }
    } else if (isOpeningStillSoon(s.openedDate, now)) {
      result.push({
        key: s.id,
        serverId: s.id,
        instanceId: null,
        projectName: s.name,
        chronicle: s.chronicle,
        rates: s.rates,
        openedAt: s.openedDate!,
        isVip: serverVip,
      });
    }
  }
  return result.sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime());
}

export function PricingClient() {
  const { user, token } = useAuth();
  const [vip, setVip] = useState<VipStatus | null>(null);
  const [soonVip, setSoonVip] = useState<VipStatus | null>(null);
  const [vipLoading, setVipLoading] = useState(true);
  const [servers, setServers] = useState<Server[]>([]);
  const [soonServers, setSoonServers] = useState<Server[]>([]);
  const [sel, setSel] = useState<string>('');
  const [query, setQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [soonSel, setSoonSel] = useState<SoonOpening | null>(null);
  const [soonQuery, setSoonQuery] = useState('');
  const [soonPickerOpen, setSoonPickerOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const soonPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([api.payments.vipStatus(), api.payments.soonVipStatus()])
      .then(([main, soon]) => { setVip(main); setSoonVip(soon); setVipLoading(false); })
      .catch(() => setVipLoading(false));
    api.servers.list({ limit: '500' }).then(r => setServers(r.data)).catch(() => {});
    api.servers.comingSoon().then(setSoonServers).catch(() => {});
  }, []);

  // Закрывать выпадашку при клике снаружи
  useEffect(() => {
    if (!pickerOpen && !soonPickerOpen) return;
    function onClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
      if (soonPickerRef.current && !soonPickerRef.current.contains(e.target as Node)) {
        setSoonPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [pickerOpen, soonPickerOpen]);

  const selectedServer = servers.find(s => s.id === sel);
  const paidServers = useMemo(() => servers.filter(hasOpenedLaunch), [servers]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return paidServers.slice(0, 50);
    return paidServers.filter(s => projectSearchText(s).includes(q)).slice(0, 50);
  }, [paidServers, query]);
  const soonOpenings = useMemo(() => flattenSoonOpenings(soonServers).filter(o => !o.isVip), [soonServers]);
  const filteredSoonOpenings = useMemo(() => {
    const q = soonQuery.trim().toLowerCase();
    if (!q) return soonOpenings.slice(0, 50);
    return soonOpenings.filter(o =>
      o.projectName.toLowerCase().includes(q) ||
      (o.label ?? '').toLowerCase().includes(q) ||
      o.chronicle.toLowerCase().includes(q) ||
      o.rates.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [soonOpenings, soonQuery]);

  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(''), 3500);
  }

  async function buy(kind: 'vip' | 'boost') {
    if (!token || !user) return showToast('Войдите, чтобы совершить покупку (чек придёт на ваш email)');
    if (!sel) return showToast('Выберите сервер');
    setBusy(kind);
    try {
      const res = await api.payments.purchase({ kind, serverId: sel, returnUrl: window.location.href }, token);
      if (res.confirmationUrl) { window.location.href = res.confirmationUrl; return; }
      if (res.activated) {
        showToast(kind === 'boost' ? 'Буст активирован' : 'VIP активирован');
        const [freshVip, freshSoonVip] = await Promise.all([api.payments.vipStatus(), api.payments.soonVipStatus()]);
        setVip(freshVip);
        setSoonVip(freshSoonVip);
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ошибка');
    }
    setBusy(null);
  }

  async function buySoonVip() {
    if (!token || !user) return showToast('Войдите, чтобы совершить покупку (чек придёт на ваш email)');
    if (!soonSel) {
      setSoonPickerOpen(true);
      return showToast('Выберите запуск в «Скоро открытие»');
    }
    setBusy('soon_vip');
    try {
      const res = await api.payments.purchase({
        kind: 'soon_vip',
        serverId: soonSel.serverId,
        instanceId: soonSel.instanceId,
        returnUrl: window.location.href,
      }, token);
      if (res.confirmationUrl) { window.location.href = res.confirmationUrl; return; }
      if (res.activated) {
        showToast('VIP Скоро активирован');
        const [freshSoonVip, freshSoonServers] = await Promise.all([api.payments.soonVipStatus(), api.servers.comingSoon()]);
        setSoonVip(freshSoonVip);
        setSoonServers(freshSoonServers);
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ошибка');
    }
    setBusy(null);
  }

  const vipFull = (vip?.taken ?? 0) >= VIP_MAX;
  const soonVipFull = (soonVip?.taken ?? 0) >= SOON_VIP_MAX;
  const regularBuyLocked = !selectedServer;

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      <div className={styles.hero}>
        <p className={styles.heroEye}>◆ Тарифы и продвижение ◆</p>
        <h1 className={styles.heroTitle}>Продвижение <em>сервера</em></h1>
        <p className={styles.heroSub}>
          Размещение уже открытого сервера в каталоге — бесплатное. Ниже три платных способа получить больше видимости.
        </p>
      </div>

      <div className={styles.wrap}>
        <div className={`${styles.serverPick} ${!selectedServer ? styles.serverPickAttention : ''}`}>
          <label className={styles.pickLabel}>Сначала выберите открытый сервер для VIP или буста</label>
          <div ref={pickerRef} className={styles.picker}>
            <input
              className={`input ${styles.pickerInput}`}
              value={pickerOpen ? query : (selectedServer ? projectPickerLabel(selectedServer) : '')}
              onChange={e => { setQuery(e.target.value); setPickerOpen(true); }}
              onFocus={() => { setQuery(''); setPickerOpen(true); }}
              placeholder="Начните вводить название, хронику или рейты…"
            />
            {sel && (
              <button
                type="button"
                className={styles.pickerClear}
                onClick={() => { setSel(''); setQuery(''); setPickerOpen(true); }}
                title="Сбросить выбор"
              >×</button>
            )}
            {pickerOpen && (
              <div className={styles.pickerList}>
                {filtered.length === 0 ? (
                  <div className={styles.pickerEmpty}>Ничего не найдено</div>
                ) : (
                  filtered.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      className={`${styles.pickerItem} ${s.id === sel ? styles.pickerItemActive : ''}`}
                      onClick={() => { setSel(s.id); setPickerOpen(false); setQuery(''); }}
                    >
                      <span className={styles.pickerItemName}>{s.name}</span>
                      <span className={styles.pickerItemMeta}>{projectPickerMeta(s)}</span>
                    </button>
                  ))
                )}
                {paidServers.length > filtered.length && !query && (
                  <div className={styles.pickerEmpty}>Показаны первые {filtered.length} — уточните поиском</div>
                )}
              </div>
            )}
          </div>
          <p className={styles.pickHint}>
            Для VIP «Скоро открытие» ниже есть отдельный выбор конкретного будущего запуска.
          </p>
        </div>

        <div className={styles.tiers}>

          {/* VIP */}
          <div className={`${styles.tier} ${styles.tierVip} ${regularBuyLocked ? styles.tierDisabled : ''}`}>
            <div className={styles.tierHead}>
              <span className={styles.tierBadge}>◆ VIP</span>
              <span className={styles.tierPrice}>{VIP_PRICE.toLocaleString('ru-RU')} ₽<span className={styles.priceSub}> / {VIP_DAYS} дн.</span></span>
            </div>
            <h2 className={styles.tierTitle}>Отдельный VIP-блок на главной</h2>
            <p className={styles.tierDesc}>
              Ваш сервер — в выделенном блоке на главной, выше всех остальных, с подсветкой и бейджем VIP.
              Всего {VIP_MAX} мест, условия одинаковые.
            </p>
            <ul className={styles.tierList}>
              <li>Выделенный блок «VIP Серверы» в самом верху каталога</li>
              <li>Золотая обводка и бейдж VIP на карточке</li>
              <li>Страница сервера без ограничений</li>
              <li>Бесплатное место в каталоге сохраняется после окончания</li>
            </ul>

            <div className={styles.slotsBox}>
              <div className={styles.slotsLine}>
                <span>Мест занято:</span>
                <strong className={vipFull ? styles.slotsFull : styles.slotsFree}>
                  {vipLoading ? '…' : `${vip?.taken ?? 0} из ${VIP_MAX}`}
                </strong>
              </div>
              {vipFull && vip?.nextFreeAt && (
                <div className={styles.slotsLine}>
                  <span>Ближайшее освободится:</span>
                  <strong>{new Date(vip.nextFreeAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                </div>
              )}
              {!vipFull && vip && (
                <div className={styles.slotsHint}>
                  {VIP_MAX - vip.taken} свободн{VIP_MAX - vip.taken === 1 ? 'о' : 'о'} прямо сейчас.
                </div>
              )}
            </div>

            <button
              className="btn-primary"
              onClick={() => buy('vip')}
              disabled={busy === 'vip' || vipFull || regularBuyLocked}
              style={{ padding: '.6rem 1.4rem', alignSelf: 'flex-start' }}
            >
              {busy === 'vip' ? <span className="spin" /> : vipFull ? 'Все места заняты' : regularBuyLocked ? 'Выберите сервер выше' : `Купить VIP за ${VIP_PRICE.toLocaleString('ru-RU')} ₽`}
            </button>
          </div>

          {/* Буст */}
          <div className={`${styles.tier} ${styles.tierBoost} ${regularBuyLocked ? styles.tierDisabled : ''}`}>
            <div className={styles.tierHead}>
              <span className={`${styles.tierBadge} ${styles.badgeBoost}`}>🔥 Буст</span>
              <span className={styles.tierPrice}>{BOOST_PRICE} ₽<span className={styles.priceSub}> / {BOOST_DAYS} дн.</span></span>
            </div>
            <h2 className={styles.tierTitle}>Поднять сервер в топ на неделю</h2>
            <p className={styles.tierDesc}>
              Точечная реклама без длинных подписок. Сервер поднимается выше обычных в каталоге,
              получает метку огонька 🔥 и подсветку.
            </p>
            <ul className={styles.tierList}>
              <li>Выше всех не-VIP серверов в каталоге</li>
              <li>Огонёк 🔥 с анимацией на карточке</li>
              <li>Оранжево-красная акцентная линия</li>
              <li>Продление суммируется — можно держать в топе сколько нужно</li>
            </ul>

            <button
              className="btn-primary"
              onClick={() => buy('boost')}
              disabled={busy === 'boost' || regularBuyLocked}
              style={{ padding: '.6rem 1.4rem', alignSelf: 'flex-start' }}
            >
              {busy === 'boost' ? <span className="spin" /> : regularBuyLocked ? 'Выберите сервер выше' : `Купить буст за ${BOOST_PRICE} ₽`}
            </button>
          </div>

          {/* Скоро открытие */}
          <div className={`${styles.tier} ${styles.tierSod}`}>
            <div className={styles.tierHead}>
              <span className={`${styles.tierBadge} ${styles.badgeSod}`}>⏳ Скоро открытие</span>
              <span className={styles.tierPrice}>{COMING_SOON_PRICE.toLocaleString('ru-RU')} ₽<span className={styles.priceSub}> / разово</span></span>
            </div>
            <h2 className={styles.tierTitle}>Платное размещение анонса</h2>
            <p className={styles.tierDesc}>
              Если ваш сервер ещё не открылся — оплатите размещение в разделе «Скоро открытие».
              После оплаты заявка уйдёт на модерацию, а после одобрения будет показываться там до даты открытия.
            </p>
            <ul className={styles.tierList}>
              <li>Размещение в специальном блоке «Скоро открытие»</li>
              <li>Бейдж «Оплачено» и контакт видны администратору в заявке</li>
              <li>Виден до даты открытия, потом переходит в каталог</li>
              <li>Можно сразу подключить VIP/буст после открытия</li>
            </ul>
            <Link
              href="/add"
              className="btn-primary"
              style={{ padding: '.6rem 1.4rem', alignSelf: 'flex-start', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
            >
              Оформить за {COMING_SOON_PRICE.toLocaleString('ru-RU')} ₽ →
            </Link>
          </div>

          {/* VIP Скоро открытие */}
          <div className={`${styles.tier} ${styles.tierSoonVip}`}>
            <div className={styles.tierHead}>
              <span className={`${styles.tierBadge} ${styles.badgeSoonVip}`}>◆ VIP Скоро</span>
              <span className={styles.tierPrice}>{SOON_VIP_PRICE.toLocaleString('ru-RU')} ₽<span className={styles.priceSub}> / {VIP_DAYS} дн.</span></span>
            </div>
            <h2 className={styles.tierTitle}>VIP-блок в разделе «Скоро открытие»</h2>
            <p className={styles.tierDesc}>
              Для серверов с будущей датой открытия: отдельный верхний блок в /coming-soon, золотая подсветка и приоритет над обычными анонсами.
              Всего {SOON_VIP_MAX} мест.
            </p>
            <ul className={styles.tierList}>
              <li>Отдельный VIP-блок над обычными ожидаемыми серверами</li>
              <li>Премиальная карточка с бейджем VIP и акцентом на дату открытия</li>
              <li>Работает для проекта или конкретного будущего запуска внутри проекта</li>
              <li>Обычное размещение «Скоро открытие» остаётся отдельной услугой</li>
            </ul>

            <div className={styles.slotsBox}>
              <div className={styles.slotsLine}>
                <span>Мест занято:</span>
                <strong className={soonVipFull ? styles.slotsFull : styles.slotsFree}>
                  {vipLoading ? '…' : `${soonVip?.taken ?? 0} из ${SOON_VIP_MAX}`}
                </strong>
              </div>
              {soonVipFull && soonVip?.nextFreeAt && (
                <div className={styles.slotsLine}>
                  <span>Ближайшее освободится:</span>
                  <strong>{new Date(soonVip.nextFreeAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                </div>
              )}
              <div ref={soonPickerRef} className={styles.picker}>
                <input
                  className={`input ${styles.pickerInput}`}
                  value={soonPickerOpen ? soonQuery : (soonSel ? `${soonSel.projectName}${soonSel.label ? ` · ${soonSel.label}` : ''} (${soonSel.chronicle} · ${soonSel.rates})` : '')}
                  onChange={e => { setSoonQuery(e.target.value); setSoonPickerOpen(true); }}
                  onFocus={() => { setSoonQuery(''); setSoonPickerOpen(true); }}
                  placeholder="Найти запуск в «Скоро открытие»..."
                />
                {soonSel && (
                  <button
                    type="button"
                    className={styles.pickerClear}
                    onClick={() => { setSoonSel(null); setSoonQuery(''); setSoonPickerOpen(true); }}
                    title="Сбросить выбор"
                  >×</button>
                )}
                {soonPickerOpen && (
                  <div className={styles.pickerList}>
                    {filteredSoonOpenings.length === 0 ? (
                      <div className={styles.pickerEmpty}>Нет свободных запусков для VIP</div>
                    ) : (
                      filteredSoonOpenings.map(o => (
                        <button
                          key={o.key}
                          type="button"
                          className={`${styles.pickerItem} ${o.key === soonSel?.key ? styles.pickerItemActive : ''}`}
                          onClick={() => { setSoonSel(o); setSoonPickerOpen(false); setSoonQuery(''); }}
                        >
                          <span className={styles.pickerItemName}>{o.projectName}{o.label ? ` · ${o.label}` : ''}</span>
                          <span className={styles.pickerItemMeta}>
                            {o.chronicle} · {o.rates} · открытие {new Date(o.openedAt).toLocaleDateString('ru-RU')}
                          </span>
                        </button>
                      ))
                    )}
                    {soonOpenings.length > filteredSoonOpenings.length && !soonQuery && (
                      <div className={styles.pickerEmpty}>Показаны первые {filteredSoonOpenings.length} — уточните поиском</div>
                    )}
                  </div>
                )}
              </div>
              <div className={styles.slotsHint}>VIP покупается на конкретный запуск, а не на весь проект сразу.</div>
            </div>

            <button
              className="btn-primary"
              onClick={buySoonVip}
              disabled={busy === 'soon_vip' || soonVipFull}
              style={{ padding: '.6rem 1.4rem', alignSelf: 'flex-start' }}
            >
              {busy === 'soon_vip' ? <span className="spin" /> : soonVipFull ? 'Все места заняты' : !soonSel ? 'Выберите запуск' : `Купить VIP Скоро за ${SOON_VIP_PRICE.toLocaleString('ru-RU')} ₽`}
            </button>
          </div>

        </div>

        <div className={styles.faq}>
          <h3 className={styles.faqTitle}>Частые вопросы</h3>

          <details className={styles.faqItem}>
            <summary>Что будет, когда VIP закончится?</summary>
            <p>Сервер автоматически вернётся в бесплатный список. Данные, отзывы и статистика сохраняются.</p>
          </details>

          <details className={styles.faqItem}>
            <summary>Можно купить буст поверх VIP?</summary>
            <p>Буст работает только вне VIP-блока — VIP и так выше всех, дополнительное продвижение не нужно.</p>
          </details>

          <details className={styles.faqItem}>
            <summary>Как платить?</summary>
            <p>Через ЮKassa (карта, СБП, кошельки). После подтверждения платежа всё активируется автоматически — в течение нескольких секунд.</p>
          </details>

          <details className={styles.faqItem}>
            <summary>Как получить услугу после оплаты?</summary>
            <p>Ничего дополнительно делать не нужно. После успешной оплаты сервер автоматически попадает в VIP-блок или получает метку буста. Подтверждение (чек) приходит на email, указанный при оплате.</p>
          </details>

          <details className={styles.faqItem}>
            <summary>Есть возврат?</summary>
            <p>Да — условия возврата описаны в <Link href="/legal" style={{ color: 'var(--gold)' }}>публичной оферте</Link>. Для запроса напишите в <a href="https://t.me/ManaboRi" target="_blank" rel="noopener" style={{ color: 'var(--gold)' }}>Telegram @ManaboRi</a>.</p>
          </details>
        </div>

        <p className={styles.ofertaNote}>
          Оплачивая услугу, вы соглашаетесь с условиями <Link href="/legal" style={{ color: 'var(--gold)' }}>публичной оферты</Link>.
          Реквизиты исполнителя и порядок возврата — там же.
        </p>
      </div>
    </div>
  );
}
