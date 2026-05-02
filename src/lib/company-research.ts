export type CompanySearchResult = {
  name: string;
  url: string;
  description: string;
  source: string;
};

export type CompanyResearchContext = CompanySearchResult & {
  scrapedText: string;
  scrapedUrls: string[];
};

const searchTimeoutMs = 8000;
const scrapeTimeoutMs = 7000;
const maxTextLength = 9000;

export async function findCompanyMatches(companyName: string, location = ""): Promise<CompanySearchResult[]> {
  const autocompleteResults = await findCompanyAutocompleteMatches(companyName);

  if (autocompleteResults.length) {
    return autocompleteResults;
  }

  const query = [companyName, location, "official company website"].filter(Boolean).join(" ");
  const url = `https://duckduckgo.com/html/?${new URLSearchParams({ q: query }).toString()}`;

  try {
    const html = await fetchText(url, searchTimeoutMs);
    const results = parseDuckDuckGoResults(html)
      .filter((result) => isLikelyCompanyResult(result, companyName))
      .slice(0, 5);

    return dedupeResults(results).slice(0, 3);
  } catch {
    return [];
  }
}

async function findCompanyAutocompleteMatches(companyName: string): Promise<CompanySearchResult[]> {
  const url = `https://autocomplete.clearbit.com/v1/companies/suggest?${new URLSearchParams({ query: companyName }).toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      return [];
    }

    const companies = (await response.json()) as Array<{ name?: string; domain?: string }>;

    return dedupeResults(
      companies
        .map((company) => {
          const domain = String(company.domain ?? "").trim().toLowerCase();
          const name = String(company.name ?? "").trim();

          if (!domain || !name) {
            return null;
          }

          return {
            name,
            url: `https://${domain}`,
            description: "Company domain match found from public company autocomplete data.",
            source: domain
          };
        })
        .filter((result): result is CompanySearchResult => Boolean(result))
        .filter((result) => isLikelyCompanyResult(result, companyName))
    ).slice(0, 3);
  } catch {
    return [];
  }
}

export async function researchCompany(match: CompanySearchResult): Promise<CompanyResearchContext | null> {
  const candidates = buildCompanyPageCandidates(match.url);
  const pages = await Promise.all(
    candidates.map(async (url) => {
      try {
        return {
          url,
          text: extractReadableText(await fetchText(url, scrapeTimeoutMs))
        };
      } catch {
        return null;
      }
    })
  );
  const usablePages = pages.filter((page): page is { url: string; text: string } => Boolean(page?.text && page.text.length > 180));
  const scrapedText = usablePages.map((page) => `Source: ${page.url}\n${page.text}`).join("\n\n").slice(0, maxTextLength).trim();

  if (!scrapedText) {
    return null;
  }

  return {
    ...match,
    scrapedText,
    scrapedUrls: usablePages.map((page) => page.url)
  };
}

function parseDuckDuckGoResults(html: string): CompanySearchResult[] {
  const results: CompanySearchResult[] = [];
  const resultPattern = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = resultPattern.exec(html)) !== null) {
    const url = normalizeDuckDuckGoUrl(decodeHtml(match[1]));

    if (!url || !url.startsWith("http")) {
      continue;
    }

    results.push({
      name: cleanText(match[2]),
      url,
      description: cleanText(match[3]),
      source: hostnameFromUrl(url)
    });
  }

  return results;
}

function normalizeDuckDuckGoUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl, "https://duckduckgo.com");
    const redirect = parsed.searchParams.get("uddg");

    return redirect ? decodeURIComponent(redirect) : parsed.toString();
  } catch {
    return "";
  }
}

function dedupeResults(results: CompanySearchResult[]) {
  const seen = new Set<string>();

  return results.filter((result) => {
    const key = hostnameFromUrl(result.url).replace(/^www\./, "");

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function isLikelyCompanyResult(result: CompanySearchResult, companyName: string) {
  const haystack = `${result.name} ${result.description} ${result.source}`.toLowerCase();
  const companyWords = companyName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);
  const blockedHosts = ["linkedin.com", "facebook.com", "instagram.com", "youtube.com", "wikipedia.org", "crunchbase.com", "glassdoor.com"];

  if (blockedHosts.some((host) => result.source.includes(host))) {
    return false;
  }

  return companyWords.length ? companyWords.some((word) => haystack.includes(word)) : Boolean(result.name);
}

function buildCompanyPageCandidates(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    const origin = parsed.origin;
    const path = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/$/, "");

    return Array.from(
      new Set([
        `${origin}${path || "/"}`,
        `${origin}/about`,
        `${origin}/about-us`,
        `${origin}/careers`,
        `${origin}/jobs`,
        `${origin}/values`
      ])
    );
  } catch {
    return [rawUrl];
  }
}

async function fetchText(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "ShortlistBot/1.0 (+https://shortlist.local)",
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Fetch failed with ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function extractReadableText(html: string) {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 3000);
}

function cleanText(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function hostnameFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
