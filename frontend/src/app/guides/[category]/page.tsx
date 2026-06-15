import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatGuideChronicle } from '../guides';
import { findGuideCategory } from '../categories';
import { GuideIcon } from '../GuideIcon';
import { GuidesDisclaimer } from '../GuidesDisclaimer';
import { QuestList } from './QuestList';
import type { Guide } from '@/lib/types';
import g from '../page.module.css';

const SITE = 'https://l2realm.ru';
const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';

export const revalidate = 300;

type Props = { params: Promise<{ category: string }>; searchParams: Promise<{ lvl?: string; chr?: string; type?: string }> };

// Кнопки-разделы (как на хабе).
const NAV = [
  { slug: 'novichkam', label: 'Новичкам', href: '/guides' },
  { slug: 'quests', label: 'Квесты', href: '/guides/quests' },
  { slug: 'classes', label: 'Классы', href: '/guides/classes' },
  { slug: 'skills', label: 'Скиллы', href: '/guides/skills' },
  { slug: 'items', label: 'Предметы', href: '/guides/items' },
  { slug: 'npc', label: 'NPC', href: '/guides/npc' },
  { slug: 'monsters', label: 'Монстры', href: '/guides/monsters' },
  { slug: 'locations', label: 'Локации', href: '/guides/locations' },
  { slug: 'raid-bosses', label: 'Рейд-боссы', href: '/guides/raid-bosses' },
];

// Левый блок «Основные квесты» — частые подборки.
const MAIN_QUESTS = [
  { label: 'Квесты на 1 профессию', desc: 'с 18–20 уровня', href: '/guides/quests?lvl=b1' },
  { label: 'Квесты на 2 профессию', desc: 'с 40 уровня', href: '/guides/quests?lvl=b3' },
  { label: 'Квесты на 3 профессию', desc: 'с 76 уровня', href: '/guides/quests?lvl=b4' },
  { label: 'Сабкласс', desc: 'дополнительные классы', href: '/guides/quests' },
  { label: 'Нублесс', desc: 'статус Noblesse', href: '/guides/quests' },
  { label: 'Пайлака', desc: 'эндгейм-инстанс', href: '/guides/quests?lvl=b4' },
];

const PLAYER_PATH = [
  { n: '1', title: 'Новичок (1–20)', desc: 'Первые квесты и квест на 1 профессию.' },
  { n: '2', title: 'Развитие (20–40)', desc: 'Снаряжение и 2 профессия.' },
  { n: '3', title: 'Подготовка (40–76)', desc: 'Нублесс, сабкласс, фарм.' },
  { n: '4', title: 'Эндгейм (76+)', desc: 'Пайлака, эпик и боссы.' },
];

