// @chartsPage/charts/ui/ChartContainer/FieldChartContainer/ChartHeader/SyncCheckbox/SyncCheckbox.tsx

import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/store/hooks';
import { addSyncField, removeSyncField } from '@chartsPage/charts/core/store/chartsSlice';
import type { RootState } from '@/store/store';
import styles from './SyncCheckbox.module.css';
import type {Guid} from "@app/lib/types/Guid.ts";
import {
    selectSyncEnabled,
    selectSyncFields,
    selectTemplate
} from "@chartsPage/charts/core/store/selectors/base.selectors.ts";

interface SyncCheckboxProps {
    readonly tabId: Guid; // ← ТОЛЬКО ДОБАВИЛИ
    readonly fieldName: string;
}

export function SyncCheckbox({ fieldName, tabId }: SyncCheckboxProps) {
    const dispatch = useAppDispatch();

    const syncEnabled = useSelector((state: RootState) =>
        selectSyncEnabled(state, tabId)
    );

    const syncFields = useSelector((state: RootState) =>
        selectSyncFields(state, tabId)
    );

    const template = useSelector((state: RootState) =>
        selectTemplate(state, tabId)
    );

    // Находим FieldDto для текущего поля
    const fieldDto = useMemo(() => {
        return template?.selectedFields.find(f => f.name === fieldName);
    }, [template?.selectedFields, fieldName]);

    // Проверяем, выбрано ли поле для синхронизации
    const isChecked = useMemo(() => {
        return syncFields.some(f => f.name === fieldName);
    }, [syncFields, fieldName]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (!fieldDto) {
            console.error('[SyncCheckbox] FieldDto not found for:', fieldName);
            return;
        }

        if (e.target.checked) {
            dispatch(addSyncField({ tabId, field: fieldDto })); // ← добавили tabId
        } else {
            dispatch(removeSyncField({ tabId, fieldName })); // ← добавили tabId
        }
    }, [dispatch, fieldDto, fieldName, tabId]);

    // Не показываем чекбокс если синхронизация выключена
    if (!syncEnabled) {
        return null;
    }

    return (
        <label className={styles.syncCheckbox} title="Синхронизировать зум с другими графиками">
            <input
                type="checkbox"
                checked={isChecked}
                onChange={handleChange}
                className={styles.checkbox}
            />
            <span className={styles.label}>
                Синхронизация
            </span>
        </label>
    );
}