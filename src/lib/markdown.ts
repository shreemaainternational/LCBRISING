/**
 * Tiny, zero-dependency Markdown → HTML renderer used for blog posts
 * and story bodies. Intentionally narrow:
 *
 *   - # / ## / ### headings
 *   - **bold**, *italic*, `code`
 *   - [text](href) links (auto-rel)
 *   - ![alt](src) images
 *   - > blockquote
 *   - --- horizontal rule
 *   - Unordered (-) and ordered (1.) lists
 *   - Paragraphs separated by blank lines
 *
 * The output is HTML-escaped before any markdown syntax is applied so
 * we cannot accidentally pass raw user HTML through.
 */
export function renderMarkdown(input: string): string {
  if (!input) return '';
  const esc = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  // Normalise line endings and split into blocks
  const lines = input.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Horizontal rule
    if (/^\s*---\s*$/.test(line)) {
      out.push('<hr class="my-10 border-gray-200" />');
      i++;
      continue;
    }

    // Headings
    const h = /^(#{1,3})\s+(.+?)\s*$/.exec(line);
    if (h) {
      const level = h[1].length;
      const text = inline(esc(h[2]));
      const cls =
        level === 1
          ? 'text-3xl md:text-4xl font-bold text-navy-900 mt-10 mb-4'
          : level === 2
          ? 'text-2xl md:text-3xl font-bold text-navy-900 mt-8 mb-3'
          : 'text-xl font-semibold text-navy-900 mt-6 mb-2';
      out.push(`<h${level} class="${cls}">${text}</h${level}>`);
      i++;
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      out.push(
        `<blockquote class="border-l-4 border-brand-500 pl-6 my-8 italic text-xl text-navy-800">${inline(
          esc(buf.join(' ')),
        )}</blockquote>`,
      );
      continue;
    }

    // Unordered list
    if (/^\s*-\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*-\s+/, ''));
        i++;
      }
      out.push(
        `<ul class="list-disc pl-6 my-4 space-y-1 text-gray-800">${items
          .map((it) => `<li>${inline(esc(it))}</li>`)
          .join('')}</ul>`,
      );
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      out.push(
        `<ol class="list-decimal pl-6 my-4 space-y-1 text-gray-800">${items
          .map((it) => `<li>${inline(esc(it))}</li>`)
          .join('')}</ol>`,
      );
      continue;
    }

    // Blank line — paragraph break
    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }

    // Paragraph (collect until blank line / structural marker)
    const buf: string[] = [line];
    i++;
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !/^\s*-\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^\s*---\s*$/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    out.push(
      `<p class="my-4 text-gray-800 leading-relaxed">${inline(esc(buf.join(' ')))}</p>`,
    );
  }

  return out.join('\n');
}

function inline(s: string): string {
  return (
    s
      // Images first so the link rule doesn't swallow them
      .replace(
        /!\[([^\]]*)\]\(([^)\s]+)\)/g,
        '<img src="$2" alt="$1" class="my-6 rounded-xl w-full" loading="lazy" />',
      )
      .replace(
        /\[([^\]]+)\]\(([^)\s]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-navy-800 underline decoration-brand-500 underline-offset-4 hover:text-brand-600">$1</a>',
      )
      .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-gray-100 rounded text-sm">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-navy-900">$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
  );
}
