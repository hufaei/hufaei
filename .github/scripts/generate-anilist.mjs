import { access, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { replaceOutputs } from "./replace-outputs.mjs";

const username = process.env.ANILIST_USERNAME || "LJTLI";
const outputDirectory = process.env.OUTPUT_DIRECTORY || "dist";
const endpoint = "https://graphql.anilist.co";

const themes = {
  dark: {
    background: "#080e13",
    card: "#0c131a",
    border: "#233139",
    cardBorder: "#26343d",
    cyan: "#39c5bb",
    purple: "#8a719c",
    user: "#9aa9b3",
    title: "#e6fffc",
  },
  light: {
    background: "#f5fbfa",
    card: "#ffffff",
    border: "#b9d4d1",
    cardBorder: "#c8dcda",
    cyan: "#087f79",
    purple: "#735485",
    user: "#50656b",
    title: "#153638",
  },
};

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

function renderSvg(profile, items, theme) {
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
        <rect x="${x}" y="58" width="210" height="150" rx="9" fill="${theme.card}" stroke="${theme.cardBorder}"/>
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

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="232" viewBox="0 0 960 232" role="img" aria-labelledby="title description">
  <title id="title">${escapeXml(profile.name)} AniList favorites</title>
  <desc id="description">Four favorite anime selected by ${escapeXml(profile.name)} on AniList.</desc>
  <defs>
    ${clipPaths}
    <linearGradient id="topline" x1="0" x2="1">
      <stop offset="0" stop-color="${theme.cyan}"/>
      <stop offset=".58" stop-color="${theme.cyan}" stop-opacity=".32"/>
      <stop offset="1" stop-color="${theme.purple}"/>
    </linearGradient>
    <style>
      .label { font: 700 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: 2px; fill: ${theme.cyan}; }
      .user { font: 600 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: 1px; fill: ${theme.user}; }
      .index { font: 700 11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: 1px; fill: ${theme.purple}; }
      .title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; font-size: 11.5px; font-weight: 600; fill: ${theme.title}; }
    </style>
  </defs>
  <rect x="1" y="1" width="958" height="230" rx="11" fill="${theme.background}" stroke="${theme.border}"/>
  <rect x="1" y="1" width="958" height="2" rx="1" fill="url(#topline)" opacity=".8"/>
  <circle cx="26" cy="29" r="4" fill="${theme.cyan}"/>
  <text class="label" x="39" y="33">ANILIST 收藏</text>
  <text class="user" x="934" y="33" text-anchor="end">${escapeXml(profile.name)} ↗</text>
  ${cards}
</svg>
`;
}

function deriveLightSvg(darkSvg) {
  return Object.keys(themes.dark).reduce(
    (svg, key) => svg.replaceAll(themes.dark[key], themes.light[key]),
    darkSvg,
  );
}

const darkOutputPath = join(outputDirectory, "anilist-favorites.svg");
const lightOutputPath = join(outputDirectory, "anilist-favorites-light.svg");

async function writeLightFallback() {
  try {
    await access(lightOutputPath);
    console.warn(`Preserving the existing ${lightOutputPath}.`);
    return;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const darkSvg = await readFile(darkOutputPath, "utf8");
  await replaceOutputs([[lightOutputPath, deriveLightSvg(darkSvg)]]);
  console.warn(`Generated ${lightOutputPath} from the existing dark SVG.`);
}

try {
  const { profile, favorites } = await loadProfile();
  const items = await Promise.all(
    favorites.map(async (favorite) => ({
      title: favorite.title.english || favorite.title.romaji,
      color: favorite.coverImage.color || themes.dark.cyan,
      cover: await loadCover(favorite.coverImage.large),
    })),
  );

  await mkdir(outputDirectory, { recursive: true });
  await replaceOutputs([
    [darkOutputPath, renderSvg(profile, items, themes.dark)],
    [lightOutputPath, renderSvg(profile, items, themes.light)],
  ]);

  console.log(`Generated ${darkOutputPath} and ${lightOutputPath} with ${items.length} favorites for ${profile.name}.`);
} catch (error) {
  try {
    await writeLightFallback();
  } catch (fallbackError) {
    console.warn(`Could not generate a light fallback: ${fallbackError.message}`);
  }
  throw error;
}
