import React from 'react';

/**
 * Минималистичный Markdown-парсер для статей блога.
 * Поддерживает: # ## ### заголовки, **жирный**, *курсив*, [текст](url),
 * - списки, --- разделители, > цитаты, ``` блоки кода, ` инлайн-код `, абзацы.
 *
 * Если нужны таблицы, картинки, footnotes — вынести в react-markdown.
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
  return s;
}

export function renderMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];

  const lines  = text.replace(/\r\n/g, '\n').split('\n');
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
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

  function flushCode() {
    if (codeLines === null) return;
    out.push(
      <pre key={`pre-${key++}`}><code>{codeLines.join('\n')}</code></pre>,
    );
    codeLines = null;
  }

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');

    // code block toggle
    if (/^```/.test(line)) {
      if (codeLines === null) { flushBullets(); codeLines = []; }
      else { flushCode(); }
      continue;
    }
    if (codeLines !== null) {
      codeLines.push(rawLine);
      continue;
    }

    // headings — лояльные: #X, ## X, ###X — пробел после # необязателен
    const h = line.match(/^(#{1,3})\s*(.+)$/);
    if (h && h[2].trim()) {
      flushBullets();
      const level = h[1].length;
      const html = renderInline(h[2].trim());
      const Tag: any = `h${level + 1}`; // h1 в файле = <h2> на странице (h1 — заголовок статьи)
      out.push(<Tag key={`h-${key++}`} dangerouslySetInnerHTML={{ __html: html }} />);
      continue;
    }

    // divider
    if (/^-{3,}$/.test(line)) {
      flushBullets();
      out.push(<hr key={`hr-${key++}`} />);
      continue;
    }

    // blockquote
    const q = line.match(/^>\s?(.*)$/);
    if (q) {
      flushBullets();
      out.push(
        <blockquote key={`bq-${key++}`} dangerouslySetInnerHTML={{ __html: renderInline(q[1]) }} />,
      );
      continue;
    }

    // bullet list
    const b = line.match(/^[-*]\s+(.+)$/);
    if (b) {
      bullets.push(b[1]);
      continue;
    }

    // empty line — конец абзаца
    if (line.trim() === '') {
      flushBullets();
      continue;
    }

    // обычный абзац
    flushBullets();
    out.push(
      <p key={`p-${key++}`} dangerouslySetInnerHTML={{ __html: renderInline(line) }} />,
    );
  }

  flushBullets();
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
    if (/^[#`>\-*]/.test(t)) continue; // пропускаем заголовки/код/цитаты/списки
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
