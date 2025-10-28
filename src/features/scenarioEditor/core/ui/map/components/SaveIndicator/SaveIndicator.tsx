// src/features/scenarioEditor/core/ui/map/components/SaveIndicator/SaveIndicator.tsx

import { useSelector } from 'react-redux';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { RootState } from '@/baseStore/store';
import styles from './SaveIndicator.module.css';

export function SaveIndicator() {
    const saveInProgress = useSelector((state: RootState) => state.saveSettings.saveInProgress);
    const lastSaveTimestamp = useSelector((state: RootState) => state.saveSettings.lastSaveTimestamp);
    const lastSaveError = useSelector((state: RootState) => state.saveSettings.lastSaveError);

    // Определяем состояние
    const status = saveInProgress ? 'saving' : lastSaveError ? 'error' : 'saved';

    // Форматируем время последнего сохранения
    const formatTime = (timestamp: number | null): string => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div className={`${styles.indicator} ${styles[status]}`}>
            {status === 'saving' && (
                <>
                    <Loader2 size={16} className={styles.spinner} />
                    <span>Сохранение...</span>
                </>
            )}

            {status === 'saved' && (
                <>
                    <CheckCircle size={16} />
                    {/*<span>Сохранено</span>*/}
                    {lastSaveTimestamp && (
                        <span className={styles.time}>{formatTime(lastSaveTimestamp)}</span>
                    )}
                </>
            )}

            {status === 'error' && (
                <>
                    <AlertCircle size={16} />
                    <span>Ошибка</span>
                    {lastSaveError && (
                        <span className={styles.errorText} title={lastSaveError}>
                            {lastSaveError}
                        </span>
                    )}
                </>
            )}
        </div>
    );
}
