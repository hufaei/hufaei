import { readFile, writeFile } from 'node:fs/promises';

const portrait = await readFile(new URL('../../assets/bocchi-welcome-original.png', import.meta.url));
const portraitData = `data:image/png;base64,${portrait.toString('base64')}`;
const labScene = await readFile(new URL('../../assets/worldline-lab-cinematic.webp', import.meta.url));
const labSceneData = `data:image/webp;base64,${labScene.toString('base64')}`;
const litLabScene = await readFile(new URL('../../assets/worldline-lab-lit.webp', import.meta.url));
const litLabSceneData = `data:image/webp;base64,${litLabScene.toString('base64')}`;

const themes = {
  dark: {
    bg: '#17121b', panel: '#1f1923', ink: '#fff5f8', muted: '#bbaebd',
    pink: '#ff73a7', purple: '#9273a4', purpleSoft: '#4a3953', line: '#4a3a51',
    chassis: '#17171a', well: '#0d0c10', glass: '#29252d', glassEdge: '#77687a',
    base: '#3b343f', digit: '#ff9b54', digitDim: '#6e4430', overlay: '#140d18', overlayOpacity: '.30',
  },
  light: {
    bg: '#f4eef5', panel: '#fff9fb', ink: '#2c2430', muted: '#736578',
    pink: '#dc5b8d', purple: '#806b91', purpleSoft: '#cbbdd4', line: '#d7cbdc',
    chassis: '#eee8e6', well: '#d8d0d6', glass: '#302b32', glassEdge: '#8f8190',
    base: '#877a85', digit: '#eb7137', digitDim: '#8d4b31', overlay: '#ffffff', overlayOpacity: '.04',
  },
};

function banner(c) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="500" viewBox="0 0 1200 500" role="img" aria-labelledby="title desc">
  <title id="title">Welcome to hufaei's worldline</title>
  <desc id="desc">A worldline-themed profile banner featuring Bocchi reluctantly welcoming visitors.</desc>
  <defs>
    <clipPath id="portrait"><path d="M684 18H1182V482H638L690 410 650 330 700 248 658 165 702 82Z"/></clipPath>
  </defs>
  <style>
    .sans{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}.mono{font-family:"SFMono-Regular",Consolas,"Liberation Mono",monospace}
    .drift{transform-origin:900px 250px;animation:drift 18s ease-in-out infinite alternate}.blink{animation:blink 4s ease-in-out infinite}
    @keyframes drift{to{transform:rotate(3deg) scale(1.025)}}@keyframes blink{50%{opacity:.35}}
    @media (prefers-reduced-motion:reduce){.drift,.blink{animation:none}}
  </style>
  <rect width="1200" height="500" rx="26" fill="${c.bg}"/>
  <g class="drift" fill="none" stroke="${c.purpleSoft}" opacity=".65">
    <ellipse cx="905" cy="250" rx="720" ry="440" stroke-width="50"/>
    <ellipse cx="905" cy="250" rx="588" ry="350" stroke-width="46"/>
    <ellipse cx="905" cy="250" rx="454" ry="270" stroke-width="42"/>
    <ellipse cx="905" cy="250" rx="326" ry="190" stroke-width="38"/>
    <ellipse cx="905" cy="250" rx="202" ry="110" stroke-width="32"/>
  </g>
  <g clip-path="url(#portrait)">
    <image href="${portraitData}" x="718" y="18" width="464" height="464"/>
    <rect x="620" y="18" width="562" height="464" fill="${c.overlay}" opacity="${c.overlayOpacity}"/>
  </g>
  <path d="M0 0H670L720 90 678 180 718 270 668 385 700 500H0Z" fill="${c.panel}" opacity=".97"/>
  <text x="66" y="76" class="mono" font-size="13" font-weight="700" letter-spacing="3.2" fill="${c.pink}">WELCOME TO THIS WORLDLINE</text>
  <circle class="blink" cx="48" cy="71" r="5" fill="${c.pink}"/>
  <text x="66" y="194" class="sans" font-size="46" font-weight="680" letter-spacing="-1.3" fill="${c.ink}">If destiny is hardcoded,</text>
  <text x="66" y="252" class="sans" font-size="46" font-weight="680" letter-spacing="-1.3" fill="${c.ink}">I'll refactor it.</text>
  <path d="M66 296H500" stroke="${c.pink}" stroke-width="4"/><path d="M510 296H578" stroke="${c.purple}" stroke-width="4"/>
  <text x="66" y="337" class="mono" font-size="12" letter-spacing="2.1" fill="${c.muted}">CODE · TIME · POSSIBILITY</text>
  <text x="66" y="456" class="mono" font-size="11" letter-spacing="2" fill="${c.muted}">HUFAEI // LAB MEMBER 048596</text>
  <path d="M684 18H1182V482H638" fill="none" stroke="${c.pink}" stroke-width="2" opacity=".72"/>
  <rect x="1.5" y="1.5" width="1197" height="497" rx="24.5" fill="none" stroke="${c.line}" stroke-width="3"/>
  <rect x="18" y="18" width="1164" height="464" rx="14" fill="none" stroke="${c.line}" opacity=".65"/>
