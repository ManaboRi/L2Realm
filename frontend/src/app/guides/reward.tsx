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
