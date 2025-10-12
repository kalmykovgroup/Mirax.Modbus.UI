// src/features/chartsPage/charts/ui/ChartContainer/FieldChartContainer/ViewFieldChart/SyncFields/SyncCheckbox/SyncCheckbox.tsx

import { useCallback} from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/store/hooks';
import type { RootState } from '@/store/store';
import type { Guid } from '@app/lib/types/Guid';
import styles from './SyncCheckbox.module.css';
import {
    addTabSyncField,
    removeTabSyncField,
    selectActiveTabId,
    selectTabSyncEnabled
} from "@chartsPage/charts/core/store/tabsSlice.ts";
import {selectIsTabFieldSynced} from "@chartsPage/charts/core/store/tabsSelectors.ts";

interface SyncCheckboxProps {
    readonly contextId: Guid;
    readonly fieldName: string;
}

/**
 * Чекбокс для добавления/удаления поля в синхронизацию на уровне вкладки
 * Теперь работает с общей синхронизацией всех шаблонов текущей вкладки
 */
export function SyncCheckbox({ fieldName, contextId }: SyncCheckboxProps) {
    const dispatch = useAppDispatch();

    // Получаем активную вкладку
    const activeTabId = useSelector(selectActiveTabId);

    // Проверяем, включена ли синхронизация
    const syncEnabled = useSelector((state: RootState) => {
        if (!activeTabId) return false;
        return selectTabSyncEnabled(state, activeTabId);
    });

    // Проверяем, выбрано ли поле для синхронизации
    const isChecked = useSelector((state: RootState) => {
        if (!activeTabId) return false;
        return selectIsTabFieldSynced(state, activeTabId, contextId, fieldName);
    });

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (!activeTabId) {
                console.warn('[SyncCheckbox] No active tab');
                return;
            }

            if (e.target.checked) {
                dispatch(
                    addTabSyncField({
                        tabId: activeTabId,
                        contextId,
                        fieldName,
                    })
                );
            } else {
                dispatch(
                    removeTabSyncField({
                        tabId: activeTabId,
                        contextId,
                        fieldName,
                    })
                );
            }
        },
        [dispatch, activeTabId, contextId, fieldName]
    );

    // Не показываем чекбокс если синхронизация выключена или нет активной вкладки
    if (!syncEnabled || !activeTabId) {
        return null;
    }

    return (
        <label
            className={styles.syncCheckbox}
            title="Синхронизировать зум с другими графиками"
        >
            <input
                type="checkbox"
                checked={isChecked}
                onChange={handleChange}
                className={styles.checkbox}
            />
            <span className={styles.label}>Синхронизация</span>
        </label>
    );
}