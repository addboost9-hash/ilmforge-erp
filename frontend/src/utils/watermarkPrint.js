const BASE = {
  logoRadius: '20px',
  fallbackRadius: '20px',
  logoOpacity: '0.07',
  textOpacity: '0.055',
  textLetterSpacing: '1px',
};

const SCALE = {
  a4: {
    logoSize: '170px',
    textSize: '30px',
    textMarginTop: '10px',
    fallbackFontSize: '90px',
  },
  compact: {
    logoSize: '86px',
    textSize: '11px',
    textMarginTop: '6px',
    fallbackFontSize: '54px',
  },
};

export function getWatermarkScale(mode = 'a4') {
  return SCALE[mode] || SCALE.a4;
}

export function buildWatermarkCss(options = {}) {
  const {
    mode = 'a4',
    position = 'fixed',
    containerClass = 'wm',
    logoClass = 'wm-logo',
    fallbackClass = 'wm-fallback',
    textClass = 'wm-name',
    color = '#0F4C45',
    logoSize,
    textSize,
    textMarginTop,
    fallbackFontSize,
    logoRadius,
    fallbackRadius,
    logoOpacity,
    textOpacity,
    letterSpacing,
  } = options;

  const scale = getWatermarkScale(mode);

  return `
.${containerClass}{position:${position};inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;pointer-events:none;z-index:0;}
.${logoClass}{width:${logoSize || scale.logoSize};height:${logoSize || scale.logoSize};object-fit:contain;border-radius:${logoRadius || BASE.logoRadius};opacity:${logoOpacity || BASE.logoOpacity};}
.${fallbackClass}{width:${logoSize || scale.logoSize};height:${logoSize || scale.logoSize};border-radius:${fallbackRadius || BASE.fallbackRadius};background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:${fallbackFontSize || scale.fallbackFontSize};font-weight:900;opacity:${logoOpacity || BASE.logoOpacity};}
.${textClass}{margin-top:${textMarginTop || scale.textMarginTop};font-size:${textSize || scale.textSize};font-weight:900;color:${color};letter-spacing:${letterSpacing || BASE.textLetterSpacing};opacity:${textOpacity || BASE.textOpacity};text-transform:uppercase;text-align:center;}
`.trim();
}

export function buildWatermarkMarkup(options = {}) {
  const {
    logo,
    text,
    fallbackLetter,
    containerClass = 'wm',
    logoClass = 'wm-logo',
    fallbackClass = 'wm-fallback',
    textClass = 'wm-name',
    imgAlt = 'School watermark',
  } = options;

  const safeText = String(text || '').trim();
  const safeFallback = String(fallbackLetter || safeText.slice(0, 1) || 'S').trim().slice(0, 1);

  return `<div class="${containerClass}">${logo ? `<img src="${logo}" class="${logoClass}" alt="${imgAlt}"/>` : `<div class="${fallbackClass}">${safeFallback}</div>`}<div class="${textClass}">${safeText}</div></div>`;
}