const SIDE_BY_CATEGORY: Record<string, {
  linksTitle: string;
  links: Array<{ label: string; desc: string; href: string; icon: string }>;
  popularTitle: string;
  pathTitle: string;
  path: Array<{ n: string; title: string; desc: string }>;
}> = {
  quests: {
    linksTitle: 'Основные квесты',
    links: MAIN_QUESTS.map(item => ({ ...item, icon: 'quests' })),
    popularTitle: 'Популярные квесты',
    pathTitle: 'Путь игрока',
    path: PLAYER_PATH,
  },
  items: {
    linksTitle: 'Подборки предметов',
    links: [
      { label: 'Оружие', desc: 'мечи, луки, магическое оружие', href: '/guides/items?type=Оружие', icon: 'items' },
      { label: 'Броня', desc: 'сеты, части брони и грейды', href: '/guides/items?type=Броня', icon: 'items' },
      { label: 'Ресурсы', desc: 'крафт, спойл и материалы', href: '/guides/items?type=Ресурсы', icon: 'items' },
      { label: 'Квестовые предметы', desc: 'что нужно для заданий', href: '/guides/items?type=Квестовый%20предмет', icon: 'quests' },
      { label: 'Рецепты', desc: 'рецепты и куски предметов', href: '/guides/items?type=Рецепты', icon: 'items' },
    ],
    popularTitle: 'Популярные предметы',
    pathTitle: 'Как читать предметы',
    path: [
      { n: '1', title: 'Тип', desc: 'Оружие, броня, ресурс или квестовый предмет.' },
      { n: '2', title: 'Хроника', desc: 'Некоторые предметы есть не во всех версиях Lineage 2.' },
      { n: '3', title: 'Источник', desc: 'NPC, локация, квест, дроп или крафт.' },
      { n: '4', title: 'Связи', desc: 'Позже свяжем предметы с квестами и NPC.' },
    ],
  },
  npc: {
    linksTitle: 'Типы NPC',
    links: [
      { label: 'Квестовые NPC', desc: 'персонажи, которые выдают задания', href: '/guides/npc?type=Квестовый%20NPC', icon: 'npc' },
      { label: 'Торговцы', desc: 'магазины, расходники и книги', href: '/guides/npc?type=Торговец', icon: 'npc' },
      { label: 'Хранители склада', desc: 'warehouse и freight NPC', href: '/guides/npc?type=Хранитель%20склада', icon: 'npc' },
      { label: 'Мастера', desc: 'классы, скиллы, профессии', href: '/guides/npc?type=Мастер', icon: 'classes' },
      { label: 'Рейд-боссы', desc: 'боссы, респ и дроп', href: '/guides/npc?type=Рейд-босс', icon: 'raid-bosses' },
    ],
    popularTitle: 'Популярные NPC',
    pathTitle: 'Карточка NPC',
    path: [
      { n: '1', title: 'Где стоит', desc: 'Локация и хроники, где NPC встречается.' },
      { n: '2', title: 'Что делает', desc: 'Квесты, магазин, склад, телепорт или профессия.' },
      { n: '3', title: 'Скриншот', desc: 'Когда дашь скрины из игры, добавим портреты.' },
      { n: '4', title: 'Связанные квесты', desc: 'Потом привяжем задания к конкретным NPC.' },
    ],
  },
  monsters: {
    linksTitle: 'Типы монстров',
    links: [
      { label: 'По локациям', desc: 'монстры внутри зон охоты', href: '/guides/monsters', icon: 'locations' },
      { label: 'Квестовые монстры', desc: 'нужны для заданий и цепочек', href: '/guides/monsters?type=Квестовый%20монстр', icon: 'quests' },
      { label: 'Дроп', desc: 'предметы, ресурсы и адена', href: '/guides/monsters?type=Дроп', icon: 'items' },
      { label: 'Спойл', desc: 'что можно получить гномом', href: '/guides/monsters?type=Спойл', icon: 'items' },
      { label: 'Агрессивные', desc: 'опасные монстры в локациях', href: '/guides/monsters?type=Агрессивный', icon: 'monsters' },
    ],
    popularTitle: 'Популярные монстры',
    pathTitle: 'Карточка монстра',
    path: [
      { n: '1', title: 'Уровень', desc: 'Диапазон уровней и хроника, где монстр встречается.' },
      { n: '2', title: 'Локация', desc: 'Где искать и с какими NPC/квестами связан.' },
      { n: '3', title: 'Дроп и спойл', desc: 'Предметы будут связываться с базой знаний.' },
      { n: '4', title: 'Квесты', desc: 'Если монстр нужен в квесте, появится внутренняя ссылка.' },
    ],
  },
  'raid-bosses': {
    linksTitle: 'Рейд-боссы',
    links: [
      { label: 'Все боссы', desc: 'список по уровню и хронике', href: '/guides/raid-bosses', icon: 'raid-bosses' },
      { label: 'Эпик-боссы', desc: 'важные боссы и цепочки', href: '/guides/raid-bosses?type=Эпик-босс', icon: 'raid-bosses' },
      { label: 'Дроп', desc: 'основные награды', href: '/guides/raid-bosses?type=Дроп', icon: 'items' },
      { label: 'Локации', desc: 'где искать босса', href: '/guides/locations', icon: 'locations' },
    ],
    popularTitle: 'Популярные рейд-боссы',
    pathTitle: 'Карточка босса',
    path: [
      { n: '1', title: 'Уровень', desc: 'Подбирай босса под диапазон группы.' },
      { n: '2', title: 'Респ', desc: 'Позже добавим время и заметки по появлению.' },
      { n: '3', title: 'Дроп', desc: 'Предметы будут ссылаться на базу предметов.' },
      { n: '4', title: 'Связи', desc: 'Квесты, локации и монстры свяжутся автоматически.' },
    ],
  },
};

const HERO_IMG: Record<string, string> = {
  quests: '/images/guide-hero-quests.webp',
  items: '/images/guide-hero-items.webp',
  npc: '/images/guide-hero-npc.webp',
  monsters: '/images/guide-hero-npc.webp',
  locations: '/images/guide-hero-locations.webp',
  classes: '/images/guide-hero-classes.webp',
  skills: '/images/guide-hero-skills.webp',
  'raid-bosses': '/images/guide-hero-npc.webp',
};

