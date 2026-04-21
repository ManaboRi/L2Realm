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
  boost?:      Boost | null;
  reviews?:    Review[];
  news?:       NewsItem[];
  _isVip?:     boolean;
  _isBoosted?: boolean;
  _isSod?:     boolean;
  _boostEnd?:  string | null;
}

export interface Subscription {
  id:        string;
  serverId:  string;
  plan:      'FREE' | 'VIP';
  startDate: string;
  endDate:   string;
  paid:      boolean;
}

export interface Boost {
  id:        string;
  serverId:  string;
  startDate: string;
  endDate:   string;
  paid:      boolean;
}

export interface VipStatus {
  taken:      number;
  free:       number;
  max:        number;
  nextFreeAt: string | null;
  slots: Array<{
    id: string;
    serverId: string;
    endDate: string;
    server: { id: string; name: string; icon: string | null };
  }>;
}

export interface Review {
  id:        string;
  rating:    number;
  text:      string;
  createdAt: string;
  user:      { id: string; name?: string; nickname?: string; avatar?: string };
}

export interface NewsItem {
  id:       string;
  title:    string;
  body:     string;
  date:     string;
  source:   string;
}

export interface User {
  id:        string;
  email:     string;
  name?:     string;
  nickname?: string;
  avatar?:   string;
  vkId?:     string;
  role:      'USER' | 'ADMIN';
}

export interface FavoriteServer {
  id:          string;
  createdAt:   string;
  server: {
    id:          string;
    name:        string;
    icon:        string | null;
    chronicle:   string;
    rates:       string;
    rating:      number;
    ratingCount: number;
    status:      'online' | 'offline' | 'unknown';
    online:      number | null;
    openedDate:  string | null;
  };
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

export type SubscriptionPlan = 'free' | 'vip';

export const VIP_PRICE   = 5000;
export const VIP_DAYS    = 31;
export const VIP_MAX     = 3;
export const BOOST_PRICE = 250;
export const BOOST_DAYS  = 7;
