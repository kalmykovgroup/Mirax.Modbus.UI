// src/features/chartsPage/charts/ui/ChartContainer/FieldChartContainer/FieldChartContainer.tsx
// ФИНАЛЬНАЯ ВЕРСИЯ с исправлением ВСЕХ проблем

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/store/hooks';
import type { RootState } from '@/store/store';
import type { Guid } from '@app/lib/types/Guid';
import type { FieldDto } from '@chartsPage/metaData/shared/dtos/FieldDto';
import {
    selectFieldCurrentBucketMs,
    selectFieldCurrentRange,
    selectContextSyncFields,
    selectIsContextFieldSynced,
} from '@chartsPage/charts/core/store/selectors/base.selectors';
import {
    selectActiveTabId,
    selectTabSyncEnabled,
    selectTabSyncContextIds,
} from '@chartsPage/charts/core/store/tabsSlice';
import { setViewRange, setViewBucket } from '@chartsPage/charts/core/store/chartsSlice';
import { ViewFieldChart } from './ViewFieldChart/ViewFieldChart';
import { useRequestManager } from '@chartsPage/charts/orchestration/hooks/useRequestManager';
import { RequestManagerRegistry } from '@chartsPage/charts/orchestration/requests/RequestManagerRegistry';
import type { TimeRange } from '@chartsPage/charts/core/store/types/chart.types';
import {calculateBucket} from "@chartsPage/charts/core/store/chartsSettingsSlice.ts";

interface FieldChartContainerProps {
    readonly contextId: Guid;
    readonly fieldName: string;
    readonly width: number;
}

