/* Seed/update monster guides from the Linedia "Monsters 1-9" page.
 *
 * This script intentionally targets only one source list:
 *   https://linedia.ru/wiki/Монстры/1—9
 *
 * It also creates lightweight item guide pages for useful drop/spoil items.
 *
 * Run from repo root:
 *   node backend/prisma/seed-monsters-level-1-9.js
 *
 * Set DRY_RUN=1 to preview without writing.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DRY_RUN = process.env.DRY_RUN === '1';
const USER_AGENT = 'Mozilla/5.0 L2RealmBot/1.0 (+https://l2realm.ru)';
const SOURCE_HOST = 'https://linedia.ru';
const SOURCE_LIST = 'https://linedia.ru/wiki/%D0%9C%D0%BE%D0%BD%D1%81%D1%82%D1%80%D1%8B/1%E2%80%949';
const CHRONICLE = 'interlude,high-five';

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

function cleanCell(value) {
  return htmlToText(value)
    .replace(/\s*\|\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function absoluteUrl(url) {
  if (!url) return null;
  const value = decodeHtml(url);
  if (/^https?:\/\//i.test(value)) return value;
  return `${SOURCE_HOST}${value.startsWith('/') ? '' : '/'}${value}`;
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

function isRedlink(href) {
  return /(?:\?|&)redlink=1\b/i.test(decodeHtml(href || ''));
}

function normalizeNumber(value) {
  const digits = String(value || '').replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
}

function formatNumber(value) {
  if (value == null) return '—';
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function formatPercent(value) {
  return String(value || '').replace(/\.?0+%$/, '%').replace('.', ',');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function parseTitle(html, source) {
  const raw = cleanCell(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '');
  const translated = raw.match(/^(.+)\s+\(([\u0400-\u04FF][\s\S]*)\)$/u);
  if (translated) {
    return { titleEn: translated[1].trim(), title: translated[2].trim() };
  }
  const fallback = decodeURIComponent(source.split('/').pop() || '').replace(/_/g, ' ');
  return { titleEn: raw || fallback, title: raw || fallback };
}

function parseMonsterList(html) {
  const tables = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map(match => match[0]);
  const table = tables.find(t => /<th[^>]*>\s*Имя\s*<\/th>/i.test(t) && /<th[^>]*>\s*Ур\.\s*<\/th>/i.test(t));
  if (!table) throw new Error('Monster list table not found');

  return [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .slice(1)
    .map((row, index) => {
      const cells = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(cell => cell[1]);
      const link = cells[0]?.match(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      if (!link) return null;
      const title = cleanCell(link[2]);
      const href = absoluteUrl(link[1]);
      const firstText = cleanCell(cells[0]);
      const titleEn = firstText.startsWith(title) ? firstText.slice(title.length).trim() : '';
      const sourceName = decodeURIComponent(new URL(href).pathname.split('/').pop() || '').replace(/_/g, ' ');
      return {
        index,
        href,
        sourceName,
        listTitle: title,
        listTitleEn: titleEn || sourceName,
        level: normalizeNumber(cells[1]),
        hp: normalizeNumber(cells[2]),
        pDef: normalizeNumber(cells[3]),
        mDef: normalizeNumber(cells[4]),
        exp: normalizeNumber(cells[5]),
        sp: normalizeNumber(cells[6]),
        race: cleanCell(cells[7]),
      };
    })
    .filter(Boolean)
    .filter(row => row.level >= 1 && row.level <= 9);
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
  const text = String(raw || '').trim();
  if (!text) return null;
  const parts = text.split(/\s*,\s*/).map(part => {
    const ru = [...part.matchAll(/\(([^()]+)\)/g)].map(m => m[1]).filter(Boolean).pop();
    return (ru || part)
      .replace(/^Земли\s+/i, '')
      .replace(/^Город\s+/i, '')
      .trim();
  }).filter(Boolean);
  return [...new Set(parts)].slice(0, 4).join(', ');
}

function locationEnLabel(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  const parts = text
    .split(/\s*,\s*/)
    .map(part => part.replace(/\s*\([^()]*\)/g, '').trim())
    .filter(Boolean);
  const en = [...new Set(parts)].slice(0, 4).join(', ');
  return en && en !== locationLabel(raw) ? en : null;
}

