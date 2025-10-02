import {useAppDispatch} from "@/store/hooks.ts";
import {useStore} from "react-redux";
import type {RootState} from "@/store/store.ts";
import {RequestManager} from "@chartsPage/charts/orchestration/requests/RequestManager.ts";
import {type ReactNode, useEffect, useRef} from "react";
import { RequestManagerContext } from "./RequestManagerContext";

interface RequestManagerProviderProps {
    readonly children: ReactNode;
}

/**
 * Провайдер глобального RequestManager
 * Добавить в корень приложения (App.tsx)
 */
export function RequestManagerProvider({ children }: RequestManagerProviderProps) {
    const dispatch = useAppDispatch();
    const store = useStore<RootState>();

    const managerRef = useRef<RequestManager | null>(null);

    if (!managerRef.current) {
        managerRef.current = new RequestManager(
            dispatch,
            () => store.getState()
        );
        console.log('[RequestManagerProvider] Manager created');
    }

    // Cleanup при unmount приложения
    useEffect(() => {
        const manager = managerRef.current;

        return () => {
            if (manager) {
                console.log('[RequestManagerProvider] Disposing global manager');
                manager.dispose();
            }
        };
    }, []);

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