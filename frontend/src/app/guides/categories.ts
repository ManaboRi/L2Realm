// Канонический список категорий гайдов. slug — в URL (/guides/high-five/kvesty).
// Используется хабом хроники, страницами категорий и админкой.
export type GuideCategory = {
  slug: string;
  label: string;
  icon: string;
  desc: string;
};

export const GUIDE_CATEGORIES: GuideCategory[] = [
  { slug: 'novichkam',   label: 'Новичкам',    icon: '🚀', desc: 'Старт для новых игроков: первые шаги, что качать сначала.' },
  { slug: 'kvesty',      label: 'Квесты',      icon: '📜', desc: 'Квесты на профессии, сабкласс, нублесс, награды и эндгейм.' },
  { slug: 'klassy',      label: 'Классы',      icon: '⚔️', desc: 'Описания классов, роли, сильные стороны и сложность.' },
  { slug: 'skilly',      label: 'Скиллы',      icon: '✨', desc: 'Умения, эффекты и как их прокачивать.' },
  { slug: 'predmety',    label: 'Предметы',    icon: '💎', desc: 'Оружие, броня, аксессуары, ресурсы и рецепты.' },
  { slug: 'npc',         label: 'NPC',         icon: '🧙', desc: 'Торговцы, мастера, квестодатели и где их найти.' },
  { slug: 'lokacii',     label: 'Локации',     icon: '🗺️', desc: 'Зоны охоты, города, инстансы и рейдовые локации.' },
  { slug: 'farm',        label: 'Фарм',        icon: '💰', desc: 'Лучшие споты, заработок адены и маршруты прокачки.' },
  { slug: 'pvp',         label: 'PvP',         icon: '🛡️', desc: 'Олимпиада, осады замков, массовые битвы и тактика.' },
  { slug: 'ekipirovka',  label: 'Экипировка',  icon: '🎽', desc: 'Сборка сетов, заточка, лучшее снаряжение под класс.' },
];

export function findGuideCategory(slug: string): GuideCategory | undefined {
  return GUIDE_CATEGORIES.find(c => c.slug === slug);
}

export function guideCategoryLabel(slug: string): string {
  return findGuideCategory(slug)?.label ?? slug;
}