async function fetchGuides(category: string): Promise<Guide[]> {
  try {
    const res = await fetch(`${BACKEND}/api/guides?category=${encodeURIComponent(category)}`, { next: { revalidate } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const cat = findGuideCategory(category);
  if (!cat) return { title: 'Гайды не найдены', robots: { index: false, follow: false } };
  return {
    title: `${cat.label} Lineage 2 — гайды и список | L2Realm`,
    description: `${cat.label} Lineage 2: ${cat.desc} Фильтры по хронике, типу, уровню и локации.`,
    alternates: { canonical: `${SITE}/guides/${cat.slug}` },
  };
}

export default async function GuideCategoryPage({ params, searchParams }: Props) {
  const { category } = await params;
  const sp = await searchParams;
  const cat = findGuideCategory(category);
  if (!cat) notFound();

  const guides = await fetchGuides(cat.slug);
  const popular = [...guides].sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 6);
  const heroImg = HERO_IMG[cat.slug] ?? '/images/guides-hero.webp';
  const side = SIDE_BY_CATEGORY[cat.slug] ?? {
    linksTitle: `Разделы ${cat.label.toLowerCase()}`,
    links: NAV.filter(item => item.slug !== 'novichkam').map(item => ({
      label: item.label,
      desc: 'перейти к разделу базы знаний',
      href: item.href,
      icon: item.slug,
    })),
    popularTitle: `Популярное в разделе`,
    pathTitle: 'Как пользоваться',
    path: [
      { n: '1', title: 'Выбери хронику', desc: 'Interlude, High Five, Essence или Main.' },
      { n: '2', title: 'Уточни фильтр', desc: 'Тип, уровень и локация помогают сузить список.' },
      { n: '3', title: 'Открой гайд', desc: 'Внутри будут детали, связанные NPC и предметы.' },
    ],
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Гайды', item: `${SITE}/guides` },
      { '@type': 'ListItem', position: 2, name: cat.label, item: `${SITE}/guides/${cat.slug}` },
    ],
  };

  return (
    <main className={g.guidesMain}>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* ── Hero раздела (full-bleed, своя картинка) ── */}
      <div className={g.heroBand}>
        <div className={g.heroBg} aria-hidden="true"><img src={heroImg} alt="" /></div>
        <div className={g.heroInner}>
          <div className={g.heroContent}>
            <span className={g.heroKicker}>База знаний L2Realm</span>
            <h1 className={g.heroTitle}>{cat.label} <span>Lineage 2</span></h1>
            <p className={g.heroSub}>{cat.desc} Хроника, уровень, раса и локация — фильтры, выбирай нужное.</p>
          </div>
        </div>
      </div>

      <div className={g.wrap}>
        {/* ── Кнопки-разделы ── */}
        <nav className={g.catNav} aria-label="Разделы гайдов">
          {NAV.map(item => (
            <Link key={item.slug} href={item.href} className={`${g.catBtn} ${item.slug === cat.slug ? g.catBtnActive : ''}`}>
              <GuideIcon name={item.slug} size={18} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className={g.gGrid}>

          {/* LEFT: Основные квесты */}
          <aside className={g.leftCol}>
            <div className={g.panel}>
              <div className={g.panelTitle}>{side.linksTitle}</div>
              {side.links.map(m => (
                <Link key={m.label} href={m.href} className={g.nextLink}>
                  <span className={g.nextIcon}><GuideIcon name={m.icon} size={16} /></span>
                  <span className={g.nextText}>
                    <strong>{m.label}</strong>
                    <small>{m.desc}</small>
                  </span>
                  <span className={g.nextArrow} aria-hidden="true">›</span>
                </Link>
              ))}
            </div>
          </aside>

          {/* CENTER: список квестов */}
          <section className={g.centerCol}>
            <QuestList guides={guides} category={cat.slug} defaultChronicle={sp.chr ?? ''} initialLevel={sp.lvl ?? 'all'} initialType={sp.type ?? ''} />
          </section>

          {/* RIGHT: популярные + путь игрока */}
          <aside className={g.rightCol}>
            <div className={g.panel}>
              <div className={g.panelTitle}>{side.popularTitle}</div>
              {popular.length > 0 ? (
                <div className={g.popList}>
                  {popular.map(pg => {
                    return (
                      <Link key={pg.id} href={`/guides/${pg.category}/${pg.slug}`} className={g.popRow}>
                        <span className={g.popFire} aria-hidden="true">🔥</span>
                        <span className={g.popName}>{pg.title}</span>
                        <span className={g.popMeta}>{formatGuideChronicle(pg.chronicle)}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className={g.popEmpty}>Скоро здесь будут самые просматриваемые материалы раздела.</p>
              )}
            </div>

            <div className={g.panel}>
              <div className={g.panelTitle}>{side.pathTitle}</div>
              <div className={g.pathSteps}>
                {side.path.map(p => (
                  <div key={p.n} className={g.pathStep}>
                    <span className={g.pathNum}>{p.n}</span>
                    <div className={g.pathText}>
                      <strong>{p.title}</strong>
                      <p>{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

        </div>

        <GuidesDisclaimer />
      </div>
    </main>
  );
}
