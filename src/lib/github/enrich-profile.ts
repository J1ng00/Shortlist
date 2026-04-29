type GitHubUserResponse = {
  login?: string;
  html_url?: string;
  name?: string | null;
  bio?: string | null;
  company?: string | null;
  location?: string | null;
  blog?: string | null;
  public_repos?: number;
  followers?: number;
  following?: number;
  created_at?: string | null;
  updated_at?: string | null;
  message?: string;
};

type GitHubRepoResponse = {
  name?: string;
  full_name?: string;
  html_url?: string;
  description?: string | null;
  language?: string | null;
  stargazers_count?: number;
  forks_count?: number;
  updated_at?: string | null;
  topics?: string[];
  fork?: boolean;
};

export type GitHubProfileEnrichment = {
  username: string;
  profileUrl: string;
  name: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  publicRepos: number;
  followers: number;
  following: number;
  createdAt: string | null;
  updatedAt: string | null;
  topLanguages: Array<{ language: string; repos: number }>;
  repositories: Array<{
    name: string;
    fullName: string;
    description: string | null;
    htmlUrl: string;
    language: string | null;
    stargazersCount: number;
    forksCount: number;
    updatedAt: string | null;
    topics: string[];
  }>;
  error?: string;
};

function extractGitHubUsername(githubUrl?: string | null) {
  if (!githubUrl) {
    return null;
  }

  try {
    const url = new URL(githubUrl);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");

    if (host !== "github.com") {
      return null;
    }

    const [username] = url.pathname.split("/").filter(Boolean);

    if (!username || ["orgs", "organizations", "marketplace", "topics"].includes(username.toLowerCase())) {
      return null;
    }

    return username;
  } catch {
    return null;
  }
}

async function githubFetch<T>(url: string): Promise<T> {
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Shortlist-Hiring-Copilot",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { headers, next: { revalidate: 3600 } });
  const data = (await response.json()) as T & { message?: string };

  if (!response.ok) {
    throw new Error(data.message ?? `GitHub request failed with status ${response.status}.`);
  }

  return data;
}

export async function enrichGitHubProfile(githubUrl?: string | null): Promise<GitHubProfileEnrichment | null> {
  const username = extractGitHubUsername(githubUrl);

  if (!username) {
    return null;
  }

  const profileUrl = `https://github.com/${username}`;

  try {
    const user = await githubFetch<GitHubUserResponse>(`https://api.github.com/users/${username}`);
    const repos = await githubFetch<GitHubRepoResponse[]>(
      `https://api.github.com/users/${username}/repos?type=owner&sort=updated&per_page=12`
    );
    const publicRepos = repos
      .filter((repo) => !repo.fork)
      .map((repo) => ({
        name: repo.name ?? "",
        fullName: repo.full_name ?? repo.name ?? "",
        description: repo.description ?? null,
        htmlUrl: repo.html_url ?? "",
        language: repo.language ?? null,
        stargazersCount: repo.stargazers_count ?? 0,
        forksCount: repo.forks_count ?? 0,
        updatedAt: repo.updated_at ?? null,
        topics: repo.topics ?? [],
      }))
      .filter((repo) => repo.name && repo.htmlUrl);

    const languageCounts = publicRepos.reduce<Record<string, number>>((counts, repo) => {
      if (repo.language) {
        counts[repo.language] = (counts[repo.language] ?? 0) + 1;
      }

      return counts;
    }, {});

    return {
      username: user.login ?? username,
      profileUrl: user.html_url ?? profileUrl,
      name: user.name ?? null,
      bio: user.bio ?? null,
      company: user.company ?? null,
      location: user.location ?? null,
      blog: user.blog ?? null,
      publicRepos: user.public_repos ?? publicRepos.length,
      followers: user.followers ?? 0,
      following: user.following ?? 0,
      createdAt: user.created_at ?? null,
      updatedAt: user.updated_at ?? null,
      topLanguages: Object.entries(languageCounts)
        .map(([language, count]) => ({ language, repos: count }))
        .sort((a, b) => b.repos - a.repos)
        .slice(0, 8),
      repositories: publicRepos,
    };
  } catch (error) {
    return {
      username,
      profileUrl,
      name: null,
      bio: null,
      company: null,
      location: null,
      blog: null,
      publicRepos: 0,
      followers: 0,
      following: 0,
      createdAt: null,
      updatedAt: null,
      topLanguages: [],
      repositories: [],
      error: error instanceof Error ? error.message : "GitHub enrichment failed.",
    };
  }
}
