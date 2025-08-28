const fs = require('fs');

// SVG로 간단한 아이콘 생성
function generateSVGIcon(size) {
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1E40AF;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="url(#grad)" />
  <text x="${size/2}" y="${size/2 + size/8}" font-family="Arial, sans-serif" font-size="${size * 0.5}" font-weight="bold" text-anchor="middle" fill="white">T</text>
</svg>`.trim();
}

// 여러 크기의 SVG 아이콘 생성
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach(size => {
  const svg = generateSVGIcon(size);
  fs.writeFileSync(`public/icons/icon-${size}x${size}.svg`, svg);
});

console.log('SVG icons generated!');