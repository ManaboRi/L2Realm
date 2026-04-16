// ══════════════════════════════════════════════
// L2Realm — TypeScript типы
// ══════════════════════════════════════════════

export interface Server {
  id:          string;
  name:        string;
  abbr?:       string;
  url:         string;
  chronicle:   string;
  rates:       string;
  rateNum:     number;
  donate:      'free' | 'cosmetic' | 'p2w';
  type:        string[];
  vip:         boolean;
  openedDate?: string;
  country?:    string;
  icon?:       string;
  banner?:     string;
  discord?:    string;
  telegram?:   string;
  vk?:         string;
  youtube?:    string;
  site?:       string;
  shortDesc?:  string;
  fullDesc?:   string;
  rating:      number;
  ratingCount: number;
  online?:     number;
  status?:     'online' | 'offline' | 'unknown';
  subscription?: Subscription;
  reviews?:    Review[];
  news?:       NewsItem[];
}

export interface Subscription {
  id:        string;
  serverId:  string;
  plan:      'FREE' | 'STANDARD' | 'PREMIUM' | 'VIP';
  startDate: string;
  endDate:   string;
  paid:      boolean;
}

export interface Review {
  id:        string;
  rating:    number;
  text:      string;
  createdAt: string;
  user:      { id: string; name?: string };
}

export interface NewsItem {
  id:       string;
  title:    string;
  body:     string;
  date:     string;
  source:   string;
}

export interface User {
  id:    string;
  email: string;
  name?: string;
  role:  'USER' | 'ADMIN';
}

export interface ServersResponse {
  data:  Server[];
  total: number;
  page:  number;
  limit: number;
  pages: number;
}

export interface Stats {
  total:       number;
  vip:         number;
  newCount:    number;
  reviewCount: number;
}

export type SubscriptionPlan = 'free' | 'standard' | 'premium' | 'vip';

export const PLAN_INFO: Record<SubscriptionPlan, { name: string; what: string; price: string; color: string; slots?: number }> = {
  free:     { name: 'Бесплатное', what: 'Просто попасть в список',                  price: '0 ₽',         color: 'var(--text2)' },
  standard: { name: 'Стандарт',   what: 'Выделение в списке',                       price: '500 ₽/мес',   color: '#5A8FC8' },
  premium:  { name: '👑 Премиум', what: 'Закрепление вверху списка',                price: '2 000 ₽/мес', color: 'var(--gold)' },
  vip:      { name: '◆ VIP',      what: 'Отдельный блок на главной + баннер',       price: '5 000 ₽/мес', color: 'var(--gold)', slots: 3 },
};
