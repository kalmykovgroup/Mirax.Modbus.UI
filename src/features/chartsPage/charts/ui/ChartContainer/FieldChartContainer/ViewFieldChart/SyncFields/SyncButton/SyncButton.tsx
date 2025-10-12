// src/features/chartsPage/charts/ui/ChartContainer/FieldChartContainer/ViewFieldChart/SyncFields/SyncButton/SyncButton.tsx

import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/store/hooks';
import type { RootState } from '@/store/store';
import {
    selectActiveTabId,
    selectTabSyncEnabled,
    selectTabSyncFieldsCount,
    toggleTabSync,
} from '@chartsPage/charts/core/store/tabsSlice';
import styles from './SyncButton.module.css';

/**
 * Кнопка включения/отключения синхронизации зума для всей вкладки
 * Теперь работает на уровне вкладки, а не контекста
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

    // Количество синхронизированных полей
    const syncFieldsCount = useSelector((state: RootState) => {
        if (!activeTabId) return 0;
        return selectTabSyncFieldsCount(state, activeTabId);
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
            {syncEnabled && syncFieldsCount > 0 && (
                <span className={styles.badge}>{syncFieldsCount}</span>
            )}
        </button>
    );
}