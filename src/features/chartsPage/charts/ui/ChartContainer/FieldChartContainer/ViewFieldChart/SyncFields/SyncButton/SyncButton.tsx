// src/features/chartsPage/charts/ui/ChartContainer/FieldChartContainer/ViewFieldChart/SyncFields/SyncButton/SyncButton.tsx

import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/store/hooks';
import type { RootState } from '@/store/store';
import {
    selectActiveTabId,
    selectTabSyncContextsCount,
    selectTabSyncEnabled,
    toggleTabSync,
} from '@chartsPage/charts/core/store/tabsSlice';
import styles from './SyncButton.module.css';

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

        dispatch(toggleTabSync(activeTabId));
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