'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import styles from './page.module.css';

export default function AddServerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [toast, setToast]     = useState('');

  const [form, setForm] = useState({
    name: '', chronicle: '', rates: '', url: '', icon: '', description: '', email: '',
  });

  function upd(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }

  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(''), 4000);
  }

  function validate() {
    if (!form.name.trim() || !form.chronicle || !form.rates.trim() || !form.url.trim()) {
      showToast('Заполните все обязательные поля'); return false;
    }
    return true;
  }

  async function submit() {
    if (!validate()) return;
    setLoading(true);
    try {
      await api.servers.request({ ...form, plan: 'free' });
      showToast('Заявка отправлена! Модерация до 24 часов.');
      setTimeout(() => router.push('/'), 2000);
    } catch (e: any) {
      showToast(e.message || 'Ошибка при отправке');
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
        <div className={styles.card}>
          <div className={styles.cardTitle}>Данные сервера</div>
          <p className={styles.cardSub}>
            Заявка попадёт на модерацию. Продвижение (VIP блок и буст «Огонёк») продаётся отдельно —
            подробности на <Link href="/pricing" style={{ color: 'var(--gold)' }}>странице тарифов</Link>.
          </p>

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
              {loading ? <span className="spin" /> : 'Отправить заявку'}
            </button>
            <p className={styles.note}>
              После одобрения сервер появится в каталоге. По вопросам —{' '}
              <a href="https://t.me/ManaboRi" target="_blank" rel="noopener" style={{ color: 'var(--gold)' }}>@ManaboRi</a>
            </p>
          </div>
        </div>
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
