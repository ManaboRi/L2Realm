'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Guide } from '@/lib/types';
import { findGuideChronicle } from './guides';
import { guideCategoryLabel } from './categories';
import styles from './GuidesSearch.module.css';

export function GuidesSearch() {
  const [all, setAll] = useState<Guide[]>([]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    api.guides.list()
      .then(list => { if (alive) setAll(Array.isArray(list) ? list : []); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const query = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (query.length < 2) return [];
    return all
      .filter(g =>
        g.title.toLowerCase().includes(query) ||
        (g.description ?? '').toLowerCase().includes(query) ||
        (g.npc ?? '').toLowerCase().includes(query) ||
        (g.location ?? '').toLowerCase().includes(query),
      )
      .slice(0, 8);
  }, [all, query]);

  return (
    <div className={styles.box} ref={boxRef}>
      <div className={styles.inputWrap}>
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          className={styles.input}
          type="search"
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Поиск по гайдам, квестам, NPC, локациям…"
          aria-label="Поиск по гайдам"
        />
      </div>

      {open && query.length >= 2 && (
        <div className={styles.dropdown}>
          {results.length === 0 ? (
            <div className={styles.empty}>Ничего не нашлось по «{q.trim()}». База гайдов пополняется.</div>
          ) : (
            results.map(g => {
              const ch = findGuideChronicle(g.chronicle);
              return (
                <Link
                  key={g.id}
                  href={`/guides/${g.chronicle}/${g.category}/${g.slug}`}
                  className={styles.result}
                  onClick={() => setOpen(false)}
                >
                  <strong>{g.title}</strong>
                  <span>{ch?.name ?? g.chronicle} · {guideCategoryLabel(g.category)}</span>
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
