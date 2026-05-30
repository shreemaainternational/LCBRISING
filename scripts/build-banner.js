const fs = require('fs');
const path = require('path');

/**
 * Builds the header banner SVG (and the two emblem SVGs) for the
 * Lions Club of Baroda Rising Star site.
 *
 * Edit the CONFIG block below and run `node scripts/build-banner.js`
 * (or `npm run build:banner`) to regenerate:
 *   - public/header-banner.svg  (the letterhead)
 *   - public/logo-lions.svg     (Lions International emblem)
 *   - public/logo-club.svg      (club "Rising Star" emblem)
 *
 * The artwork is generated from a single source of truth so the club
 * details (office bearers, year, etc.) and the emblems stay in sync and
 * are easy to update each Lions year.
 */

const CONFIG = {
  clubName: 'LIONS CLUB OF BARODA RISING STAR',
  subtitle: 'Club No:- 179323  •  District 3232 F1  •  Region:- 6  •  Zone:- 1',
  year: 'Lions Year 2025 - 2026',
  officers: [
    { role: 'Treasurer', name: 'LN Tarun Bhatt' },
    { role: 'Club President', name: 'LN Hiren Rathod' },
    { role: 'Secretary', name: 'LN Paresh Sharma' },
  ],
  colors: {
    bgTop: '#0e4aa8',
    bgBottom: '#062a66',
    title: '#ffffff',
    accent: '#ffd24d',
    accentSoft: '#ffe49a',
    gold: '#ffce4a',
    goldDark: '#c9971f',
    navy: '#0a3d91',
    maroon: '#7a1f2b',
  },
};

/* ----------------------------------------------------------------------- *
 * Emblem builders — each returns SVG markup centred on (0,0) at radius R,  *
 * so it can be embedded in the banner with a single translate/scale.      *
 * ----------------------------------------------------------------------- */

const R = 92; // emblem design radius (drawn centred on 0,0)

function lionsEmblem(c, idPrefix) {
  const ring = `${idPrefix}-ring`;
  return `
    <g aria-label="Lions Club International emblem">
      <defs>
        <radialGradient id="${idPrefix}-disc" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stop-color="${c.accentSoft}"/>
          <stop offset="60%" stop-color="${c.gold}"/>
          <stop offset="100%" stop-color="${c.goldDark}"/>
        </radialGradient>
        <path id="${ring}-top" d="M ${-R + 16},0 A ${R - 16},${R - 16} 0 0 1 ${R - 16},0" fill="none"/>
        <path id="${ring}-bot" d="M ${-R + 16},6 A ${R - 16},${R - 16} 0 0 0 ${R - 16},6" fill="none"/>
      </defs>
      <circle r="${R}" fill="url(#${idPrefix}-disc)" stroke="${c.navy}" stroke-width="3"/>
      <circle r="${R - 14}" fill="none" stroke="${c.navy}" stroke-width="2"/>
      <circle r="${R - 40}" fill="${c.navy}"/>
      <text font-family="Georgia, 'Times New Roman', serif" font-weight="bold" fill="${c.navy}" font-size="17" letter-spacing="3">
        <textPath href="#${ring}-top" startOffset="50%" text-anchor="middle">LIONS</textPath>
      </text>
      <text font-family="Georgia, 'Times New Roman', serif" font-weight="bold" fill="${c.navy}" font-size="11.5" letter-spacing="2">
        <textPath href="#${ring}-bot" startOffset="50%" text-anchor="middle">INTERNATIONAL</textPath>
      </text>
      <!-- twin lion heads facing outward, flanking the central L -->
      <g fill="${c.gold}" stroke="${c.accentSoft}" stroke-width="0.8">
        <path d="M -30,-8 q -10,-9 -19,-3 q 6,-4 13,-2 q -8,-5 -16,-1 q 7,-6 17,-2 q 5,1 8,5 q 4,6 1,13 q -3,6 -9,6 q -7,0 -9,-7 q -1,-5 2,-9 q 4,-4 9,-3 z"/>
        <path d="M 30,-8 q 10,-9 19,-3 q -6,-4 -13,-2 q 8,-5 16,-1 q -7,-6 -17,-2 q -5,1 -8,5 q -4,6 -1,13 q 3,6 9,6 q 7,0 9,-7 q 1,-5 -2,-9 q -4,-4 -9,-3 z"/>
      </g>
      <text x="0" y="13" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="bold" font-size="40" fill="${c.gold}">L</text>
    </g>`;
}