</svg>`;
}

function cinematicSequence(c) {
  const tubeCenters = [384, 453, 522, 592, 662, 732, 802];
  const tubeMasks = tubeCenters.map((center, index) => `<mask id="tube-${index}" maskUnits="userSpaceOnUse" x="${center - 38}" y="208" width="76" height="132" style="mask-type:luminance"><rect x="${center - 29}" y="216" width="58" height="116" rx="27" fill="#fff" filter="url(#maskFeather)"/></mask>`).join('');
  const litTubeLayers = tubeCenters.map((center, index) => {
    const delay = (3.25 + index * 0.18).toFixed(2);
    return `<g mask="url(#tube-${index})"><use class="tubeLit" style="--delay:${delay}s" href="#litScene"/></g>`;
  }).join('');
  const isLight = c.panel === '#fff9fb';
  const wash = isLight ? '#fff0e8' : '#130a18';
  const washOpacity = isLight ? '.05' : '.045';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400" viewBox="0 0 1200 400" role="img" aria-labelledby="title desc">
  <title id="title">Every commit creates another possibility</title>
  <desc id="desc">Two silhouetted lab members watch seven Nixie tubes flicker and settle on the worldline value 1.048596.</desc>
  <defs>
    <clipPath id="scene"><rect x="10" y="10" width="1180" height="380" rx="20"/></clipPath>
    <clipPath id="caption"><rect class="captionReveal" x="66" y="333" width="510" height="34"/></clipPath>
    ${tubeMasks}
    <image id="litScene" href="${litLabSceneData}" x="10" y="10" width="1180" height="380" preserveAspectRatio="xMidYMid slice"/>
    <linearGradient id="vignette" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#05060a" stop-opacity=".06"/><stop offset=".6" stop-color="#05060a" stop-opacity="0"/><stop offset="1" stop-color="#050307" stop-opacity=".52"/></linearGradient>
    <radialGradient id="bloom" cx="49%" cy="68%" r="34%"><stop stop-color="#ff6f28" stop-opacity=".34"/><stop offset=".42" stop-color="#d94d16" stop-opacity=".09"/><stop offset="1" stop-color="#7a1f09" stop-opacity="0"/></radialGradient>
    <filter id="maskFeather" x="-25%" y="-15%" width="150%" height="130%"><feGaussianBlur stdDeviation="3.2"/></filter>
  </defs>
  <style>
    .mono{font-family:"SFMono-Regular",Consolas,"Liberation Mono",monospace}.sceneWake{animation:sceneWake 6.2s 1 both}.captionReveal{animation:captionReveal 6.2s steps(41,end) 1 both}.tubeLit{opacity:1;animation:ignite 1.05s var(--delay) 1 both}.bloom{animation:bloom 6.2s 1 both}.lockMark{animation:lockMark 6.2s 1 both}
    @keyframes sceneWake{0%{opacity:.38;filter:saturate(.58) brightness(.55)}19%,100%{opacity:1;filter:saturate(1) brightness(1)}}
    @keyframes captionReveal{0%,7%{width:0}43%,100%{width:510px}}
    @keyframes ignite{0%,16%,34%,52%{opacity:.03}8%,25%,43%,61%{opacity:.92}73%{opacity:.35}100%{opacity:1}}
    @keyframes bloom{0%,45%{opacity:0}60%{opacity:.78}72%,100%{opacity:.42}}
    @keyframes lockMark{0%,76%{opacity:0;transform:translateX(-5px)}86%,100%{opacity:1;transform:none}}
    @media (prefers-reduced-motion:reduce){.sceneWake,.captionReveal,.tubeLit,.bloom,.lockMark{animation:none}}
  </style>
  <rect width="1200" height="400" rx="24" fill="${c.bg}"/>
  <g clip-path="url(#scene)">
    <g class="sceneWake"><image href="${labSceneData}" x="10" y="10" width="1180" height="380" preserveAspectRatio="xMidYMid slice"/></g>
    ${litTubeLayers}
    <rect x="10" y="10" width="1180" height="380" fill="${wash}" opacity="${washOpacity}"/>
    <rect x="10" y="10" width="1180" height="380" fill="url(#vignette)"/>
    <rect class="bloom" x="10" y="10" width="1180" height="380" fill="url(#bloom)"/>
    <g clip-path="url(#caption)"><text x="66" y="361" class="mono" font-size="15" letter-spacing=".5" fill="#fff5ee">Every commit creates another possibility.</text></g>
    <path d="M48 355H57" stroke="#ff8c42" stroke-width="2.2"/><circle cx="48" cy="355" r="2.5" fill="#ff8c42"/>
    <g class="lockMark"><circle cx="1114" cy="355" r="3" fill="#ff8c42"/><text x="1103" y="359" text-anchor="end" class="mono" font-size="9" letter-spacing="1.5" fill="#eadbd5">WORLDLINE LOCKED</text></g>
  </g>
  <rect x="1.5" y="1.5" width="1197" height="397" rx="22.5" fill="none" stroke="${c.line}" stroke-width="3"/>
  <rect x="10" y="10" width="1180" height="380" rx="20" fill="none" stroke="${isLight ? '#d9c8d5' : '#514354'}" stroke-width="2"/>
</svg>`;
}

for (const [name, colors] of Object.entries(themes)) {
  const suffix = name === 'dark' ? '' : '-light';
  await writeFile(new URL(`../../assets/worldline-banner${suffix}.svg`, import.meta.url), banner(colors));
  await writeFile(new URL(`../../assets/worldline-sequence${suffix}.svg`, import.meta.url), cinematicSequence(colors));
}

console.log('Built light and dark Bocchi banner + cinematic worldline scene.');
