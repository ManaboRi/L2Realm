'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';

type SavedArticle = {
  slug: string;
  title: string;
  description?: string;
  image?: string | null;
  category?: string;
  savedAt: string;
};

const STORAGE_KEY = 'l2r_saved_articles';

function readSaved(): SavedArticle[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function ArticleSaveButton({ article }: { article: Omit<SavedArticle, 'savedAt'> }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(readSaved().some(item => item.slug === article.slug));
  }, [article.slug]);

  function toggle() {
    const current = readSaved();
    if (current.some(item => item.slug === article.slug)) {
      const next = current.filter(item => item.slug !== article.slug);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSaved(false);
      return;
    }

    const next = [
      { ...article, savedAt: new Date().toISOString() },
      ...current.filter(item => item.slug !== article.slug),
    ].slice(0, 30);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSaved(true);
  }

  return (
    <button
      type="button"
      className={`${styles.saveArticleButton} ${saved ? styles.saveArticleButtonActive : ''}`}
      onClick={toggle}
      aria-pressed={saved}
    >
      {saved ? 'Статья сохранена' : 'Сохранить статью'}
    </button>
  );
}
