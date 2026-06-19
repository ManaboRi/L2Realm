// Конфиг хроник для раздела гайдов. Картинки — вертикальные арты в public/images.
// Slug используется в URL: /guides/interlude и т.д.
export type GuideChronicle = {
  slug: string;
  name: string;
  tagline: string;
  image: string;
  accent: string; // цвет акцента карточки
};

export const GUIDE_CHRONICLES: GuideChronicle[] = [
  {
    slug: 'interlude',
    name: 'Interlude',
    tagline: 'Золотой стандарт классики. Сабклассы, эпик-боссы, осады.',
    image: '/images/guide-interlude.webp',
    accent: '#d2ab52',
  },
  {
    slug: 'high-five',
    name: 'High Five',
    tagline: 'Расширенная классика: новые зоны, инстансы и баланс.',
    image: '/images/guide-high-five.webp',
    accent: '#5fa6e8',
  },
];

export function splitGuideChronicles(slug: string | null | undefined): string[] {
  return String(slug ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

export function findGuideChronicle(slug: string): GuideChronicle | undefined {
  const first = splitGuideChronicles(slug)[0] ?? slug;
  return GUIDE_CHRONICLES.find(c => c.slug === first);
}

export function formatGuideChronicle(slug: string | null | undefined): string {
  const values = splitGuideChronicles(slug);
  if (values.length === 0) return 'Все хроники';
  if (values.includes('all')) return 'Все хроники';
  return values
    .map(value => GUIDE_CHRONICLES.find(c => c.slug === value)?.name ?? value)
    .join(' / ');
}

export function guideChronicleMatches(guideChronicle: string | null | undefined, selected: string): boolean {
  if (!selected) return true;
  const values = splitGuideChronicles(guideChronicle);
  if (selected === 'all') return values.includes('all');
  return values.includes(selected) || values.includes('all');
}
