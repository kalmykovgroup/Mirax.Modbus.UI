// src/features/history/useHistory.ts

import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/baseStore/store';

import type { Entity } from './types';
import type { HistoryConfig } from './types';
import {
    cancelBatch, clearHistory,
    commitBatch, initializeContext, recordCreate, recordDelete,
    recordUpdate,
    redoThunk,
    startBatch,
    undoThunk
} from "@scenario/core/features/historySystem/historySlice.ts";

export interface UseHistoryOptions {
    readonly autoInit?: boolean | undefined;
    readonly config?: Partial<HistoryConfig> | undefined;
}

export interface UseHistoryResult {
    readonly canUndo: boolean;
    readonly canRedo: boolean;
    readonly historySize: number;
    readonly lastCommand: any;
    readonly undo: () => void;
    readonly redo: () => void;
    readonly recordCreate: <T extends Entity>(entity: T) => void;
    readonly recordUpdate: <T extends Entity>(newEntity: T, previousEntity: T) => void;
    readonly recordDelete: <T extends Entity>(entity: T) => void;
    readonly startBatch: () => void;
    readonly commitBatch: (description?: string) => void;
    readonly cancelBatch: () => void;
    readonly clear: () => void;
}

const DEFAULT_CONFIG: HistoryConfig = {
    maxHistorySize: 100,
    enableBatching: true,
    batchTimeout: 1000,
    contextId: '',
};

export function useHistory(
    contextId: string,
    options: UseHistoryOptions = {}
): UseHistoryResult {
    const dispatch = useDispatch<AppDispatch>();

    const { autoInit = false, config: configOverride } = options;

    const config = useMemo(
        () => ({
            ...DEFAULT_CONFIG,
            ...configOverride,
            contextId,
        }),
        [contextId, configOverride]
    );

    // Инициализация контекста
    useEffect(() => {
        if (autoInit) {
            dispatch(initializeContext({ contextId, config }));
        }
    }, [dispatch, autoInit, contextId, config]);

    // ⚡ ИСПРАВЛЕНО: Правильные селекторы
    const context = useSelector((state: RootState) => state.history.contexts[contextId]);

    const canUndo = useMemo(() => {
        if (!context) return false;
        return context.past.length > 0;
    }, [context]);

    const canRedo = useMemo(() => {
        if (!context) return false;
        return context.future.length > 0;
    }, [context]);

    const historySize = useMemo(() => {
        if (!context) return 0;
        return context.past.length;
    }, [context]);

    const lastCommand = useMemo(() => {
        if (!context || context.past.length === 0) return null;
        return context.past[context.past.length - 1];
    }, [context]);

    // Actions
    const handleUndo = useCallback(() => {
        console.log('[useHistory] Undo called, canUndo:', canUndo);
        if (canUndo) {
            dispatch(undoThunk({ contextId }));
        }
    }, [dispatch, contextId, canUndo]);

    const handleRedo = useCallback(() => {
        console.log('[useHistory] Redo called, canRedo:', canRedo);
        if (canRedo) {
            dispatch(redoThunk({ contextId }));
        }
    }, [dispatch, contextId, canRedo]);


    const handleRecordCreate = useCallback(
        <T extends Entity>(entity: T) => {
            console.log('[useHistory] Recording create:', entity.id);
            dispatch(recordCreate({ contextId, entity }));
        },
        [dispatch, contextId]
    );

    const handleRecordUpdate = useCallback(
        <T extends Entity>(newEntity: T, previousEntity: T) => {
            console.log('[useHistory] Recording update:', newEntity.id);
            dispatch(recordUpdate({ contextId, newEntity, previousEntity }));
        },
        [dispatch, contextId]
    );

    const handleRecordDelete = useCallback(
        <T extends Entity>(entity: T) => {
            console.log('[useHistory] Recording delete:', entity.id);
            dispatch(recordDelete({ contextId, entity }));
        },
        [dispatch, contextId]
    );

    const handleStartBatch = useCallback(() => {
        console.log('[useHistory] Starting batch');
        dispatch(startBatch({ contextId }));
    }, [dispatch, contextId]);

    const handleCommitBatch = useCallback(
        (description?: string) => {
            console.log('[useHistory] Committing batch:', description);
            dispatch(commitBatch({ contextId, description }));
        },
        [dispatch, contextId]
    );

    const handleCancelBatch = useCallback(() => {
        console.log('[useHistory] Cancelling batch');
        dispatch(cancelBatch({ contextId }));
    }, [dispatch, contextId]);

    const handleClear = useCallback(() => {
        console.log('[useHistory] Clearing history');
        dispatch(clearHistory({ contextId }));
    }, [dispatch, contextId]);

    return {
        canUndo,
        canRedo,
        historySize,
        lastCommand,
        undo: handleUndo,
        redo: handleRedo,
        recordCreate: handleRecordCreate,
        recordUpdate: handleRecordUpdate,
        recordDelete: handleRecordDelete,
        startBatch: handleStartBatch,
        commitBatch: handleCommitBatch,
        cancelBatch: handleCancelBatch,
        clear: handleClear,
    };
}