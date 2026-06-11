// Типы квестов — теги с цветами. Хранятся в Guide.types как массив этих label'ов.
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

export const QUEST_TYPE_COLOR: Record<string, string> = Object.fromEntries(
  QUEST_TYPES.map(t => [t.label, t.color]),
);
