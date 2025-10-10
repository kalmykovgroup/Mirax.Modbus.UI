// orchestration/hooks/useLocalRequestManager.ts

/*import { useEffect, useRef } from 'react';
import { useStore } from 'react-redux';
import { useAppDispatch } from '@/store/hooks';
import type { RootState } from '@/store/store';
import {RequestManager} from "@chartsPage/charts/orchestration/requests/RequestManager.ts";*/

/**
 *  ЛОКАЛЬНЫЙ ХУК: создаёт отдельный RequestManager для компонента
 *
 * Используйте только если нужна изоляция (разные стратегии prefetch).
 * В большинстве случаев используйте useRequestManager() из Context.
 *
 * Использование:
 * ```tsx
 * const manager = useLocalRequestManager();
 * manager.setPrefetchStrategy({ enabled: false });
 * ```
 */
/*
export function useLocalRequestManager(): RequestManager {
    const dispatch = useAppDispatch();
    const store = useStore<RootState>();

    const managerRef = useRef<RequestManager | null>(null);

    // Создание инстанса один раз
    if (!managerRef.current) {
        managerRef.current = new RequestManager(
            dispatch,
            () => store.getState()
        );
        console.log('[useLocalRequestManager] Local manager created');
    }

    // Cleanup при unmount компонента
    useEffect(() => {
        const manager = managerRef.current;

        return () => {
            if (manager) {
                console.log('[useLocalRequestManager] Disposing local manager');
                manager.dispose();
            }
        };
    }, []);

    // Периодическая очистка истории
    useEffect(() => {
        const manager = managerRef.current;
        if (!manager) return;

        const interval = setInterval(() => {
            manager.clearOldHistory(60000); // 1 минута
        }, 30000); // каждые 30 секунд

        return () => clearInterval(interval);
    }, []);

    return managerRef.current;
}*/
