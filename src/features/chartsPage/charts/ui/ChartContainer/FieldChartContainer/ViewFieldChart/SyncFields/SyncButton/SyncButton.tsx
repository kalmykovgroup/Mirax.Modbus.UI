// @chartsPage/charts/ui/SyncButton/SyncButton.tsx

import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/store/hooks';
import { toggleSync } from '@chartsPage/charts/core/store/chartsSlice';
import type { RootState } from '@/store/store';
import styles from './SyncButton.module.css';
import type {Guid} from "@app/lib/types/Guid.ts";
import {selectSyncEnabled, selectSyncFields} from "@chartsPage/charts/core/store/selectors/base.selectors.ts";

interface SyncButtonProps {
    readonly contextId: Guid;
}


export function SyncButton({ contextId }: SyncButtonProps) {
    const dispatch = useAppDispatch();

    // ТОЛЬКО добавили contextId в селекторы
    const syncEnabled = useSelector((state: RootState) =>
        selectSyncEnabled(state, contextId)
    );

    const syncFields = useSelector((state: RootState) =>
        selectSyncFields(state, contextId)
    );

    const handleToggle = useCallback(() => {
        dispatch(toggleSync(contextId)); // ← добавили contextId
    }, [dispatch, contextId]);

    // Рендер БЕЗ ИЗМЕНЕНИЙ
    return (
        <button
            type="button"
            className={`${styles.syncButton} ${syncEnabled ? styles.active : ''}`}
            onClick={handleToggle}
            title={syncEnabled ? 'Отключить синхронизацию зума' : 'Включить синхронизацию зума'}
        >
            <span className={styles.icon}>
                {syncEnabled ? '🔗' : '⛓️‍💥'}
            </span>
            <span className={styles.label}>
                Синхронизация зума
            </span>
            {syncEnabled && syncFields.length > 0 && (
                <span className={styles.badge}>
                    {syncFields.length}
                </span>
            )}
        </button>
    );
}