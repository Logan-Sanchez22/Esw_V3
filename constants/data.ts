// Emoji tab icons — matches the icon language used everywhere else in the
// app (buttons, empty states, quest cards; see AmbientParticles.tsx,
// onboarding.tsx). Previously custom PNGs (constants/icons.ts, now removed)
// that ran a visibly different design language alongside all the emoji, and
// whose two garden icons read as near-identical at tab-bar size.
export const tabs: AppTab[] = [
    { name: "index", title: "Home", icon: "🏠" },
    { name: "garden", title: "Garden", icon: "🌳" },
    { name: "garden-alt", title: "Top-Down Garden", icon: "🧭" },
    { name: "quest-page", title: "Quests", icon: "📜" },
    { name: "settings", title: "Settings", icon: "⚙️" },
];
