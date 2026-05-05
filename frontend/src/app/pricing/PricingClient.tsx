'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Server, VipStatus } from '@/lib/types';
import { VIP_PRICE, VIP_DAYS, VIP_MAX, BOOST_PRICE, BOOST_DAYS, COMING_SOON_PRICE, SOON_VIP_PRICE, SOON_VIP_MAX } from '@/lib/types';
import styles from './page.module.css';

export function PricingClient() {
  const { user, token } = useAuth();
  const [vip, setVip] = useState<VipStatus | null>(null);
  const [soonVip, setSoonVip] = useState<VipStatus | null>(null);
  const [vipLoading, setVipLoading] = useState(true);
  const [servers, setServers] = useState<Server[]>([]);
  const [sel, setSel] = useState<string>('');
  const [query, setQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([api.payments.vipStatus(), api.payments.soonVipStatus()])
      .then(([main, soon]) => { setVip(main); setSoonVip(soon); setVipLoading(false); })
      .catch(() => setVipLoading(false));
    api.servers.list({ limit: '500' }).then(r => setServers(r.data)).catch(() => {});
  }, []);

  // Закрывать выпадашку при клике снаружи
  useEffect(() => {
    if (!pickerOpen) return;
    function onClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [pickerOpen]);

  const selectedServer = servers.find(s => s.id === sel);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return servers.slice(0, 50);
    return servers.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.chronicle.toLowerCase().includes(q) ||
      s.rates.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [servers, query]);

  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(''), 3500);
  }

  async function buy(kind: 'vip' | 'boost' | 'soon_vip') {
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

  const vipFull = (vip?.taken ?? 0) >= VIP_MAX;
  const soonVipFull = (soonVip?.taken ?? 0) >= SOON_VIP_MAX;
  const selectedIsComingSoon = !!selectedServer && (
    (selectedServer.openedDate && new Date(selectedServer.openedDate) > new Date()) ||
    (selectedServer.instances ?? []).some(i => i.openedDate && new Date(i.openedDate) > new Date())
  );

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
        <div className={styles.serverPick}>
          <label className={styles.pickLabel}>Ваш сервер</label>
          <div ref={pickerRef} className={styles.picker}>
            <input
              className={`input ${styles.pickerInput}`}
              value={pickerOpen ? query : (selectedServer ? `${selectedServer.name} (${selectedServer.chronicle} · ${selectedServer.rates})` : '')}
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
                      <span className={styles.pickerItemMeta}>{s.chronicle} · {s.rates}</span>
                    </button>
                  ))
                )}
                {servers.length > filtered.length && !query && (
                  <div className={styles.pickerEmpty}>Показаны первые {filtered.length} — уточните поиском</div>
                )}
              </div>
            )}
          </div>
          <p className={styles.pickHint}>
            Сервера нет в списке? Сначала <Link href="/add" style={{ color: 'var(--gold)' }}>подайте заявку</Link> — после одобрения вернитесь сюда.
          </p>
        </div>

        <div className={styles.tiers}>

          {/* VIP */}
          <div className={`${styles.tier} ${styles.tierVip}`}>
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
              disabled={busy === 'vip' || vipFull}
              style={{ padding: '.6rem 1.4rem', alignSelf: 'flex-start' }}
            >
              {busy === 'vip' ? <span className="spin" /> : vipFull ? 'Все места заняты' : `Купить VIP за ${VIP_PRICE.toLocaleString('ru-RU')} ₽`}
            </button>
          </div>

          {/* Буст */}
          <div className={`${styles.tier} ${styles.tierBoost}`}>
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
              disabled={busy === 'boost'}
              style={{ padding: '.6rem 1.4rem', alignSelf: 'flex-start' }}
            >
              {busy === 'boost' ? <span className="spin" /> : `Купить буст за ${BOOST_PRICE} ₽`}
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
              {!selectedIsComingSoon && (
                <div className={styles.slotsHint}>Выберите сервер с будущей датой открытия.</div>
              )}
            </div>

            <button
              className="btn-primary"
              onClick={() => buy('soon_vip')}
              disabled={busy === 'soon_vip' || soonVipFull || !selectedIsComingSoon}
              style={{ padding: '.6rem 1.4rem', alignSelf: 'flex-start' }}
            >
              {busy === 'soon_vip' ? <span className="spin" /> : soonVipFull ? 'Все места заняты' : `Купить VIP Скоро за ${SOON_VIP_PRICE.toLocaleString('ru-RU')} ₽`}
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
