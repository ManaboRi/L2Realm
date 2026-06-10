'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { BannerAd } from '@/lib/types';
import styles from './BannersBlock.module.css';

type Variant = 'feature' | 'compact';

// Блок рекламных баннеров (правый сайдбар). Тянет активные баннеры с бэка
// и фильтрует по слоту. Если для слота нет баннера — ничего не рендерит
// (никаких пустых рамок). slot 1 — премиальный «feature» сверху,
// slot 2 — компактный «compact» внизу рейла.
export function BannersBlock({ slot, variant = 'feature', max = 1 }: { slot?: number; variant?: Variant; max?: number }) {
  const [banners, setBanners] = useState<BannerAd[]>([]);

  useEffect(() => {
    let alive = true;
    api.banners.active()
      .then(list => {
        if (!alive) return;
        let arr = Array.isArray(list) ? list : [];
        if (slot != null) arr = arr.filter(b => b.slot === slot);
        setBanners(arr.slice(0, max));
      })
      .catch(() => { if (alive) setBanners([]); });
    return () => { alive = false; };
  }, [slot, max]);

  if (banners.length === 0) return null;

  return (
    <div className={styles.wrap}>
      {banners.map(b => (
        <a
          key={b.id}
          href={b.href}
          target="_blank"
          rel="noopener nofollow"
          className={`${styles.ad} ${variant === 'compact' ? styles.compact : styles.feature}`}
          onClick={() => api.banners.click(b.id)}
        >
          {b.image && (
            <span className={styles.cover} aria-hidden="true">
              <img src={b.image} alt="" loading="lazy" decoding="async" />
            </span>
          )}
          <span className={styles.shade} aria-hidden="true" />

          <span
            className={styles.mark}
            title={b.advertiser ? `Реклама. ${b.advertiser}${b.erid ? ` · erid: ${b.erid}` : ''}` : 'Реклама'}
          >
            Реклама
          </span>

          <span className={styles.content}>
            <strong className={styles.title}>{b.title}</strong>
            {b.subtitle && <span className={styles.subtitle}>{b.subtitle}</span>}
            <span className={styles.cta}>
              Перейти<i aria-hidden="true">→</i>
            </span>
          </span>

          {(b.advertiser || b.erid) && (
            <small className={styles.advertiser}>
              {[b.advertiser, b.erid && `erid: ${b.erid}`].filter(Boolean).join(' · ')}
            </small>
          )}
        </a>
      ))}
    </div>
  );
}