function parseMonsterInfo(html, titleEn, listRow) {
  const h1 = html.indexOf('<h1');
  const info = parseInfoRows(html, h1);
  const headText = htmlToText(html.slice(h1, h1 + 6000));
  const level = normalizeNumber(headText.match(new RegExp(`${escapeRegExp(titleEn)}\\s*\\((\\d+)\\)`, 'i'))?.[1]) || listRow.level;
  const locationRaw = info['Локации'] || '';
  return {
    level,
    race: info['Раса'] || listRow.race || null,
    aggro: info['Агр'] || null,
    hp: normalizeNumber(info['Кол-во HP']) || listRow.hp,
    exp: normalizeNumber(info['Кол-во Exp']) || listRow.exp,
    sp: normalizeNumber(info['Кол-во SP']) || listRow.sp,
    pDef: listRow.pDef,
    mDef: listRow.mDef,
    id: normalizeNumber(info.ID),
    locationRaw,
    location: locationLabel(locationRaw),
  };
}

function parseImage(html, titleEn) {
  const h1 = html.indexOf('<h1');
  const end = html.indexOf('Дроп', h1);
  const chunk = html.slice(h1, end > h1 ? end : h1 + 9000);
  for (const match of chunk.matchAll(/<img\b[^>]*>/gi)) {
    const img = match[0];
    const src = img.match(/\bsrc="([^"]+)"/i)?.[1];
    const alt = decodeHtml(img.match(/\balt="([^"]*)"/i)?.[1] || '');
    if (!src || /Skill|Quest|icon|No_image|Stub|symbol|Item_grade|monster-location/i.test(src)) continue;
    if (/Screenshot|Скрин|Monster/i.test(`${src} ${alt}`) || src.toLowerCase().includes(slugify(titleEn).replace(/-/g, '_'))) {
      return absoluteUrl(src);
    }
  }
  return null;
}

