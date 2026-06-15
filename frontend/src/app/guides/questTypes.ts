// Типы гайдов — теги с цветами. Хранятся в Guide.types как массив этих label'ов.
export type QuestType = { label: string; color: string };

export const QUEST_TYPES: QuestType[] = [
  { label: 'Сюжетный',    color: '#5fa6e8' },
  { label: 'Профессия',   color: '#e0b94f' },
  { label: 'Сабкласс',    color: '#a679e8' },
  { label: 'Дуал-Класс',  color: '#c77dff' },
  { label: 'Ноблес',      color: '#e8c45a' },
  { label: 'Олимпиада',   color: '#6fdc8e' },
  { label: 'Клановые',    color: '#ff6b6b' },
  { label: 'Ежедневные',  color: '#5fcf8a' },
  { label: 'Повторяемые', color: '#67b1ff' },
  { label: 'Рейд-Босс',   color: '#e25c4b' },
  { label: 'Питомцы',     color: '#f0a868' },
  { label: 'Разовые',     color: '#9b8cff' },
];

export const ITEM_TYPES: QuestType[] = [
  { label: 'Оружие',             color: '#e0b94f' },
  { label: 'Броня',              color: '#6fa8ff' },
  { label: 'Бижутерия',          color: '#a679e8' },
  { label: 'Расходники',         color: '#5fcf8a' },
  { label: 'Ресурсы',            color: '#caa46a' },
  { label: 'Рецепты',            color: '#67b1ff' },
  { label: 'Квестовый предмет',  color: '#f0a868' },
  { label: 'Книга / скилл',      color: '#9b8cff' },
  { label: 'Дроп',               color: '#e25c4b' },
  { label: 'Крафт',              color: '#d2ab52' },
  { label: 'Награда',            color: '#6fdc8e' },
];

export const NPC_TYPES: QuestType[] = [
  { label: 'Квестовый NPC',      color: '#e0b94f' },
  { label: 'Торговец',           color: '#5fcf8a' },
  { label: 'Кузнец',             color: '#f0a868' },
  { label: 'Мастер',             color: '#67b1ff' },
  { label: 'Хранитель склада',   color: '#caa46a' },
  { label: 'Телепорт',           color: '#a679e8' },
  { label: 'Баффер',             color: '#6fdc8e' },
  { label: 'Аукцион',            color: '#e0b94f' },
  { label: 'Олимпиада',          color: '#67b1ff' },
  { label: 'Татуировки',         color: '#f0a868' },
  { label: 'Рейд-босс',          color: '#e25c4b' },
  { label: 'Монстр',             color: '#9b8cff' },
  { label: 'Стража',             color: '#7e96a0' },
];

export const LOCATION_TYPES: QuestType[] = [
  { label: 'Город',      color: '#d2ab52' },
  { label: 'Деревня',    color: '#6fdc8e' },
  { label: 'Зона охоты', color: '#5fcf8a' },
  { label: 'Инстанс',    color: '#a679e8' },
  { label: 'Эпик-зона',  color: '#e25c4b' },
];

export const GUIDE_TYPES_BY_CATEGORY: Record<string, QuestType[]> = {
  quests: QUEST_TYPES,
  items: ITEM_TYPES,
  npc: NPC_TYPES,
  locations: LOCATION_TYPES,
  classes: QUEST_TYPES,
  skills: ITEM_TYPES,
  'raid-bosses': NPC_TYPES,
};

export const ALL_GUIDE_TYPES: QuestType[] = [
  ...QUEST_TYPES,
  ...ITEM_TYPES,
  ...NPC_TYPES,
  ...LOCATION_TYPES,
].filter((item, index, arr) => arr.findIndex(t => t.label === item.label) === index);

export const GUIDE_TYPE_COLOR: Record<string, string> = Object.fromEntries(
  ALL_GUIDE_TYPES.map(t => [t.label, t.color]),
);

export const QUEST_TYPE_COLOR = GUIDE_TYPE_COLOR;
