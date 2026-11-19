export const C = {
  bg: '#0E0B16',
  surface: '#18141F',
  surfaceHigh: '#231D2D',
  border: '#2E2639',
  text: '#FFFFFF',
  textDim: '#ADADB8',
  textFaint: '#6B6575',
  accent: '#9146FF',
  accentSoft: 'rgba(145,70,255,0.18)',
  live: '#EB0400',
  success: '#30D158',
  danger: '#FF453A',
} as const;

export const R = { sm: 8, md: 12, lg: 18 } as const;

export function formatViewers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')} M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace('.', ',')} k`;
  return String(n);
}
