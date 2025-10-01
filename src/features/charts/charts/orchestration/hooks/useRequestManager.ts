import type {RequestManager} from "@charts/charts/orchestration/requests/RequestManager.ts";
import {useContext} from "react";
import {RequestManagerContext} from "@charts/charts/orchestration/requests/RequestManagerContext.tsx";

/**
 * ✅ ОСНОВНОЙ ХУК: получить глобальный RequestManager из Context
 *
 * Использование:
 * ```tsx
 * const manager = useLocalRequestManager();
 * await manager.loadVisibleRange('field1');
 * ```
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