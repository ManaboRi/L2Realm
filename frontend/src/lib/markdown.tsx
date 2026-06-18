import React from 'react';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Минималистичный Markdown-парсер для статей блога.
 * Поддерживает: # ## ### заголовки, **жирный**, *курсив*, [текст](url),
 * ![alt](url), - списки, --- разделители, > цитаты, ``` блоки кода,
 * ` инлайн-код `, GFM-таблицы (| Header | ... |). Абзацы по CommonMark — соседние строки
 * склеиваются в один <p>, разделитель — пустая строка.
 */

// Whitelist тегов и атрибутов для DOMPurify — последняя линия защиты
// перед dangerouslySetInnerHTML. Бэкенд уже чистит входные данные при
// сохранении (sanitizeMarkdownText), это второй слой на случай:
//   • импорт данных мимо санитайзера
//   • баг в regex-санитайзере на бэкенде
//   • инъекция через будущие админ-фичи
// Все обычные markdown-конструкции (заголовки, списки, ссылки, форматирование)
// проходят как есть — отображение существующих статей не меняется.
const PURIFY_OPTS = {
  ALLOWED_TAGS: ['strong', 'em', 'code', 'a', 'b', 'span', 'img'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'src', 'alt', 'loading'],
  ALLOW_DATA_ATTR: false,
} as const;

type RenderMarkdownOptions = {
  getHeadingId?: (headingText: string, level: number) => string | undefined;
  autoLinks?: MarkdownAutoLink[];
  // Резолвер иконки предмета по названию (findRewardItemIcon). Если возвращает путь —
  // перед **жирным** названием предмета подставляется маленькая иконка.
  itemIcon?: (name: string) => string | null;
};

export type MarkdownAutoLink = {
  label: string;
  aliases?: string[];
  href: string;
  kind?: 'quest' | 'npc' | 'monster' | 'raid' | 'location' | 'item' | 'skill' | 'class';
};

function guideLinkClass(kind?: MarkdownAutoLink['kind']): string {
  if (kind === 'quest') return 'md-guide-link--quest';
  if (kind === 'npc') return 'md-guide-link--npc';
  if (kind === 'monster') return 'md-guide-link--monster';
  if (kind === 'raid') return 'md-guide-link--raid';
  if (kind === 'location') return 'md-guide-link--location';
  if (kind === 'skill') return 'md-guide-link--skill';
  if (kind === 'class') return 'md-guide-link--class';
  return 'md-guide-link--item';
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function isSafeImageUrl(url: string): boolean {
  const value = url.trim();
  if (/^\/(?:uploads|images)\/[A-Za-z0-9._~!$&'()*+,;=:@/%-]+$/.test(value)) return true;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

// inline: **bold**, *italic*, `code`, [link](url) → возвращает HTML-строку
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function autoLinkHtml(html: string, links?: MarkdownAutoLink[]): string {
  if (!links?.length) return html;

  const candidates = links
    .flatMap(link => [link.label, ...(link.aliases ?? [])].map(alias => ({
      alias: alias.trim(),
      href: link.href,
      className: `md-guide-link ${guideLinkClass(link.kind)}`,
    })))
    .filter(item => item.alias.length >= 3 && item.href.startsWith('/'))
    .sort((a, b) => b.alias.length - a.alias.length);

  if (!candidates.length) return html;

  const byAlias = new Map<string, { href: string; className: string }>();
  for (const item of candidates) {
    const key = item.alias.toLocaleLowerCase('ru');
    if (!byAlias.has(key)) byAlias.set(key, { href: item.href, className: item.className });
  }

  const pattern = candidates.map(item => escapeRegExp(item.alias)).join('|');
  const word = 'A-Za-zА-Яа-яЁё0-9_';
  const re = new RegExp(`(^|[^${word}])(${pattern})(?=$|[^${word}])`, 'giu');
  const protectedBlocks: string[] = [];

  const token = (index: number) => `\u0000L${index}\u0000`;
  let safe = html.replace(/<a\b[\s\S]*?<\/a>|<code\b[\s\S]*?<\/code>|<span\b[\s\S]*?<\/span>/gi, match => {
    const index = protectedBlocks.push(match) - 1;
    return token(index);
  });

  safe = safe
    .split(/(<[^>]+>)/g)
    .map(part => {
      if (!part || part.startsWith('<')) return part;
      return part.replace(re, (match, prefix: string, label: string) => {
        const link = byAlias.get(label.toLocaleLowerCase('ru'));
        if (!link) return match;
        return `${prefix}<a href="${link.href}" class="${link.className}">${label}</a>`;
      });
    })
    .join('');

  return safe.replace(/\u0000L(\d+)\u0000/g, (_match, index: string) => protectedBlocks[Number(index)] ?? '');
}

function renderInline(raw: string, options: RenderMarkdownOptions = {}): string {
  let s = escapeHtml(raw);
  const codeFragments: string[] = [];
  const linkUrls: string[] = [];
  const token = (kind: 'C' | 'U', index: number) => `\u0000${kind}${index}\u0000`;

  // Protect code and link destinations while text emphasis is parsed. Otherwise
  // underscores in paths such as /events_and_promos/ become <em> inside href.
  s = s.replace(/`([^`]+)`/g, (_match, code: string) => {
    const index = codeFragments.push(`<code>${code}</code>`) - 1;
    return token('C', index);
  });
  s = s.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_match, label: string, url: string) => {
      const index = linkUrls.push(url) - 1;
      return `[${label}](${token('U', index)})`;
    },
  );
  // bold (+ иконка предмета перед названием, если есть привязка)
  s = s.replace(/\*\*([^*]+?)\*\*/g, (_m, inner: string) => {
    const ic = options.itemIcon?.(inner);
    if (ic) return `<strong><img class="md-bi" src="${ic}" alt="" loading="lazy" />${inner}</strong>`;
    return `<strong>${inner}</strong>`;
  });
  // italic (только парные `*` или `_`, не одиночные)
  s = s.replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>');
  s = s.replace(/(^|[^_])_([^_\s][^_]*?)_(?!_)/g, '$1<em>$2</em>');
  // links: [text](https://url) — только http(s) для безопасности
  s = s.replace(
    /\[([^\]]+)\]\(\u0000U(\d+)\u0000\)/g,
    (_match, label: string, index: string) => (
      `<a href="${linkUrls[Number(index)]}" target="_blank" rel="noopener nofollow">${label}</a>`
    ),
  );
  s = s.replace(/\u0000C(\d+)\u0000/g, (_match, index: string) => codeFragments[Number(index)]);
  // Pill-бейджи: <strong>X:</strong> value → <span class="md-pill">...</span>
  // Value тянется до следующего <strong>Y:</strong> или конца строки.
  // Срабатывает только на bold, заканчивающийся ":" — нормальный bold не задевает.
  s = s.replace(
    /<strong>([^<]+?:)<\/strong>([\s\S]*?)(?=<strong>[^<]+?:<\/strong>|$)/g,
    (_m, label, value) => {
      const lab = label.trim();
      const val = value.trim();
      const normalizedLabel = lab.replace(/:$/, '').toLowerCase();
      const pillLabels = new Set([
        'сайт',
        'рейт',
        'рейты',
        'хроника',
        'активность',
        'открытие',
        'дата открытия',
      ]);
      if (!pillLabels.has(normalizedLabel) || val.length > 90 || /[.!?]\s/.test(val)) {
        return `<strong>${lab}</strong>${value}`;
      }
      return val
        ? `<span class="md-pill"><b>${lab}</b> ${val}</span>`
        : `<span class="md-pill"><b>${lab}</b></span>`;
    },
  );
  // Иконки-шорткоды наград :adena: :exp: :sp: → span с фоновой картинкой (img режется DOMPurify).
  // Применяется в гайдах; в обычных статьях такие токены не встречаются.
  s = s.replace(/:(adena|exp|sp):/gi, (_m, key: string) => `<span class="md-ico md-ico-${key.toLowerCase()}"></span>`);
  s = autoLinkHtml(s, options.autoLinks);
  // Финальный пропуск через DOMPurify — гарантирует что ни одного <script>
  // или on*-атрибута не дойдёт до dangerouslySetInnerHTML.
  // String() конвертит TrustedHTML → string (тип DOMPurify в новых версиях).
  return String(DOMPurify.sanitize(s, PURIFY_OPTS as any));
}

