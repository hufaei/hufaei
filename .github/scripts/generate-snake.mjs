import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { generateSnakeAnimation } from "generate-snake-animation";

const owner = process.env.GITHUB_OWNER?.trim();

if (!owner) {
  throw new Error("GITHUB_OWNER is required");
}

const response = await fetch(`https://github.com/users/${owner}/contributions`, {
  headers: {
    Accept: "text/html",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent": `${owner}-profile-readme`,
  },
});

if (!response.ok) {
  throw new Error(`GitHub contribution calendar returned ${response.status}`);
}

const html = await response.text();
const countsByDate = {};
const levelsByDate = {};
const dayPattern = /<td\b([^>]*\bdata-date="[^"]+"[^>]*)><\/td>\s*<tool-tip\b[^>]*>([\s\S]*?)<\/tool-tip>/g;

for (const match of html.matchAll(dayPattern)) {
  const attributes = match[1];
  const date = attributes.match(/\bdata-date="([^"]+)"/)?.[1];
  const level = Number(attributes.match(/\bdata-level="([0-4])"/)?.[1]);
  const label = match[2].replace(/<[^>]+>/g, "").trim();
  const number = label.match(/^([\d,]+) contributions?\b/)?.[1];
  const count = number ? Number(number.replaceAll(",", "")) : 0;

  if (date && Number.isInteger(level)) {
    countsByDate[date] = count;
    levelsByDate[date] = level;
  }
}

const dates = Object.keys(countsByDate);
if (dates.length < 365) {
  throw new Error(`Only parsed ${dates.length} contribution days`);
}

// The generator's GitLab adapter accepts a simple date/count map. These
// synthetic values preserve GitHub's own five contribution color levels.
const levelValues = [0, 1, 34, 67, 100];
const generatorCounts = { "1970-01-01": 100 };
for (const date of dates) {
  generatorCounts[date] = levelValues[levelsByDate[date]];
}

const server = createServer((request, serverResponse) => {
  if (request.url === `/users/${owner}/calendar.json`) {
    serverResponse.writeHead(200, { "Content-Type": "application/json" });
    serverResponse.end(JSON.stringify(generatorCounts));
    return;
  }

  serverResponse.writeHead(404);
  serverResponse.end();
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;
const animationOptions = { frameByStep: 1, stepDurationMs: 100 };
const baseDrawOptions = {
  sizeDotBorderRadius: 2,
  sizeCell: 16,
  sizeDot: 12,
  colorDotBorder: "#1b1f230a",
  colorSnake: "#67577a",
};

try {
  const [light, dark] = await generateSnakeAnimation(
    { platform: "gitlab", username: owner, baseUrl },
    [
      {
        format: "svg",
        animationOptions,
        drawOptions: {
          ...baseDrawOptions,
          colorEmpty: "#ebedf0",
          colorDots: ["#ebedf0", "#b9e7e3", "#76d5ce", "#39c5bb", "#238f89"],
        },
      },
      {
        format: "svg",
        animationOptions,
        drawOptions: {
          ...baseDrawOptions,
          colorEmpty: "#182029",
          colorDots: ["#182029", "#25443f", "#2f716a", "#39c5bb", "#85efe7"],
        },
      },
    ],
  );

  await mkdir("dist", { recursive: true });
  await Promise.all([
    writeFile("dist/github-contribution-grid-snake.svg", light),
    writeFile("dist/github-contribution-grid-snake-dark.svg", dark),
  ]);
} finally {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}

const total = Object.values(countsByDate).reduce((sum, count) => sum + count, 0);
const activeDays = Object.values(countsByDate).filter(Boolean).length;
console.log(`Generated snake from ${total} contributions across ${activeDays} active days.`);
