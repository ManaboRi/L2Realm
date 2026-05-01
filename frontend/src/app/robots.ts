import type { MetadataRoute } from 'next';

const SITE = 'https://l2realm.ru';

const DISALLOWED = [
  '/api/',
  '/admin',
  '/admin/',
  '/profile',
  '/auth/',
  '/forgot-password',
  '/reset-password',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Универсальное правило — для всех неназванных краулеров
      { userAgent: '*',          allow: '/', disallow: DISALLOWED },
      // Явные правила для основных ботов — Яндекс некоторые версии
      // регистрировал как нестандартный UA, явное правило страхует
      { userAgent: 'Yandex',     allow: '/', disallow: DISALLOWED },
      { userAgent: 'YandexBot',  allow: '/', disallow: DISALLOWED },
      { userAgent: 'Googlebot',  allow: '/', disallow: DISALLOWED },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    // Директива host устарела (Яндекс отказался от неё в 2018) —
    // зеркало теперь определяется через 301-redirect и Я.Вебмастер.
  };
}
