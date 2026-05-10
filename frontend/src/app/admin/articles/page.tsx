'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { ImageUpload } from '@/components/ImageUpload';
import { renderMarkdown, readingTime } from '@/lib/markdown';
import type { Article } from '@/lib/types';
import styles from './page.module.css';

type FormState = {
  id?:          string;
  slug:         string;
  title:        string;
  description:  string;
  content:      string;
  image:        string;
  category:     string;
  publishedAt:  string; // datetime-local или пусто = черновик
};

const EMPTY: FormState = { slug: '', title: '', description: '', content: '', image: '', category: 'Новости', publishedAt: '' };
const CATEGORY_SUGGESTIONS = ['Новости', 'Гайды', 'Сервера', 'Обзоры', 'Обновления'];

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  // ISO без зоны для <input type="datetime-local">
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminArticlesPage() {
  const { user, token, isAdmin } = useAuth();
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [form,     setForm]     = useState<FormState>(EMPTY);
  const [busy,     setBusy]     = useState(false);
  const [toast,    setToast]    = useState('');

  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(''), 3500);
  }

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const list = await api.articles.adminList(token);
      setArticles(list);
    } catch (e: any) {
      showToast(e.message || 'Ошибка загрузки');
    }
    setLoading(false);
  }

  useEffect(() => {
    if (token && isAdmin) load();
  }, [token, isAdmin]);

  function startNew() {
    setForm(EMPTY);
  }

  function startEdit(a: Article) {
    setForm({
      id:          a.id,
      slug:        a.slug,
      title:       a.title,
      description: a.description,
      content:     a.content,
      image:       a.image ?? '',
      category:    a.category ?? 'Новости',
      publishedAt: toLocalInput(a.publishedAt),
    });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setCursor(start: number, end = start) {
    requestAnimationFrame(() => {
      const el = contentRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(start, end);
    });
  }

  function insertAtSelection(before: string, after = '', placeholder = 'текст') {
    const value = form.content;
    const el = contentRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const body = selected || placeholder;
    const next = value.slice(0, start) + before + body + after + value.slice(end);
    setForm(p => ({ ...p, content: next }));
    const cursorStart = start + before.length;
    setCursor(cursorStart, cursorStart + body.length);
  }

  function insertBlock(block: string) {
    const value = form.content;
    const el = contentRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const prefix = before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
    const suffix = after && !after.startsWith('\n\n') ? (after.startsWith('\n') ? '\n' : '\n\n') : '';
    const insertion = `${prefix}${block}${suffix}`;
    const next = before + insertion + after;
    setForm(p => ({ ...p, content: next }));
    setCursor(before.length + insertion.length);
  }

  function insertArticleImage(url: string) {
    insertBlock(`![Описание изображения](${url})`);
  }

  async function save() {
    if (!token) return;
    if (!form.title.trim() || !form.description.trim() || !form.content.trim()) {
      showToast('Заполни title, description и content');
      return;
    }
    setBusy(true);
    try {
      const payload: any = {
        slug:        form.slug.trim() || undefined,
        title:       form.title.trim(),
        description: form.description.trim(),
        content:     form.content,
        image:       form.image.trim() || null,
        category:    form.category.trim() || 'Новости',
        publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null,
      };
      let savedSlug = form.slug;
      if (form.id) {
        const updated = await api.articles.update(form.id, payload, token);
        savedSlug = updated.slug;
        setForm(p => ({ ...p, slug: updated.slug }));
        showToast('Статья обновлена');
      } else {
        const created = await api.articles.create(payload, token);
        savedSlug = created.slug;
        showToast('Статья создана');
        setForm({ ...form, id: created.id, slug: created.slug });
      }
      // Сбрасываем SSR-кеш блога — иначе пользователь не увидит правки 5 минут
      api.articles.revalidate(savedSlug, token).catch(() => {});
      await load();
    } catch (e: any) {
      showToast(e.message || 'Ошибка сохранения');
    }
    setBusy(false);
  }

  async function remove(a: Article) {
    if (!token) return;
    if (!confirm(`Удалить статью «${a.title}»? Действие необратимо.`)) return;
    try {
      await api.articles.delete(a.id, token);
      showToast('Удалено');
      if (form.id === a.id) setForm(EMPTY);
      api.articles.revalidate(a.slug, token).catch(() => {});
      await load();
    } catch (e: any) {
      showToast(e.message || 'Ошибка удаления');
    }
  }

  async function togglePublish(a: Article) {
    if (!token) return;
    try {
      await api.articles.update(
        a.id,
        { publishedAt: a.publishedAt ? null : new Date().toISOString() },
        token,
      );
      showToast(a.publishedAt ? 'Снято с публикации' : 'Опубликовано');
      api.articles.revalidate(a.slug, token).catch(() => {});
      await load();
    } catch (e: any) {
      showToast(e.message || 'Ошибка');
    }
  }

  const sortedArticles = useMemo(() => articles, [articles]);

  if (!user) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Только для администраторов</div>
          <p>Войдите в аккаунт с ролью ADMIN.</p>
          <Link href="/" style={{ color: 'var(--gold)' }}>← Главная</Link>
        </div>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Доступ закрыт</div>
          <p>У вашего аккаунта нет роли ADMIN.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      <div className={styles.head}>
        <h1 className={styles.title}>Статьи блога</h1>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <Link href="/admin" className="btn-ghost">← Админка</Link>
          <button className="btn-primary" onClick={startNew}>+ Новая статья</button>
        </div>
      </div>

      {/* Форма */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>{form.id ? 'Редактирование' : 'Новая статья'}</div>

        <div className={styles.row2}>
          <Field label="Заголовок *">
            <input
              className="input"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Как выбрать первый сервер L2"
              maxLength={120}
            />
          </Field>
          <Field label="Slug (URL)">
            <input
              className="input"
              value={form.slug}
              onChange={e => setForm(p => ({ ...p, slug: e.target.value }))}
              placeholder="kak-vybrat-server (если пусто — сгенерируется из заголовка)"
              maxLength={80}
            />
          </Field>
        </div>

        <Field label="Категория">
          <input
            className="input"
            list="article-categories"
            value={form.category}
            onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
            placeholder="Новости, гайды, сервера..."
            maxLength={40}
          />
          <datalist id="article-categories">
            {CATEGORY_SUGGESTIONS.map(c => <option key={c} value={c} />)}
          </datalist>
        </Field>

        <Field label="Описание (для SEO + превью на /blog) *">
          <textarea
            className="input"
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Короткое описание 1–2 предложения. Используется в meta description и на карточке списка."
            rows={2}
            maxLength={300}
          />
        </Field>

        {token && (
          <ImageUpload
            label="Обложка статьи (опционально)"
            value={form.image}
            type="banner"
            token={token}
            onChange={url => setForm(p => ({ ...p, image: url }))}
          />
        )}

        <Field label="Текст статьи (Markdown) *">
          <div className={styles.editorShell}>
            <div className={styles.editorTools}>
              <button type="button" className={styles.toolBtn} onClick={() => insertBlock('## Подзаголовок')}>H2</button>
              <button type="button" className={styles.toolBtn} onClick={() => insertAtSelection('**', '**')}>B</button>
              <button type="button" className={styles.toolBtn} onClick={() => insertAtSelection('*', '*')}>I</button>
              <button type="button" className={styles.toolBtn} onClick={() => insertBlock('- пункт списка')}>•</button>
              <button type="button" className={styles.toolBtn} onClick={() => insertBlock('> Важная мысль')}>”</button>
              <button type="button" className={styles.toolBtn} onClick={() => insertBlock('---')}>—</button>
              {token && (
                <div className={styles.inlineUpload}>
                  <ImageUpload
                    label="Картинка в текст"
                    value=""
                    type="banner"
                    token={token}
                    onChange={insertArticleImage}
                  />
                </div>
              )}
              <span className={styles.editorStat}>{readingTime(form.content)} мин</span>
            </div>

            <div className={styles.editorGrid}>
              <textarea
                ref={contentRef}
                className={`input ${styles.contentArea}`}
                value={form.content}
                onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                placeholder={
                  '# Заголовок раздела\n\n' +
                  'Обычный абзац. Поддерживается **жирный**, *курсив*, [ссылка](https://example.com), `код`.\n\n' +
                  '![Описание изображения](/uploads/example.webp)\n\n' +
                  '## Подзаголовок\n\n' +
                  '- пункт списка\n' +
                  '- ещё пункт\n\n' +
                  '> Цитата\n\n' +
                  '```\nблок кода\n```'
                }
                rows={22}
              />

              <div className={styles.previewPane}>
                <div className={styles.previewTitle}>Превью</div>
                <div className={styles.previewBody}>
                  {form.content.trim()
                    ? renderMarkdown(form.content)
                    : <p className={styles.previewEmpty}>Текст появится здесь.</p>}
                </div>
              </div>
            </div>
          </div>
        </Field>

        <Field label="Дата публикации (если пусто — черновик, не виден на /blog)">
          <input
            className="input"
            type="datetime-local"
            value={form.publishedAt}
            onChange={e => setForm(p => ({ ...p, publishedAt: e.target.value }))}
            style={{ width: 'auto' }}
          />
          <p className={styles.hint}>
            Можно указать будущую дату — статья появится автоматически после неё.
          </p>
        </Field>

        <div style={{ display: 'flex', gap: '.6rem', marginTop: '.5rem', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={save} disabled={busy}>
            {busy ? <span className="spin" /> : (form.id ? 'Сохранить' : 'Создать')}
          </button>
          {form.id && (
            <button className="btn-ghost" onClick={startNew} disabled={busy}>
              Отмена
            </button>
          )}
          {form.id && (
            <Link href={`/blog/${form.slug}`} target="_blank" className="btn-ghost" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Открыть на сайте ↗
            </Link>
          )}
        </div>
      </div>

      {/* Список */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Все статьи ({sortedArticles.length})</div>
        {loading ? (
          <p style={{ color: 'var(--text3)' }}>Загрузка…</p>
        ) : sortedArticles.length === 0 ? (
          <p style={{ color: 'var(--text3)', fontStyle: 'italic' }}>Пока ничего нет — создай первую.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Заголовок</th>
                <th>Slug</th>
                <th>Категория</th>
                <th>Статус</th>
                <th>Дата</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedArticles.map(a => {
                const published = !!a.publishedAt && new Date(a.publishedAt) <= new Date();
                const scheduled = !!a.publishedAt && new Date(a.publishedAt) > new Date();
                return (
                  <tr key={a.id} className={form.id === a.id ? styles.rowActive : ''}>
                    <td>{a.title}</td>
                    <td><code>{a.slug}</code></td>
                    <td>{a.category ?? 'Новости'}</td>
                    <td>
                      {published && <span className={styles.tagOn}>● Опубликовано</span>}
                      {scheduled && <span className={styles.tagSched}>⏳ {new Date(a.publishedAt!).toLocaleDateString('ru-RU')}</span>}
                      {!a.publishedAt && <span className={styles.tagOff}>○ Черновик</span>}
                    </td>
                    <td>{new Date(a.publishedAt ?? a.createdAt).toLocaleDateString('ru-RU')}</td>
                    <td className={styles.actions}>
                      <button className="btn-ghost" onClick={() => startEdit(a)}>Изм.</button>
                      <button className="btn-ghost" onClick={() => togglePublish(a)}>
                        {a.publishedAt ? 'Снять' : 'Публ.'}
                      </button>
                      <button className="btn-ghost" onClick={() => remove(a)} style={{ color: 'var(--red)', borderColor: 'rgba(196,64,64,.3)' }}>
                        Удалить
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
