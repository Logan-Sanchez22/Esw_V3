import { createContext, ReactNode, useContext, useState } from 'react';

import {
    completeQuest as completeQuestInState,
    createEmptyQuestState,
    isQuestCompleted,
    QuestDomainState,
} from '@/lib/quest-domain';

type Store = {
    state: QuestDomainState;
    completeQuest: (questId: string) => void;
    isCompleted: (questId: string) => boolean;
};

const QuestDomainContext = createContext<Store | null>(null);

export function QuestDomainProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<QuestDomainState>(createEmptyQuestState);

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
