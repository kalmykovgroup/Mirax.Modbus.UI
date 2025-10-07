// @chartsPage/charts/ui/SyncButton/SyncButton.tsx

import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/store/hooks';
import { toggleSync } from '@chartsPage/charts/core/store/chartsSlice';
import type { RootState } from '@/store/store';
import styles from './SyncButton.module.css';

export function SyncButton() {
    const dispatch = useAppDispatch();
    const syncEnabled = useSelector((state: RootState) => state.charts.syncEnabled);
    const syncFields = useSelector((state: RootState) => state.charts.syncFields);

    const handleToggle = useCallback(() => {
        dispatch(toggleSync());
    }, [dispatch]);

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