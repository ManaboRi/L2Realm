// Канонический список категорий гайдов. slug — в URL (/guides/high-five/kvesty).
// Используется хабом хроники, страницами категорий и админкой.
export type GuideCategory = {
  slug: string;
  label: string;
  icon: string;
  desc: string;
};

export const GUIDE_CATEGORIES: GuideCategory[] = [
  { slug: 'kvesty',      label: 'Квесты',      icon: '📜', desc: 'Прохождения, награды, условия и требования.' },
  { slug: 'predmety',    label: 'Предметы',    icon: '💎', desc: 'Оружие, броня, аксессуары, ресурсы и рецепты.' },
  { slug: 'npc',         label: 'NPC',         icon: '🧙', desc: 'Торговцы, мастера, квестодатели и где их найти.' },
  { slug: 'lokacii',     label: 'Локации',     icon: '🗺️', desc: 'Зоны охоты, города, инстансы и рейды.' },
  { slug: 'klassy',      label: 'Классы',      icon: '⚔️', desc: 'Описания классов, роли, плюсы и минусы.' },
  { slug: 'skilly',      label: 'Скиллы',      icon: '✨', desc: 'Умения, эффекты, комбинации и гайды.' },
  { slug: 'reyd-bossy',  label: 'Рейд-боссы',  icon: '🐉', desc: 'Рейд- и эпик-боссы: респ, локации и дроп.' },
];

export function findGuideCategory(slug: string): GuideCategory | undefined {
  return GUIDE_CATEGORIES.find(c => c.slug === slug);
}

export function guideCategoryLabel(slug: string): string {
  return findGuideCategory(slug)?.label ?? slug;
}
