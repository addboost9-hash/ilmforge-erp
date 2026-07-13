/**
 * IlmForge — PWA Icon Generator
 * Creates PNG icons of all required sizes using Canvas API
 * Run in browser console or as a Node script
 *
 * Since we can't use sharp/canvas in this environment,
 * we provide the SVG and let the browser/Vite handle it.
 * For production, use: https://realfavicongenerator.net
 */

// Icon sizes required for PWA
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// For each size, we reference the SVG
ICON_SIZES.forEach(size => {
  console.log(`Required: icon-${size}x${size}.png`);
});

console.log('\nTo generate icons:');
console.log('1. Go to https://realfavicongenerator.net');
console.log('2. Upload public/icons/icon.svg');
console.log('3. Download and place in public/icons/');
console.log('\nOr use the fallback SVG icons (modern browsers support SVG icons)');
