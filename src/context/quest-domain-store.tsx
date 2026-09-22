import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';

import {
    completeQuest as completeQuestInState,
    createEmptyQuestState,
    isQuestCompleted,
    QuestDomainState,
    todayDateKey,
} from '@/lib/quest-domain';

const STORAGE_KEY = 'gryph-gardens:quest-state';

function isValidQuestState(value: unknown): value is QuestDomainState {
    if (!value || typeof value !== 'object') return false;
    const state = value as QuestDomainState;
    return (
        !!state.completedAt &&
        typeof state.completedAt === 'object' &&
        Object.values(state.completedAt).every((date) => typeof date === 'string')
    );
}

/** Pre-daily-reset shape — a flat list of ids with no completion date. */
type LegacyQuestState = { completedQuestIds: string[] };

function isLegacyQuestState(value: unknown): value is LegacyQuestState {
    if (!value || typeof value !== 'object') return false;
    const state = value as LegacyQuestState;
    return Array.isArray(state.completedQuestIds) && state.completedQuestIds.every((id) => typeof id === 'string');
}

/** Treats whatever was already completed as "completed today" rather than
 * losing that progress or letting it be re-done once for free right after
 * this update — the closest match to what the player actually did. */
function migrateFromLegacy(legacy: LegacyQuestState): QuestDomainState {
    const today = todayDateKey();
    const completedAt: Record<string, string> = {};
    for (const id of legacy.completedQuestIds) completedAt[id] = today;
    return { completedAt };
}

type Store = {
    state: QuestDomainState;
    completeQuest: (questId: string) => void;
    isCompleted: (questId: string) => boolean;
    resetQuests: () => void;
};

const QuestDomainContext = createContext<Store | null>(null);

export function QuestDomainProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<QuestDomainState>(createEmptyQuestState);
    // Same reasoning as GardenDomainProvider: don't let the initial empty
    // state overwrite storage before the hydration read below has run.
    const hydrated = useRef(false);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY)
            .then((raw) => {
                if (!raw) return;
                const parsed = JSON.parse(raw);

                if (isValidQuestState(parsed)) {
                    setState(parsed);
                    return;
                }

                if (isLegacyQuestState(parsed)) {
                    setState(migrateFromLegacy(parsed));
                }
            })
            .catch(() => {
                // Corrupt or unavailable storage — keep the empty quest state already in state.
            })
            .finally(() => {
                hydrated.current = true;
            });
    }, []);

    useEffect(() => {
        if (!hydrated.current) return;
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
    }, [state]);

    const completeQuest = (questId: string) => {
        setState((prev) => completeQuestInState(prev, questId));
    };

    const isCompleted = (questId: string) => isQuestCompleted(state, questId);

    const resetQuests = () => {
        setState(createEmptyQuestState());
    };

    return (
        <QuestDomainContext.Provider value={{ state, completeQuest, isCompleted, resetQuests }}>
            {children}
        </QuestDomainContext.Provider>
    );
}

export function useQuestDomain() {
    const ctx = useContext(QuestDomainContext);
    if (!ctx) throw new Error('useQuestDomain must be used inside QuestDomainProvider');
    return ctx;
}
