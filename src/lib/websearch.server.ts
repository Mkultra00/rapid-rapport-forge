export type SearchHit = { title: string; url: string; snippet: string };

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
    if (href.startsWith("//")) href = `https:${href}`;
    const u = new URL(href, "https://duckduckgo.com");
    const target = u.searchParams.get("uddg");
    return target ? decodeURIComponent(target) : u.toString();
  } catch {
    return href;
  }
}

/** Scrapes the DuckDuckGo HTML endpoint — no API key required. */
export async function webSearch(query: string, limit = 5): Promise<SearchHit[]> {
  const res = await fetch("https://html.duckduckgo.com/html/", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
    },
    body: new URLSearchParams({ q: query }).toString(),
  });
  if (!res.ok) return [];
  const html = await res.text();

  const hits: SearchHit[] = [];
  const blocks = html.split('class="result__body"').slice(1);
  for (const block of blocks) {
    const link = /<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/.exec(block);
    if (!link) continue;
    const snip = /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/.exec(block);
    hits.push({
      title: decode(link[2] ?? ""),
      url: unwrap(link[1] ?? ""),
      snippet: decode(snip?.[1] ?? ""),
    });
    if (hits.length >= limit) break;
  }
  return hits;
}
