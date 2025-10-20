// src/features/chartsPage/charts/ui/ChartContainer/FieldChartContainer/FieldChartContainer.tsx
// ИСПРАВЛЕНИЕ: Устранение рассинхронизации при включении/выключении sync

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
import { calculateBucket } from '@chartsPage/charts/core/store/chartsSettingsSlice.ts';

interface NavigationInfo {
    readonly currentIndex: number;
    readonly totalFields: number;
    readonly onPrevious: () => void;
    readonly onNext: () => void;
}

interface FieldChartContainerProps {
    readonly contextId: Guid;
    readonly fieldName: string;
    readonly width: number;
    readonly navigationInfo?: NavigationInfo | undefined;
}

export function FieldChartContainer({
                                        contextId,
                                        fieldName,
                                        width,
                                        navigationInfo
                                    }: FieldChartContainerProps) {
    const dispatch = useAppDispatch();
    const requestManager = useRequestManager();

    const activeTabId = useSelector(selectActiveTabId);

    const syncEnabled = useSelector((state: RootState) => {
        if (!activeTabId) return false;
        return selectTabSyncEnabled(state, activeTabId);
    });

    const syncContextIdsRaw = useSelector((state: RootState) => {
        if (!activeTabId) return undefined;
        return selectTabSyncContextIds(state, activeTabId);
    });

    const syncContextIds = useMemo((): readonly Guid[] => {
        return syncContextIdsRaw ?? [];
    }, [syncContextIdsRaw]);

    const isCurrentFieldSynced = useSelector((state: RootState) =>
        selectIsContextFieldSynced(state, contextId, fieldName)
    );

    const allContextSyncFieldsMap = useSelector((state: RootState) => {
        const result: Record<string, readonly FieldDto[]> = {};
        for (const ctxId of syncContextIds) {
            result[ctxId] = selectContextSyncFields(state, ctxId);
        }
        return result;
    }, (a, b) => {
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        if (aKeys.length !== bKeys.length) return false;
        for (const key of aKeys) {
            if (a[key] !== b[key]) return false;
        }
        return true;
    });

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

    const otherSyncFields = useMemo(() => {
        return allSyncFields.filter(
            (item) => !(item.contextId === contextId && item.field.name === fieldName)
        );
    }, [allSyncFields, contextId, fieldName]);

    const currentBucket = useSelector((state: RootState) =>
        selectFieldCurrentBucketMs(state, contextId, fieldName)
    );

    const currentRange = useSelector((state: RootState) => {
        if (syncEnabled && isCurrentFieldSynced) {
            return selectFieldCurrentRange(state, contextId, fieldName);
        }
        return undefined;
    });

    // ========== КРИТИЧНО: Все динамические значения в ref ==========
    const currentBucketRef = useRef<typeof currentBucket>(currentBucket);
    const syncEnabledRef = useRef<boolean>(syncEnabled);
    const isCurrentFieldSyncedRef = useRef<boolean>(isCurrentFieldSynced);
    const otherSyncFieldsRef = useRef<typeof otherSyncFields>(otherSyncFields);
    const widthRef = useRef<number>(width);
    const loadDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // ========== УЛУЧШЕННАЯ СИСТЕМА ЗАЩИТЫ ОТ ЦИКЛОВ ==========
    const isSyncUpdateRef = useRef<boolean>(false);
    const syncUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const lastUserZoomRef = useRef<{ fromMs: number; toMs: number } | null>(null);

    useEffect(() => {
        currentBucketRef.current = currentBucket;
    }, [currentBucket]);

    useEffect(() => {
        syncEnabledRef.current = syncEnabled;
    }, [syncEnabled]);

    useEffect(() => {
        isCurrentFieldSyncedRef.current = isCurrentFieldSynced;
    }, [isCurrentFieldSynced]);

    useEffect(() => {
        otherSyncFieldsRef.current = otherSyncFields;
    }, [otherSyncFields]);

    useEffect(() => {
        widthRef.current = width;
    }, [width]);

    // Cleanup при unmount
    useEffect(() => {
        return () => {
            if (loadDebounceRef.current !== undefined) {
                clearTimeout(loadDebounceRef.current);
            }
            if (syncUpdateTimerRef.current !== undefined) {
                clearTimeout(syncUpdateTimerRef.current);
            }
        };
    }, []);

    // ========== ОБРАБОТЧИК ЗУМА С УЛУЧШЕННОЙ ЗАЩИТОЙ ==========
    const handleZoomEnd = useCallback(
        (range: TimeRange) => {
            // КРИТИЧНО: Берём актуальные значения из ref
            const shouldSync =
                syncEnabledRef.current &&
                isCurrentFieldSyncedRef.current &&
                !isSyncUpdateRef.current;

            // Проверка на повторный зум с теми же значениями
            const TOLERANCE = 1; // 1ms допуск
            if (
                lastUserZoomRef.current &&
                Math.abs(lastUserZoomRef.current.fromMs - range.fromMs) <= TOLERANCE &&
                Math.abs(lastUserZoomRef.current.toMs - range.toMs) <= TOLERANCE
            ) {
                console.log('[FieldChartContainer] Игнорируем повторный зум с теми же значениями');
                return;
            }

            // Сохраняем последний user zoom
            lastUserZoomRef.current = { fromMs: range.fromMs, toMs: range.toMs };

            const newBucket = calculateBucket(range.fromMs, range.toMs, widthRef.current);

            console.log('[FieldChartContainer] Zoom ended:', {
                contextId,
                fieldName,
                range: { from: range.fromMs, to: range.toMs },
                newBucket,
                shouldSync,
                syncEnabled: syncEnabledRef.current,
                isFieldSynced: isCurrentFieldSyncedRef.current,
                isSyncUpdate: isSyncUpdateRef.current,
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
                if (shouldSync && otherSyncFieldsRef.current.length > 0) {
                    // КРИТИЧНО: Устанавливаем флаг ПЕРЕД диспатчами
                    isSyncUpdateRef.current = true;

                    // Очищаем предыдущий таймер, если есть
                    if (syncUpdateTimerRef.current !== undefined) {
                        clearTimeout(syncUpdateTimerRef.current);
                    }

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

                    // КРИТИЧНО: Увеличенное время + сохранение в ref для cleanup
                    syncUpdateTimerRef.current = setTimeout(() => {
                        isSyncUpdateRef.current = false;
                        syncUpdateTimerRef.current = undefined;
                        console.log('[FieldChartContainer] Флаг синхронизации сброшен');
                    }, 500); // Увеличено до 500ms для надёжности
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
                    const fieldschartContexts = new Map<Guid, FieldDto[]>();

                    for (const item of otherSyncFieldsRef.current) {
                        const fields = fieldschartContexts.get(item.contextId) ?? [];
                        fields.push(item.field);
                        fieldschartContexts.set(item.contextId, fields);
                    }

                    console.log(
                        '[FieldChartContainer] Генерируем запросы для синхронизированных контекстов:',
                        Array.from(fieldschartContexts.keys()).map((ctxId) => ({
                            contextId: ctxId,
                            fields: fieldschartContexts.get(ctxId)?.map((f) => f.name),
                        }))
                    );

                    for (const [otherContextId, fields] of fieldschartContexts.entries()) {
                        if (otherContextId === contextId) continue;

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
        [dispatch, contextId, fieldName, requestManager]
        // КРИТИЧНО: isCurrentFieldSynced УБРАН из dependencies, т.к. используется ref
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
            navigationInfo={navigationInfo}
        />
    );
}