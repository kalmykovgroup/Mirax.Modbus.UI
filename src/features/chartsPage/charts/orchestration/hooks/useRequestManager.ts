// src/features/chartsPage/charts/orchestration/hooks/useRequestManager.ts

import { useContext } from 'react';
import type { Guid } from '@app/lib/types/Guid';
import { RequestManagerContext } from '../requests/RequestManagerContext';
import { RequestManagerRegistry } from '../requests/RequestManagerRegistry';
import type { RequestManager } from '../requests/RequestManager';

/**
 * Хук для получения текущего RequestManager из контекста
 *
 * Должен использоваться внутри RequestManagerProvider
 */
export function useRequestManager(): RequestManager {
    const manager = useContext(RequestManagerContext);

  if (!manager) {
        throw new Error(
            '[useLocalRequestManager] Must be used within RequestManagerProvider. ' +
            'Add <RequestManagerProvider> to your App component.'
        );
    }


    return manager;
}

/**
 * Хук для получения менеджера любого контекста через реестр
 *
 * Полезно для синхронизации: можно получить менеджеры других контекстов
 */
export function useRequestManagerForContext(contextId: Guid): RequestManager | undefined {
    return RequestManagerRegistry.get(contextId);
}