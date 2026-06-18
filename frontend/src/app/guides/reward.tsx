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
  'Ancient Porcelain': '/images/WIKI/Ancient%20Porcelain.jpg',
  'Blooded Fabric': '/images/WIKI/Blooded%20Fabric.jpg',
  'Certificate of Dawn': '/images/WIKI/Certificate%20of%20Dawn.jpg',
  'Coarse Bone Powder': '/images/WIKI/Coarse%20Bone%20Powder.jpg',
  "Dawn's Bracelet": '/images/WIKI/Dawns%20Bracelet.jpg',
  'Dawns Bracelet': '/images/WIKI/Dawns%20Bracelet.jpg',
  'Drake Leather Boots': '/images/WIKI/Drake%20Leather%20Boots.jpg',
  'Dress Shoe Box': '/images/WIKI/Dress%20Shoe%20Box.jpg',
  'Einhasad Crucifix': '/images/WIKI/Einhasad%20Crucifix.jpg',
  'Fire Attribute Stone': '/images/WIKI/Rough%20Fire%20Ore.jpg',
  'Water Attribute Stone': '/images/WIKI/Rough%20Water%20Ore.jpg',
  'Earth Attribute Stone': '/images/WIKI/Rough%20Earth%20Ore.jpg',
  'Wind Attribute Stone': '/images/WIKI/Rough%20Wind%20Ore.jpg',
  'Dark Attribute Stone': '/images/WIKI/Rough%20Dark%20Ore.jpg',
  'Holy Attribute Stone': '/images/WIKI/Rough%20Holy%20Ore.jpg',
  'Flaming Bait': '/images/WIKI/Flaming%20Bait.jpg',
  'Formal Wear': '/images/WIKI/Formal%20Wear.jpg',
  'Heavy Doom Hammer': '/images/WIKI/Heavy%20Doom%20Hammer.jpg',
  "Lesser Giant's Codex": '/images/WIKI/Lesser%20Giants%20Codex.jpg',
  'Lesser Giants Codex': '/images/WIKI/Lesser%20Giants%20Codex.jpg',
  'Musical Score - Theme of Journey': '/images/WIKI/Musical%20Score%20-%20Theme%20of%20Journey.jpg',
  'Necklace of Protection': '/images/WIKI/Necklace%20of%20Protection.jpg',
  'Noblesse Tiara': '/images/WIKI/noobles%20tiara.jpg',
  'Old Hilt': '/images/WIKI/Old%20Hilt.jpg',
  'Old Key': '/images/WIKI/Old%20Key.jpg',
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
  'Камень Огня': '/images/WIKI/Rough%20Fire%20Ore.jpg',
  'Камень Воды': '/images/WIKI/Rough%20Water%20Ore.jpg',
  'Камень Земли': '/images/WIKI/Rough%20Earth%20Ore.jpg',
  'Камень Ветра': '/images/WIKI/Rough%20Wind%20Ore.jpg',
  'Камень Тьмы': '/images/WIKI/Rough%20Dark%20Ore.jpg',
  'Камень Святости': '/images/WIKI/Rough%20Holy%20Ore.jpg',
  'Камень атрибута': '/images/WIKI/Rough%20Fire%20Ore.jpg',
  'Камень Атрибута': '/images/WIKI/Rough%20Fire%20Ore.jpg',
  'Totem Necklace': '/images/WIKI/Totem%20Necklace.jpg',
  'Varnish of Purity': '/images/WIKI/Varnish%20of%20Purity.jpg',
  'Ring of Knowledge': '/images/WIKI/Accessary_ring_of_knowledge.jpg',
  'Necklace of Knowledge': '/images/WIKI/Accessary_necklace_of_knowledge.jpg',
  'Clay Pot': '/images/WIKI/clay%20pot.jpg',
  'Cloth Bundle': '/images/WIKI/cloth%20bundle.jpg',
  'Heavy Wood Box': '/images/WIKI/heavy%20wood%20box.jpg',
  'Cokes': '/images/WIKI/Cokes.jpg',
  'Leather': '/images/WIKI/Leather.jpg',
  'Oriharukon Ore': '/images/WIKI/Oriharukon%20Ore.jpg',
  'Stone of Purity': '/images/WIKI/Stone%20of%20Purity.jpg',
  'Spiritshot': '/images/WIKI/spirit_bullet_white.jpg',
  'Unknown Reward': '/images/WIKI/UKNOWN%20REWARD.jpg',
};

