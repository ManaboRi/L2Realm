import React from 'react';

/**
 * Минималистичный Markdown-парсер для статей блога.
 * Поддерживает: # ## ### заголовки, **жирный**, *курсив*, [текст](url),
 * - списки, --- разделители, > цитаты, ``` блоки кода, ` инлайн-код `,
 * GFM-таблицы (| Header | ... |). Абзацы по CommonMark — соседние строки
 * склеиваются в один <p>, разделитель — пустая строка.
 *
 * Если нужны картинки, footnotes, nested блоки — вынести в react-markdown.
 */

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// inline: **bold**, *italic*, `code`, [link](url) → возвращает HTML-строку
function renderInline(raw: string): string {
  let s = escapeHtml(raw);
  // inline code (до bold/italic, чтобы внутри `**x**` не подчёркивалось)
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  // bold
  s = s.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  // italic (только парные `*` или `_`, не одиночные)
  s = s.replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>');
  s = s.replace(/(^|[^_])_([^_\s][^_]*?)_(?!_)/g, '$1<em>$2</em>');
  // links: [text](https://url) — только http(s) для безопасности
  s = s.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener nofollow">$1</a>',
  );
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
        'онлайн',
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
  return s;
}

function normalizeMarkdownSource(text: string): string {
  let s = text.replace(/\r\n?/g, '\n');
  const lineCount = s.split('\n').length;
  if (lineCount <= 3 && /\s#{1,3}\s+/.test(s)) {
    s = s.replace(/\s+(#{1,3}\s+)/g, '\n\n$1');
    s = s.replace(/\s+(\*\*(?:Сайт|Рейт|Рейты|Хроника|Онлайн|Открытие|Дата открытия|Для кого|Осторожно):\*\*)/gi, '\n\n$1');
    s = s.replace(/\s+(-{3,})\s+/g, '\n\n$1\n\n');
  }
  return s;
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

export function renderMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];

  const lines = normalizeMarkdownSource(text).split('\n');
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
  let paraBuf: string[] = [];
  let codeLines: string[] | null = null;
  let key = 0;

  function flushBullets() {
    if (!bullets.length) return;
    out.push(
      <ul key={`ul-${key++}`}>
        {bullets.map((b, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: renderInline(b) }} />
        ))}
      </ul>,
    );
    bullets = [];
  }

  function flushParagraph() {
    if (!paraBuf.length) return;
    // CommonMark: соседние строки внутри абзаца склеиваются через пробел
    const html = paraBuf.map(l => renderInline(l)).join(' ');
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
                <th key={k} dangerouslySetInnerHTML={{ __html: renderInline(h) }} />
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>
                {r.map((c, ci) => (
                  <td key={ci} dangerouslySetInnerHTML={{ __html: renderInline(c) }} />
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
      const html = renderInline(h[2].trim());
      const Tag: any = `h${level + 1}`; // h1 в файле = <h2> на странице (h1 — заголовок статьи)
      out.push(<Tag key={`h-${key++}`} dangerouslySetInnerHTML={{ __html: html }} />);
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
        <blockquote key={`bq-${key++}`} dangerouslySetInnerHTML={{ __html: renderInline(q[1]) }} />,
      );
      continue;
    }

    // bullet list — список накапливается, абзацный буфер сбрасывается
    const bMatch = line.match(/^[-*]\s+(.+)$/);
    if (bMatch) {
      flushParagraph();
      bullets.push(bMatch[1]);
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
  const clean = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/[#>*_\[\]\(\)\-]/g, ' ');
  const words = clean.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Первый абзац — для превью на /blog */
export function firstParagraph(text: string, maxChars = 220): string {
  if (!text) return '';
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
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
