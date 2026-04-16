'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { PLAN_INFO, type SubscriptionPlan } from '@/lib/types';
import styles from './page.module.css';

const VIP_MAX = 3;
const PLANS: SubscriptionPlan[] = ['free', 'standard', 'premium', 'vip'];

export default function AddServerPage() {
  const router = useRouter();
  const [step, setStep]       = useState<1 | 2>(1);
  const [plan, setPlan]       = useState<SubscriptionPlan>('free');
  const [loading, setLoading] = useState(false);
  const [toast, setToast]     = useState('');
  const [vipUsed, setVipUsed] = useState(0);

  const [form, setForm] = useState({
    name: '', chronicle: '', rates: '', url: '', icon: '', description: '', email: '',
  });

  useEffect(() => {
    api.servers.stats().then(s => setVipUsed(s.vip)).catch(() => {});
  }, []);

  function upd(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }

  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(''), 4000);
  }

  function validateStep2() {
    if (!form.name.trim() || !form.chronicle || !form.rates.trim() || !form.url.trim()) {
      showToast('Заполните все обязательные поля'); return false;
    }
    return true;
  }

  async function submit() {
    if (!validateStep2()) return;
    setLoading(true);
    try {
      await api.servers.request({ ...form, plan });
      showToast('Заявка отправлена! Мы свяжемся с вами.');
      setTimeout(() => router.push('/'), 2000);
    } catch (e: any) {
      showToast(e.message || 'Ошибка при отправке');
    }
    setLoading(false);
  }

  const vipFull = vipUsed >= VIP_MAX;

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      <div className={styles.hero}>
        <p className={styles.heroEye}>◆ Добавить сервер ◆</p>
        <h1 className={styles.heroTitle}>Разместить <em>сервер</em></h1>
        <p className={styles.heroSub}>Выберите тариф и заполните данные — модерация до 24 часов</p>
      </div>

      <div className={styles.wrap}>

        {/* Прогресс */}
        <div className={styles.steps}>
          <div className={`${styles.step} ${step >= 1 ? styles.stepDone : ''}`}>
            <span className={styles.stepNum}>1</span>
            <span>Тариф</span>
          </div>
          <div className={styles.stepLine} />
          <div className={`${styles.step} ${step >= 2 ? styles.stepDone : ''}`}>
            <span className={styles.stepNum}>2</span>
            <span>Данные сервера</span>
          </div>
        </div>

        {/* Шаг 1: тариф */}
        {step === 1 && (
          <div className={styles.card}>
            <div className={styles.cardTitle}>Выберите тариф</div>
            <p className={styles.cardSub}>Бесплатное размещение — без оплаты. Платные тарифы — свяжемся после заявки.</p>

            <div className={styles.tiers}>
              {PLANS.map(p => {
                const info  = PLAN_INFO[p];
                const isVip = p === 'vip';
                const disabled = isVip && vipFull;
                return (
                  <div
                    key={p}
                    className={`${styles.tier} ${p === plan ? styles.tierActive : ''} ${isVip ? styles.tierVip : ''} ${disabled ? styles.tierDisabled : ''}`}
                    onClick={() => { if (!disabled) setPlan(p); }}
                  >
                    <div className={styles.tierLeft}>
                      <div className={styles.tierName} style={{ color: info.color }}>{info.name}</div>
                      <div className={styles.tierWhat}>{info.what}</div>
                      {isVip && (
                        <div className={styles.vipSlots}>
                          {vipFull
                            ? '⛔ Все места заняты'
                            : `Свободно: ${VIP_MAX - vipUsed} из ${VIP_MAX} мест`}
                        </div>
                      )}
                    </div>
                    <div className={styles.tierPrice}>{info.price}</div>
                  </div>
                );
              })}
            </div>

            <button
              className="btn-primary"
              style={{ alignSelf: 'flex-end', padding: '.5rem 1.8rem' }}
              onClick={() => setStep(2)}
            >
              Далее → Данные сервера
            </button>
          </div>
        )}

        {/* Шаг 2: форма */}
        {step === 2 && (
          <div className={styles.card}>
            <button className={styles.backBtn} onClick={() => setStep(1)}>← Назад</button>
            <div className={styles.cardTitle} style={{ marginTop: '.7rem' }}>
              Данные сервера
              <span className={styles.selectedPlan} style={{ color: PLAN_INFO[plan].color }}>
                — {PLAN_INFO[plan].name}
              </span>
            </div>
            <div className={styles.form}>
              <div className={styles.row2}>
                <Field label="Название *">
                  <input className="input" value={form.name} onChange={e => upd('name', e.target.value)} placeholder="L2Fantasy" required />
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
              <Field label="Иконка (URL, необязательно)">
                <input className="input" type="url" value={form.icon} onChange={e => upd('icon', e.target.value)} placeholder="https://…" />
              </Field>
              <Field label="Ваш email для связи (необязательно)">
                <input className="input" type="email" value={form.email} onChange={e => upd('email', e.target.value)} placeholder="admin@example.com" />
              </Field>
              <Field label="Краткое описание (необязательно)">
                <textarea className="input" value={form.description} onChange={e => upd('description', e.target.value)} rows={3} placeholder="Пара предложений о сервере…" style={{ resize: 'vertical' }} />
              </Field>
              <button
                className="btn-primary"
                style={{ alignSelf: 'flex-end', padding: '.5rem 1.8rem' }}
                onClick={submit}
                disabled={loading}
              >
                {loading ? <span className="spin" /> : `Отправить заявку (${PLAN_INFO[plan].name})`}
              </button>
              <p className={styles.note}>
                После отправки мы свяжемся с вами через Telegram{' '}
                <a href="https://t.me/ManaboRi" target="_blank" rel="noopener" style={{ color: 'var(--gold)' }}>@ManaboRi</a>
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
