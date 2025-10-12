// features/chartsPage/charts/ui/ChartContainer/FieldChartContainer/FieldChartContainer.tsx
// ОПТИМИЗАЦИЯ: currentRange передаётся ТОЛЬКО для синхронизированных графиков

import { useRef, useCallback, useEffect, useMemo } from 'react';
import { batch, useSelector } from 'react-redux';
import { useAppDispatch } from '@/store/hooks';
import { useRequestManager } from '@chartsPage/charts/orchestration/hooks/useRequestManager.ts';
import {
    setViewBucket,
    setViewRange,
    updateView
} from '@chartsPage/charts/core/store/chartsSlice.ts';
import { calculateBucket } from '@chartsPage/charts/core/store/chartsSettingsSlice.ts';
import type { RootState } from '@/store/store.ts';
import {
    selectContextSyncFields,
    selectFieldCurrentBucketMs,
    selectFieldCurrentRange, // ← ДОБАВЛЕНО
    selectIsContextFieldSynced // ← ДОБАВЛЕНО
} from '@chartsPage/charts/core/store/selectors/base.selectors.ts';
import type { TimeRange } from '@chartsPage/charts/core/store/types/chart.types.ts';
import type { Guid } from '@app/lib/types/Guid.ts';
import {
    selectActiveTabId,
    selectTabSyncContextIds,
    selectTabSyncEnabled
} from '@chartsPage/charts/core/store/tabsSlice.ts';
import type { FieldDto } from '@chartsPage/metaData/shared/dtos/FieldDto.ts';
import { ViewFieldChart } from '@chartsPage/charts/ui/ChartContainer/FieldChartContainer/ViewFieldChart/ViewFieldChart.tsx';
import { RequestManagerRegistry } from '@chartsPage/charts/orchestration/requests/RequestManagerRegistry.ts';

interface FieldChartContainerProps {
    readonly contextId: Guid;
    readonly fieldName: string;
    readonly width: number;
}

/**
 * ОПТИМИЗАЦИЯ FINAL + СИНХРОНИЗАЦИЯ:
 * - Зум колесом - callback сразу (с debounce 150ms для стабильности)
 * - Пан мышью - callback только после отпускания кнопки
 * - UI обновляется мгновенно
 * - Синхронизация зума между выбранными графиками
 * - Защита от циклических обновлений при синхронизации
 * - currentRange передаётся ТОЛЬКО для синхронизированных графиков
 */
