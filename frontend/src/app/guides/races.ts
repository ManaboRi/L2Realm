// Расы для фильтра/админки квестов. slug хранится в Guide.race (null = для всех рас).
export type GuideRace = { slug: string; label: string };

export const GUIDE_RACES: GuideRace[] = [
  { slug: 'human', label: 'Human' },
  { slug: 'elf', label: 'Elf' },
  { slug: 'dark-elf', label: 'Dark Elf' },
  { slug: 'orc', label: 'Orc' },
  { slug: 'dwarf', label: 'Dwarf' },
  { slug: 'kamael', label: 'Kamael' },
];

export function guideRaceLabel(slug?: string | null): string {
  if (!slug) return 'Все расы';
  return GUIDE_RACES.find(r => r.slug === slug)?.label ?? slug;
}
