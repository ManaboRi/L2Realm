// ══════════════════════════════════════════════
// L2Realm — TypeScript типы
// ══════════════════════════════════════════════

export interface ServerInstance {
  id:          string;       // uuid внутри проекта
  label?:      string;       // опционально: "Interlude PvP" или "x100"
  shortDesc?:  string;       // короткое описание этого запуска (1 строка)
  chronicle:   string;
  rates:       string;
  rateNum:     number;
  type?:       ServerType;
  donate?:     DonateType | 'free';
  url:         string;       // внешний URL — сайт конкретного запуска
  openedDate?: string | null;
  soonVipUntil?: string | null;
  soonVipPaymentId?: string | null;
}

export type DownloadLinkKind = 'client' | 'patch' | 'updater' | 'torrent' | 'mirror';

export interface DownloadLink {
  kind: DownloadLinkKind;
  label?: string | null;
  url: string;
}

export interface Server {
  id:          string;
  name:        string;
  abbr?:       string;
  url:         string;
  chronicle:   string;
  rates:       string;
  rateNum:     number;
  instances?:  ServerInstance[]; // массив "запусков" проекта (Scryde-кейс)
  donate:      DonateType | 'free';
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
  clientUrl?:  string | null;
  patchUrl?:   string | null;
  updaterUrl?: string | null;
  downloadLinks?: DownloadLink[] | null;
  installGuide?: string | null;
  shortDesc?:  string;
  fullDesc?:   string;
  rating:      number;
  ratingCount: number;
  status?:     'online' | 'offline' | 'unknown';
  statusOverride?: 'online' | 'offline' | 'unknown' | null;
  subscription?: Subscription;
  boost?:      Boost | null;
  reviews?:    Review[];
  news?:       NewsItem[];
  totalVotes?:   number;
  monthlyVotes?: number;
  weeklyVotes?:  number;
  voteRewardsEnabled?: boolean;
  _isVip?:     boolean;
  _isBoosted?: boolean;
  _isSod?:     boolean;
  _boostEnd?:  string | null;
}

export interface VoteStatus {
  voted:       boolean;
  cooldownEnds: string | null;
}

export interface VoteSummary {
  totalVotes: number;
  monthlyVotes: number;
  todayVotes: number;
  rewardsEnabled: boolean;
  top: Array<{ place: number; nickname: string; votes: number; lastVoteAt: string | null }>;
  recent: Array<{ nickname: string; votedAt: string }>;
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
    instanceId?: string | null;
    instanceLabel?: string | null;
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
  image:        string | null;
  category:     string;
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
  launchCount?: number;
  vip:         number;
  newCount:    number;
  reviewCount: number;
  monthlyVotes?: number;
}

export type SubscriptionPlan = 'free' | 'vip';
export type ServerType = 'pvp' | 'pve' | 'pvp-pve' | 'gve' | 'rvr' | 'multiproff' | 'multicraft';
export type DonateType = 'cosmetic' | 'convenience' | 'p2w';

export const VIP_PRICE   = 5000;
export const VIP_DAYS    = 31;
export const VIP_MAX     = 5;
export const BOOST_PRICE = 500;
export const BOOST_DAYS  = 7;
export const COMING_SOON_PRICE = 500;
export const SOON_VIP_PRICE = 2000;
export const SOON_VIP_MAX = 5;

// Канонический список хроник в хронологическом порядке выпуска.
// Используется в формах /add и админки (selects) и для упорядочивания
// фильтров на главной (фильтр показывает только те, у которых
// counts.chronicles[c] > 0 — пустые скрыты).
export const CHRONICLES = [
  'C1', 'C2', 'C3', 'C4', 'C5',
  'Interlude',
  'Kamael', 'Hellbound',
  'Gracia Part 1', 'Gracia Part 2', 'Gracia Final', 'Epilogue',
  'Freya', 'High Five', 'GoD',
  'Awakening', 'Harmony', 'Tauti', 'Glory Days', 'Lindvior',
  'Valiance', 'Ertheia', 'Infinite Odyssey', 'Helios',
  'Grand Crusade', 'Salvation', 'Fafurion', 'Prelude of War',
  'Master Class', 'Storm of Terror', "Hero's Tome", 'Dethrone',
  'Shine Maker', 'Rising Knight',
  'Classic', 'Essence', 'Main',
];

export const SERVER_TYPES: { v: ServerType; l: string }[] = [
  { v: 'pvp',        l: 'PvP' },
  { v: 'pve',        l: 'PvE' },
  { v: 'pvp-pve',    l: 'PvP/PvE' },
  { v: 'gve',        l: 'GvE' },
  { v: 'rvr',        l: 'RvR' },
  { v: 'multiproff', l: 'MultiProff' },
  { v: 'multicraft', l: 'MultiCraft' },
];

export const DONATE_OPTIONS: { v: DonateType; l: string }[] = [
  { v: 'cosmetic',    l: 'Косметический' },
  { v: 'convenience', l: 'Донат-удобства' },
  { v: 'p2w',         l: 'P2W' },
];

// Канонический список диапазонов рейтов. Backend в rateRange() даёт
// серверу один из этих ключей. На фронте показываем только те, у которых
// counts.rates[v] > 0.
export const RATES = [
  { v: 'low',     l: 'x1–x5' },
  { v: 'mid',     l: 'x7–x30' },
  { v: 'high',    l: 'x50–x100' },
  { v: 'ultra',   l: 'x100–x999' },
  { v: 'mega',    l: 'x1000–x9999' },
  { v: 'extreme', l: 'x10000+' },
] as const;
