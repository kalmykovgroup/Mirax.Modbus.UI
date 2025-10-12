// src/features/chartsPage/charts/ui/ChartContainer/FieldChartContainer/ViewFieldChart/SyncFields/SyncCheckbox/SyncCheckbox.tsx

import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/store/hooks';
import type { RootState } from '@/store/store';
import type { Guid } from '@app/lib/types/Guid';
import {
    addContextSyncField,
    removeContextSyncField,
} from '@chartsPage/charts/core/store/chartsSlice';
import {
    addSyncContext,
    removeSyncContext,
    selectActiveTabId,
    selectTabSyncEnabled,
} from '@chartsPage/charts/core/store/tabsSlice';
import {
    selectContextSyncFields,
    selectIsContextFieldSynced,
    selectTemplate,
} from '@chartsPage/charts/core/store/selectors/base.selectors';
import styles from './SyncCheckbox.module.css';

interface SyncCheckboxProps {
    readonly contextId: Guid;
    readonly fieldName: string;
}

/**
 * Чекбокс для добавления/удаления поля в синхронизацию
 *
 * ДВУХУРОВНЕВАЯ СИНХРОНИЗАЦИЯ:
 * 1. Управляет ContextState.syncFields (какие поля контекста синхронизированы)
 * 2. Управляет TabInfo.syncContextIds (какие контексты вкладки синхронизированы)
 *
 * Логика:
 * - При добавлении первого поля -> добавляем контекст в TabInfo.syncContextIds
 * - При удалении последнего поля -> удаляем контекст из TabInfo.syncContextIds
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

    // Получаем шаблон для поиска FieldDto
    const template = useSelector((state: RootState) => selectTemplate(state, contextId));

    // Получаем текущие синхронизированные поля контекста
    const contextSyncFields = useSelector((state: RootState) =>
        selectContextSyncFields(state, contextId)
    );

    // Проверяем, выбрано ли это поле для синхронизации
    const isChecked = useSelector((state: RootState) =>
        selectIsContextFieldSynced(state, contextId, fieldName)
    );

    // Находим FieldDto для текущего поля
    const fieldDto = useMemo(() => {
        return template?.selectedFields.find((f) => f.name === fieldName);
    }, [template?.selectedFields, fieldName]);

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (!activeTabId) {
                console.warn('[SyncCheckbox] No active tab');
                return;
            }

            if (!fieldDto) {
                console.error('[SyncCheckbox] FieldDto not found for:', fieldName);
                return;
            }

            if (e.target.checked) {
                // ========== ДОБАВЛЕНИЕ ПОЛЯ ==========

                // 1. Добавляем поле в syncFields контекста
                dispatch(
                    addContextSyncField({
                        contextId,
                        field: fieldDto,
                    })
                );

                // 2. Если это первое поле контекста - добавляем контекст в Tab
                const isFirstField = contextSyncFields.length === 0;
                if (isFirstField) {
                    dispatch(
                        addSyncContext({
                            tabId: activeTabId,
                            contextId,
                        })
                    );
                    console.log(
                        '[SyncCheckbox] Added first field, context added to tab sync:',
                        contextId
                    );
                }
            } else {
                // ========== УДАЛЕНИЕ ПОЛЯ ==========

                // 1. Удаляем поле из syncFields контекста
                dispatch(
                    removeContextSyncField({
                        contextId,
                        fieldName,
                    })
                );

                // 2. Если это было последнее поле - удаляем контекст из Tab
                const isLastField = contextSyncFields.length === 1;
                if (isLastField) {
                    dispatch(
                        removeSyncContext({
                            tabId: activeTabId,
                            contextId,
                        })
                    );
                    console.log(
                        '[SyncCheckbox] Removed last field, context removed from tab sync:',
                        contextId
                    );
                }
            }
        },
        [dispatch, activeTabId, contextId, fieldName, fieldDto, contextSyncFields.length]
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