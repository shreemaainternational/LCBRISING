/**
 * Zero-dependency HTML utilities for the blog crawler.
 *
 * We deliberately avoid pulling in jsdom / cheerio (heavy, and this repo
 * already ships a hand-rolled Markdown renderer in `src/lib/markdown.ts`).
 * The crawler's primary extraction path is structured metadata — JSON-LD
 * and OpenGraph — which is stable, machine-authored, and reliably parsed
 * with focused regexes. Free-text body extraction is a best-effort
 * fallback only.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  mdash: '—', ndash: '–', hellip: '…', rsquo: '’',
  lsquo: '‘', ldquo: '“', rdquo: '”', copy: '©',
  reg: '®', trade: '™', deg: '°', eacute: 'é',
};

/** Decode HTML entities (named + numeric) into their unicode characters. */
export function decodeEntities(input: string): string {
  if (!input) return '';
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, body: string) => {
    if (body[0] === '#') {
      const isHex = body[1] === 'x' || body[1] === 'X';
      const code = parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return Number.isFinite(code) && code > 0 ? safeFromCodePoint(code) : m;
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named ?? m;
  });
}

function safeFromCodePoint(code: number): string {
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

/** Strip every tag and collapse whitespace, returning plain text. */
export function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[\t\f\r ]+/g, ' ')
    .replace(/\s*\n\s*\n\s*/g, '\n\n')
    .trim();
}

/**
 * Extract every `<script type="application/ld+json">` payload and return
 * the parsed JSON values (flattening `@graph` arrays). Malformed blocks
 * are skipped rather than throwing — real-world pages ship broken JSON-LD.
 */
export function extractJsonLd(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const re = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const raw = m[1].trim();
    if (!raw) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    for (const node of flattenJsonLd(parsed)) out.push(node);
  }
  return out;
}

function flattenJsonLd(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const nested = Array.isArray(obj['@graph']) ? (obj['@graph'] as unknown[]).flatMap(flattenJsonLd) : [];
    return [obj, ...nested];
  }
  return [];
}

/** True when a JSON-LD node's @type marks it as an article-like document. */
export function isArticleNode(node: Record<string, unknown>): boolean {
  const t = node['@type'];
  const types = (Array.isArray(t) ? t : [t]).map((x) => String(x).toLowerCase());
  return types.some((x) =>
    ['article', 'blogposting', 'newsarticle', 'report', 'socialmediaposting'].includes(x),
  );
}

/**
 * Parse `<meta>` tags into a lookup keyed by both `name` and `property`
 * (lowercased), so callers can read `og:title`, `article:published_time`,
 * `description`, `author`, etc. uniformly.
 */
export function extractMeta(html: string): Record<string, string> {
  const meta: Record<string, string> = {};
  const re = /<meta\b([^>]*)>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const attrs = parseAttrs(m[1]);
    const key = (attrs.property || attrs.name || attrs.itemprop || '').toLowerCase();
    const content = attrs.content;
    if (key && content != null && meta[key] == null) {
      meta[key] = decodeEntities(content).trim();
    }
  }
  return meta;
}

/** Read the document `<title>` (used as a last-resort headline). */
export function extractTitle(html: string): string | null {
  const m = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m ? decodeEntities(m[1]).trim() : null;
}

/** Extract raw `<a href>` targets from a fragment of HTML. */
export function extractHrefs(html: string): string[] {
  const out: string[] = [];
  const re = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push(decodeEntities(m[1]).trim());
  return out;
}

/** Extract `<loc>` entries from a sitemap or sitemap-index XML document. */
export function extractSitemapLocs(xml: string): string[] {
  const out: string[] = [];
  const re = /<loc>\s*([^<]+?)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(decodeEntities(m[1]).trim());
  return out;
}

/** True when the XML root is a `<sitemapindex>` (children are more sitemaps). */
export function isSitemapIndex(xml: string): boolean {
  return /<sitemapindex[\s>]/i.test(xml);
}

function parseAttrs(fragment: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fragment))) {
    attrs[m[1].toLowerCase()] = m[3] ?? m[4] ?? m[5] ?? '';
  }
  return attrs;
}

/**
 * Best-effort conversion of a chunk of article HTML into lightweight
 * Markdown. Block-level tags become paragraphs / headings / list items;
 * inline emphasis and links are preserved; everything else is stripped.
 * The output feeds `renderMarkdown()` (src/lib/markdown.ts) for display.
 */
export function htmlToMarkdown(html: string): string {
  let s = html;
  // Drop non-content regions entirely.
  s = s.replace(/<(script|style|noscript|template|svg|form|nav|aside|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');

  // Images → markdown (keep alt + src).
  s = s.replace(/<img\b[^>]*>/gi, (tag) => {
    const attrs = parseAttrs(tag.replace(/^<img\b/i, '').replace(/>$/, ''));
    const src = attrs.src || attrs['data-src'] || '';
    if (!src) return '';
    const alt = attrs.alt ? decodeEntities(attrs.alt) : '';
    return `\n\n![${alt}](${src})\n\n`;
  });

  // Links → markdown.
  s = s.replace(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, inner: string) => {
    const text = stripTags(inner);
    return text ? `[${text}](${decodeEntities(href)})` : '';
  });

  // Headings.
  for (let level = 1; level <= 6; level++) {
    const re = new RegExp(`<h${level}\\b[^>]*>([\\s\\S]*?)</h${level}>`, 'gi');
    s = s.replace(re, (_m, inner: string) => `\n\n${'#'.repeat(level)} ${stripTags(inner)}\n\n`);
  }

  // Emphasis.
  s = s.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _t, inner: string) => `**${stripTags(inner)}**`);
  s = s.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _t, inner: string) => `*${stripTags(inner)}*`);
  s = s.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, inner: string) => `\n\n> ${stripTags(inner)}\n\n`);

  // List items.
  s = s.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_m, inner: string) => `\n- ${stripTags(inner)}`);

  // Block separators.
  s = s.replace(/<\/(p|div|section|article|ul|ol|table|tr)>/gi, '\n\n');
  s = s.replace(/<br\s*\/?>(?!\n)/gi, '\n');

  // Remove any surviving tags, decode, normalise whitespace.
  s = stripTags(s);
  return s.replace(/\n{3,}/g, '\n\n').trim();
}
