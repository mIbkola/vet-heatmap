import { NextResponse } from 'next/server';

/**
 * GET /api/outbreaks-feed
 *
 * Fetches and parses the FSVPS (Россельхознадзор) operational summaries RSS feed
 * plus the South Interregional Directorate news feed.
 *
 * Caching: revalidate every 60 minutes (3600s) to avoid hammering fsvps.gov.ru.
 *
 * Returns JSON: {
 *   fetchedAt: string (ISO),
 *   sources: Array<{ id, label, url, count }>,
 *   items: Array<{
 *     guid: string,
 *     title: string,
 *     link: string,
 *     pubDate: string (ISO),
 *     pubDateMs: number,
 *     source: 'fsvps_oper' | 'fsvps_south',
 *     description: string,
 *     categories: string[],
 *   }>
 * }
 *
 * No external dependencies — pure regex-based RSS parsing (fast, no DOM parser needed).
 */

interface FeedItem {
  guid: string;
  title: string;
  link: string;
  pubDate: string; // ISO
  pubDateMs: number;
  source: 'fsvps_oper' | 'fsvps_south';
  description: string;
  categories: string[];
}

interface FeedSource {
  id: 'fsvps_oper' | 'fsvps_south';
  label: string;
  url: string;
  count: number;
}

interface FeedResponse {
  fetchedAt: string;
  sources: FeedSource[];
  items: FeedItem[];
  errors: Array<{ source: string; error: string }>;
}

const FEEDS: FeedSource[] = [
  {
    id: 'fsvps_oper',
    label: 'Россельхознадзор — Оперативные сводки',
    url: 'https://fsvps.gov.ru/oper/feed/',
    count: 0,
  },
  {
    id: 'fsvps_south',
    label: 'Южное МУ Россельхознадзора — Новости',
    url: 'https://123.fsvps.gov.ru/news-cat/glavnoe/rssnews',
    count: 0,
  },
];

/** Parse RFC 822 / RFC 2822 date (e.g. "Mon, 16 Jun 2025 09:00:00 +0000") to ISO. */
function parseRfc822Date(s: string): { iso: string; ms: number } | null {
  if (!s) return null;
  // Try built-in Date parser first
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return { iso: d.toISOString(), ms: d.getTime() };
  }
  // Fallback: try to extract YYYY-MM-DD from text
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const d2 = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
    if (!isNaN(d2.getTime())) {
      return { iso: d2.toISOString(), ms: d2.getTime() };
    }
  }
  return null;
}

/** Decode common HTML entities in RSS text. */
function decodeEntities(s: string): string {
  if (!s) return '';
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .trim();
}

/** Extract the first text content of an XML tag, supporting CDATA. */
function tag(xml: string, tagName: string): string {
  // Try CDATA form first
  const cdataRe = new RegExp(`<${tagName}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tagName}>`, 'i');
  const cdataMatch = xml.match(cdataRe);
  if (cdataMatch) return decodeEntities(cdataMatch[1]);

  // Plain form
  const plainRe = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, 'i');
  const plainMatch = xml.match(plainRe);
  if (plainMatch) return decodeEntities(plainMatch[1]);
  return '';
}

/** Extract all <category> values from an <item> block. */
function categories(itemXml: string): string[] {
  const out: string[] = [];
  const re = /<category[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/category>/gi;
  let m;
  while ((m = re.exec(itemXml)) !== null) {
    out.push(decodeEntities(m[1]));
  }
  // Also try plain (non-CDATA) categories
  const re2 = /<category[^>]*>([^<]+)<\/category>/gi;
  while ((m = re2.exec(itemXml)) !== null) {
    const v = decodeEntities(m[1]);
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

/** Fetch RSS with a sane User-Agent and timeout. */
async function fetchRss(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'EpizoMonitor/1.0 (+https://epizomonitor.example; contact: dev@example)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      signal: controller.signal,
      next: { revalidate: 3600 }, // ISR — cache for 1 hour
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

/** Parse RSS XML into FeedItem array. */
function parseRss(xml: string, sourceId: 'fsvps_oper' | 'fsvps_south'): FeedItem[] {
  const items: FeedItem[] = [];
  // Match each <item>...</item> block
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = tag(block, 'title');
    const link = tag(block, 'link');
    const guid = tag(block, 'guid') || link || title;
    const pubDateRaw = tag(block, 'pubDate');
    const description = tag(block, 'description');
    const cats = categories(block);

    const parsed = parseRfc822Date(pubDateRaw);
    const pubDate = parsed?.iso ?? new Date().toISOString();
    const pubDateMs = parsed?.ms ?? Date.now();

    if (!title) continue;
    items.push({
      guid,
      title,
      link,
      pubDate,
      pubDateMs,
      source: sourceId,
      description,
      categories: cats,
    });
  }
  return items;
}

export async function GET(): Promise<NextResponse<FeedResponse>> {
  const errors: Array<{ source: string; error: string }> = [];
  const allItems: FeedItem[] = [];
  const sources: FeedSource[] = [];

  // Fetch both feeds in parallel
  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const xml = await fetchRss(feed.url);
      const items = parseRss(xml, feed.id);
      return { feed, items };
    })
  );

  for (const r of results) {
    if (r.status === 'fulfilled') {
      const { feed, items } = r.value;
      sources.push({ ...feed, count: items.length });
      allItems.push(...items);
    } else {
      // Find which feed failed
      const idx = results.indexOf(r);
      const feed = FEEDS[idx];
      const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
      errors.push({ source: feed.id, error: msg });
      sources.push({ ...feed, count: 0 });
    }
  }

  // Sort all items by pubDate descending
  allItems.sort((a, b) => b.pubDateMs - a.pubDateMs);

  // Limit to last 50 items to keep payload small
  const items = allItems.slice(0, 50);

  return NextResponse.json(
    {
      fetchedAt: new Date().toISOString(),
      sources,
      items,
      errors,
    },
    {
      headers: {
        // Cache on the edge for 1 hour
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    }
  );
}
