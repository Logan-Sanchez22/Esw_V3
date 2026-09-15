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
} as const;