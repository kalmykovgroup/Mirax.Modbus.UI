// src/features/scenarioEditor/core/ui/map/components/SaveIndicator/SaveIndicator.tsx

import { useSelector } from 'react-redux';
import { CheckCircle, AlertCircle, Loader2, Clock } from 'lucide-react';
import type { RootState } from '@/baseStore/store';
import { selectActiveScenarioId } from '@scenario/store/scenarioSelectors';
import { useMemo } from 'react';
import { buildOperationsFromHistory } from '@scenario/core/features/saveSystem/operationBuilder';
import styles from './SaveIndicator.module.css';

export function SaveIndicator() {
    const saveInProgress = useSelector((state: RootState) => state.saveSettings.saveInProgress);
    const lastSaveTimestamp = useSelector((state: RootState) => state.saveSettings.lastSaveTimestamp);
    const lastSaveError = useSelector((state: RootState) => state.saveSettings.lastSaveError);

    // Получаем активный сценарий
    const activeScenarioId = useSelector(selectActiveScenarioId);

    // Получаем историю для проверки несохраненных изменений
    const historyContext = useSelector((state: RootState) =>
        activeScenarioId ? state.history.contexts[activeScenarioId] : null
    );

    // Проверяем, есть ли несохраненные изменения
    const hasUnsavedChanges = useMemo(() => {
        if (!historyContext) return false;

        const { past, future, lastSyncedIndex } = historyContext;

        // Строим операции чтобы понять есть ли что сохранять
        const operations = buildOperationsFromHistory(past, lastSyncedIndex, future);

        return operations.length > 0;
    }, [historyContext]);

    // Определяем состояние
    // Приоритет: saving > error > unsaved > saved
    const status = saveInProgress
        ? 'saving'
        : lastSaveError
            ? 'error'
            : hasUnsavedChanges
                ? 'unsaved'
                : 'saved';

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

            {status === 'unsaved' && (
                <>
                    <Clock size={16} />
                    <span>Есть изменения</span>
                </>
            )}

            {status === 'saved' && (
                <>
                    <CheckCircle size={16} />
                    <span>Синхронизировано</span>
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
