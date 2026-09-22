/**
 * Real points-earning, replacing the "+10 pts (test)" placeholder that used
 * to live on the garden screen. Pure data/logic, no rendering — same split
 * as garden-domain.ts. A quest's points still land in the garden's shared
 * points pool (via useGardenDomain().addPoints), so completing one here
 * shows up as spendable currency on both garden screens immediately.
 */
export type Quest = {
    id: string;
    title: string;
    description: string;
    points: number;
};

export const QUESTS: Quest[] = [
    {
        id: 'reusable-bottle',
        title: 'Use a Reusable Bottle',
        description: 'Skip single-use plastic today — bring your own bottle or cup.',
        points: 5,
    },
    {
        id: 'lights-off',
        title: 'Turn Off Unused Lights',
        description: 'Switch off lights and unplug devices when you leave a room.',
        points: 5,
    },
    {
        id: 'recycle',
        title: 'Recycle Something',
        description: 'Recycle a bottle, can, or piece of paper instead of trashing it.',
        points: 5,
    },
    {
        id: 'bike-or-walk',
        title: 'Bike or Walk to Campus',
        description: 'Skip the car for one trip today.',
        points: 15,
    },
    {
        id: 'water-plants',
        title: 'Water a Plant',
        description: 'Water a plant on campus or at home.',
        points: 10,
    },
    {
        id: 'campus-cleanup',
        title: 'Join a Campus Cleanup',
        description: 'Help tidy up a shared campus space.',
        points: 25,
    },
];

/** Device-local calendar date as "YYYY-MM-DD" — quests reset at local
 * midnight, not a rolling 24h window from whenever they were last done
 * (simpler to reason about, and matches how the quest copy already reads:
 * "today," "for one trip today"). */
export function todayDateKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export type QuestDomainState = {
    /**
     * Maps a quest id to the calendar date it was last completed on. A
     * quest counts as completed only if that date is today — no explicit
     * "reset" step runs anywhere; isQuestCompleted just checks the date
     * live, so a quest silently becomes available again the next calendar
     * day on its own, correctly even if the app was closed for days.
     * Quests award real (non-refundable) points on every completion, same
     * as before — this only changes how long "completed" lasts.
     */
    completedAt: Record<string, string>;
};

export function createEmptyQuestState(): QuestDomainState {
    return { completedAt: {} };
}

export function isQuestCompleted(state: QuestDomainState, questId: string): boolean {
    return state.completedAt[questId] === todayDateKey();
}

export function completeQuest(state: QuestDomainState, questId: string): QuestDomainState {
    if (isQuestCompleted(state, questId)) return state;
    return { completedAt: { ...state.completedAt, [questId]: todayDateKey() } };
}

/** How many of today's quests are done — replaces the old all-time
 * completedQuestIds.length now that completion resets daily. */
export function completedTodayCount(state: QuestDomainState): number {
    return QUESTS.filter((quest) => isQuestCompleted(state, quest.id)).length;
}
