// Paper pattern definitions for the note background
// Each pattern's css() function receives the theme's border color (hex) and returns
// a CSS background string that can be layered over the solid surface color.
// Returning null means "Plain" (no pattern overlay).

export const patternCategories = ['core', 'sweet', 'graphic'];

export const paperPatterns = {
  core: [
    {
      id: 'plain',
      label: 'Plain',
      css: () => null,
    },
    {
      id: 'lines',
      label: 'Lines',
      css: (c) =>
        `repeating-linear-gradient(180deg, transparent 0px, transparent 22px, ${c}55 22px, ${c}55 23px)`,
    },
    {
      id: 'dots',
      label: 'Dots',
      css: (c) =>
        `radial-gradient(circle, ${c}88 1.5px, transparent 1.5px) 12px 12px / 24px 24px`,
    },
    {
      id: 'grid',
      label: 'Grid',
      css: (c) =>
        `linear-gradient(${c}44 1px, transparent 1px) 0 0/24px 24px,` +
        `linear-gradient(90deg, ${c}44 1px, transparent 1px) 0 0/24px 24px`,
    },
    {
      id: 'waves',
      label: 'Waves',
      css: (c) =>
        `repeating-linear-gradient(-45deg, transparent, transparent 8px, ${c}44 8px, ${c}44 9px)`,
    },
  ],
  sweet: [
    {
      id: 'plain-s',
      label: 'Plain',
      css: () => null,
    },
    {
      id: 'checks',
      label: 'Checks',
      css: (c) =>
        `repeating-conic-gradient(${c}33 0% 25%, transparent 0% 50%) 0 0 / 20px 20px`,
    },
    {
      id: 'ditsy',
      label: 'Ditsy',
      css: (c) =>
        `radial-gradient(circle, ${c}99 2px, transparent 2px) 0 0 / 16px 16px,` +
        `radial-gradient(circle, ${c}55 1px, transparent 1px) 8px 8px / 16px 16px`,
    },
    {
      id: 'stripe',
      label: 'Stripe',
      css: (c) =>
        `repeating-linear-gradient(90deg, transparent 0px, transparent 14px, ${c}55 14px, ${c}55 15px)`,
    },
    {
      id: 'hearts',
      label: 'Hearts',
      css: (c) =>
        `radial-gradient(circle at 30% 45%, ${c}88 3px, transparent 3px) 0 0 / 18px 18px`,
    },
  ],
  graphic: [
    {
      id: 'plain-g',
      label: 'Plain',
      css: () => null,
    },
    {
      id: 'crosshatch',
      label: 'Cross',
      css: (c) =>
        `repeating-linear-gradient(45deg, ${c}33 0, ${c}33 1px, transparent 0, transparent 50%) 0 0 / 12px 12px,` +
        `repeating-linear-gradient(-45deg, ${c}33 0, ${c}33 1px, transparent 0, transparent 50%) 0 0 / 12px 12px`,
    },
    {
      id: 'graph',
      label: 'Graph',
      css: (c) =>
        `linear-gradient(${c}66 1px, transparent 1px) 0 0/16px 16px,` +
        `linear-gradient(90deg, ${c}66 1px, transparent 1px) 0 0/16px 16px`,
    },
    {
      id: 'zigzag',
      label: 'Zigzag',
      css: (c) =>
        `linear-gradient(135deg, ${c}44 25%, transparent 25%) -10px 0 / 20px 20px,` +
        `linear-gradient(225deg, ${c}44 25%, transparent 25%) -10px 0 / 20px 20px`,
    },
    {
      id: 'ruled',
      label: 'Ruled',
      css: (c) =>
        `repeating-linear-gradient(` +
        `180deg, transparent 0, transparent 28px, ${c}66 28px, ${c}66 29px,` +
        `transparent 29px, transparent 32px, ${c}22 32px, ${c}22 33px)`,
    },
  ],
};

/** Flat list of all patterns across all categories */
export const flatPatterns = Object.values(paperPatterns).flat();

/** O(1) lookup by pattern id */
export const patternMap = Object.fromEntries(flatPatterns.map((p) => [p.id, p]));
