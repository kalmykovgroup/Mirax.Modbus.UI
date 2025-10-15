// src/features/chartsPage/charts/ui/ChartContainer/FieldChartContainer/ViewFieldChart/SyncFields/SyncButton/SyncButton.tsx

import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/baseStore/hooks.ts';
import type { RootState } from '@/baseStore/store.ts';
import {
    selectActiveTabId,
    selectTabSyncContextsCount,
    selectTabSyncEnabled,
} from '@chartsPage/charts/core/store/tabsSlice';
import styles from './SyncButton.module.css';
import {toggleTabSyncWithAutoFill} from "@chartsPage/charts/orchestration/thunks/syncAutoFillThunk.ts";

/**
 * Кнопка включения/отключения синхронизации зума для всей вкладки
 * Показывает количество контекстов (шаблонов), участвующих в синхронизации
 */
export function SyncButton() {
    const dispatch = useAppDispatch();

    // Получаем активную вкладку
    const activeTabId = useSelector(selectActiveTabId);

    // Состояние синхронизации текущей вкладки
    const syncEnabled = useSelector((state: RootState) => {
        if (!activeTabId) return false;
        return selectTabSyncEnabled(state, activeTabId);
    });

    // Количество контекстов в синхронизации
    const syncContextsCount = useSelector((state: RootState) => {
        if (!activeTabId) return 0;
        return selectTabSyncContextsCount(state, activeTabId);
    });

    const handleToggle = useCallback(() => {
        if (!activeTabId) {
            console.warn('[SyncButton] No active tab');
            return;
        }

        void dispatch(toggleTabSyncWithAutoFill(activeTabId));
    }, [dispatch, activeTabId]);

    // Если нет активной вкладки - не показываем кнопку
    if (!activeTabId) {
        return null;
    }

    return (
        <button
            type="button"
            className={`${styles.syncButton} ${syncEnabled ? styles.active : ''}`}
            onClick={handleToggle}
            title={
                syncEnabled
                    ? 'Отключить синхронизацию зума (для всех шаблонов)'
                    : 'Включить синхронизацию зума (для всех шаблонов)'
            }
        >
            <span className={styles.icon}>{syncEnabled ? '🔗' : '⛓️‍💥'}</span>
            <span className={styles.label}>Синхронизация зума</span>
            {syncEnabled && syncContextsCount > 0 && (
                <span className={styles.badge} title={`${syncContextsCount} шаблонов`}>
                    {syncContextsCount}
                </span>
            )}
        </button>
    );
}