function parseDropRows(table) {
  return [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .slice(1)
    .map(row => {
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(cell => cell[1]);
      const itemCell = cells[1] || cells[0] || '';
      const link = itemCell.match(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      const icon = (cells[0] || itemCell).match(/<img\b[^>]*src="([^"]+)"/i)?.[1];
      const name = cleanCell(link?.[2] || itemCell)
        .replace(/\s+/g, ' ')
        .trim();
      const href = link ? absoluteUrl(link[1]) : null;
      return {
        name,
        href,
        slug: sourceSlugFromHref(href, name),
        amount: cleanCell(cells[2] || ''),
        chance: cleanCell(cells[3] || ''),
        icon: icon ? absoluteUrl(icon) : null,
      };
    })
    .filter(row => row.name && row.name.length < 100 && !/^Файл:/i.test(row.name));
}

function parseDropTables(html) {
  const tables = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map(match => ({ html: match[0], index: match.index || 0 }));
  const result = { drop: [], spoil: [] };
  for (const table of tables) {
    const tableText = htmlToText(table.html);
    if (!tableText.includes('Название предмета') || !tableText.includes('Шанс')) continue;
    const context = htmlToText(html.slice(Math.max(0, table.index - 350), table.index));
    const rows = parseDropRows(table.html);
    if (!rows.length) continue;
    if (context.includes('Спойл')) {
      if (!result.spoil.length) result.spoil = rows;
    } else if (!result.drop.length) {
      result.drop = rows;
    }
  }
  return result;
}

function isNoiseDrop(name) {
  return /\bHerb\b/i.test(name) || /^Adena$/i.test(name);
}

function compactReward(dropRows, spoilRows) {
  const parts = [];
  if (dropRows.some(row => /^Adena$/i.test(row.name))) parts.push(':adena:');
  for (const row of [...dropRows, ...spoilRows]) {
    if (parts.length >= 4) break;
    if (isNoiseDrop(row.name)) continue;
    if (!parts.includes(row.name)) parts.push(row.name);
  }
  return parts.join(' · ').slice(0, 120);
}

function dropCell(row) {
  if (/^Adena$/i.test(row.name)) return ':adena: Adena';
  const slug = row.slug || sourceSlugFromHref(row.href, row.name);
  return slug ? `[${row.name}](/guides/items/${slug})` : `**${row.name}**`;
}

function mdTable(rows, limit = 14) {
  const clean = rows.filter(row => row.name && !/\bHerb\b/i.test(row.name)).slice(0, limit);
  if (!clean.length) return 'Нет проверенных данных.';
  return [
    '| Предмет | Кол-во | Шанс |',
    '|---|---:|---:|',
    ...clean.map(row => `| ${dropCell(row)} | ${row.amount || '—'} | ${formatPercent(row.chance) || '—'} |`),
  ].join('\n');
}

function buildMonsterContent(monster, parsed) {
  const info = parsed.info;
  const locationRu = info.location || 'локация уточняется';
  const locationEn = locationEnLabel(info.locationRaw);
  const locationRaw = String(info.locationRaw || '').trim();
  return [
    '## Обзор',
    '',
    `**${parsed.title}** (${parsed.titleEn}) — монстр **${info.level || monster.level}+ уровня** в Lineage 2. Здесь собраны место появления, основные параметры, обычный дроп и спойл, чтобы быстро понять, стоит ли идти на этого моба под фарм или квест.`,
    '',
    `- Уровень: **${info.level || monster.level}**`,
    info.race ? `- Раса: **${info.race}**` : null,
    `- Агрессия: **${info.aggro || 'уточняется'}**`,
    info.hp ? `- HP: **${formatNumber(info.hp)}**` : null,
    info.pDef || info.mDef ? `- P.Def / M.Def: **${formatNumber(info.pDef)} / ${formatNumber(info.mDef)}**` : null,
    info.exp || info.sp ? `- EXP / SP: **${formatNumber(info.exp)} / ${formatNumber(info.sp)}**` : null,
    info.id ? `- ID монстра: **${info.id}**` : null,
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
    mdTable(parsed.dropRows),
    '',
    '### Спойл',
    '',
    parsed.spoilRows.length ? mdTable(parsed.spoilRows) : 'Нет проверенных данных по спойлу.',
  ].filter(Boolean).join('\n');
}

function itemTypeFromInfo(typeText, titleEn) {
  const text = `${typeText || ''} ${titleEn || ''}`;
  if (/Recipe|Рецепт/i.test(text)) return 'Рецепты';
  if (/Resource|Ресурс|Material|Piece|Часть|Кусок|Blade|Head|Shaft|Gemstone|Ore|Asofe|Mold|Varnish|Coal|Stem|Suede|Thread/i.test(text)) return 'Ресурсы';
  if (/Potion|Scroll|Arrow|Shot|Зелье|Свиток|Стрела|Soulshot|Spiritshot|Dye|Life Stone/i.test(text)) return 'Расходники';
  if (/Sword|Dagger|Blunt|Bow|Pole|Fist|Dual|Weapon|Staff|Rod|Mace|Club|Knife|Chisel|Меч|Кинжал|Лук|Оруж|Посох|Жезл|Булава|Дубина/i.test(text)) return 'Оружие';
  if (/Armor|Shield|Helmet|Gloves|Boots|Tunic|Pants|Robe|Leather|Stockings|Shirt|Shoes|Sandals|Cap|Брон|Щит|Шлем|Перчат|Ботин|Штаны|Рубаха|Туника|Сандалии|Шляпа/i.test(text)) return 'Броня';
  if (/Ring|Earring|Necklace|Accessory|Кольцо|Серьг|Ожерель/i.test(text)) return 'Бижутерия';
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
  const price = rows['Цена'] || null;
  const weight = rows['Вес'] || null;
  const id = rows.ID || null;
  const statKeys = [
    'P. Atk.', 'M. Atk.', 'P. Def.', 'M. Def.', 'Def. Rate', 'Уворот',
    'Скорость атаки', 'Крит. Атк.', 'Дальность', 'MP', 'Вес', 'Цена', 'ID',
  ];
  const stats = statKeys
    .filter(key => rows[key])
    .map(key => ({ label: key.replace(/\.$/, ''), value: rows[key] }));
  return { ...title, type, itemType, grade, icon, price, weight, id, stats };
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

async function fetchMonster(row) {
  const html = await fetchHtml(row.href);
  const title = parseTitle(html, row.href);
  const titleEn = row.listTitleEn || title.titleEn;
  const info = parseMonsterInfo(html, title.titleEn, row);
  const image = parseImage(html, title.titleEn);
  const { drop, spoil } = parseDropTables(html);
  return { title: row.listTitle || title.title, titleEn, sourceTitle: title, info, image, dropRows: drop, spoilRows: spoil };
}

async function fetchItem(href, fallbackName, fallbackIcon) {
  const sourceSlug = sourceSlugFromHref(href, fallbackName);
  const fallbackItem = {
    title: fallbackName,
    titleEn: fallbackName,
    sourceSlug,
    itemType: itemTypeFromInfo('', fallbackName),
    grade: null,
    icon: fallbackIcon,
    type: null,
    price: null,
    weight: null,
    id: null,
    stats: [],
  };
  if (!href || isRedlink(href)) return fallbackItem;
  let html;
  try {
    html = await fetchHtml(href);
  } catch {
    return fallbackItem;
  }
  const parsed = parseItemInfo(html);
  return {
    title: parsed.title || fallbackName,
    titleEn: parsed.titleEn || fallbackName,
    sourceSlug,
    itemType: parsed.itemType || 'Ресурсы',
    grade: parsed.grade,
    icon: parsed.icon || fallbackIcon,
    type: parsed.type,
    price: parsed.price,
    weight: parsed.weight,
    id: parsed.id,
    stats: parsed.stats || [],
  };
}

async function upsertMonster(row, parsed) {
  const slug = slugify(row.sourceName || parsed.titleEn);
  const existing = await prisma.guide.findUnique({ where: { slug } });
  const types = new Set(['Монстр', 'Дроп']);
  if (parsed.info.aggro === 'Да') types.add('Агрессивный');
  if (parsed.spoilRows.length) types.add('Спойл');
  const data = {
    slug,
    chronicle: CHRONICLE,
    category: 'monsters',
    title: parsed.title,
    titleEn: parsed.titleEn,
    description: `${parsed.title} (${parsed.titleEn}) — монстр Lineage 2 ${parsed.info.level || row.level} уровня: локация, дроп, спойл и параметры.`,
    content: buildMonsterContent(row, parsed),
    image: parsed.image,
    levelMin: parsed.info.level || row.level,
    levelMax: null,
    npc: null,
    location: parsed.info.location,
    reward: compactReward(parsed.dropRows, parsed.spoilRows),
    race: null,
    grade: null,
    repeatable: false,
    types: [...types],
    sort: 1000 + row.index,
    publishedAt: existing?.publishedAt ?? new Date(),
  };

  if (DRY_RUN) {
    console.log(`${existing ? 'update' : 'create'}\tmonster\t${data.slug}\t${data.title}\tlvl=${data.levelMin}\tdrop=${parsed.dropRows.length}\tspoil=${parsed.spoilRows.length}`);
    return existing ? 'updated' : 'created';
  }
  if (existing) {
    await prisma.guide.update({ where: { id: existing.id }, data });
    return 'updated';
  }
  await prisma.guide.create({ data });
  return 'created';
}

async function upsertItem(item, seenOn, reservedSourceSlugs = new Set()) {
  const slug = item.sourceSlug || slugify(item.titleEn || item.title);
  let existing = await prisma.guide.findFirst({
    where: { slug, category: 'items' },
  });
  if (!existing) {
    existing = await prisma.guide.findFirst({
      where: { title: item.title, category: 'items' },
    });
    if (existing && reservedSourceSlugs.has(existing.slug) && existing.slug !== slug) {
      existing = null;
    }
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
    chronicle: CHRONICLE,
    category: 'items',
    title: item.title,
    titleEn: item.titleEn,
    description: `${item.title} (${item.titleEn}) — предмет Lineage 2: где получить и в каком дропе встречается.`,
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
    const generatedContent = !existing.content || (existing.content.includes('базе L2Realm') && existing.content.includes('дропа'));
    const slugTaken = existing.slug === data.slug
      ? null
      : await prisma.guide.findUnique({ where: { slug: data.slug } });
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
        content: generatedContent ? data.content : existing.content,
      },
    });
    return 'updated';
  }
  await prisma.guide.create({ data });
  return 'created';
}

