/* Seed/update monster guide entries used by the current quest base.
 *
 * The script fetches factual monster data from public wiki pages and writes
 * original L2Realm markdown: level, aggro, location, drop, spoil and related quests.
 *
 * Run from backend app root:
 *   node prisma/seed-monsters.js
 *
 * Set OVERWRITE_GUIDE_CONTENT=0 if you only want metadata updates.
 * Set DRY_RUN=1 to preview without writing.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const OVERWRITE_CONTENT = process.env.OVERWRITE_GUIDE_CONTENT !== '0';
const DRY_RUN = process.env.DRY_RUN === '1';
const USER_AGENT = 'Mozilla/5.0 L2RealmBot/1.0 (+https://l2realm.ru)';
const SOURCE_HOST = 'https://linedia.ru';

const MONSTERS = [
  m('https://linedia.ru/wiki/Trisalim_Tarantula', ['Repent Your Sins']),
  m('https://linedia.ru/wiki/Maille_Lizardman', ['Lizardmen\'s Conspiracy']),
  m('https://linedia.ru/wiki/Maille_Lizardman_Warrior', ['Lizardmen\'s Conspiracy']),
  m('https://linedia.ru/wiki/Maille_Lizardman_Shaman', ['Lizardmen\'s Conspiracy']),
  m('https://linedia.ru/wiki/Maille_Lizardman_Matriarch', ['Lizardmen\'s Conspiracy']),
  m('https://linedia.ru/wiki/Vuku_Orc_Fighter', ['Path of the Orc Shaman'], { titleEn: 'Vuku Orc Fighter' }),
  m('https://linedia.ru/wiki/Goblin_Tomb_Raider_Leader', ['Path of the Orc Raider']),
  m('https://linedia.ru/wiki/Kuruka_Ratman_Leader', ['Path of the Orc Raider'], { titleEn: 'Kuruka Ratman Leader' }),
  m('https://linedia.ru/wiki/Umbar_Orc', ['Path of the Orc Raider']),
  m('https://linedia.ru/wiki/Ant', ['Trial of the Guildsman']),
  m('https://linedia.ru/wiki/Ant_Captain', ['Trial of the Guildsman']),
  m('https://linedia.ru/wiki/Ant_Overseer', ['Trial of the Guildsman']),
  m('https://linedia.ru/wiki/Noble_Ant', ['Test of the War Spirit', 'Test of the Summoner']),
  m('https://linedia.ru/wiki/Noble_Ant_Leader', ['Test of the War Spirit'], { titleEn: 'Noble Ant Leader' }),
  m('https://linedia.ru/wiki/Leto_Lizardman', ['Test of the Summoner']),
  m('https://linedia.ru/wiki/Leto_Lizardman_Warrior', ['Testimony of Fate']),
  m('https://linedia.ru/wiki/Leto_Lizardman_Shaman', ['Test of the War Spirit', 'Testimony of Prosperity']),
  m('https://linedia.ru/wiki/Leto_Lizardman_Overlord', ['Testimony of Fate', 'Testimony of Prosperity']),
  m('https://linedia.ru/wiki/Giant_Fungus', ['Test of the Searcher', 'Test of the Summoner']),
  m('https://linedia.ru/wiki/Karul_Bugbear', ['Testimony of Fate', 'Test of the Summoner']),
  m('https://linedia.ru/wiki/Grandis', ['Testimony of Fate']),
  m('https://linedia.ru/wiki/Medusa', ['Testimony of Fate']),
  m('https://linedia.ru/wiki/Fettered_Soul', ['Testimony of Fate', 'Test of the Summoner']),
  m('https://linedia.ru/wiki/Enchanted_Gargoyle', ['Testimony of Fate'], { titleEn: 'Enchanted Gargoyle' }),
  m('https://linedia.ru/wiki/Wyrm', ['Testimony of Prosperity', 'Test of the Summoner']),
  m('https://linedia.ru/wiki/Manashen_Gargoyle', ['Test of the Summoner']),
  m('https://linedia.ru/wiki/Breka_Orc', ['Test of the Summoner']),
  m('https://linedia.ru/wiki/Breka_Orc_Overlord', ['Testimony of Fate'], { titleEn: 'Breka Orc Overlord' }),
  m('https://linedia.ru/wiki/Windsus', ['Test of the Summoner']),
  m('https://linedia.ru/wiki/Tyrant_%28Monster%29', ['Test of the Summoner'], { titleEn: 'Tyrant' }),
  m('https://linedia.ru/wiki/Taik_Orc_Seeker', ['For the Sake of the Territory - Aden'], { titleEn: 'Taik Orc Seeker' }),
  m('https://linedia.ru/wiki/Taik_Orc_Supply_Leader', ['For the Sake of the Territory - Aden']),
  m('https://linedia.ru/wiki/Hallate%27s_Warrior', ['Legacy of Insolence']),
  m('https://linedia.ru/wiki/Hallate%27s_Knight', ['Legacy of Insolence']),
  m('https://linedia.ru/wiki/Hallate%27s_Commander', ['Legacy of Insolence']),
  m('https://linedia.ru/wiki/Crimson_Drake', ['Chest Caught with a Bait of Fire']),
  m('https://linedia.ru/wiki/Doom_Archer', ['Cursed Life']),
  m('https://linedia.ru/wiki/Doom_Guard', ['Cursed Life']),
  m('https://linedia.ru/wiki/Doom_Servant', ['Cursed Life']),
  m('https://linedia.ru/wiki/Enchanted_Iron_Golem', ['Make Formal Wear'], { titleEn: 'Enchanted Iron Golem' }),
];

function m(source, quests = [], extra = {}) {
  return { source, quests, ...extra };
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

function htmlToText(html) {
  return decodeHtml(String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<img\b[^>]*>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/td>/gi, ' | ')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/(?:p|li|div|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t\r\f\v]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim());
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function sourceSlugFromHref(href, fallbackName) {
  if (!href) return slugify(fallbackName);
  try {
    const url = new URL(decodeHtml(href), SOURCE_HOST);
    const title = url.searchParams.get('title');
    const raw = decodeURIComponent(title || url.pathname.split('/').pop() || '').replace(/_/g, ' ');
    return slugify(raw || fallbackName);
  } catch {
    return slugify(fallbackName);
  }
}

function normalizeNumber(value) {
  const digits = String(value || '').replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
}

function cleanCell(value) {
  return htmlToText(value)
    .replace(/\s*\|\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseTitle(html, source) {
  const raw = cleanCell(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '');
  const translated = raw.match(/^(.+)\s+\(([\u0400-\u04FF][\s\S]*)\)$/u);
  if (translated) return { titleEn: translated[1].trim(), title: translated[2].trim() };
  const match = raw.match(/^(.+?)\s+\((.+?)\)$/);
  if (match) return { titleEn: match[1].trim(), title: match[2].trim() };
  const fallback = decodeURIComponent(source.split('/').pop() || '').replace(/_/g, ' ');
  return { titleEn: raw || fallback, title: raw || fallback };
}

function parseInfo(html, titleEn) {
  const h1 = html.indexOf('<h1');
  const firstDrop = html.indexOf('Дроп', h1);
  const infoText = htmlToText(html.slice(h1, firstDrop > h1 ? firstDrop : h1 + 4500));
  const level = normalizeNumber(infoText.match(new RegExp(`${escapeRegExp(titleEn)}\\s*\\((\\d+)\\)`, 'i'))?.[1]);
  const race = cleanInfo(infoText.match(/Раса:\s*\|?\s*([^|>]+?)(?=\s*Агр:|\s*Кол-во HP:)/i)?.[1]);
  const aggro = cleanInfo(infoText.match(/Агр:\s*\|?\s*(Да|Нет)/i)?.[1]);
  const hp = normalizeNumber(infoText.match(/Кол-во HP:\s*\|?\s*([\d\s]+)/i)?.[1]);
  const exp = normalizeNumber(infoText.match(/Кол-во Exp:\s*\|?\s*([\d\s]+)/i)?.[1]);
  const sp = normalizeNumber(infoText.match(/Кол-во SP:\s*\|?\s*([\d\s]+)/i)?.[1]);
  const id = normalizeNumber(infoText.match(/ID:\s*\|?\s*(\d+)/i)?.[1]);
  const locationRaw = parseLocationRaw(html, h1) || cleanInfo(infoText.match(/Локации:\s*\|?\s*([\s\S]+?)(?=\s+[A-Z][A-Za-z'’\s-]+\s*\(|$)/i)?.[1]);
  return {
    level,
    race,
    aggro,
    hp,
    exp,
    sp,
    id,
    locationRaw,
    location: locationLabel(locationRaw),
  };
}

function cleanInfo(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\s*\|\s*/g, ' ')
    .trim();
}

