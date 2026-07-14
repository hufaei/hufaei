import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const username = process.env.ANILIST_USERNAME || "LJTLI";
const outputDirectory = process.env.OUTPUT_DIRECTORY || "dist";
const endpoint = "https://graphql.anilist.co";

const query = `
  query ProfileFavorites($name: String!) {
    User(name: $name) {
      name
      siteUrl
      favourites {
        anime(perPage: 4) {
          nodes {
            title {
              romaji
              english
            }
            coverImage {
              large
              color
            }
          }
        }
      }
    }
  }
`;

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapTitle(value, lineLength = 15, maxLines = 4) {
  const words = value.trim().split(/\s+/);
  const lines = [];

  for (const word of words) {
    const current = lines.at(-1);

    if (!current || `${current} ${word}`.length > lineLength) {
      lines.push(word);
    } else {
      lines[lines.length - 1] = `${current} ${word}`;
    }
  }

  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    visible[maxLines - 1] = `${visible[maxLines - 1].slice(0, lineLength - 1)}…`;
  }

  return visible;
}

async function loadProfile() {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "hufaei-github-profile",
    },
    body: JSON.stringify({ query, variables: { name: username } }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`AniList API ${response.status}: ${await response.text()}`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(`AniList API: ${payload.errors.map(({ message }) => message).join(", ")}`);
  }

  const profile = payload.data?.User;
  const favorites = profile?.favourites?.anime?.nodes ?? [];

  if (!profile || favorites.length === 0) {
    throw new Error(`No public anime favorites found for AniList user ${username}.`);
  }

  return { profile, favorites };
}

async function loadCover(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "hufaei-github-profile" },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`AniList cover ${response.status}: ${url}`);
  }

  const contentType = response.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  const bytes = Buffer.from(await response.arrayBuffer());
  return `data:${contentType};base64,${bytes.toString("base64")}`;
}

const { profile, favorites } = await loadProfile();
const items = await Promise.all(
  favorites.map(async (favorite) => ({
    title: favorite.title.english || favorite.title.romaji,
    color: favorite.coverImage.color || "#39c5bb",
    cover: await loadCover(favorite.coverImage.large),
  })),
);

const cards = items
  .map((item, index) => {
    const x = 24 + index * 228;
    const titleLines = wrapTitle(item.title)
      .map(
        (line, lineIndex) =>
          `<text class="title" x="${x + 112}" y="${116 + lineIndex * 18}">${escapeXml(line)}</text>`,
      )
      .join("");

    return `
      <g>
        <rect x="${x}" y="58" width="210" height="150" rx="9" fill="#0c131a" stroke="#26343d"/>
        <image x="${x + 1}" y="59" width="94" height="148" preserveAspectRatio="xMidYMid slice" clip-path="url(#cover-${index})" href="${item.cover}"/>
        <rect x="${x + 94}" y="67" width="2" height="132" rx="1" fill="${escapeXml(item.color)}" opacity=".72"/>
        <text class="index" x="${x + 112}" y="88">0${index + 1}</text>
        ${titleLines}
      </g>`;
  })
  .join("");

const clipPaths = items
  .map(
    (_, index) =>
      `<clipPath id="cover-${index}"><rect x="${25 + index * 228}" y="59" width="94" height="148" rx="8"/></clipPath>`,
  )
  .join("");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="232" viewBox="0 0 960 232" role="img" aria-labelledby="title description">
  <title id="title">${escapeXml(profile.name)} AniList favorites</title>
  <desc id="description">Four favorite anime selected by ${escapeXml(profile.name)} on AniList.</desc>
  <defs>
    ${clipPaths}
    <linearGradient id="topline" x1="0" x2="1">
      <stop offset="0" stop-color="#39c5bb"/>
      <stop offset=".58" stop-color="#39c5bb" stop-opacity=".32"/>
      <stop offset="1" stop-color="#8a719c"/>
    </linearGradient>
    <style>
      .label { font: 700 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: 2px; fill: #39c5bb; }
      .user { font: 600 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: 1px; fill: #9aa9b3; }
      .index { font: 700 11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: 1px; fill: #8a719c; }
      .title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; font-size: 11.5px; font-weight: 600; fill: #e6fffc; }
    </style>
  </defs>
  <rect x="1" y="1" width="958" height="230" rx="11" fill="#080e13" stroke="#233139"/>
  <rect x="1" y="1" width="958" height="2" rx="1" fill="url(#topline)" opacity=".8"/>
  <circle cx="26" cy="29" r="4" fill="#39c5bb"/>
  <text class="label" x="39" y="33">ANILIST 收藏</text>
  <text class="user" x="934" y="33" text-anchor="end">${escapeXml(profile.name)} ↗</text>
  ${cards}
</svg>
`;

await mkdir(outputDirectory, { recursive: true });
const outputPath = join(outputDirectory, "anilist-favorites.svg");
await writeFile(outputPath, svg, "utf8");

console.log(`Generated ${outputPath} with ${items.length} favorites for ${profile.name}.`);
