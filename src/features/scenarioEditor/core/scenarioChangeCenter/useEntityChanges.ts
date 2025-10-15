/**
 * ФАЙЛ: src/store/changes/useEntityChanges.ts
 *
 * Универсальный хук для работы с изменениями любых сущностей
 */

import { useCallback, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/baseStore/store.ts';
import type { Entity, EntityChange, ChangeVisual } from '@scenario/core/scenarioChangeCenter/types';
import { toVisuals } from '@scenario/core/scenarioChangeCenter/optimizer';
import {
    addChange,
    clearContext,
    removeChange,
    selectChangesCount,
    selectContextChangesArray,
    selectHasChanges,
    selectContextChanges,
} from '@scenario/store/scenarioChangesSlice';

export interface UseEntityChangesOptions {
    readonly contextId: string;
    readonly entityType: string;
}

export interface UseEntityChangesReturn<T extends Entity> {
    readonly changes: readonly EntityChange<T>[];
    readonly visualChanges: readonly ChangeVisual<T>[];
    readonly hasChanges: boolean;
    readonly changesCount: number;
    readonly trackCreate: (entity: T) => void;
    readonly trackUpdate: (original: T, updated: T) => void;
    readonly trackDelete: (entity: T) => void;
    readonly clearChanges: () => void;
    readonly removeChangeByKey: (key: string) => void;
}

/**
 * Универсальный хук для отслеживания изменений сущностей
 */
export function useEntityChanges<T extends Entity>({
                                                       contextId,
                                                       entityType,
                                                   }: UseEntityChangesOptions): UseEntityChangesReturn<T> {
    const dispatch = useDispatch<AppDispatch>();

    // 🔍 ОТЛАДКА: Проверяем весь контекст
    const fullContext = useSelector((state: RootState) =>
        selectContextChanges(contextId)(state)
    );

    // Селекторы
    const changes = useSelector((state: RootState) =>
        selectContextChangesArray(contextId)(state)
    ) as readonly EntityChange<T>[];

    const hasChanges = useSelector((state: RootState) =>
        selectHasChanges(contextId)(state)
    );

    const changesCount = useSelector((state: RootState) =>
        selectChangesCount(contextId)(state)
    );

    // 🔍 ОТЛАДКА: Логируем всё, что получили из селекторов
    useEffect(() => {
        console.log(`🔍 useEntityChanges [${entityType}] DEBUG:`, {
            contextId,
            entityType,
            fullContext,
            changes,
            changesCount,
            hasChanges,
        });
    }, [contextId, entityType, fullContext, changes, changesCount, hasChanges]);

    // Визуальные представления с diff'ами
    const visualChanges = useMemo(
        () => toVisuals(changes),
        [changes]
    );

    // Создание
    const trackCreate = useCallback(
        (entity: T) => {
            console.log('🔵 trackCreate вызван:', { contextId, entityType, entity });

            dispatch(
                addChange({
                    contextId,
                    entityType,
                    entity,
                    action: 'create',
                })
            );
        },
        [dispatch, contextId, entityType]
    );

    // Обновление
    const trackUpdate = useCallback(
        (original: T, updated: T) => {
            console.log('🟡 trackUpdate вызван:', { contextId, entityType, original, updated });

            dispatch(
                addChange({
                    contextId,
                    entityType,
                    entity: updated,
                    action: 'update',
                    original,
                })
            );
        },
        [dispatch, contextId, entityType]
    );

    // Удаление
    const trackDelete = useCallback(
        (entity: T) => {
            console.log('🔴 trackDelete вызван:', { contextId, entityType, entity });

            dispatch(
                addChange({
                    contextId,
                    entityType,
                    entity,
                    action: 'delete',
                })
            );
        },
        [dispatch, contextId, entityType]
    );

    // Очистка всех изменений контекста
    const clearChanges = useCallback(() => {
        console.log('🗑️ clearChanges вызван:', { contextId });
        dispatch(clearContext(contextId));
    }, [dispatch, contextId]);

    // Удаление конкретного изменения
    const removeChangeByKey = useCallback(
        (key: string) => {
            console.log('❌ removeChangeByKey вызван:', { contextId, key });
            dispatch(removeChange({ contextId, key }));
        },
        [dispatch, contextId]
    );

    return useMemo(
        () => ({
            changes,
            visualChanges,
            hasChanges,
            changesCount,
            trackCreate,
            trackUpdate,
            trackDelete,
            clearChanges,
            removeChangeByKey,
        }),
        [
            changes,
            visualChanges,
            hasChanges,
            changesCount,
            trackCreate,
            trackUpdate,
            trackDelete,
            clearChanges,
            removeChangeByKey,
        ]
    );
}