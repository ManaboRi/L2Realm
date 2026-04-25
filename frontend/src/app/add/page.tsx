'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import styles from './page.module.css';

export default function AddServerPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [toast,   setToast]   = useState('');

  const [form, setForm] = useState({
    name:       '',
    chronicle:  '',
    rates:      '',
    url:        '',
    openedDate: '',
    contact:    '',
  });

  // Платный flow активен, если дата открытия в будущем
  const isFutureDate = !!(form.openedDate && new Date(form.openedDate) > new Date());

  function upd(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }

  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(''), 5000);
  }

  async function submit() {
    if (!token) return;
    if (!form.name.trim() || !form.chronicle || !form.rates.trim() || !form.url.trim()) {
      showToast('Заполните название, хронику, рейты и URL');
      return;
    }

    // Платный flow для «Скоро открытие»
    if (isFutureDate) {
      if (!form.contact.trim()) {
        showToast('Укажите контакт (TG/VK) — мы свяжемся с вами после оплаты');
        return;
      }
      setLoading(true);
      try {
        const res = await api.payments.purchaseSoon(
          { ...form, returnUrl: window.location.origin + '/coming-soon' },
          token,
        );
        if (res.confirmationUrl) { window.location.href = res.confirmationUrl; return; }
        if (res.activated) {
          showToast('Оплата получена. Заявка ушла на модерацию (до 24 часов).');
          setTimeout(() => router.push('/'), 1800);
        }
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Ошибка при оформлении');
      }
      setLoading(false);
      return;
    }

    // Бесплатный flow — обычная заявка
    setLoading(true);
    try {
      await api.servers.request(form, token);
      showToast('Заявка отправлена! Модерация до 24 часов.');
      setTimeout(() => router.push('/'), 1800);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ошибка при отправке');
    }
    setLoading(false);
  }

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      <div className={styles.hero}>
        <p className={styles.heroEye}>◆ Добавить сервер ◆</p>
        <h1 className={styles.heroTitle}>Разместить <em>сервер</em></h1>
        <p className={styles.heroSub}>Размещение бесплатное. Модерация до 24 часов.</p>
      </div>

      <div className={styles.wrap}>

        {/* Кнопка «в ТГ» — всегда видна */}
        <div style={{ marginBottom: '1.2rem', textAlign: 'center' }}>
          <a
            href="https://t.me/ManaboRi"
            target="_blank"
            rel="noopener"
            className="btn-ghost"
            style={{ padding: '.45rem 1.1rem', fontSize: '.82rem', display: 'inline-flex', alignItems: 'center', gap: '.45rem' }}
          >
            ✈️ Вопросы? Написать в Telegram
          </a>
        </div>

        {!user ? (
          <div className={styles.card}>
            <div className={styles.cardTitle}>Войдите, чтобы подать заявку</div>
            <p className={styles.cardSub}>
              Для защиты от спама заявки принимаются только от авторизованных пользователей.
              С одного аккаунта — не чаще 1 заявки за 24 часа.
            </p>
            <p style={{ fontSize: '.84rem', color: 'var(--text2)', margin: '1rem 0 .4rem' }}>
              Откройте любую страницу каталога и нажмите «Войти» в шапке — вход через VK в один клик.
            </p>
            <Link href="/" style={{ color: 'var(--gold)', fontSize: '.84rem' }}>← Вернуться в каталог</Link>
          </div>
        ) : (
          <div className={styles.card}>
            <div className={styles.cardTitle}>Данные сервера</div>
            <p className={styles.cardSub}>
              Нужен минимум: название, хроника, рейты, ссылка на сайт и дата открытия.
              Описание, иконку, баннер и соцсети добавим уже после одобрения.
              Продвижение (VIP, буст) — на <Link href="/pricing" style={{ color: 'var(--gold)' }}>странице тарифов</Link>.
            </p>

            <div className={styles.form}>
              <div className={styles.row2}>
                <Field label="Название *">
                  <input
                    className="input"
                    value={form.name}
                    onChange={e => upd('name', e.target.value)}
                    placeholder="L2Fantasy"
                    maxLength={60}
                  />
                </Field>
                <Field label="Хроника *">
                  <select className="input" value={form.chronicle} onChange={e => upd('chronicle', e.target.value)}>
                    <option value="">— Выберите —</option>
                    {['Interlude','High Five','Classic','Essence','Gracia','Другая'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </Field>
              </div>
              <div className={styles.row2}>
                <Field label="Рейты *">
                  <input className="input" value={form.rates} onChange={e => upd('rates', e.target.value)} placeholder="x100, x50…" />
                </Field>
                <Field label="Сайт (URL) *">
                  <input className="input" type="url" value={form.url} onChange={e => upd('url', e.target.value)} placeholder="https://…" />
                </Field>
              </div>
              <Field label="Дата открытия (или планируемая)">
                <input
                  className="input"
                  type="date"
                  value={form.openedDate}
                  onChange={e => upd('openedDate', e.target.value)}
                />
                <p style={{ fontSize: '.72rem', color: 'var(--text3)', margin: '.2rem 0 0' }}>
                  Если ещё не открылся — укажите будущую дату, попадёт в блок «Скоро».
                </p>
              </Field>

              {/* Контакт нужен только для платного flow «Скоро открытие» */}
              {isFutureDate && (
                <Field label="Контакт для связи (TG/VK) *">
                  <input
                    className="input"
                    value={form.contact}
                    onChange={e => upd('contact', e.target.value)}
                    placeholder="@yourhandle или vk.com/id…"
                  />
                  <p style={{ fontSize: '.72rem', color: 'var(--text3)', margin: '.2rem 0 0' }}>
                    Свяжемся с вами после оплаты, чтобы согласовать детали анонса (иконка, описание).
                  </p>
                </Field>
              )}

              {/* Баннер про платное размещение — появляется когда дата в будущем */}
              {isFutureDate && (
                <div style={{ background: 'rgba(200,168,75,.08)', border: '1px solid var(--gold-d)', borderRadius: 3, padding: '.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: '.78rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
                    ⏳ Скоро открытие — платное размещение
                  </div>
                  <p style={{ fontSize: '.84rem', color: 'var(--text2)', margin: 0, lineHeight: 1.55 }}>
                    Сервер с датой открытия в будущем размещается в разделе «Скоро открытие» за 1 000 ₽ разово.
                    После оплаты заявка попадёт на быструю модерацию (до 24 часов) — после одобрения сервер
                    появится в разделе и будет показываться там до даты открытия.
                  </p>
                </div>
              )}

              <button
                className="btn-primary"
                style={{ alignSelf: 'flex-end', padding: '.5rem 1.8rem', marginTop: '.4rem' }}
                onClick={submit}
                disabled={loading}
              >
                {loading
                  ? <span className="spin" />
                  : isFutureDate
                    ? 'Оплатить размещение — 1 000 ₽'
                    : 'Отправить заявку'}
              </button>

              <p className={styles.note}>
                {isFutureDate
                  ? 'После оплаты через ЮKassa заявка автоматически уходит на модерацию (до 24 часов). После одобрения сервер появится в разделе «Скоро открытие». Чек придёт на email из вашего профиля.'
                  : 'Одна заявка с аккаунта раз в 24 часа. После одобрения сервер появится в каталоге — все детали (описание, иконка, соцсети) мы добавим сами.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      {children}
    </div>
  );
}
