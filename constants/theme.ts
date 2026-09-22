export const colors = {
    background: "#020F09",
    foreground: "#ECFDF5",
    card: "#061A10",
    muted: "#064E3B",
    mutedForeground: "#6EE7B7",
    primary: "#34D399",
    accent: "#064E3B",
    border: "#065F46",
    success: "#34D399",
    warning: "#FBBF24",
    info: "#60A5FA",
    // Matches global.css's existing --color-error — same red, named for what
    // it's actually used for (destructive actions), not the CSS variable's name.
    danger: "#F87171",
    // The garden screens' selection/preview-outline accent — was duplicated
    // as the raw hex '#facc15' independently in ItemPicker's selected-item
    // border, both screens' PREVIEW_HIGHLIGHT_COLOR, and garden-alt's
    // highlighted-tile border. Deliberately distinct from `warning`
    // (#FBBF24, a different shade) since that token means "status/caution
    // message," not "this is the thing you've selected."
    highlight: "#facc15",
    // The garden screens' "you can't place/move here" flash — was
    // duplicated as raw hex independently in garden.tsx's flashColor prop
    // and garden-alt.tsx's isFlash border color. Distinct from `danger` (a
    // softer red, used for destructive-action buttons); this one needs to
    // read as an urgent, momentary alert.
    flash: "#ef4444",
    // The isometric/top-down tile outline color — was duplicated as raw hex
    // independently in garden.tsx's TILE_OUTLINE_COLOR and garden-alt.tsx's
    // border-color fallback.
    tileOutline: "#4A3728",
} as const;

// Five sizes, covering every screen in the app — see the UI Overhaul Roadmap's
// design-system section. All via the custom Plus Jakarta Sans family already
// loaded in the root layout (sans-regular/medium/semibold/bold), so weight
// comes from fontFamily, never a separate fontWeight prop.
export const typography = {
    display: { fontSize: 28, fontFamily: "sans-bold" },
    title: { fontSize: 20, fontFamily: "sans-bold" },
    body: { fontSize: 15, fontFamily: "sans-regular" },
    label: { fontSize: 13, fontFamily: "sans-semibold" },
    caption: { fontSize: 12, fontFamily: "sans-regular" },
} as const;

/**
 * How visible the garden screens' per-tile grid outline is, keyed by the
 * screen's current mode — same values drive both IsometricGrid's SVG
 * strokeOpacity and garden-alt.tsx's View borderColor alpha (via withAlpha
 * below), so the grid recedes by the same amount in both views for the same
 * mode instead of two independently-tuned numbers. Paint mode keeps it most
 * visible (you're deciding tile boundaries); Interact mode dims it most
 * (you're just looking/moving things, the grid should stay out of the way);
 * Decorate sits in between. Never fully 0 — a preview/flash tile's own
 * outline always overrides this and stays fully opaque regardless of mode.
 */
export const gridOutlineOpacity = {
    paint: 0.55,
    decorate: 0.25,
    interact: 0.12,
} as const;

/** "#rrggbb" -> "rgba(r,g,b,alpha)" — for a View borderColor, which (unlike
 * an SVG stroke) has no separate opacity prop of its own. */
export function withAlpha(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// One shared "raised card" shadow — used sparingly (stat cards, not every
// list row) so it stays a signal rather than wallpaper.
export const shadow = {
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
} as const;

export const spacing = {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    11: 44,
    12: 48,
    14: 56,
    16: 64,
    18: 72,
    20: 80,
    24: 96,
    30: 120,
} as const;

export const components = {
    tabBar: {
        height: spacing[18],
        horizontalInset: spacing[5],
        radius: spacing[8],
        iconFrame: spacing[12],
        itemPaddingVertical: spacing[2],
    },
} as const;

export const theme = {
    colors,
    spacing,
    components,
    typography,
    shadow,
    gridOutlineOpacity,
} as const;