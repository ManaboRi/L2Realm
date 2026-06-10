'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { BannerAd } from '@/lib/types';
import styles from './BannersBlock.module.css';

// Блок рекламных баннеров (правый сайдбар, сверху). Тянет активные баннеры с бэка.
// Если баннеров нет — ничего не рендерит (никаких пустых рамок).
export function BannersBlock({ max = 2 }: { max?: number }) {
  const [banners, setBanners] = useState<BannerAd[]>([]);

  useEffect(() => {
    let alive = true;
    api.banners.active()
      .then(list => { if (alive) setBanners(Array.isArray(list) ? list.slice(0, max) : []); })
      .catch(() => { if (alive) setBanners([]); });
    return () => { alive = false; };
  }, [max]);

  if (banners.length === 0) return null;

  return (
    <div className={styles.wrap}>
      {banners.map(b => (
        <a
          key={b.id}
          href={b.href}
          target="_blank"
          rel="noopener nofollow"
          className={styles.ad}
          onClick={() => api.banners.click(b.id)}
        >
          <span className={styles.mark} title={b.advertiser ? `Реклама. ${b.advertiser}${b.erid ? ` · erid: ${b.erid}` : ''}` : 'Реклама'}>
            Реклама
          </span>
          {b.image && (
            <span className={styles.media}>
              <img src={b.image} alt="" loading="lazy" decoding="async" />
            </span>
          )}
          <span className={styles.body}>
            <strong>{b.title}</strong>
            {b.subtitle && <span>{b.subtitle}</span>}
            {(b.advertiser || b.erid) && (
              <small className={styles.advertiser}>
                {[b.advertiser, b.erid && `erid: ${b.erid}`].filter(Boolean).join(' · ')}
              </small>
            )}
          </span>
        </a>
      ))}
    </div>
  );
}
