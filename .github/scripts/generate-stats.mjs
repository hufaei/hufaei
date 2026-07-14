import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const owner = process.env.GITHUB_OWNER || process.env.GITHUB_REPOSITORY_OWNER || "hufaei";
const token = process.env.GITHUB_TOKEN;
const outputDirectory = process.env.OUTPUT_DIRECTORY || "dist";

const headers = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": `${owner}-profile-stats`,
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

async function github(path) {
  const response = await fetch(`https://api.github.com${path}`, { headers });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`GitHub API ${response.status}: ${details}`);
  }

  return response.json();
}

async function ownedRepositories() {
  const repositories = [];

  for (let page = 1; ; page += 1) {
    const batch = await github(
      `/users/${encodeURIComponent(owner)}/repos?type=owner&sort=updated&per_page=100&page=${page}`,
    );
    repositories.push(...batch);

    if (batch.length < 100) break;
  }

  return repositories;
}

const query = (value) => encodeURIComponent(value);

function countOverride(name, fallback) {
  const value = process.env[name]?.trim();

  if (!value) return fallback;
  if (!/^\d+$/.test(value)) {
    throw new Error(`${name} must be a non-negative integer.`);
  }

  return Number(value);
}

const [repositories, commits, pullRequests, issues] = await Promise.all([
  ownedRepositories(),
  github(`/search/commits?q=${query(`author:${owner}`)}&per_page=1`),
  github(`/search/issues?q=${query(`author:${owner} type:pr`)}&per_page=1`),
  github(`/search/issues?q=${query(`author:${owner} type:issue`)}&per_page=1`),
]);

const statistics = [
  ["COMMITS", countOverride("TOTAL_COMMITS", commits.total_count)],
  ["STARS", repositories.filter((repository) => !repository.fork).reduce((sum, repository) => sum + repository.stargazers_count, 0)],
  ["PULL REQUESTS", pullRequests.total_count],
  ["ISSUES", issues.total_count],
];

const cells = statistics
  .map(([label, value], index) => {
    const x = 85 + index * 170;
    return `
      <g>
        <text class="value" x="${x}" y="36" text-anchor="middle">${Number(value).toLocaleString("en-US")}</text>
        <text class="label" x="${x}" y="62" text-anchor="middle">${label}</text>
      </g>`;
  })
  .join("");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="680" height="86" viewBox="0 0 680 86" role="img" aria-labelledby="title description">
  <title id="title">${owner} GitHub totals</title>
  <desc id="description">Total commits, stars, pull requests, and issues.</desc>
  <defs>
    <style>
      .label { font: 600 9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: 1.2px; fill: #687680; }
      .value { font: 700 22px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: .4px; fill: #e6fffc; }
    </style>
  </defs>
  <rect x="1" y="1" width="678" height="84" rx="9" fill="#0a0f14" stroke="#233139"/>
  <path d="M170 18V68M340 18V68M510 18V68" stroke="#26343d"/>
  ${cells}
</svg>
`;

await mkdir(outputDirectory, { recursive: true });
await writeFile(join(outputDirectory, "worldline-stats.svg"), svg, "utf8");

console.log(`Generated ${join(outputDirectory, "worldline-stats.svg")} for ${owner}.`);
