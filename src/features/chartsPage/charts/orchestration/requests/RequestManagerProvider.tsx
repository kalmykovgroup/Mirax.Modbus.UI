// src/features/chartsPage/charts/orchestration/requests/RequestManagerProvider.tsx

import { useAppDispatch } from '@/store/hooks';
import { useStore } from 'react-redux';
import type { RootState } from '@/store/store';
import type { Guid } from '@app/lib/types/Guid';
import { RequestManager } from '@chartsPage/charts/orchestration/requests/RequestManager';
import { type ReactNode, useEffect, useRef } from 'react';
import { RequestManagerContext } from './RequestManagerContext';
import { RequestManagerRegistry } from './RequestManagerRegistry';

interface RequestManagerProviderProps {
    readonly contextId: Guid;
    readonly children: ReactNode;
}

/**
 * Провайдер RequestManager для одного контекста
 *
 * ВАЖНО:
 * - Создаёт изолированный менеджер при монтировании
 * - Регистрирует менеджер в глобальном реестре
 * - Удаляет менеджер из реестра при размонтировании
 * - Это позволяет FieldChartContainer'ам получать доступ к менеджерам других контекстов
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

    // Регистрация в реестре + cleanup при unmount контекста
    useEffect(() => {
        const manager = managerRef.current;
        if (!manager) return;

        console.log(`[RequestManagerProvider] Registering manager for context: ${contextId}`);
        RequestManagerRegistry.register(contextId, manager);

        return () => {
            console.log(`[RequestManagerProvider] Unregistering and disposing manager for context: ${contextId}`);
            RequestManagerRegistry.unregister(contextId);
            manager.dispose();
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