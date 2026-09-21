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

export type QuestDomainState = {
    /** Quests are one-time for now — no daily/weekly reset logic yet. */
    completedQuestIds: string[];
};

export function createEmptyQuestState(): QuestDomainState {
    return { completedQuestIds: [] };
}

export function isQuestCompleted(state: QuestDomainState, questId: string): boolean {
    return state.completedQuestIds.includes(questId);
}

export function completeQuest(state: QuestDomainState, questId: string): QuestDomainState {
    if (isQuestCompleted(state, questId)) return state;
    return { completedQuestIds: [...state.completedQuestIds, questId] };
}
