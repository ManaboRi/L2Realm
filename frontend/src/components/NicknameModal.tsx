'use client';
import { useState } from 'react';
import styles from './AuthModal.module.css';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

interface Props {
  open:      boolean;
  onClose?:  () => void;
  required?: boolean;
  initial?:  string;
  title?:    string;
  subtitle?: string;
}

const NICK_RE = /^[a-zA-Zа-яА-ЯёЁ0-9_\-]{3,16}$/;

export function NicknameModal({
  open,
  onClose,
  required = false,
  initial = '',
  title = 'Выбери никнейм',
  subtitle = 'Так тебя будут видеть другие игроки. 3–16 символов, буквы/цифры/_/-.',
}: Props) {
  const { token, updateUser } = useAuth();
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const trimmed = value.trim();
  const valid = NICK_RE.test(trimmed);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!valid) {
      setError('3–16 символов, только буквы / цифры / _ / -');
      return;
    }
    if (!token) {
      setError('Нет авторизации');
      return;
    }
    setSaving(true);
    try {
      const user = await api.auth.updateNickname(trimmed, token);
      updateUser(user);
      onClose?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Не удалось сохранить';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={styles.overlay}
      onClick={e => {
        if (!required && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className={styles.modal}>
        {!required && (
          <button className={styles.close} onClick={onClose} type="button">✕</button>
        )}
        <h2 style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '1rem',
          letterSpacing: '.15em',
          textTransform: 'uppercase',
          color: 'var(--gold)',
          textAlign: 'center',
          margin: '0 0 .6rem',
        }}>
          {title}
        </h2>
        <p style={{
          fontSize: '.78rem',
          color: 'var(--text3)',
          textAlign: 'center',
          margin: '0 0 1.2rem',
          lineHeight: 1.5,
        }}>
          {subtitle}
        </p>

        <form className={styles.form} onSubmit={submit}>
          <input
            className="input"
            type="text"
            autoFocus
            maxLength={16}
            placeholder="Например, GladiatorXx"
            value={value}
            onChange={e => setValue(e.target.value)}
            disabled={saving}
          />

          <div style={{
            fontSize: '.7rem',
            color: valid ? 'var(--gold)' : 'var(--text3)',
            textAlign: 'right',
          }}>
            {trimmed.length}/16
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            className="btn-primary"
            type="submit"
            disabled={saving || !valid}
            style={{ padding: '.65rem', marginTop: '.2rem' }}
          >
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </form>
      </div>
    </div>
  );
}
