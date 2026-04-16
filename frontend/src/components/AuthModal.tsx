'use client';
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import styles from './AuthModal.module.css';

interface Props { open: boolean; onClose: () => void; }

export function AuthModal({ open, onClose }: Props) {
  const { login } = useAuth();
  const [tab,   setTab]   = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [pass,  setPass]  = useState('');
  const [name,  setName]  = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = tab === 'login'
        ? await api.auth.login(email, pass)
        : await api.auth.register({ email, password: pass, name });
      login(res.access_token, res.user);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Ошибка. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <button className={styles.close} onClick={onClose}>✕</button>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'login' ? styles.active : ''}`} onClick={() => setTab('login')}>Войти</button>
          <button className={`${styles.tab} ${tab === 'register' ? styles.active : ''}`} onClick={() => setTab('register')}>Регистрация</button>
        </div>
        <form onSubmit={submit} className={styles.form}>
          {tab === 'register' && (
            <input className="input" placeholder="Имя (необязательно)" value={name} onChange={e => setName(e.target.value)} />
          )}
          <input className="input" type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)} />
          <input className="input" type="password" placeholder="Пароль" required minLength={6} value={pass} onChange={e => setPass(e.target.value)} />
          {error && <p className={styles.error}>{error}</p>}
          <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '.5rem' }}>
            {loading ? <span className="spin" /> : tab === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>
      </div>
    </div>
  );
}
