'use client';
import { useRef, useState } from 'react';
import styles from './ImageUpload.module.css';

interface Props {
  label: string;
  value: string;
  type: 'icon' | 'banner';
  token: string;
  onChange: (url: string) => void;
}

export function ImageUpload({ label, value, type, token, onChange }: Props) {
  const inputRef  = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    if (!token) {
      setError('Не авторизован — войдите заново');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setLoading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch(`/api/proxy/upload?type=${type}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      if (!res.ok) {
        // Понятные сообщения для частых статусов — особенно 401
        // (истёкший/невалидный JWT после смены JWT_SECRET на проде).
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          throw new Error('Сессия истекла — обновите страницу и войдите снова');
        }
        if (res.status === 403) {
          throw new Error('Нет прав. Загрузка картинок только для админа');
        }
        if (res.status === 413) {
          throw new Error('Файл слишком большой (лимит 8 МБ)');
        }
        throw new Error(data.message ?? `Ошибка загрузки (HTTP ${res.status})`);
      }
      const { url } = await res.json();
      onChange(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className={styles.wrap}>
      <label className={styles.label}>{label}</label>

      {value && (
        <div className={styles.preview}>
          <img
            src={value}
            alt={`Превью изображения: ${label}`}
            className={type === 'icon' ? styles.previewIcon : styles.previewBanner}
          />
        </div>
      )}

      <div className={styles.row}>
        <button
          type="button"
          className={styles.btn}
          onClick={() => inputRef.current?.click()}
          disabled={loading}
        >
          {loading ? 'Загрузка…' : value ? '↺ Заменить' : '+ Выбрать файл'}
        </button>
        {value && (
          <button type="button" className={styles.btnClear} onClick={() => onChange('')}>✕</button>
        )}
      </div>

      {error && <span className={styles.error}>{error}</span>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
    </div>
  );
}
