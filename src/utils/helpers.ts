// ? [HELPER] Get contrasting text color (black or white) based on background color brightness
export const getContrastColor = (hex: string) => {
  // Remove hash if present
  const cleanHex = hex.replace("#", "");

  // Convert R, G, B
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  // Calculate brightness (YIQ formula)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  // Return black for bright colors, white for dark colors
  return brightness > 220 ? "#000000" : "#FFFFFF";
};

// ? [HELPER] Convert hex color to HSL for brightness adjustments
const hexToHSL = (H: string) => {
  let r = 0, g = 0, b = 0;
  if (H.length === 4) {
    r = parseInt("0x" + H[1] + H[1]);
    g = parseInt("0x" + H[2] + H[2]);
    b = parseInt("0x" + H[3] + H[3]);
  } else if (H.length === 7) {
    r = parseInt("0x" + H[1] + H[2]);
    g = parseInt("0x" + H[3] + H[4]);
    b = parseInt("0x" + H[5] + H[6]);
  }
  r /= 255; g /= 255; b /= 255;
  const cmin = Math.min(r, g, b);
  const cmax = Math.max(r, g, b);
  const delta = cmax - cmin;
  let h = 0, s = 0, l = 0;

  if (delta === 0) h = 0;
  else if (cmax === r) h = ((g - b) / delta) % 6;
  else if (cmax === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;
  h = Math.round(h * 60);
  if (h < 0) h += 360;

  l = (cmax + cmin) / 2;
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return { h, s, l };
};

// ? [HELPER] Convert HSL back to hex after adjustments
const hslToHex = (h: number, s: number, l: number) => {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
};

// ? [HELPER] Adjust theme color brightness if it's too light for better contrast
export const adjustThemeColor = (hex: string) => {
  // Convert hex → HSL
  const { h, s, l } = hexToHSL(hex);

  let newL = l;
  let newS = s;

  // If lightness is too high, force it down
  if (l > 45) {
    newL = 45;   // much darker
    newS = Math.min(s * 1.1, 100);
  } else if (l > 65) {
    newL = 55;
  }

  // Convert back to hex
  return hslToHex(h, newS, newL);
};