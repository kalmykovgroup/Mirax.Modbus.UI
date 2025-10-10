// src/features/chartsPage/charts/orchestration/requests/RequestManagerProvider.tsx

import { useAppDispatch } from '@/store/hooks.ts';
import { useStore } from 'react-redux';
import type { RootState } from '@/store/store.ts';
import type { Guid } from '@app/lib/types/Guid';
import { RequestManager } from '@chartsPage/charts/orchestration/requests/RequestManager.ts';
import { type ReactNode, useEffect, useRef } from 'react';
import { RequestManagerContext } from './RequestManagerContext';

interface RequestManagerProviderProps {
    readonly tabId: Guid; // ← Принимаем tabId
    readonly children: ReactNode;
}

/**
 * Провайдер RequestManager для одной вкладки
 * Создаёт изолированный менеджер при монтировании
 */
export function RequestManagerProvider({ tabId, children }: RequestManagerProviderProps) {
    const dispatch = useAppDispatch();
    const store = useStore<RootState>();

    const managerRef = useRef<RequestManager | null>(null);

    // Создание менеджера для вкладки
    if (!managerRef.current) {
        managerRef.current = new RequestManager(dispatch, () => store.getState(), tabId);
        console.log(`[RequestManagerProvider] Created manager for tab: ${tabId}`);
    }

    // Cleanup при unmount вкладки
    useEffect(() => {
        const manager = managerRef.current;

        return () => {
            if (manager) {
                console.log(`[RequestManagerProvider] Disposing manager for tab: ${tabId}`);
                manager.dispose();
            }
        };
    }, [tabId]);

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