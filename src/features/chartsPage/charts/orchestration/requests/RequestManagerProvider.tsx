// src/features/chartsPage/charts/orchestration/requests/RequestManagerProvider.tsx

import { useAppDispatch } from '@/store/hooks.ts';
import { useStore } from 'react-redux';
import type { RootState } from '@/store/store.ts';
import type { Guid } from '@app/lib/types/Guid';
import { RequestManager } from '@chartsPage/charts/orchestration/requests/RequestManager.ts';
import { type ReactNode, useEffect, useRef } from 'react';
import { RequestManagerContext } from './RequestManagerContext';

interface RequestManagerProviderProps {
    readonly contextId: Guid;
    readonly children: ReactNode;
}

/**
 * Провайдер RequestManager для одного контекста
 * Создаёт изолированный менеджер при монтировании
 */
export function RequestManagerProvider({ contextId, children }: RequestManagerProviderProps) {
    const dispatch = useAppDispatch();
    const store = useStore<RootState>();

    const managerRef = useRef<RequestManager | null>(null);

    // Создание менеджера для контекста
    if (!managerRef.current) {
        managerRef.current = new RequestManager(dispatch, () => store.getState(), contextId);
        console.log(`[RequestManagerProvider] Created manager for context: ${contextId}`);
    }

    // Cleanup при unmount контекста
    useEffect(() => {
        const manager = managerRef.current;

        return () => {
            if (manager) {
                console.log(`[RequestManagerProvider] Disposing manager for context: ${contextId}`);
                manager.dispose();
            }
        };
    }, [contextId]);

    // Периодическая очистка истории
    useEffect(() => {
        const manager = managerRef.current;
        if (!manager) return;

        const interval = setInterval(() => {
            manager.clearOldHistory(60000);
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    return (
        <RequestManagerContext.Provider value={managerRef.current}>
            {children}
        </RequestManagerContext.Provider>
    );
}