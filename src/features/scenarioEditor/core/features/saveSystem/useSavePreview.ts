// src/features/scenarioEditor/core/features/saveSystem/useSavePreview.ts

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { Guid } from '@app/lib/types/Guid';
import type { RootState } from '@/baseStore/store';
import { buildOperationsFromHistory } from './operationBuilder';
import { buildOperationsDiff, type OperationDiff } from './operationDiffBuilder';

export interface UseSavePreviewResult {
    /** Список всех изменений с diff */
    changes: OperationDiff[];
    /** Общее количество изменений */
    changesCount: number;
    /** Есть ли несохраненные изменения */
    hasChanges: boolean;
}

/**
 * Хук для получения предпросмотра изменений перед сохранением
 */
export function useSavePreview(scenarioId: Guid | null): UseSavePreviewResult {
    // Получаем историю из Redux
    const historyContext = useSelector((state: RootState) =>
        scenarioId ? state.history.contexts[scenarioId] : null
    );

    // Вычисляем changes только когда меняется история
    const changes = useMemo(() => {
        if (!historyContext) {
            return [];
        }

        const { past, future, lastSyncedIndex } = historyContext;

        // Если нет несохраненных операций
        if (past.length === 0 && lastSyncedIndex === 0) {
            return [];
        }

        // Строим операции для сервера
        const operations = buildOperationsFromHistory(past, lastSyncedIndex, future);

        if (operations.length === 0) {
            return [];
        }

        // Строим diff для каждой операции
        const diffs = buildOperationsDiff(operations, past, lastSyncedIndex);

        return diffs;
    }, [historyContext?.past, historyContext?.lastSyncedIndex, historyContext?.future]);

    return {
        changes,
        changesCount: changes.length,
        hasChanges: changes.length > 0,
    };
}