function normalizeMarkdownSource(text: string): string {
  let s = text.replace(/\r\n?/g, '\n');
  const lineCount = s.split('\n').length;
  if (lineCount <= 3 && /\s#{1,3}\s+/.test(s)) {
    s = s.replace(/\s+(#{1,3}\s+)/g, '\n\n$1');
    s = s.replace(/\s+(\*\*(?:Сайт|Рейт|Рейты|Хроника|Онлайн|Открытие|Дата открытия|Для кого|Осторожно):\*\*)/gi, '\n\n$1');
    s = s.replace(/\s+(-{3,})\s+/g, '\n\n$1\n\n');
  }
  // Разбиваем СЛИПШИЙСЯ в одну строку нумерованный список "1. … 2. …" на строки.
  // Триггер требует "1." и "2." на ОДНОЙ строке (настоящий run-on); корректно
  // отформатированный список (каждый шаг с новой строки) и числа в прозе/скобках
  // вроде "(ур. 76)" не трогаем — иначе разметка ломается ("76)" → ложный маркер).
  if (/1[.)][ \t][^\n]*[ \t]2[.)][ \t]/.test(s)) {
    s = s.replace(/([^\n])[ \t]+(\d{1,2}[.)][ \t]+)/g, '$1\n$2');
  }
  return s;
}

