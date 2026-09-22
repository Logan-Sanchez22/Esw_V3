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
    // Average color of the top-down ground atlas's actual grass tile
    // (sampled from assets/images/garden-topdown/spring_forest.png's grass
    // rect, not guessed) — garden-alt.tsx's grid dimming blends toward this
    // instead of using an alpha-transparent border. A transparent border
    // shows whatever's directly behind THAT one tile's edge, which varies
    // pixel to pixel across the grass texture, so two adjacent tiles' borders
    // (each tile draws its own) blended inconsistently and read as a muddy,
    // uneven line rather than a clean dim one — confirmed by on-device
    // feedback after shipping the alpha version. Blending to a flat solid
    // color first avoids that: every tile's border is the same exact color
    // regardless of what's under it.
    topDownGrassBase: "#5A8550",
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
 * screen's current mode — drives both IsometricGrid's SVG strokeOpacity
 * directly, and garden-alt.tsx's solid blended border color (via mixColors
 * below: `1 - gridOutlineOpacity[mode]` toward topDownGrassBase) — same
 * underlying "how much should this recede" values for both views, applied
 * however each rendering technique actually needs it. Paint mode keeps it
 * most visible (you're deciding tile boundaries); Interact mode dims it most
 * (you're just looking/moving things, the grid should stay out of the way);
 * Decorate sits in between. Never fully 0 — a preview/flash tile's own
 * outline always overrides this and stays fully opaque regardless of mode
 * (see IsometricGrid's highlightIndex/flashIndex and garden-alt.tsx's
 * isHighlighted/isFlash — neither reads this value at all).
 *
 * Lowered a further notch (demo-polish pass) — at the previous values the
 * grid still read as a level-editor overlay at rest, especially on the
 * top-down screen's flat square tiles. Placement/move/invalid feedback is
 * untouched, since that's the always-opaque override above, not this.
 */
export const gridOutlineOpacity = {
    paint: 0.35,
    decorate: 0.1,
    interact: 0.05,
} as const;

/** "#rrggbb" -> "rgba(r,g,b,alpha)" — for a View borderColor, which (unlike
 * an SVG stroke) has no separate opacity prop of its own. */
export function withAlpha(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Linear-interpolates two "#rrggbb" colors into a third solid "#rrggbb" —
 * t=0 is hexA, t=1 is hexB. Used instead of withAlpha wherever the color
 * needs to stay solid (opaque) rather than see-through — e.g. a View
 * border drawn over a busy, non-uniform texture, where transparency would
 * blend inconsistently depending on what's directly underneath. */
export function mixColors(hexA: string, hexB: string, t: number): string {
    const a = { r: parseInt(hexA.slice(1, 3), 16), g: parseInt(hexA.slice(3, 5), 16), b: parseInt(hexA.slice(5, 7), 16) };
    const b = { r: parseInt(hexB.slice(1, 3), 16), g: parseInt(hexB.slice(3, 5), 16), b: parseInt(hexB.slice(5, 7), 16) };
    const mix = (x: number, y: number) => Math.round(x + (y - x) * t);
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(mix(a.r, b.r))}${toHex(mix(a.g, b.g))}${toHex(mix(a.b, b.b))}`;
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