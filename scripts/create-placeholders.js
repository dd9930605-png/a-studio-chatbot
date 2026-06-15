const fs = require('fs');
const path = require('path');

const outfits = [
  { id: 'F1', label: '女1', color: '#E8F4FC', sub: '白T＋淺藍牛仔褲' },
  { id: 'F5', label: '女5', color: '#F5E6E8', sub: '白襯衫＋藕色裙' },
  { id: 'M1', label: '男1', color: '#E8EEF5', sub: '白襯衫＋領帶＋牛仔褲' },
  { id: 'M2', label: '男2', color: '#E5EAF2', sub: '黑T＋迷彩寬褲' },
  { id: 'M3', label: '男3', color: '#ECECEC', sub: '黑T＋灰西褲' },
  { id: 'M4', label: '男4', color: '#D8DDE3', sub: '灰色套裝' },
  { id: 'M5', label: '男5', color: '#D5D5D5', sub: '深灰T＋牛仔褲' },
  { id: 'M6', label: '男6', color: '#C8CDD4', sub: '破邊襯衫＋工裝褲' },
];

const dir = path.join(__dirname, '../public/images/outfits');
fs.mkdirSync(dir, { recursive: true });

for (const o of outfits) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500">
  <rect width="400" height="500" fill="${o.color}"/>
  <rect x="40" y="60" width="320" height="380" rx="8" fill="#fff" stroke="#ccc" stroke-width="2"/>
  <text x="200" y="220" text-anchor="middle" font-family="sans-serif" font-size="36" font-weight="bold" fill="#333">${o.label}</text>
  <text x="200" y="270" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#666">${o.sub}</text>
  <text x="200" y="400" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#999">placeholder — 可替換為正式照片</text>
</svg>`;
  fs.writeFileSync(path.join(dir, `${o.id}.svg`), svg);
  console.log(`Created ${o.id}.svg`);
}