function clubEmblem(c, idPrefix) {
  const ring = `${idPrefix}-ring`;
  return `
    <g aria-label="Lions Club of Baroda Rising Star club emblem">
      <defs>
        <radialGradient id="${idPrefix}-disc" cx="38%" cy="30%" r="80%">
          <stop offset="0%" stop-color="#a23344"/>
          <stop offset="65%" stop-color="${c.maroon}"/>
          <stop offset="100%" stop-color="#54141d"/>
        </radialGradient>
        <linearGradient id="${idPrefix}-star" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${c.accentSoft}"/>
          <stop offset="100%" stop-color="${c.goldDark}"/>
        </linearGradient>
        <path id="${ring}-top" d="M ${-R + 16},0 A ${R - 16},${R - 16} 0 0 1 ${R - 16},0" fill="none"/>
        <path id="${ring}-bot" d="M ${-R + 16},6 A ${R - 16},${R - 16} 0 0 0 ${R - 16},6" fill="none"/>
      </defs>
      <circle r="${R}" fill="url(#${idPrefix}-disc)" stroke="${c.gold}" stroke-width="3"/>
      <circle r="${R - 14}" fill="none" stroke="${c.gold}" stroke-width="2"/>
      <text font-family="Georgia, 'Times New Roman', serif" font-weight="bold" fill="${c.gold}" font-size="14" letter-spacing="1.5">
        <textPath href="#${ring}-top" startOffset="50%" text-anchor="middle">BARODA RISING STAR</textPath>
      </text>
      <text font-family="Georgia, 'Times New Roman', serif" font-weight="bold" fill="${c.gold}" font-size="12" letter-spacing="1.5">
        <textPath href="#${ring}-bot" startOffset="50%" text-anchor="middle">DISTRICT 3232 F1</textPath>
      </text>
      <!-- rising sun rays -->
      <g stroke="${c.gold}" stroke-width="2" stroke-linecap="round" opacity="0.85">
        <line x1="-34" y1="34" x2="-44" y2="44"/>
        <line x1="-18" y1="40" x2="-23" y2="52"/>
        <line x1="0" y1="42" x2="0" y2="55"/>
        <line x1="18" y1="40" x2="23" y2="52"/>
        <line x1="34" y1="34" x2="44" y2="44"/>
      </g>
      <path d="M -40,34 A 40,40 0 0 1 40,34 Z" fill="none" stroke="${c.gold}" stroke-width="2"/>
      <!-- rising star -->
      ${star(0, -8, 26, 11, `url(#${idPrefix}-star)`, c.accentSoft)}
    </g>`;
}

/* five-pointed star centred at (cx,cy) */
function star(cx, cy, outer, inner, fill, stroke) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`;
}

/* ----------------------------------------------------------------------- *
 * Banner builder                                                          *
 * ----------------------------------------------------------------------- */

function buildBanner(config) {
  const { clubName, subtitle, year, officers, colors: c } = config;
  const W = 1200;
  const H = 240;
  const cy = H / 2;
  const emblemScale = 0.82; // R(92) * 0.82 ≈ 75px radius

  const officerCols = [250, 600, 950];
  const officerSvg = officers
    .map((o, i) => {
      const x = officerCols[i] ?? 600;
      return `
  <text x="${x}" y="206" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="15" letter-spacing="0.5" fill="${c.accent}">${o.role}</text>
  <text x="${x}" y="227" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="bold" fill="${c.title}">${o.name}</text>
  <line x1="${x - 52}" y1="232" x2="${x + 52}" y2="232" stroke="${c.accent}" stroke-width="1.2" opacity="0.7"/>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Lions Club of Baroda Rising Star letterhead">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${c.bgTop}"/>
      <stop offset="100%" stop-color="${c.bgBottom}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="18%" r="70%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- gold frame -->
  <rect x="6" y="6" width="${W - 12}" height="${H - 12}" fill="none" stroke="${c.accent}" stroke-width="2.5"/>
  <rect x="12" y="12" width="${W - 24}" height="${H - 24}" fill="none" stroke="${c.accent}" stroke-width="1" opacity="0.55"/>

  <!-- emblems -->
  <g transform="translate(112,${cy - 12}) scale(${emblemScale})">${lionsEmblem(c, 'lions')}
  </g>
  <g transform="translate(${W - 112},${cy - 12}) scale(${emblemScale})">${clubEmblem(c, 'club')}
  </g>

  <!-- club name -->
  <text x="${W / 2}" y="62" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="40" font-weight="bold" fill="${c.title}" letter-spacing="1">${clubName}</text>

  <!-- divider with star accent -->
  <line x1="320" y1="80" x2="${W - 320}" y2="80" stroke="${c.accent}" stroke-width="1.4" opacity="0.65"/>
  ${star(W / 2, 80, 9, 4, c.accent, c.accent)}

  <text x="${W / 2}" y="108" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="${c.accent}" letter-spacing="0.5">${subtitle}</text>
  <text x="${W / 2}" y="134" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="bold" fill="${c.accentSoft}" letter-spacing="1">${year}</text>

  <!-- office bearers divider -->
  <line x1="250" y1="160" x2="${W - 250}" y2="160" stroke="${c.accent}" stroke-width="1" opacity="0.4"/>
${officerSvg}
</svg>
`;
}

/* Standalone emblem files (square viewBox so the site layout stays intact) */
function buildStandaloneEmblem(inner, label) {
  const pad = 6;
  const size = (R + pad) * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${label}">
  <g transform="translate(${size / 2},${size / 2})">${inner}
  </g>
</svg>
`;
}

/* ----------------------------------------------------------------------- */

const publicDir = path.join(__dirname, '..', 'public');

fs.writeFileSync(path.join(publicDir, 'header-banner.svg'), buildBanner(CONFIG));
fs.writeFileSync(
  path.join(publicDir, 'logo-lions.svg'),
  buildStandaloneEmblem(lionsEmblem(CONFIG.colors, 'lionsStandalone'), 'Lions Club International emblem')
);
fs.writeFileSync(
  path.join(publicDir, 'logo-club.svg'),
  buildStandaloneEmblem(clubEmblem(CONFIG.colors, 'clubStandalone'), 'Lions Club of Baroda Rising Star club emblem')
);

console.log('Wrote public/header-banner.svg');
console.log('Wrote public/logo-lions.svg');
console.log('Wrote public/logo-club.svg');

/*
 * The app shell (src/components/BrandHeader.tsx) serves the letterhead as a
 * raster image at /letterhead.png. If the optional renderer @resvg/resvg-js
 * is available, regenerate that PNG too (at 2x for crisp display/print).
 * Otherwise skip with a hint — the SVGs above are still up to date.
 */
try {
  const { Resvg } = require('@resvg/resvg-js');
  const svg = fs.readFileSync(path.join(publicDir, 'header-banner.svg'), 'utf8');
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 2400 } }).render().asPng();
  fs.writeFileSync(path.join(publicDir, 'letterhead.png'), png);
  console.log('Wrote public/letterhead.png (2x)');
} catch (err) {
  console.log(
    'Skipped public/letterhead.png — install the optional renderer to regenerate it:\n' +
      '  npm i -D @resvg/resvg-js && npm run build:banner'
  );
}
