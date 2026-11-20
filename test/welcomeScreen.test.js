import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const readFile = (relPath) => fs.readFileSync(path.join(rootDir, relPath), 'utf8');

test('index.html loads Kaushan Script cursive font for GondiaStay welcome pages', () => {
  const html = readFile('index.html');
  assert.match(html, /Kaushan\+Script/, 'Kaushan Script font should be imported in index.html');
});

test('WelcomeScreen embeds the uploaded welcome image asset directly and matches Page 1 & Page 2 content', () => {
  const src = readFile('src/components/WelcomeScreen.tsx');
  const assetPath = path.join(rootDir, 'public/assets/aistudio/IMG-20261120-WA3582_6a7bdbdb.jpg');
  assert.equal(fs.existsSync(assetPath), true, 'Uploaded welcome artwork asset must exist in public/');
  assert.match(
    src,
    /\/assets\/aistudio\/IMG-20261120-WA3582_6a7bdbdb\.jpg/,
    'WelcomeScreen must reference the uploaded image asset path directly'
  );

  // Page 1 exact text & cards
  assert.match(src, /Find Your Perfect Stay/);
  assert.match(src, /in Gondia/);
  assert.match(src, /Comfortable Homes\. Peaceful Stay\./);
  assert.match(src, /Rental/);
  assert.match(src, /Flats/);
  assert.match(src, /Rooms/);
  assert.match(src, /&amp; PG/);
  assert.match(src, /Mess/);
  assert.match(src, /Tiffin/);
  assert.match(src, /Explore GondiaStay/);
  assert.match(src, /Stay/);
  assert.match(src, /Eat/);
  assert.match(src, /Live Better/);

  // Page 2 exact text & 6 circular service badges
  assert.match(src, /Trusted Home Services/);
  assert.match(src, /Reliable Services\. Hassle-Free Life\./);
  assert.match(src, /'Maid'/);
  assert.match(src, /'Cook'/);
  assert.match(src, /'Housekeeping'/);
  assert.match(src, /'Laundry'/);
  assert.match(src, /'Electrician'/);
  assert.match(src, /'Plumber'/);
  assert.match(src, /Explore Home Services/);
  assert.match(src, /Your Home/);
  assert.match(src, /Our Care/);

  // Distinct SVG ID prefixes on Page 1 & Page 2 logos
  assert.match(src, /<GondiaStayWelcomeLogo idPrefix="stay" \/>/);
  assert.match(src, /<GondiaStayWelcomeLogo idPrefix="services" \/>/);
});

test('WelcomeScreen implements horizontal swipe navigation, pagination dots, and CTA button hooks', () => {
  const src = readFile('src/components/WelcomeScreen.tsx');

  // Touch & mouse swipe handlers + transform track
  assert.match(src, /onTouchStart=\{handleTouchStart\}/);
  assert.match(src, /onTouchMove=\{handleTouchMove\}/);
  assert.match(src, /onTouchEnd=\{handleTouchEnd\}/);
  assert.match(src, /onMouseDown=\{handleMouseDown\}/);
  assert.match(src, /translate3d\(calc\(\$\{-activePage \* 100\}%/);
  assert.match(src, /data-testid=\{`welcome-dot-\$\{idx\}`\}/);

  // Clickable CTA buttons
  assert.match(src, /data-testid="explore-gondiastay-btn"/);
  assert.match(src, /onClick=\{onExploreStay\}/);
  assert.match(src, /data-testid="explore-home-services-btn"/);
  assert.match(src, /onClick=\{onExploreServices\}/);
});

test('App.tsx wires WelcomeScreen to existing explore and services sections without disturbing deep links', () => {
  const appSrc = readFile('src/App.tsx');

  assert.match(appSrc, /import \{ WelcomeScreen \} from '\.\/components\/WelcomeScreen'/);
  assert.match(appSrc, /gondia_stay_welcome_dismissed/);
  assert.match(appSrc, /handleWelcomeExploreStay/);
  assert.match(appSrc, /navigateTo\('explore'\)/);
  assert.match(appSrc, /handleWelcomeExploreServices/);
  assert.match(appSrc, /navigateTo\('services'\)/);
  assert.match(appSrc, /<WelcomeScreen[\s\S]*onExploreStay=\{handleWelcomeExploreStay\}[\s\S]*onExploreServices=\{handleWelcomeExploreServices\}/);
});
