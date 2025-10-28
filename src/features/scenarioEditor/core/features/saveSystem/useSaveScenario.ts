// src/features/scenarioEditor/core/features/saveSystem/useSaveScenario.ts

import { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { Guid } from '@app/lib/types/Guid';
import type { RootState } from '@/baseStore/store';
import { useApplyScenarioChangesMutation } from '@scenario/shared/api/scenarioApi';
import { buildOperationsFromHistory } from './operationBuilder';
import {
    setSaveInProgress,
    setSaveSuccess,
    setSaveError,
    selectAutoSave,
} from './saveSettingsSlice';
import { markAsSynced } from '@scenario/core/features/historySystem/historySlice';
import type { ScenarioOperationDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/ScenarioOperationDto';
import { useScenarioValidation } from '@scenario/core/features/validation/useScenarioValidation';

export interface UseSaveScenarioResult {
    save: () => Promise<void>;
    operations: ScenarioOperationDto[];
    canSave: boolean;
    isSaving: boolean;
    /**
     * Опциональная функция для фокусировки на невалидной ноде
     * Устанавливается через setFocusHandler
     */
    setFocusHandler: (handler: ((nodeId: Guid) => void) | null) => void;
}

export function useSaveScenario(scenarioId: Guid | null): UseSaveScenarioResult {
    const dispatch = useDispatch();
    const autoSave = useSelector(selectAutoSave);

    // RTK Query mutation
    const [triggerSave] = useApplyScenarioChangesMutation();

    // Валидация сценария
    const validation = useScenarioValidation(scenarioId);

    // Handler для фокусировки на невалидной ноде
    const [focusHandler, setFocusHandler] = useState<((nodeId: Guid) => void) | null>(null);

    // Получаем историю из Redux
    const historyContext = useSelector((state: RootState) =>
        scenarioId ? state.history.contexts[scenarioId] : null
    );

    const saveInProgress = useSelector((state: RootState) => state.saveSettings.saveInProgress);

    // Строим операции из истории - МЕМОИЗИРУЕМ для производительности
    const operations = useMemo(() => {
        if (!historyContext) {
            return [];
        }

        const { past, future, lastSyncedIndex } = historyContext;

        console.log('[useSaveScenario] Building operations:', {
            pastLength: past.length,
            futureLength: future.length,
            lastSyncedIndex,
        });

        // Если нет несохраненных операций и не было Undo
        if (past.length === 0 && lastSyncedIndex === 0) {
            return [];
        }

        const ops = buildOperationsFromHistory(past, lastSyncedIndex, future);
        console.log('[useSaveScenario] Operations built:', ops.length);
        return ops;
    }, [historyContext?.past, historyContext?.lastSyncedIndex, historyContext?.future]);

    // ✅ ВАЛИДАЦИЯ: canSave теперь учитывает валидность всех нод
    const canSave = operations.length > 0 && !saveInProgress && scenarioId !== null && validation.canSave;

    // Функция сохранения
    const save = useCallback(async () => {
        if (!scenarioId) {
            console.warn('[useSaveScenario] Cannot save: no scenarioId');
            return;
        }

        if (operations.length === 0) {
            console.log('[useSaveScenario] Nothing to save');
            return;
        }

        if (saveInProgress) {
            console.log('[useSaveScenario] Save already in progress');
            return;
        }

        // ✅ ВАЛИДАЦИЯ: Проверяем валидность нод перед сохранением
        if (validation.hasInvalidNodes) {
            console.warn('[useSaveScenario] Cannot save: scenario has invalid nodes', validation.invalidNodes);

            // Формируем понятное сообщение об ошибке
            const errorMessages = validation.invalidNodes.map(node =>
                `"${node.nodeName}" (${node.nodeType}): ${node.errors.join(', ')}`
            );
            const fullError = `Невозможно сохранить: есть невалидные ноды (${validation.invalidNodes.length}):\n${errorMessages.join('\n')}`;

            dispatch(setSaveError(fullError));

            // ✅ ФОКУСИРОВКА: Фокусируемся на первой невалидной ноде
            if (focusHandler && validation.invalidNodes.length > 0) {
                const firstInvalidNode = validation.invalidNodes[0];
                console.log('[useSaveScenario] Focusing on invalid node:', firstInvalidNode.nodeId);
                focusHandler(firstInvalidNode.nodeId);
            }

            return;
        }

        console.log('[useSaveScenario] Starting save:', operations.length, 'operations');

        dispatch(setSaveInProgress(true));

        try {
            const result = await triggerSave({ scenarioId, operations }).unwrap();

            console.log('[useSaveScenario] Save response received:', result);

            // Проверяем, есть ли failed операции в результате
            const failedOps = result.results.filter(r => !r.result.success);

            if (failedOps.length > 0) {
                console.error('[useSaveScenario] Some operations failed:', failedOps);

                // Формируем детальное сообщение об ошибке
                const errorMessages = failedOps.map(op =>
                    `${op.entity} ${op.action} (${op.opId}): ${op.result.errorMessage || 'Unknown error'}`
                );

                const fullError = `Failed operations (${failedOps.length}/${result.results.length}):\n${errorMessages.join('\n')}`;

                dispatch(setSaveError(fullError));

                // Не очищаем историю, если были ошибки
                console.warn('[useSaveScenario] History not cleared due to failed operations');
            } else {
                console.log('[useSaveScenario] All operations successful');
                dispatch(setSaveSuccess(Date.now()));

                // Помечаем все текущие операции как синхронизированные с сервером
                // История НЕ очищается, чтобы можно было делать Undo
                dispatch(markAsSynced({ contextId: scenarioId }));
            }
        } catch (err: any) {
            const errorMessage = err?.data?.message || err?.message || 'Unknown error';
            console.error('[useSaveScenario] Save request failed:', errorMessage, err);
            dispatch(setSaveError(errorMessage));
        } finally {
            dispatch(setSaveInProgress(false));
        }
    }, [scenarioId, operations, saveInProgress, dispatch, triggerSave, validation]);

    // Автосохранение с debounce
    const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const historySize = historyContext?.past.length || 0;

    useEffect(() => {
        // Очищаем предыдущий таймер
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
        }

        // Если автосохранение выключено или нечего сохранять - не запускаем таймер
        if (!autoSave || historySize === 0 || !scenarioId || operations.length === 0) {
            return;
        }

        // Запускаем таймер на 3 секунды
        console.log('[useSaveScenario] Auto-save timer started (3s)');
        saveTimerRef.current = setTimeout(() => {
            console.log('[useSaveScenario] Auto-save triggered');
            save();
        }, 3000);

        // Cleanup
        return () => {
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
                saveTimerRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [historySize, autoSave, scenarioId]); // save не добавляем в deps чтобы избежать циклических пересозданий таймера

    return {
        save,
        operations,
        canSave,
        isSaving: saveInProgress,
        setFocusHandler: useCallback((handler: ((nodeId: Guid) => void) | null) => {
            setFocusHandler(() => handler);
        }, []),
    };
}
