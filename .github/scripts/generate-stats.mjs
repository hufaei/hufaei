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
    const x = 24 + index * 164;
    return `
      <g transform="translate(${x} 58)">
        <text class="label" x="0" y="0">${label}</text>
        <text class="value" x="0" y="36">${Number(value).toLocaleString("en-US")}</text>
      </g>`;
  })
  .join("");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="680" height="132" viewBox="0 0 680 132" role="img" aria-labelledby="title description">
  <title id="title">${owner} worldline GitHub statistics</title>
  <desc id="description">Total commits, stars, pull requests, and issues.</desc>
  <defs>
    <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#101820"/>
      <stop offset="1" stop-color="#090d12"/>
    </linearGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <style>
      .eyebrow { font: 600 10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: 2.4px; fill: #667680; }
      .label { font: 600 10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: 1.2px; fill: #39c5bb; }
      .value { font: 700 25px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: .5px; fill: #ff9e45; }
    </style>
  </defs>
  <rect x="1" y="1" width="678" height="130" rx="12" fill="url(#panel)" stroke="#26343d"/>
  <path d="M16 33H664" stroke="#1f2c33"/>
  <path d="M170 49V112M334 49V112M498 49V112" stroke="#1d2a31"/>
  <circle cx="21" cy="17" r="3" fill="#39c5bb" filter="url(#glow)"/>
  <text class="eyebrow" x="32" y="21">WORLDLINE STATISTICS // ${owner.toUpperCase()}</text>
  ${cells}
  <text class="eyebrow" x="658" y="119" text-anchor="end">観測中</text>
</svg>
`;

await mkdir(outputDirectory, { recursive: true });
await writeFile(join(outputDirectory, "worldline-stats.svg"), svg, "utf8");

console.log(`Generated ${join(outputDirectory, "worldline-stats.svg")} for ${owner}.`);
