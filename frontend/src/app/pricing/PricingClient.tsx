'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { isOpeningStillSoon } from '@/lib/opening';
import type { Server, ServerInstance, VipStatus } from '@/lib/types';
import {
  BOOST_DAYS,
  BOOST_PRICE,
  COMING_SOON_PRICE,
  SOON_VIP_MAX,
  SOON_VIP_PRICE,
  VIP_DAYS,
  VIP_MAX,
  VIP_PRICE,
} from '@/lib/types';
import styles from './page.module.css';

type BuyKind = 'vip' | 'boost' | 'soon_vip';

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

type PlanCardProps = {
  tone: 'free' | 'vip' | 'boost' | 'soon' | 'soonVip';
  badge: string;
  title: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  button: React.ReactNode;
  note?: React.ReactNode;
  ribbon?: string;
};

function hasOpenedLaunch(s: Server): boolean {
  const now = Date.now();
  if (s.openedDate && !isOpeningStillSoon(s.openedDate, now)) return true;

  const insts = s.instances ?? [];
  let hasDatedInstance = false;
  for (const i of insts) {
    if (!i.openedDate) continue;
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

function formatRub(value: number) {
  return value.toLocaleString('ru-RU') + '₽';
}

function PlanCard({ tone, badge, title, price, period, description, features, button, note, ribbon }: PlanCardProps) {
  return (
    <article className={`${styles.planCard} ${styles[`plan_${tone}`]}`}>
      {ribbon && <span className={styles.ribbon}>{ribbon}</span>}
      <div className={styles.planBadge}>{badge}</div>
      <div className={styles.planPrice}>
        <strong>{price}</strong>
        <span>{period}</span>
      </div>
      <p className={styles.planDescription}>{description}</p>
      <h2>{title}</h2>
      <ul className={styles.featureList}>
        {features.map(item => <li key={item}>{item}</li>)}
      </ul>
      {note && <div className={styles.planNote}>{note}</div>}
      <div className={styles.planAction}>{button}</div>
    </article>
  );
}

export function PricingClient() {
  const { user, token } = useAuth();
  const [vip, setVip] = useState<VipStatus | null>(null);
  const [soonVip, setSoonVip] = useState<VipStatus | null>(null);
  const [vipLoading, setVipLoading] = useState(true);
  const [servers, setServers] = useState<Server[]>([]);
  const [soonServers, setSoonServers] = useState<Server[]>([]);
  const [selectedServerId, setSelectedServerId] = useState('');
  const [selectedSoon, setSelectedSoon] = useState<SoonOpening | null>(null);
  const [pickerMode, setPickerMode] = useState<BuyKind | null>(null);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState<BuyKind | null>(null);

  useEffect(() => {
    Promise.all([api.payments.vipStatus(), api.payments.soonVipStatus()])
      .then(([main, soon]) => {
        setVip(main);
        setSoonVip(soon);
        setVipLoading(false);
      })
      .catch(() => setVipLoading(false));
    api.servers.list({ limit: '500' }).then(r => setServers(r.data)).catch(() => {});
    api.servers.comingSoon().then(setSoonServers).catch(() => {});
  }, []);

  const paidServers = useMemo(() => servers.filter(hasOpenedLaunch), [servers]);
  const soonOpenings = useMemo(() => flattenSoonOpenings(soonServers).filter(o => !o.isVip), [soonServers]);
  const vipFull = (vip?.taken ?? 0) >= VIP_MAX;
  const soonVipFull = (soonVip?.taken ?? 0) >= SOON_VIP_MAX;
  const activePickerIsSoon = pickerMode === 'soon_vip';

  const filteredServers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return paidServers.slice(0, 60);
    return paidServers.filter(s => projectSearchText(s).includes(q)).slice(0, 60);
  }, [paidServers, query]);

  const filteredSoon = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return soonOpenings.slice(0, 60);
    return soonOpenings.filter(o =>
      o.projectName.toLowerCase().includes(q) ||
      (o.label ?? '').toLowerCase().includes(q) ||
      o.chronicle.toLowerCase().includes(q) ||
      o.rates.toLowerCase().includes(q)
    ).slice(0, 60);
  }, [query, soonOpenings]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(''), 3500);
  }

  function openPicker(mode: BuyKind) {
    if (!token || !user) {
      showToast('Войдите, чтобы оплатить тариф');
      return;
    }
    setPickerMode(mode);
    setQuery('');
  }

  async function buy(kind: 'vip' | 'boost', serverId = selectedServerId) {
    if (!token || !user) return showToast('Войдите, чтобы оплатить тариф');
    if (!serverId) return openPicker(kind);
    setBusy(kind);
    try {
      const res = await api.payments.purchase({ kind, serverId, returnUrl: window.location.href }, token);
      if (res.confirmationUrl) {
        window.location.href = res.confirmationUrl;
        return;
      }
      if (res.activated) {
        showToast(kind === 'boost' ? 'Буст активирован' : 'VIP активирован');
        const [freshVip, freshSoonVip] = await Promise.all([api.payments.vipStatus(), api.payments.soonVipStatus()]);
        setVip(freshVip);
        setSoonVip(freshSoonVip);
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ошибка оплаты');
    } finally {
      setBusy(null);
    }
  }

  async function buySoonVip(opening = selectedSoon) {
    if (!token || !user) return showToast('Войдите, чтобы оплатить тариф');
    if (!opening) return openPicker('soon_vip');
    setBusy('soon_vip');
    try {
      const res = await api.payments.purchase({
        kind: 'soon_vip',
        serverId: opening.serverId,
        instanceId: opening.instanceId,
        returnUrl: window.location.href,
      }, token);
      if (res.confirmationUrl) {
        window.location.href = res.confirmationUrl;
        return;
      }
      if (res.activated) {
        showToast('VIP в «Скоро открытие» активирован');
        const [freshSoonVip, freshSoonServers] = await Promise.all([api.payments.soonVipStatus(), api.servers.comingSoon()]);
        setSoonVip(freshSoonVip);
        setSoonServers(freshSoonServers);
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ошибка оплаты');
    } finally {
      setBusy(null);
    }
  }

  function handlePickServer(server: Server) {
    setSelectedServerId(server.id);
    const mode = pickerMode;
    setPickerMode(null);
    if (mode === 'vip' || mode === 'boost') {
      buy(mode, server.id);
    }
  }

  function handlePickSoon(opening: SoonOpening) {
    setSelectedSoon(opening);
    setPickerMode(null);
    buySoonVip(opening);
  }

  return (
    <main className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1>Размещение <span>сервера</span></h1>
          <p>Короткая страница для владельцев проектов: бесплатное добавление, буст, VIP и отдельное размещение будущих открытий.</p>
        </div>
      </section>

      <div className={styles.wrap}>
        <section className={styles.plans} aria-label="Тарифы L2Realm">
          <PlanCard
            tone="free"
            badge="Бесплатно"
            title="Базовое размещение"
            price="0₽"
            period="/ навсегда"
            description="Сервер появляется в общем каталоге и получает свою страницу."
            features={[
              'Размещение в общем списке',
              'Карточка сервера',
              'Описание, хроники и рейты',
              'Голосование',
              'Базовая статистика',
            ]}
            button={<Link href="/add" className={`${styles.cardButton} ${styles.buttonFree}`}>Добавить сервер</Link>}
          />

          <PlanCard
            tone="boost"
            badge="Буст"
            title="Быстрый буст"
            price={formatRub(BOOST_PRICE)}
            period={`/ ${BOOST_DAYS} дней`}
            description="Поднимите сервер выше обычных карточек на короткий срок."
            features={[
              'Поднятие в топ каталога',
              'Выделение цветом',
              'Увеличение просмотров',
              'Быстрый прирост игроков',
              'Доступно раз в неделю',
            ]}
            button={
              <button className={`${styles.cardButton} ${styles.buttonBoost}`} onClick={() => openPicker('boost')} disabled={busy === 'boost'}>
                {busy === 'boost' ? 'Подождите...' : 'Выбрать тариф'}
              </button>
            }
          />

          <PlanCard
            tone="soon"
            badge="Скоро"
            title="Анонс открытия"
            price={formatRub(COMING_SOON_PRICE)}
            period="/ разово"
            description="Размещение будущего открытия в отдельной вкладке."
            features={[
              'Попадание в «Скоро открытие»',
              'Дата и время открытия',
              'Таймер до старта',
              'Фильтры по хроникам и рейтам',
              'Переход на сайт проекта',
            ]}
            button={<Link href="/add" className={`${styles.cardButton} ${styles.buttonSoon}`}>Оформить</Link>}
          />

          <PlanCard
            tone="soonVip"
            badge="VIP Скоро"
            title="VIP в открытии"
            price={formatRub(SOON_VIP_PRICE)}
            period={`/ ${VIP_DAYS} день`}
            description="VIP-выделение конкретного будущего запуска в разделе «Скоро открытие»."
            features={[
              'Все из тарифа «Скоро»',
              'VIP-метка в списке открытий',
              'Приоритет над обычными анонсами',
              'Акцентная карточка',
              'Больше внимания перед стартом',
            ]}
            ribbon="Хит"
            note={<span>{vipLoading ? 'Проверяем места...' : `Мест VIP Скоро: ${soonVip?.taken ?? 0}/${SOON_VIP_MAX}`}</span>}
            button={
              <button className={`${styles.cardButton} ${styles.buttonPremium}`} onClick={() => openPicker('soon_vip')} disabled={busy === 'soon_vip' || soonVipFull}>
                {busy === 'soon_vip' ? 'Подождите...' : soonVipFull ? 'Все места заняты' : 'Выбрать тариф'}
              </button>
            }
          />

          <PlanCard
            tone="vip"
            badge="VIP"
            title="VIP-размещение"
            price={formatRub(VIP_PRICE)}
            period={`/ ${VIP_DAYS} день`}
            description="Выделение сервера в VIP-блоке на главной странице."
            features={[
              'Выделенный VIP-блок',
              'Золотая рамка',
              'Приоритет в каталоге',
              'VIP-метка в карточке',
              'Место на 31 день',
            ]}
            note={<span>{vipLoading ? 'Проверяем места...' : `Мест VIP: ${vip?.taken ?? 0}/${VIP_MAX}`}</span>}
            button={
              <button className={styles.cardButton} onClick={() => openPicker('vip')} disabled={busy === 'vip' || vipFull}>
                {busy === 'vip' ? 'Подождите...' : vipFull ? 'Все места заняты' : 'Выбрать тариф'}
              </button>
            }
          />
        </section>

        <section className={styles.extra}>
          <div>
            <h2>Дополнительные возможности</h2>
            <p>То, что уже помогает серверу на L2Realm без отдельной покупки.</p>
          </div>
          <div className={styles.extraGrid}>
            <span><b>★</b> Сервер недели<br /><small>по голосам игроков</small></span>
            <span><b>⚔</b> Голосование<br /><small>API для бонусов</small></span>
            <span><b>◆</b> Карточка проекта<br /><small>описание и контакты</small></span>
            <span><b>♡</b> Избранное<br /><small>сохранение проекта</small></span>
            <span><b>◇</b> SEO-страница<br /><small>описание и ссылки</small></span>
          </div>
        </section>

        <p className={styles.ofertaNote}>
          Оплачивая услугу, вы соглашаетесь с условиями <Link href="/legal">публичной оферты</Link>.
          Цены на странице соответствуют текущим тарифам L2Realm.
        </p>
      </div>

      {pickerMode && (
        <div className={styles.modalBackdrop} onMouseDown={() => setPickerMode(null)}>
          <div className={styles.modal} onMouseDown={e => e.stopPropagation()}>
            <button className={styles.modalClose} type="button" onClick={() => setPickerMode(null)} aria-label="Закрыть">×</button>
            <h2>{activePickerIsSoon ? 'Выберите будущий запуск' : 'Выберите сервер'}</h2>
            <p>
              {activePickerIsSoon
                ? 'VIP в «Скоро открытие» покупается на конкретный запуск проекта.'
                : `Тариф ${pickerMode === 'vip' ? 'VIP' : 'Буст'} будет применен к выбранному серверу.`}
            </p>
            <input
              className={styles.modalSearch}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Поиск по названию, хронике или рейтам..."
              autoFocus
            />
            <div className={styles.pickList}>
              {activePickerIsSoon ? (
                filteredSoon.length === 0 ? (
                  <div className={styles.pickEmpty}>Нет доступных будущих запусков</div>
                ) : filteredSoon.map(opening => (
                  <button key={opening.key} type="button" className={styles.pickItem} onClick={() => handlePickSoon(opening)}>
                    <strong>{opening.projectName}{opening.label ? ` · ${opening.label}` : ''}</strong>
                    <span>{opening.chronicle} · {opening.rates} · открытие {new Date(opening.openedAt).toLocaleDateString('ru-RU')}</span>
                  </button>
                ))
              ) : (
                filteredServers.length === 0 ? (
                  <div className={styles.pickEmpty}>Ничего не найдено</div>
                ) : filteredServers.map(server => (
                  <button key={server.id} type="button" className={styles.pickItem} onClick={() => handlePickServer(server)}>
                    <strong>{projectPickerLabel(server)}</strong>
                    <span>{projectPickerMeta(server)}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