async function main() {
  const listHtml = await fetchHtml(SOURCE_LIST);
  const rows = parseMonsterList(listHtml);
  const itemRefs = new Map();
  const stats = { monstersCreated: 0, monstersUpdated: 0, itemsCreated: 0, itemsUpdated: 0, failed: 0 };

  for (const row of rows) {
    try {
      const parsed = await fetchMonster(row);
      const result = await upsertMonster(row, parsed);
      if (result === 'created') stats.monstersCreated += 1;
      if (result === 'updated') stats.monstersUpdated += 1;
      for (const drop of [...parsed.dropRows, ...parsed.spoilRows]) {
        if (!drop.name || isNoiseDrop(drop.name)) continue;
        const key = drop.href || drop.name;
        if (!itemRefs.has(key)) itemRefs.set(key, { href: drop.href, name: drop.name, icon: drop.icon, monsters: new Set() });
        itemRefs.get(key).monsters.add(parsed.title);
      }
    } catch (error) {
      stats.failed += 1;
      console.warn(`skip monster\t${row.href}\t${error.message}`);
    }
  }

  const sourceItemSlugs = new Set([...itemRefs.values()].map(ref => sourceSlugFromHref(ref.href, ref.name)));

  for (const ref of itemRefs.values()) {
    try {
      const item = await fetchItem(ref.href, ref.name, ref.icon);
      const result = await upsertItem(item, ref, sourceItemSlugs);
      if (result === 'created') stats.itemsCreated += 1;
      if (result === 'updated') stats.itemsUpdated += 1;
    } catch (error) {
      stats.failed += 1;
      console.warn(`skip item\t${ref.href || ref.name}\t${error.message}`);
    }
  }

  console.log(`Monster level 1-9 seed complete: monsters created=${stats.monstersCreated}, monsters updated=${stats.monstersUpdated}, items created=${stats.itemsCreated}, items updated=${stats.itemsUpdated}, failed=${stats.failed}, source monsters=${rows.length}, source items=${itemRefs.size}${DRY_RUN ? ' (dry-run)' : ''}`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
