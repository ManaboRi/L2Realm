import React from 'react';

// Иконки наград вставляются в текст шорткодами :adena: :exp: :sp:
export const REWARD_ICONS: Record<string, string> = {
  adena: '/images/icon-adena.webp',
  exp: '/images/icon-exp.webp',
  sp: '/images/icon-sp.webp',
};
export const REWARD_LABEL: Record<string, string> = {
  adena: 'Адена',
  exp: 'Опыт',
  sp: 'SP',
};

const ITEM_REWARD_ICONS: Record<string, string> = {
  'Aden Territory Badge': '/images/WIKI/ADEN%20ZNACHOK.jpg',
  'Blooded Fabric': '/images/WIKI/Blooded%20Fabric.jpg',
  'Certificate of Dawn': '/images/WIKI/Certificate%20of%20Dawn.jpg',
  "Dawn's Bracelet": '/images/WIKI/Dawn%27s%20Bracelet.jpg',
  'Dress Shoe Box': '/images/WIKI/Dress%20Shoe%20Box.jpg',
  'Flaming Bait': '/images/WIKI/Flaming%20Bait.jpg',
  'Formal Wear': '/images/WIKI/Formal%20Wear.jpg',
  "Lesser Giant's Codex": '/images/WIKI/Lesser%20Giant%27s%20Codex.jpg',
  'Musical Score - Theme of Journey': '/images/WIKI/Musical%20Score%20-%20Theme%20of%20Journey.jpg',
  'Necklace of Protection': '/images/WIKI/Necklace%20of%20Protection.jpg',
  'Noblesse Tiara': '/images/WIKI/noobles%20tiara.jpg',
  'Proof of Alliance': '/images/WIKI/Proof%20of%20Alliance.jpg',
  'Raid Sword': '/images/WIKI/Raid%20Sword.jpg',
  'Ring of Ages': '/images/WIKI/Ring%20of%20Ages.jpg',
  'Sealed Ancient Cloak': '/images/WIKI/Sealed%20Ancient%20Cloak.jpg',
  'Sewing Kit': '/images/WIKI/Sewing%20Kit.jpg',
  'Scroll: Enchant Armor (A-grade)': '/images/WIKI/scroll_of_enchant_armor_A.jpg',
  'Scroll: Enchant Armor (B-grade)': '/images/WIKI/scroll_of_enchant_armor_B.jpg',
  'Scroll: Enchant Armor (D-grade)': '/images/WIKI/scroll_of_enchant_armor_D.jpg',
  'Scroll: Enchant Weapon (A-grade)': '/images/WIKI/scroll_of_enchant_weapon_A.jpg',
  'Scroll: Enchant Weapon (B-grade)': '/images/WIKI/scroll_of_enchant_weapon_B.jpg',
  'Scroll: Enchant Weapon (C-grade)': '/images/WIKI/scroll_of_enchant_weapon_C.jpg',
  'Scroll: Enchant Weapon (D-grade)': '/images/WIKI/scroll_of_enchant_weapon_D.jpg',
  'Scroll: Enchant Weapon (S-grade)': '/images/WIKI/scroll_of_enchant_weapon_S.jpg',
  'Unknown Reward': '/images/WIKI/UKNOWN%20REWARD.jpg',
};

export function findRewardItemIcon(text: string): string | null {
  const clean = String(text || '')
    .replace(/^\d[\d\s.,]*\s+/, '')
    .replace(/\s+\([^)]+\)$/g, '')
    .trim();
  if (ITEM_REWARD_ICONS[clean]) return ITEM_REWARD_ICONS[clean];
  const found = Object.entries(ITEM_REWARD_ICONS).find(([label]) => clean.includes(label));
  return found?.[1] ?? null;
}

export type RewardPart =
  | { kind: 'icon'; key: 'adena' | 'exp' | 'sp'; amount: string }
  | { kind: 'text'; text: string };

// "Манифест альянса · 120 000 :sp:" → [{text:'Манифест альянса'},{icon:sp, amount:'120 000'}]
export function parseReward(reward?: string | null): RewardPart[] {
  if (!reward) return [];
  const parts: RewardPart[] = [];
  const re = /(\d[\d\s.,]*)?\s*:(adena|exp|sp):/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(reward)) !== null) {
    const before = reward.slice(last, m.index).replace(/[·,;|]\s*$/, '').trim();
    if (before) parts.push({ kind: 'text', text: before });
    parts.push({ kind: 'icon', key: m[2].toLowerCase() as 'adena' | 'exp' | 'sp', amount: (m[1] || '').trim() });
    last = re.lastIndex;
  }
  const tail = reward.slice(last).replace(/^[\s·,;|]+/, '').trim();
  if (tail) parts.push({ kind: 'text', text: tail });
  return parts;
}

// Компактный ряд только из иконок (для таблицы списка). cls — класс <img>.
export function RewardIconRow({ reward, imgClass, fallbackClass }: { reward?: string | null; imgClass: string; fallbackClass: string }) {
  const parts = parseReward(reward);
  const icons = parts.filter(p => p.kind === 'icon') as Extract<RewardPart, { kind: 'icon' }>[];
  const hasText = parts.some(p => p.kind === 'text');
  if (icons.length === 0 && !hasText) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem' }}>
      {icons.map((p, i) => (
        <img key={i} className={imgClass} src={REWARD_ICONS[p.key]} alt={REWARD_LABEL[p.key]} title={`${REWARD_LABEL[p.key]}${p.amount ? ' ' + p.amount : ''}`} loading="lazy" />
      ))}
      {/* квест без числовой награды (статус/предмет) — нейтральный значок-свиток */}
      {icons.length === 0 && hasText && (
        <svg className={fallbackClass} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 3h10a2 2 0 0 1 2 2v12a4 4 0 0 1-4 4H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}