export function FieldChartContainer({
                                        contextId,
                                        fieldName,
                                        width
                                    }: FieldChartContainerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const dispatch = useAppDispatch();
    const requestManager = useRequestManager();

    const loadDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const isSyncUpdateRef = useRef(false);
    const lastRangeRef = useRef<TimeRange | null>(null);

    // ========== СОСТОЯНИЕ СИНХРОНИЗАЦИИ ==========

    const activeTabId = useSelector(selectActiveTabId);

    const syncEnabled = useSelector((state: RootState) => {
        if (!activeTabId) return false;
        return selectTabSyncEnabled(state, activeTabId);
    });

    const syncContextIds = useSelector((state: RootState) => {
        if (!activeTabId) return [];
        return selectTabSyncContextIds(state, activeTabId);
    });

    // ========== ПРОВЕРКА: Участвует ли ТЕКУЩЕЕ поле в синхронизации ==========
    const isCurrentFieldSynced = useSelector((state: RootState) =>
        selectIsContextFieldSynced(state, contextId, fieldName)
    );

    // Получаем синхронизированные поля ВСЕХ контекстов
    const allSyncFields = useSelector((state: RootState) => {
        const fieldsMap = new Map<string, { contextId: Guid; field: FieldDto }>();

        for (const ctxId of syncContextIds) {
            const fields = selectContextSyncFields(state, ctxId);

            for (const field of fields) {
                const key = `${ctxId}::${field.name}`;
                fieldsMap.set(key, { contextId: ctxId, field });
            }
        }

        return Array.from(fieldsMap.values());
    });

    // Фильтруем: оставляем только ДРУГИЕ поля (не текущее)
    const otherSyncFields = useMemo(() => {
        return allSyncFields.filter(
            (item) => !(item.contextId === contextId && item.field.name === fieldName)
        );
    }, [allSyncFields, contextId, fieldName]);

    // ========== ТЕКУЩЕЕ СОСТОЯНИЕ ПОЛЯ ==========

    const currentBucket = useSelector((state: RootState) =>
        selectFieldCurrentBucketMs(state, contextId, fieldName)
    );

    // ========== КРИТИЧНО: currentRange ТОЛЬКО для синхронизированных ==========
    const currentRange = useSelector((state: RootState) => {
        // Передаём currentRange ТОЛЬКО если:
        // 1. Синхронизация включена на уровне таба
        // 2. Текущее поле участвует в синхронизации
        if (syncEnabled && isCurrentFieldSynced) {
            return selectFieldCurrentRange(state, contextId, fieldName);
        }
        return undefined; // Для несинхронизированных графиков - не передаём
    });

    const currentBucketRef = useRef(currentBucket);
    const syncEnabledRef = useRef(syncEnabled);
    const otherSyncFieldsRef = useRef(otherSyncFields);
    const widthRef = useRef(width);

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

    /**
     * Обработчик завершения зума
     *
     * ЛОГИКА:
     * 1. Обновляем Redux state для ВСЕХ синхронизированных полей
     * 2. Генерируем запросы (debounced):
     *    - 1 запрос для текущего контекста
     *    - 1 запрос для каждого ДРУГОГО синхронизированного контекста
     */
    const handleOnZoomEnd = useCallback(
        (range: TimeRange) => {
            // ========== ЗАЩИТЫ ==========

            if (isSyncUpdateRef.current) {
                console.log('[FieldChartContainer] Пропускаем - обновление от синхронизации');
                return;
            }

            const isDuplicate =
                lastRangeRef.current &&
                lastRangeRef.current.fromMs === range.fromMs &&
                lastRangeRef.current.toMs === range.toMs;

            if (isDuplicate) {
                console.log('[FieldChartContainer] Дубликат события, игнорируем');
                return;
            }

            lastRangeRef.current = range;

            const newBucket = calculateBucket(range.fromMs, range.toMs, widthRef.current);
            const oldBucket = currentBucketRef.current;
            const shouldSync = syncEnabledRef.current && otherSyncFieldsRef.current.length > 0;

            // ========== 1. ОБНОВЛЯЕМ REDUX STATE ==========

            batch(() => {
                // 1.1. Текущее поле
                dispatch(
                    setViewRange({
                        contextId,
                        field: fieldName,
                        range: {
                            fromMs: range.fromMs,
                            toMs: range.toMs
                        }
                    })
                );

                if (oldBucket !== newBucket) {
                    requestManager.cancelFieldRequests(fieldName);

                    dispatch(
                        setViewBucket({
                            contextId,
                            field: fieldName,
                            bucketMs: newBucket
                        })
                    );
                }

                // 1.2. Синхронизируем другие поля
                if (shouldSync) {
                    isSyncUpdateRef.current = true;

                    console.log(
                        `[FieldChartContainer] Синхронизация зума с ${otherSyncFieldsRef.current.length} полями из ${syncContextIds.length} контекстов`
                    );

                    for (const item of otherSyncFieldsRef.current) {
                        dispatch(
                            setViewRange({
                                contextId: item.contextId,
                                field: item.field.name,
                                range: {
                                    fromMs: range.fromMs,
                                    toMs: range.toMs
                                }
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
                                    bucketMs: syncBucket
                                })
                            );
                        }
                    }

                    // КРИТИЧНО: Таймаут синхронизирован с ChartCanvas (300ms)
                    setTimeout(() => {
                        isSyncUpdateRef.current = false;
                    }, 300);
                }
            });

            // ========== 2. ГЕНЕРАЦИЯ ЗАПРОСОВ (DEBOUNCED) ==========

            if (loadDebounceRef.current) {
                clearTimeout(loadDebounceRef.current);
            }

            loadDebounceRef.current = setTimeout(() => {
                // 2.1. Запрос для ТЕКУЩЕГО контекста
                console.log('[FieldChartContainer] Генерируем запрос для текущего контекста:', {
                    contextId,
                    fieldName,
                    range: { from: range.fromMs, to: range.toMs },
                    bucket: newBucket
                });

                void requestManager.loadVisibleRange(
                    fieldName,
                    range.fromMs,
                    range.toMs,
                    newBucket,
                    widthRef.current
                );

                // 2.2. Запросы для ДРУГИХ синхронизированных контекстов
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
                            fields: fieldsByContext.get(ctxId)?.map((f) => f.name)
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
                                otherContextId,
                                '- данные загрузятся автоматически при рендере контекста'
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
                                bucket: newBucket
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
        [dispatch, contextId, fieldName, requestManager, syncContextIds.length]
    );

    const handleRetry = useCallback(() => {
        console.log('[FieldChartContainer] Попытка handleRetry');
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width } = entry.contentRect;
                if (width > 100) {
                    const px = Math.floor(width);
                    dispatch(updateView({ contextId, field: fieldName, px }));
                }
            }
        });

        observer.observe(container);

        return () => {
            observer.disconnect();
            if (loadDebounceRef.current) {
                clearTimeout(loadDebounceRef.current);
            }
        };
    }, [dispatch, fieldName, contextId]);

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column'
            }}
            ref={containerRef}
        >
            <ViewFieldChart
                width={width}
                contextId={contextId}
                fieldName={fieldName}
                onZoomEnd={handleOnZoomEnd}
                onRetry={handleRetry}
                currentRange={currentRange}
            />
        </div>
    );
}