import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';

import {
    completeQuest as completeQuestInState,
    createEmptyQuestState,
    isQuestCompleted,
    QuestDomainState,
} from '@/lib/quest-domain';

const STORAGE_KEY = 'gryph-gardens:quest-state';

function isValidQuestState(value: unknown): value is QuestDomainState {
    if (!value || typeof value !== 'object') return false;
    const state = value as QuestDomainState;
    return Array.isArray(state.completedQuestIds) && state.completedQuestIds.every((id) => typeof id === 'string');
}

type Store = {
    state: QuestDomainState;
    completeQuest: (questId: string) => void;
    isCompleted: (questId: string) => boolean;
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
                if (isValidQuestState(parsed)) setState(parsed);
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

    return (
        <QuestDomainContext.Provider value={{ state, completeQuest, isCompleted }}>
            {children}
        </QuestDomainContext.Provider>
    );
}

export function useQuestDomain() {
    const ctx = useContext(QuestDomainContext);
    if (!ctx) throw new Error('useQuestDomain must be used inside QuestDomainProvider');
    return ctx;
}