export function FieldChartContainer({ contextId, fieldName, width }: FieldChartContainerProps) {
    const dispatch = useAppDispatch();
    const requestManager = useRequestManager();

    const activeTabId = useSelector(selectActiveTabId);

    // ==========  ИСПРАВЛЕНИЕ #1: Стабильный boolean ==========
    const syncEnabled = useSelector((state: RootState) => {
        if (!activeTabId) return false;
        return selectTabSyncEnabled(state, activeTabId);
    });

    // ==========  ИСПРАВЛЕНИЕ #2: Мемоизация через useMemo ==========
    // Получаем RAW массив (стабильная ссылка из Redux)
    const syncContextIdsRaw = useSelector((state: RootState) => {
        if (!activeTabId) return undefined; // undefined вместо []
        return selectTabSyncContextIds(state, activeTabId);
    });

    // Мемоизируем преобразование в массив
    const syncContextIds = useMemo((): readonly Guid[] => {
        return syncContextIdsRaw ?? [];
    }, [syncContextIdsRaw]);

    const isCurrentFieldSynced = useSelector((state: RootState) =>
        selectIsContextFieldSynced(state, contextId, fieldName)
    );

    // ==========  ИСПРАВЛЕНИЕ #3: Мемоизация allSyncFields ==========

    // Получаем данные для всех контекстов (Object с ключами contextId)
    const allContextSyncFieldsMap = useSelector((state: RootState) => {
        const result: Record<string, readonly FieldDto[]> = {};
        for (const ctxId of syncContextIds) {
            result[ctxId] = selectContextSyncFields(state, ctxId);
        }
        return result;
    }, (a, b) => {
        //  Кастомное сравнение: сравниваем ключи и значения
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);

        if (aKeys.length !== bKeys.length) return false;

        for (const key of aKeys) {
            if (a[key] !== b[key]) return false; // Сравниваем ссылки на массивы
        }

        return true;
    });

    // Мемоизируем создание плоского массива
    const allSyncFields = useMemo(() => {
        const result: Array<{ contextId: Guid; field: FieldDto }> = [];

        for (const ctxId of syncContextIds) {
            const fields = allContextSyncFieldsMap[ctxId];
            if (!fields) continue;

            for (const field of fields) {
                result.push({ contextId: ctxId, field });
            }
        }

        return result;
    }, [syncContextIds, allContextSyncFieldsMap]);

    // Фильтруем через useMemo
    const otherSyncFields = useMemo(() => {
        return allSyncFields.filter(
            (item) => !(item.contextId === contextId && item.field.name === fieldName)
        );
    }, [allSyncFields, contextId, fieldName]);

    // ========== ТЕКУЩЕЕ СОСТОЯНИЕ ПОЛЯ ==========

    const currentBucket = useSelector((state: RootState) =>
        selectFieldCurrentBucketMs(state, contextId, fieldName)
    );

    const currentRange = useSelector((state: RootState) => {
        if (syncEnabled && isCurrentFieldSynced) {
            return selectFieldCurrentRange(state, contextId, fieldName);
        }
        return undefined;
    });

    // ==========  ИСПРАВЛЕНИЕ #4: useRef с initialValue ==========

    const currentBucketRef = useRef<typeof currentBucket>(currentBucket);
    const syncEnabledRef = useRef<boolean>(syncEnabled);
    const otherSyncFieldsRef = useRef<typeof otherSyncFields>(otherSyncFields);
    const widthRef = useRef<number>(width);
    const loadDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const isSyncUpdateRef = useRef<boolean>(false);

    useEffect(() => {
        currentBucketRef.current = currentBucket;
    }, [currentBucket]);

    useEffect(() => {
        syncEnabledRef.current = syncEnabled;
    }, [syncEnabled]);

    useEffect(() => {
        otherSyncFieldsRef.current = otherSyncFields;
    }, [otherSyncFields]);

    useEffect(() => {
        widthRef.current = width;
    }, [width]);

    // ========== ОБРАБОТЧИК ЗУМА ==========

    const handleZoomEnd = useCallback(
        (range: TimeRange) => {
            const newBucket = calculateBucket(range.fromMs, range.toMs, widthRef.current);
            const shouldSync =
                syncEnabledRef.current && isCurrentFieldSynced && !isSyncUpdateRef.current;

            console.log('[FieldChartContainer] Zoom ended:', {
                contextId,
                fieldName,
                range: { from: range.fromMs, to: range.toMs },
                newBucket,
                shouldSync,
            });

            // 1. Обновляем Redux state
            requestAnimationFrame(() => {
                dispatch(
                    setViewRange({
                        contextId,
                        field: fieldName,
                        range: { fromMs: range.fromMs, toMs: range.toMs },
                    })
                );

                if (newBucket !== currentBucketRef.current) {
                    dispatch(
                        setViewBucket({
                            contextId,
                            field: fieldName,
                            bucketMs: newBucket,
                        })
                    );
                }

                // Синхронизируем другие поля
                if (shouldSync) {
                    isSyncUpdateRef.current = true;

                    console.log(
                        `[FieldChartContainer] Синхронизация зума с ${otherSyncFieldsRef.current.length} полями`
                    );

                    for (const item of otherSyncFieldsRef.current) {
                        dispatch(
                            setViewRange({
                                contextId: item.contextId,
                                field: item.field.name,
                                range: { fromMs: range.fromMs, toMs: range.toMs },
                            })
                        );

                        const syncBucket = calculateBucket(
                            range.fromMs,
                            range.toMs,
                            widthRef.current
                        );

                        if (syncBucket !== currentBucketRef.current) {
                            dispatch(
                                setViewBucket({
                                    contextId: item.contextId,
                                    field: item.field.name,
                                    bucketMs: syncBucket,
                                })
                            );
                        }
                    }

                    setTimeout(() => {
                        isSyncUpdateRef.current = false;
                    }, 300);
                }
            });

            // 2. ГЕНЕРАЦИЯ ЗАПРОСОВ (DEBOUNCED)
            if (loadDebounceRef.current !== undefined) {
                clearTimeout(loadDebounceRef.current);
            }

            loadDebounceRef.current = setTimeout(() => {
                console.log('[FieldChartContainer] Генерируем запрос для текущего контекста:', {
                    contextId,
                    fieldName,
                    range: { from: range.fromMs, to: range.toMs },
                    bucket: newBucket,
                });

                void requestManager.loadVisibleRange(
                    fieldName,
                    range.fromMs,
                    range.toMs,
                    newBucket,
                    widthRef.current
                );

                // Запросы для ДРУГИХ синхронизированных контекстов
                if (shouldSync && otherSyncFieldsRef.current.length > 0) {
                    const fieldsByContext = new Map<Guid, FieldDto[]>();

                    for (const item of otherSyncFieldsRef.current) {
                        const fields = fieldsByContext.get(item.contextId) ?? [];
                        fields.push(item.field);
                        fieldsByContext.set(item.contextId, fields);
                    }

                    console.log(
                        '[FieldChartContainer] Генерируем запросы для синхронизированных контекстов:',
                        Array.from(fieldsByContext.keys()).map((ctxId) => ({
                            contextId: ctxId,
                            fields: fieldsByContext.get(ctxId)?.map((f) => f.name),
                        }))
                    );

                    for (const [otherContextId, fields] of fieldsByContext.entries()) {
                        if (otherContextId === contextId) {
                            continue;
                        }

                        const otherManager = RequestManagerRegistry.get(otherContextId);

                        if (!otherManager) {
                            console.warn(
                                '[FieldChartContainer] Manager not found for context:',
                                otherContextId
                            );
                            continue;
                        }

                        const firstField = fields[0];
                        if (!firstField) {
                            console.warn('[FieldChartContainer] No fields for context:', otherContextId);
                            continue;
                        }

                        console.log(
                            `[FieldChartContainer] Генерируем запрос для контекста ${otherContextId}:`,
                            {
                                triggerField: firstField.name,
                                allFieldsInContext: fields.map((f) => f.name),
                                range: { from: range.fromMs, to: range.toMs },
                                bucket: newBucket,
                            }
                        );

                        void otherManager.loadVisibleRange(
                            firstField.name,
                            range.fromMs,
                            range.toMs,
                            newBucket,
                            widthRef.current
                        );
                    }
                }
            }, 150);
        },
        [dispatch, contextId, fieldName, requestManager, isCurrentFieldSynced]
    );

    const handleRetry = useCallback(() => {
        console.log('[FieldChartContainer] Попытка handleRetry');
    }, []);

    return (
        <ViewFieldChart
            contextId={contextId}
            fieldName={fieldName}
            onZoomEnd={handleZoomEnd}
            onRetry={handleRetry}
            width={width}
            currentRange={currentRange}
        />
    );
}