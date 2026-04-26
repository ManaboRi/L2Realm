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
  monthlyVotes?: number;
  weeklyVotes?:  number;
  _isVip?:     boolean;
  _isBoosted?: boolean;
  _isSod?:     boolean;
  _boostEnd?:  string | null;
}

export interface VoteStatus {
  voted:       boolean;
  cooldownEnds: string | null;
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
  id:                string;
  email:             string;
  name?:             string;
  nickname?:         string;
  avatar?:           string;
  vkId?:             string;
  role:              'USER' | 'ADMIN';
  nicknameChangedAt?: string | null;
}

export interface Article {
  id:           string;
  slug:         string;
  title:        string;
  description:  string;
  content:      string;
  publishedAt:  string | null;
  createdAt:    string;
  updatedAt:    string;
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
export const BOOST_PRICE = 500;
export const BOOST_DAYS  = 7;
export const COMING_SOON_PRICE = 1000;

// Канонический список хроник. Используется в формах /add и админки (selects)
// и для упорядочивания фильтров на главной (фильтр показывает только те,
// у которых counts.chronicles[c] > 0 — пустые скрыты).
export const CHRONICLES = [
  'Interlude', 'High Five', 'Classic', 'Essence', 'Gracia',
  'C4', 'GoD', 'Salvation', 'Samurai', 'Fafurion', 'C1', 'Lindvior',
];
