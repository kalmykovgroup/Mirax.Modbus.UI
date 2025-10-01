// components/chart/ChartControls/ChartControls.tsx
// Элементы управления графиком

import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store/store';

import {
    selectSyncEnabled,
    selectSyncFields,
    selectTemplate
} from '@charts/charts/core/store/selectors/base.selectors';
import styles from './ChartControls.module.css';
import {addSyncField, removeSyncField, toggleSync} from "@charts/charts/core/store/chartsSlice.ts";

// ============================================
// ТИПЫ
// ============================================

interface ChartControlsProps {
    readonly fieldName: string;
    readonly onResetZoom?: (() => void) | undefined;
}

// ============================================
// КОМПОНЕНТ
// ============================================

export function ChartControls({
                                  fieldName,
                                  onResetZoom
                              }: ChartControlsProps) {
    const dispatch = useDispatch<AppDispatch>();

    const syncEnabled = useSelector((state: RootState) =>
        selectSyncEnabled(state)
    );
    const syncFields = useSelector((state: RootState) =>
        selectSyncFields(state)
    );
    const template = useSelector((state: RootState) =>
        selectTemplate(state)
    );

    // Проверка: включено ли поле в sync
    const isFieldSynced = syncFields.some(f => f.name === fieldName);

    /**
     * Toggle sync для текущего поля
     */
    const handleToggleFieldSync = useCallback(() => {
        if (!template) return;

        const field = template.selectedFields.find(f => f.name === fieldName);
        if (!field) return;

        if (isFieldSynced) {
            dispatch(removeSyncField(fieldName));
        } else {
            dispatch(addSyncField(field));
        }
    }, [dispatch, fieldName, isFieldSynced, template]);

    /**
     * Toggle глобального sync
     */
    const handleToggleGlobalSync = useCallback(() => {
        dispatch(toggleSync());
    }, [dispatch]);

    return (
        <div className={styles.controls}>
            {/* Reset Zoom */}
            {onResetZoom && (
                <button
                    className={styles.button}
                    onClick={onResetZoom}
                    title="Сбросить масштаб"
                >
                    🔄 Reset
                </button>
            )}

            {/* Field Sync */}
            <button
                className={styles.button}
                data-active={isFieldSynced}
                onClick={handleToggleFieldSync}
                title={isFieldSynced ? 'Убрать из синхронизации' : 'Добавить в синхронизацию'}
            >
                🔗 {isFieldSynced ? 'Synced' : 'Sync'}
            </button>

            {/* Global Sync Toggle */}
            <button
                className={styles.button}
                data-active={syncEnabled}
                onClick={handleToggleGlobalSync}
                title={syncEnabled ? 'Отключить синхронизацию' : 'Включить синхронизацию'}
            >
                {syncEnabled ? '🔓' : '🔒'} Global Sync
            </button>

            {/* Sync Fields Count */}
            {syncFields.length > 0 && (
                <span className={styles.badge}>
                    {syncFields.length} synced
                </span>
            )}
        </div>
    );
}