function parseLocationRaw(html, start) {
  const labels = ['\u041b\u043e\u043a\u0430\u0446\u0438\u0438', '\u041b\u043e\u043a\u0430\u0446\u0438\u044f'];
  const chunk = String(html || '').slice(start, start + 35000);
  for (const match of chunk.matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
    const row = match[0];
    if (!labels.some(label => row.includes(label))) continue;
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(cell => cleanCell(cell[1]));
    const value = cells[1] || cells[0] || '';
    return cleanInfo(value);
  }
  return null;
}

function parseInfoRows(html, start) {
  const chunk = String(html || '').slice(start, start + 35000);
  const result = {};
  for (const match of chunk.matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
    const cells = [...match[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(cell => cleanCell(cell[1]));
    if (cells.length < 2) continue;
    const key = cells[0].replace(/:$/, '').trim();
    if (result[key] === undefined) result[key] = cells[1];
  }
  return result;
}

function locationLabel(raw) {
  const text = cleanInfo(raw);
  if (!text) return null;
  const ru = [...text.matchAll(/\(([^()]+)\)/g)].map(m => m[1]).filter(Boolean).pop();
  return (ru || text)
    .replace(/^Земли\s+/i, '')
    .replace(/^Город\s+/i, '')
    .trim();
}

function locationEnLabel(raw) {
  const text = cleanInfo(raw);
  if (!text) return null;
  const parts = text
    .split(/\s*,\s*/)
    .map(part => part.replace(/\s*\([^()]*\)/g, '').trim())
    .filter(Boolean);
  const en = [...new Set(parts)].slice(0, 4).join(', ');
  return en && en !== locationLabel(raw) ? en : null;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function absoluteImage(src) {
  if (!src) return null;
  const value = decodeHtml(src);
  if (/^https?:\/\//i.test(value)) return value;
  return `${SOURCE_HOST}${value.startsWith('/') ? '' : '/'}${value}`;
}

const absoluteUrl = absoluteImage;

function isRedlink(href) {
  return /(?:\?|&)redlink=1\b/i.test(decodeHtml(href || ''));
}

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function parseImage(html) {
  const h1 = html.indexOf('<h1');
  const end = html.indexOf('Дроп', h1);
  const chunk = html.slice(h1, end > h1 ? end : h1 + 7000);
  const images = [...chunk.matchAll(/<img\b[^>]*>/gi)].map(m => m[0]);
  for (const img of images) {
    const src = img.match(/\bsrc="([^"]+)"/i)?.[1];
    const alt = decodeHtml(img.match(/\balt="([^"]*)"/i)?.[1] || '');
    const title = decodeHtml(img.match(/\btitle="([^"]*)"/i)?.[1] || '');
    if (!src || /Skill|Quest|icon|No_image|symbol/i.test(src)) continue;
    if (/screenshot|скрин|монстр|tarantula|orc|lizard|drake|golem|ant|doom|wyrm|gargoyle|fungus|medusa|tyrant/i.test(`${src} ${alt} ${title}`)) {
      return absoluteImage(src);
    }
  }
  return null;
}

function parseRows(table) {
  return [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .slice(1)
    .map(row => {
      const rawCells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(cell => cell[1]);
      const itemCell = rawCells[1] || rawCells[0] || '';
      const link = itemCell.match(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      const icon = (rawCells[0] || itemCell).match(/<img\b[^>]*src="([^"]+)"/i)?.[1];
      const name = cleanCell(link?.[2] || itemCell).replace(/\s+/g, ' ').trim();
      const href = link ? absoluteUrl(link[1]) : null;
      return {
        name,
        href,
        slug: sourceSlugFromHref(href, name),
        amount: cleanCell(rawCells[2] || ''),
        chance: cleanCell(rawCells[3] || ''),
        icon: icon ? absoluteUrl(icon) : null,
      };
    })
    .filter(row => row.name && !/^Файл:/i.test(row.name) && row.name.length < 90);
}

function parseDropTables(html) {
  const tables = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map(match => ({ html: match[0], index: match.index || 0 }));
  const result = { drop: [], spoil: [] };
  for (const table of tables) {
    if (!/Название предмета/i.test(table.html) || !/Шанс/i.test(table.html)) continue;
    const context = htmlToText(html.slice(Math.max(0, table.index - 260), table.index));
    const rows = parseRows(table.html);
    if (!rows.length) continue;
    if (/Cпойл|Спойл/i.test(context)) {
      if (!result.spoil.length) result.spoil = rows;
    } else if (/Дроп/i.test(context)) {
      if (!result.drop.length) result.drop = rows;
    }
  }
  return result;
}

function isNoiseDrop(name) {
  return /\bHerb\b/i.test(name);
}

function compactReward(dropRows, spoilRows) {
  const parts = [];
  if (dropRows.some(row => /^Adena$/i.test(row.name))) parts.push(':adena:');
  for (const row of [...dropRows, ...spoilRows]) {
    if (parts.length >= 4) break;
    if (/^Adena$/i.test(row.name) || isNoiseDrop(row.name)) continue;
    if (!parts.includes(row.name)) parts.push(row.name);
  }
  return parts.join(' · ').slice(0, 120);
}

function dropCell(row) {
  if (/^Adena$/i.test(row.name)) return ':adena: Adena';
  const slug = row.slug || sourceSlugFromHref(row.href, row.name);
  return slug ? `[${row.name}](/guides/items/${slug})` : `**${row.name}**`;
}

function formatNumber(value) {
  if (value == null) return '—';
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function formatPercent(value) {
  return String(value || '').replace(/\.?0+%$/, '%').replace('.', ',');
}

function mdTable(rows, limit = 12) {
  const clean = rows.filter(row => row.name && !isNoiseDrop(row.name)).slice(0, limit);
  if (!clean.length) return 'Нет проверенных данных.';
  return [
    '| Предмет | Кол-во | Шанс |',
    '|---|---:|---:|',
    ...clean.map(row => `| ${dropCell(row)} | ${row.amount || '—'} | ${formatPercent(row.chance) || '—'} |`),
  ].join('\n');
}

function buildContent(monster, parsed) {
  const { title, titleEn, info, dropRows, spoilRows } = parsed;
  const aggroText = info.aggro === 'Да' ? 'агрессивный' : 'неагрессивный';
  const locationRu = info.location || locationLabel(info.locationRaw) || 'локация уточняется';
  const locationEn = locationEnLabel(info.locationRaw);
  const locationRaw = cleanInfo(info.locationRaw);
  const questLines = monster.quests.length
    ? monster.quests.map(q => `- **${q}**`).join('\n')
    : null;

  return [
    '## Обзор',
    '',
    `**${title}** (${titleEn}) — ${aggroText} монстр **${info.level || '—'} уровня**${info.race ? `, раса **${info.race}**` : ''}. Ниже собраны параметры, место появления, дроп и спойл, чтобы быстро понять, нужен ли этот моб для фарма или квеста.`,
    '',
    `- Уровень: **${info.level || '—'}**`,
    info.race ? `- Раса: **${info.race}**` : null,
    `- Агрессия: **${info.aggro || 'уточняется'}**`,
    info.hp ? `- HP: **${formatNumber(info.hp)}**` : null,
    info.exp || info.sp ? `- EXP / SP: **${formatNumber(info.exp)} / ${formatNumber(info.sp)}**` : null,
    info.id ? `- ID монстра: **${info.id}**` : null,
    questLines ? '- Используется в квестах:' : null,
    questLines,
    '',
    '## Где находится',
    '',
    `- Русское название: **${locationRu}**`,
    locationEn ? `- Английское название: **${locationEn}**` : null,
    locationRaw && locationRaw !== locationRu && locationRaw !== locationEn ? `- В источнике: ${locationRaw}` : null,
    '',
    '## Дроп и спойл',
    '',
    '### Дроп',
    '',
    mdTable(dropRows, 14),
    '',
    '### Спойл',
    '',
    mdTable(spoilRows, 10),
  ].filter(Boolean).join('\n');
}

function itemTypeFromInfo(typeText, titleEn) {
  const text = `${typeText || ''} ${titleEn || ''}`;
  if (/Recipe|Рецепт/i.test(text)) return 'Рецепты';
  if (/Resource|Ресурс|Material|Piece|Часть|Кусок|Blade|Head|Shaft|Gemstone|Ore|Asofe|Mold|Varnish|Coal|Stem|Suede|Thread/i.test(text)) return 'Ресурсы';
  if (/Potion|Scroll|Arrow|Shot|Зелье|Свиток|Стрела|Soulshot|Spiritshot|Dye|Life Stone/i.test(text)) return 'Расходники';
  if (/Sword|Dagger|Blunt|Bow|Pole|Fist|Dual|Weapon|Staff|Rod|Mace|Club|Knife|Chisel|Меч|Кинжал|Лук|Оруж|Посох|Жезл|Булава|Дубина/i.test(text)) return 'Оружие';
  if (/Armor|Shield|Helmet|Gloves|Boots|Tunic|Pants|Robe|Leather|Stockings|Shirt|Shoes|Sandals|Cap|Breastplate|Gaiters|Доспех|Брон|Щит|Шлем|Перчат|Ботин|Штаны|Рубаха|Туника|Сандалии|Шляпа/i.test(text)) return 'Броня';
  if (/Ring|Earring|Necklace|Accessory|Кольцо|Серьг|Ожерелье/i.test(text)) return 'Бижутерия';
  return 'Ресурсы';
}

function parseItemInfo(html) {
  const h1 = html.indexOf('<h1');
  const title = parseTitle(html, '');
  const rows = parseInfoRows(html, h1);
  const type = rows['Тип'] || null;
  const itemType = itemTypeFromInfo(type, title.titleEn);
  const isEquipment = ['Оружие', 'Броня', 'Бижутерия'].includes(itemType);
  const gradeMatch = html.slice(h1, h1 + 9000).match(/Item_grade_([A-Z0-9]+)\.gif/i);
  const grade = isEquipment ? (gradeMatch?.[1]?.toUpperCase() || null) : null;
  const icon = parseItemIcon(html);
  const statKeys = [
    'P. Atk.', 'M. Atk.', 'P. Def.', 'M. Def.', 'Def. Rate', 'Уворот',
    'Скорость атаки', 'Крит. Атк.', 'Дальность', 'MP', 'Вес', 'Цена', 'ID',
  ];
  const stats = statKeys
    .filter(key => rows[key])
    .map(key => ({ label: key.replace(/\.$/, ''), value: rows[key] }));
  return { ...title, type, itemType, grade, icon, stats };
}

function parseItemIcon(html) {
  const h1 = html.indexOf('<h1');
  const chunk = html.slice(h1, h1 + 9000);
  for (const match of chunk.matchAll(/<img\b[^>]*>/gi)) {
    const img = match[0];
    const src = img.match(/\bsrc="([^"]+)"/i)?.[1];
    if (!src || /Item_grade|Adena\.jpg|counter|yandex/i.test(src)) continue;
    return absoluteUrl(src);
  }
  return null;
}

function buildItemContent(item, seenOn) {
  const sourceLines = [...seenOn.monsters].slice(0, 10).map(name => `- **${name}**`).join('\n');
  const statsLines = [
    item.type ? `- Тип: **${item.type}**` : null,
    item.grade ? `- Грейд: **${item.grade}**` : null,
    ...(item.stats || []).map(stat => `- ${stat.label}: **${stat.value}**`),
  ].filter(Boolean);
  return [
    '## Что это',
    '',
    `**${item.title}** (${item.titleEn}) — предмет Lineage 2 из базы L2Realm. Карточка нужна, чтобы открывать предмет прямо из таблиц дропа и быстро сверять тип, грейд и основные характеристики.`,
    statsLines.length ? '' : null,
    statsLines.length ? '## Характеристики' : null,
    statsLines.length ? '' : null,
    ...statsLines,
    '',
    '## Где получить',
    '',
    sourceLines || '- Источник будет уточнен по мере наполнения базы.',
    '',
    '## Примечание',
    '',
    'Шансы и количество могут отличаться на приватных серверах, если администрация меняла дроп-листы. Для классической базы смотри связанного монстра и шанс в его таблице дропа.',
  ].filter(Boolean).join('\n');
}

async function fetchItem(href, fallbackName, fallbackIcon) {
  const sourceSlug = sourceSlugFromHref(href, fallbackName);
  if (!href || isRedlink(href)) return {
    title: fallbackName,
    titleEn: fallbackName,
    sourceSlug,
    itemType: itemTypeFromInfo('', fallbackName),
    grade: null,
    icon: fallbackIcon,
    type: null,
    stats: [],
  };
  const html = await fetchHtml(href);
  const parsed = parseItemInfo(html);
  return {
    title: parsed.title || fallbackName,
    titleEn: parsed.titleEn || fallbackName,
    sourceSlug,
    itemType: parsed.itemType || 'Ресурсы',
    grade: parsed.grade,
    icon: parsed.icon || fallbackIcon,
    type: parsed.type,
    stats: parsed.stats || [],
  };
}

function isGeneratedItemContent(content) {
  const value = String(content || '');
  return !value || (value.includes('базе L2Realm') && value.includes('таблиц') && value.includes('дропа'));
}

async function upsertItem(item, seenOn, reservedSourceSlugs = new Set()) {
  const slug = item.sourceSlug || slugify(item.titleEn || item.title);
  let existing = await prisma.guide.findFirst({ where: { slug, category: 'items' } });
  if (!existing) {
    existing = await prisma.guide.findFirst({ where: { title: item.title, category: 'items' } });
    if (existing && reservedSourceSlugs.has(existing.slug) && existing.slug !== slug) existing = null;
  }
  if (!existing && item.titleEn) {
    const candidates = await prisma.guide.findMany({
      where: { titleEn: item.titleEn, category: 'items' },
      take: 5,
    });
    existing = candidates.find(candidate => (
      (!candidate.title || candidate.title === item.title)
      && (!reservedSourceSlugs.has(candidate.slug) || candidate.slug === slug)
    )) || null;
  }

  const data = {
    slug,
    chronicle: 'interlude,high-five',
    category: 'items',
    title: item.title,
    titleEn: item.titleEn,
    description: `${item.title} (${item.titleEn}) — предмет Lineage 2: характеристики, иконка и где получить.`,
    content: buildItemContent(item, seenOn),
    image: item.icon,
    levelMin: null,
    levelMax: null,
    npc: null,
    location: null,
    reward: null,
    race: null,
    grade: item.grade,
    repeatable: false,
    types: [item.itemType],
    sort: 9000,
    publishedAt: existing?.publishedAt ?? new Date(),
  };

  if (DRY_RUN) {
    console.log(`${existing ? 'update' : 'create'}\titem\t${data.slug}\t${data.title}\ttype=${data.types[0]}\tgrade=${data.grade || '-'}`);
    return existing ? 'updated' : 'created';
  }

  if (existing) {
    const slugTaken = existing.slug === data.slug ? null : await prisma.guide.findUnique({ where: { slug: data.slug } });
    await prisma.guide.update({
      where: { id: existing.id },
      data: {
        ...(!slugTaken || slugTaken.id === existing.id ? { slug: data.slug } : {}),
        chronicle: existing.chronicle || data.chronicle,
        category: 'items',
        title: existing.title || data.title,
        titleEn: existing.titleEn || data.titleEn,
        description: existing.description || data.description,
        image: existing.image || data.image,
        grade: existing.grade || data.grade,
        types: existing.types?.length ? existing.types : data.types,
        publishedAt: existing.publishedAt ?? data.publishedAt,
        content: isGeneratedItemContent(existing.content) ? data.content : existing.content,
      },
    });
    return 'updated';
  }

  await prisma.guide.create({ data });
  return 'created';
}

async function fetchMonster(monster) {
  const res = await fetch(monster.source, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const sourceTitle = parseTitle(html, monster.source);
  const info = parseInfo(html, sourceTitle.titleEn);
  const title = { ...sourceTitle };
  if (monster.title) title.title = monster.title;
  if (monster.titleEn) title.titleEn = monster.titleEn;
  const image = parseImage(html);
  const { drop, spoil } = parseDropTables(html);
  return { ...title, info, image, dropRows: drop, spoilRows: spoil };
}

async function findExisting(slug, parsed) {
  return prisma.guide.findFirst({
    where: {
      category: 'monsters',
      OR: [
        { slug },
        { title: parsed.title },
        { titleEn: parsed.titleEn },
      ],
    },
  });
}

async function upsertMonster(monster, parsed, index) {
  const slug = slugify(parsed.titleEn);
  const existing = DRY_RUN ? null : await findExisting(slug, parsed);
  const types = new Set(['Монстр', 'Дроп']);
  if (parsed.info.aggro === 'Да') types.add('Агрессивный');
  if (monster.quests.length) types.add('Квестовый монстр');
  if (parsed.spoilRows.length) types.add('Спойл');
  const reward = compactReward(parsed.dropRows, parsed.spoilRows);
  const content = buildContent(monster, parsed);
  const data = {
    slug,
    chronicle: monster.chronicle || 'interlude,high-five',
    category: 'monsters',
    title: parsed.title,
    titleEn: parsed.titleEn,
    description: `${parsed.title} (${parsed.titleEn}) — монстр Lineage 2: уровень, локация, дроп, спойл и связанные квесты.`,
    content,
    image: parsed.image,
    levelMin: parsed.info.level,
    levelMax: null,
    npc: null,
    location: parsed.info.location,
    reward,
    race: null,
    repeatable: false,
    types: [...types],
    sort: 8000 + index,
    publishedAt: existing?.publishedAt ?? new Date(),
  };

  if (DRY_RUN) {
    console.log(`${existing ? 'update' : 'create'}\t${data.slug}\t${data.title}\tlevel=${data.levelMin}\tdrop=${parsed.dropRows.length}\tspoil=${parsed.spoilRows.length}\timage=${Boolean(data.image)}`);
    return existing ? 'updated' : 'created';
  }

  if (existing) {
    await prisma.guide.update({
      where: { id: existing.id },
      data: {
        chronicle: data.chronicle,
        category: data.category,
        title: data.title,
        titleEn: data.titleEn,
        description: data.description,
        image: data.image,
        levelMin: data.levelMin,
        levelMax: data.levelMax,
        npc: data.npc,
        location: data.location,
        reward: data.reward,
        race: data.race,
        repeatable: data.repeatable,
        types: data.types,
        sort: data.sort,
        publishedAt: data.publishedAt,
        ...(OVERWRITE_CONTENT ? { content: data.content } : {}),
      },
    });
    return 'updated';
  }

  await prisma.guide.create({ data });
  return 'created';
}

async function main() {
  let created = 0;
  let updated = 0;
  let itemsCreated = 0;
  let itemsUpdated = 0;
  let failed = 0;
  const itemRefs = new Map();

  for (let i = 0; i < MONSTERS.length; i += 1) {
    const monster = MONSTERS[i];
    try {
      const parsed = await fetchMonster(monster);
      const result = await upsertMonster(monster, parsed, i);
      if (result === 'created') created += 1;
      if (result === 'updated') updated += 1;
      for (const drop of [...parsed.dropRows, ...parsed.spoilRows]) {
        if (!drop.name || /^Adena$/i.test(drop.name) || isNoiseDrop(drop.name)) continue;
        const key = drop.href || drop.name;
        if (!itemRefs.has(key)) itemRefs.set(key, { href: drop.href, name: drop.name, icon: drop.icon, monsters: new Set() });
        itemRefs.get(key).monsters.add(parsed.title);
      }
    } catch (error) {
      failed += 1;
      console.warn(`skip\t${monster.source}\t${error.message}`);
    }
  }

  const sourceItemSlugs = new Set([...itemRefs.values()].map(ref => sourceSlugFromHref(ref.href, ref.name)));
  for (const ref of itemRefs.values()) {
    try {
      const item = await fetchItem(ref.href, ref.name, ref.icon);
      const result = await upsertItem(item, ref, sourceItemSlugs);
      if (result === 'created') itemsCreated += 1;
      if (result === 'updated') itemsUpdated += 1;
    } catch (error) {
      failed += 1;
      console.warn(`skip item\t${ref.href || ref.name}\t${error.message}`);
    }
  }

  console.log(`Monster seed complete: created=${created}, updated=${updated}, itemsCreated=${itemsCreated}, itemsUpdated=${itemsUpdated}, failed=${failed}, total=${MONSTERS.length}, sourceItems=${itemRefs.size}${DRY_RUN ? ' (dry-run)' : ''}`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
