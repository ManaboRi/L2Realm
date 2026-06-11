import type { CSSProperties, ReactNode } from 'react';

// Единый набор линейных иконок для разделов гайдов (наследуют currentColor).
const PATHS: Record<string, ReactNode> = {
  quests: (<><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></>),
  items: (<><path d="M6 3h12l3 6-9 12L3 9z" /><path d="M3 9h18" /><path d="M9 3 6 9l6 12 6-12-3-6" /></>),
  npc: (<><circle cx="12" cy="8" r="3.4" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></>),
  locations: (<><path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z" /><circle cx="12" cy="10" r="2.4" /></>),
  classes: (<><circle cx="9" cy="8" r="3" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><circle cx="17" cy="9" r="2.3" /><path d="M16 13.6a5 5 0 0 1 4.5 4.4" /></>),
  skills: (<><path d="M13 2 4.5 13H11l-1 9 9.5-12H13z" /></>),
  'raid-bosses': (<><path d="M5 10a7 7 0 0 1 14 0c0 2.4-1 3.7-2 4.6V18a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 18v-3.4C6 13.7 5 12.4 5 10z" /><circle cx="9.6" cy="11" r="1.2" /><circle cx="14.4" cy="11" r="1.2" /><path d="M11 16h2" /></>),
  novichkam: (<><circle cx="12" cy="12" r="9" /><path d="M15.6 8.4 13 13l-4.6 2.6L11 11z" /></>),
};

export function GuideIcon({ name, size = 20, className, style }: { name: string; size?: number; className?: string; style?: CSSProperties }) {
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name] ?? PATHS.quests}
    </svg>
  );
}
