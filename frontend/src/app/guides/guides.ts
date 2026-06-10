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
  {
    slug: 'essence',
    name: 'Essence',
    tagline: 'Современный темп: соло-данжи, авто-механики, быстрый прогресс.',
    image: '/images/guide-essence.webp',
    accent: '#a679e8',
  },
  {
    slug: 'main',
    name: 'Main',
    tagline: 'Актуальные хроники: новый контент, классы и механики.',
    image: '/images/guide-main.webp',
    accent: '#5fcf8a',
  },
];

export function findGuideChronicle(slug: string): GuideChronicle | undefined {
  return GUIDE_CHRONICLES.find(c => c.slug === slug);
}