function stripArticleShortcodes(text: string): string {
  return text
    .replace(/\[\[(?:summary|резюме)\]\]\s*\n[\s\S]*?\n\s*\[\[\/(?:summary|резюме)\]\]/gi, ' ')
    .replace(/^\s*\[\[(?:server|сервер|project|проект|card|карточка)(?::|=|\s+id=)\s*[A-Za-z0-9_-]+\]\]\s*$/gim, ' ');
}

// Парсинг строки таблицы: "| a | b | c |" → ['a', 'b', 'c']
function parseTableRow(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null;
  return trimmed.slice(1, -1).split('|').map(c => c.trim());
}

// Строка-разделитель: |---|---|---|  или  | :--- | :---: | ---: |
function isTableSeparator(line: string): boolean {
  const cells = parseTableRow(line);
  if (!cells || !cells.length) return false;
  return cells.every(c => /^:?-{3,}:?$/.test(c.trim()));
}

export function renderMarkdown(text: string, options: RenderMarkdownOptions = {}): React.ReactNode[] {
  if (!text) return [];

  const lines = normalizeMarkdownSource(text).split('\n');
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
  let ordered: string[] = [];
  let paraBuf: string[] = [];
  let codeLines: string[] | null = null;
  let key = 0;

  function flushBullets() {
    if (!bullets.length) return;
    out.push(
      <ul key={`ul-${key++}`}>
        {bullets.map((b, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: renderInline(b, options) }} />
        ))}
      </ul>,
    );
    bullets = [];
  }

  function flushOrdered() {
    if (!ordered.length) return;
    out.push(
      <ol key={`ol-${key++}`}>
        {ordered.map((b, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: renderInline(b, options) }} />
        ))}
      </ol>,
    );
    ordered = [];
  }

  function flushParagraph() {
    if (!paraBuf.length) return;
    // CommonMark: соседние строки внутри абзаца склеиваются через пробел
    const html = paraBuf.map(l => renderInline(l, options)).join(' ');
    out.push(<p key={`p-${key++}`} dangerouslySetInnerHTML={{ __html: html }} />);
    paraBuf = [];
  }

  function flushCode() {
    if (codeLines === null) return;
    out.push(
      <pre key={`pre-${key++}`}><code>{codeLines.join('\n')}</code></pre>,
    );
    codeLines = null;
  }

  function flushAll() {
    flushBullets();
    flushOrdered();
    flushParagraph();
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.replace(/\s+$/, '');

    // code block toggle (имеет высший приоритет — внутри `` `` ничего не парсим)
    if (/^```/.test(line)) {
      if (codeLines === null) { flushAll(); codeLines = []; }
      else { flushCode(); }
      continue;
    }
    if (codeLines !== null) {
      codeLines.push(rawLine);
      continue;
    }

    // блок-карточка параметров:
    //   ::: stats
    //   HP: 226
    //   P. Def: 58
    //   :::
    const statsOpen = line.trim().match(/^:::\s*(?:stats|статы|параметры)\s*$/i);
    if (statsOpen) {
      flushAll();
      const inner: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== ':::') { inner.push(lines[i]); i++; }
      const pairs = inner
        .map(l => l.replace(/^\s*[-*]\s*/, '').trim())
        .filter(Boolean)
        .map(l => { const m = l.match(/^(.+?)\s*[:：]\s*(.+)$/); return m ? { k: m[1].trim(), v: m[2].trim() } : null; })
        .filter((p): p is { k: string; v: string } => !!p);
      if (pairs.length) {
        out.push(
          <div key={`stats-${key++}`} className="md-stats">
            {pairs.map((p, idx) => (
              <div key={idx} className="md-stat">
                <span className="md-stat-k">{p.k}</span>
                <span className="md-stat-v">{p.v}</span>
              </div>
            ))}
          </div>,
        );
      }
      continue;
    }

    // разворачивающийся блок (нативный <details>, без JS):
    //   ::: details Заголовок
    //   ...markdown...
    //   :::
    const detailsOpen = line.trim().match(/^:::\s*(?:details|спойлер|подробнее)\b\s*(.*)$/i);
    if (detailsOpen) {
      flushAll();
      const summary = detailsOpen[1].trim() || 'Подробнее';
      const inner: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== ':::') {
        inner.push(lines[i]);
        i++;
      }
      out.push(
        <details key={`det-${key++}`} className="md-details">
          <summary dangerouslySetInnerHTML={{ __html: renderInline(summary, options) }} />
          <div className="md-details-body">{renderMarkdown(inner.join('\n'), options)}</div>
        </details>,
      );
      continue;
    }

    // block image: ![alt](/uploads/file.webp). Держим картинку отдельным блоком,
    // чтобы не ломать абзацы и переносы в существующих статьях.
    const img = line.trim().match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/);
    if (img && isSafeImageUrl(img[2])) {
      flushAll();
      const alt = img[1].trim();
      out.push(
        <figure key={`fig-${key++}`}>
          <img src={img[2].trim()} alt={alt} loading="lazy" />
          {alt && <figcaption>{alt}</figcaption>}
        </figure>,
      );
      continue;
    }

    // table (GFM): ищем header + separator вперёд
    const headerCells = parseTableRow(line);
    if (headerCells && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      flushAll();
      const header = headerCells;
      i += 2; // пропускаем header и separator, начинаем с первой data-row
      const rows: string[][] = [];
      while (i < lines.length) {
        const dataLine = lines[i].replace(/\s+$/, '');
        const cells = parseTableRow(dataLine);
        if (!cells) break;
        rows.push(cells);
        i++;
      }
      i--; // компенсируем for++ — последняя non-table строка должна обработаться нормально
      out.push(
        <table key={`tbl-${key++}`}>
          <thead>
            <tr>
              {header.map((h, k) => (
                <th key={k} dangerouslySetInnerHTML={{ __html: renderInline(h, options) }} />
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>
                {r.map((c, ci) => (
                  <td key={ci} dangerouslySetInnerHTML={{ __html: renderInline(c, options) }} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>,
      );
      continue;
    }

    // headings — лояльные: #X, ## X, ###X — пробел после # необязателен
    const h = line.match(/^(#{1,3})\s*(.+)$/);
    if (h && h[2].trim()) {
      flushAll();
      const level = h[1].length;
      const headingText = h[2].trim();
      const html = renderInline(headingText, options);
      const Tag: any = `h${level + 1}`; // h1 в файле = <h2> на странице (h1 — заголовок статьи)
      const headingId = options.getHeadingId?.(headingText, level);
      out.push(<Tag key={`h-${key++}`} id={headingId} dangerouslySetInnerHTML={{ __html: html }} />);
      continue;
    }

    // divider
    if (/^-{3,}$/.test(line)) {
      flushAll();
      out.push(<hr key={`hr-${key++}`} />);
      continue;
    }

    // blockquote
    const q = line.match(/^>\s?(.*)$/);
    if (q) {
      flushAll();
      out.push(
        <blockquote key={`bq-${key++}`} dangerouslySetInnerHTML={{ __html: renderInline(q[1], options) }} />,
      );
      continue;
    }

    // bullet list — список накапливается, абзацный буфер сбрасывается
    const bMatch = line.match(/^[-*]\s+(.+)$/);
    if (bMatch) {
      flushParagraph();
      flushOrdered();
      bullets.push(bMatch[1]);
      continue;
    }

    // ordered list: 1. step / 1) step
    const oMatch = line.match(/^\d+[.)]\s+(.+)$/);
    if (oMatch) {
      flushParagraph();
      flushBullets();
      ordered.push(oMatch[1]);
      continue;
    }

    // empty line — конец текущего блока (абзаца / списка)
    if (line.trim() === '') {
      flushAll();
      continue;
    }

    // обычная строка → в буфер абзаца. Если только что был список — закрываем его.
    flushBullets();
    paraBuf.push(line);
  }

  flushAll();
  flushCode();
  return out;
}

/** Время чтения в минутах. ~200 слов/мин для русского. Минимум 1 минута. */
export function readingTime(text: string): number {
  if (!text) return 1;
  // выкидываем код-блоки и markdown-пунктуацию
  const clean = stripArticleShortcodes(text)
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/[#>*_\[\]\(\)\-]/g, ' ');
  const words = clean.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Первый абзац — для превью на /blog */
export function firstParagraph(text: string, maxChars = 220): string {
  if (!text) return '';
  const lines = stripArticleShortcodes(text).replace(/\r\n/g, '\n').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (/^!\[[^\]]*]\([^)]+\)$/.test(t)) continue;
    if (/^[#`>\-*|]/.test(t)) continue; // пропускаем заголовки/код/цитаты/списки/таблицы
    // снимаем bold/italic/links для preview
    const clean = t
      .replace(/\*\*([^*]+?)\*\*/g, '$1')
      .replace(/\*([^*]+?)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`([^`]+)`/g, '$1');
    return clean.length > maxChars ? clean.slice(0, maxChars).trimEnd() + '…' : clean;
  }
  return '';
}
