// src/features/scenarioEditor/core/features/saveSystem/useSaveScenario.ts

import { useCallback, useEffect, useRef } from 'react';
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
import { clearHistory } from '@scenario/core/features/historySystem/historySlice';
import type { ScenarioOperationDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/ScenarioOperationDto';

export interface UseSaveScenarioResult {
    save: () => Promise<void>;
    operations: ScenarioOperationDto[];
    canSave: boolean;
    isSaving: boolean;
}

export function useSaveScenario(scenarioId: Guid | null): UseSaveScenarioResult {
    const dispatch = useDispatch();
    const autoSave = useSelector(selectAutoSave);

    // RTK Query mutation
    const [triggerSave] = useApplyScenarioChangesMutation();

    // Получаем историю из Redux
    const historyContext = useSelector((state: RootState) =>
        scenarioId ? state.history.contexts[scenarioId] : null
    );

    const saveInProgress = useSelector((state: RootState) => state.saveSettings.saveInProgress);

    // Строим операции из истории
    const operations = historyContext ? buildOperationsFromHistory(historyContext.past) : [];

    const canSave = operations.length > 0 && !saveInProgress && scenarioId !== null;

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

        console.log('[useSaveScenario] Starting save:', operations.length, 'operations');

        dispatch(setSaveInProgress(true));

        try {
            const result = await triggerSave({ scenarioId, operations }).unwrap();

            console.log('[useSaveScenario] Save successful:', result);

            dispatch(setSaveSuccess(Date.now()));

            // Очищаем историю после успешного сохранения
            dispatch(clearHistory({ contextId: scenarioId }));
        } catch (err: any) {
            const errorMessage = err?.data?.message || err?.message || 'Unknown error';
            console.error('[useSaveScenario] Save failed:', errorMessage, err);
            dispatch(setSaveError(errorMessage));
        } finally {
            dispatch(setSaveInProgress(false));
        }
    }, [scenarioId, operations, saveInProgress, dispatch, triggerSave]);

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
    };
}
