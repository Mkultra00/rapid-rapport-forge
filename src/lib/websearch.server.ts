export type SearchHit = { title: string; url: string; snippet: string; source: "web" | "news" };

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36";

function decode(html: string) {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unwrap(href: string) {
  try {
    const u = new URL(href.startsWith("//") ? `https:${href}` : href, "https://duckduckgo.com");
    const target = u.searchParams.get("uddg");
    return target ? decodeURIComponent(target) : u.toString();
  } catch {
    return href;
  }
}

async function duckduckgo(query: string, limit: number): Promise<SearchHit[]> {
  const res = await fetch(`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`, {
    headers: { "user-agent": UA },
  });
  if (!res.ok) return [];
  const html = await res.text();
  const hits: SearchHit[] = [];
  const linkRe = /<a[^>]+class="result-link"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  const snippets = [...html.matchAll(/class="result-snippet"[^>]*>([\s\S]*?)<\/td>/g)].map((m) =>
    decode(m[1] ?? ""),
  );
  let i = 0;
  for (const m of html.matchAll(linkRe)) {
    hits.push({
      title: decode(m[2] ?? ""),
      url: unwrap(m[1] ?? ""),
      snippet: snippets[i] ?? "",
      source: "web",
    });
    i++;
    if (hits.length >= limit) break;
  }
  return hits;
}

async function googleNews(query: string, limit: number): Promise<SearchHit[]> {
  const res = await fetch(
    `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`,
    { headers: { "user-agent": UA } },
  );
  if (!res.ok) return [];
  const xml = await res.text();
  const hits: SearchHit[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const item = m[1] ?? "";
    const title = decode(/<title>([\s\S]*?)<\/title>/.exec(item)?.[1] ?? "");
    const url = decode(/<link>([\s\S]*?)<\/link>/.exec(item)?.[1] ?? "");
    const date = decode(/<pubDate>([\s\S]*?)<\/pubDate>/.exec(item)?.[1] ?? "");
    if (!title) continue;
    hits.push({ title, url, snippet: date, source: "news" });
    if (hits.length >= limit) break;
  }
  return hits;
}

/** Free, key-less web + news search used by the research assistant. */
export async function webSearch(query: string, limit = 5): Promise<SearchHit[]> {
  const [web, news] = await Promise.all([
    duckduckgo(query, limit).catch(() => [] as SearchHit[]),
    googleNews(query, Math.min(limit, 4)).catch(() => [] as SearchHit[]),
  ]);
  return [...web, ...news];
}
