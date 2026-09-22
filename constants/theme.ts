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
} as const;