export function findRewardItemIcon(text: string): string | null {
  // raw — без ведущего числа, но С скобками: "Scroll: Enchant Weapon (D-grade)"
  // (для свитков точения грейд в скобках — часть ключа, его нельзя срезать).
  const raw = String(text || '').replace(/^\d[\d\s.,]*\s+/, '').trim();
  if (ITEM_REWARD_ICONS[raw]) return ITEM_REWARD_ICONS[raw];
  // clean — со срезанным хвостом "(No-grade)"/"(×3)" для предметов вроде "Soulshot (No-grade)"
  const clean = raw.replace(/\s+\([^)]+\)$/g, '').trim();
  if (clean && ITEM_REWARD_ICONS[clean]) return ITEM_REWARD_ICONS[clean];
  const found = Object.entries(ITEM_REWARD_ICONS).find(([label]) => raw.includes(label) || clean.includes(label));
  return found?.[1] ?? null;
}

export type RewardPart =
  | { kind: 'icon'; key: 'adena' | 'exp' | 'sp'; amount: string }
  | { kind: 'text'; text: string };

// "Манифест альянса · 120 000 :sp:" → [{text:'Манифест альянса'},{icon:sp, amount:'120 000'}]
export function parseReward(reward?: string | null): RewardPart[] {
  if (!reward) return [];
  const parts: RewardPart[] = [];
  const pushTextParts = (value: string) => {
    value
      .split(/\s*[·;|]\s*/g)
      .map(item => item.replace(/^[,.\s]+|[,.\s]+$/g, '').trim())
      .filter(Boolean)
      .forEach(text => parts.push({ kind: 'text', text }));
  };
  const re = /(\d[\d\s.,]*)?\s*:(adena|exp|sp):/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(reward)) !== null) {
    const before = reward.slice(last, m.index).replace(/[·,;|]\s*$/, '').trim();
    if (before) pushTextParts(before);
    parts.push({ kind: 'icon', key: m[2].toLowerCase() as 'adena' | 'exp' | 'sp', amount: (m[1] || '').trim() });
    last = re.lastIndex;
  }
  const tail = reward.slice(last).replace(/^[\s·,;|]+/, '').trim();
  if (tail) pushTextParts(tail);
  return parts;
}

// Компактный ряд только из иконок (для таблицы списка). cls — класс <img>.
// Ряд иконок награды для таблицы списка: показываем ВСЕ награды, у которых есть
// иконка (валюта + предметы по карте), остальные (без иконок) — пропускаем.
export function RewardIconRow({ reward, imgClass }: { reward?: string | null; imgClass: string; fallbackClass?: string }) {
  const parts = parseReward(reward);
  const icons: Array<{ src: string; title: string }> = [];
  for (const p of parts) {
    if (p.kind === 'icon') {
      icons.push({ src: REWARD_ICONS[p.key], title: `${REWARD_LABEL[p.key]}${p.amount ? ' ' + p.amount : ''}` });
    } else {
      const ic = findRewardItemIcon(p.text);
      if (ic) icons.push({ src: ic, title: p.text });
    }
  }
  if (icons.length === 0) return null;
  return (
    <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '.2rem' }}>
      {icons.map((ic, i) => (
        <img key={i} className={imgClass} src={ic.src} alt="" title={ic.title} loading="lazy" />
      ))}
    </span>
  );
}
