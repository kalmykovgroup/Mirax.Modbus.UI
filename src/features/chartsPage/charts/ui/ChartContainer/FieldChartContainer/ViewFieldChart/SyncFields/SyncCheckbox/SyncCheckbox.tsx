// @chartsPage/charts/ui/ChartContainer/FieldChartContainer/ChartHeader/SyncCheckbox/SyncCheckbox.tsx

import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/store/hooks';
import { addSyncField, removeSyncField } from '@chartsPage/charts/core/store/chartsSlice';
import type { RootState } from '@/store/store';
import styles from './SyncCheckbox.module.css';

interface SyncCheckboxProps {
    readonly fieldName: string;
}

export function SyncCheckbox({ fieldName }: SyncCheckboxProps) {
    const dispatch = useAppDispatch();

    const syncEnabled = useSelector((state: RootState) => state.charts.syncEnabled);
    const syncFields = useSelector((state: RootState) => state.charts.syncFields);
    const template = useSelector((state: RootState) => state.charts.template);

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
            dispatch(addSyncField(fieldDto));
        } else {
            dispatch(removeSyncField(fieldName));
        }
    }, [dispatch, fieldDto, fieldName]);

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