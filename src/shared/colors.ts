/**
 * TimeTrack - Client Brand Colors
 * Company color palette for consistent theming
 */

export const BRAND_COLORS = {
  primary: '#0B5563',      // Dark Teal
  secondary: '#14919B',    // Medium Teal
  accent: '#1FB8A0',       // Bright Teal
  background: '#E8F6F5',   // Light Teal/Mint
} as const;

// Project default colors (using brand palette)
export const PROJECT_COLORS = [
  '#0B5563',  // Dark Teal
  '#14919B',  // Medium Teal
  '#1FB8A0',  // Bright Teal
  '#0EA5A5',  // Teal variation
  '#0D7E7E',  // Darker Teal variation
  '#20C9B5',  // Light Teal variation
] as const;

// UI Colors (derived from brand colors)
export const UI_COLORS = {
  // Backgrounds
  bg: {
    primary: '#050709',
    secondary: '#0A0E14',
    card: '#161C26',
    hover: '#131820',
  },

  // Borders
  border: {
    primary: '#1A1F2B',
    secondary: '#1E2530',
    accent: BRAND_COLORS.accent,
  },

  // Text
  text: {
    primary: '#E2E8F0',
    secondary: '#A0AEC0',
    muted: '#718096',
    dark: '#4A5568',
  },

  // Brand colors for interactive elements
  brand: {
    primary: BRAND_COLORS.primary,      // #0B5563
    secondary: BRAND_COLORS.secondary,  // #14919B
    accent: BRAND_COLORS.accent,        // #1FB8A0
    light: BRAND_COLORS.background,     // #E8F6F5
  },

  // Status colors (teal-based)
  status: {
    success: '#1FB8A0',   // Bright Teal (brand accent)
    warning: '#E8A638',   // Amber
    error: '#E85D75',     // Soft Red
    info: '#14919B',      // Medium Teal (brand secondary)
  },
} as const;

export default {
  BRAND_COLORS,
  PROJECT_COLORS,
  UI_COLORS,
};
