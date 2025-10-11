import { useRef, useCallback, useEffect } from 'react';
import {batch, useSelector} from 'react-redux';
import { useAppDispatch } from '@/store/hooks';
import { useRequestManager } from "@chartsPage/charts/orchestration/hooks/useRequestManager.ts";
import { setViewBucket, setViewRange, updateView } from "@chartsPage/charts/core/store/chartsSlice.ts";
import { ViewFieldChart } from "@chartsPage/charts/ui/ChartContainer/FieldChartContainer/ViewFieldChart/ViewFieldChart.tsx";
import { calculateBucket } from "@chartsPage/charts/core/store/chartsSettingsSlice.ts";
import type { RootState } from "@/store/store.ts";
import {
    selectFieldCurrentBucketMs,
    selectSyncEnabled,
    selectSyncFields
} from "@chartsPage/charts/core/store/selectors/base.selectors.ts";
import type { TimeRange } from "@chartsPage/charts/core/store/types/chart.types.ts";
import type {FieldDto} from "@chartsPage/metaData/shared/dtos/FieldDto.ts";
import type {Guid} from "@app/lib/types/Guid.ts";

interface FieldChartContainerProps {
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
 */
// src/features/chartsPage/charts/ui/ChartContainer/FieldChartContainer/FieldChartContainer.tsx

// src/features/chartsPage/charts/ui/ChartContainer/FieldChartContainer/FieldChartContainer.tsx

interface FieldChartContainerProps {
    readonly contextId: Guid; // ← ДОБАВИЛИ
    readonly fieldName: string;
    readonly width: number;
}

export function FieldChartContainer({
                                        contextId, // ← ДОБАВИЛИ
                                        fieldName,
                                        width,
                                    }: FieldChartContainerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const dispatch = useAppDispatch();
    const requestManager = useRequestManager();

    const loadDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const isSyncUpdateRef = useRef(false);
    const syncEnabledRef = useRef(false);
    const syncFieldsRef = useRef([] as readonly FieldDto[]);

    // ТОЛЬКО добавили contextId в селекторы
    const currentBucket = useSelector((state: RootState) =>
        selectFieldCurrentBucketMs(state, contextId, fieldName)
    );

    const syncEnabled = useSelector((state: RootState) => selectSyncEnabled(state, contextId));
    const syncFields = useSelector((state: RootState) => selectSyncFields(state, contextId));

    const currentBucketRef = useRef(currentBucket);
    const lastRangeRef = useRef<TimeRange | null>(null);

    useEffect(() => {
        currentBucketRef.current = currentBucket;
    }, [currentBucket]);

    useEffect(() => {
        syncEnabledRef.current = syncEnabled;
    }, [syncEnabled]);

    useEffect(() => {
        syncFieldsRef.current = syncFields;
    }, [syncFields]);

    const handleOnZoomEnd = useCallback((range: TimeRange) => {
        if (isSyncUpdateRef.current) {
            console.log('[FieldChartContainer] Пропускаем - обновление от синхронизации');
            return;
        }

        const isDuplicate = lastRangeRef.current
            && lastRangeRef.current.fromMs === range.fromMs
            && lastRangeRef.current.toMs === range.toMs;

        if (isDuplicate) {
            console.log('[FieldChartContainer] Дубликат события, игнорируем');
            return;
        }

        lastRangeRef.current = range;

        const newBucket = calculateBucket(range.fromMs, range.toMs, width);
        const oldBucket = currentBucketRef.current;
        const shouldSync = syncEnabledRef.current && syncFieldsRef.current.some(f => f.name === fieldName);

        batch(() => {
            // ТОЛЬКО добавили contextId в dispatch
            dispatch(setViewRange({
                contextId, // ← ДОБАВИЛИ
                field: fieldName,
                range: {
                    fromMs: range.fromMs,
                    toMs: range.toMs
                }
            }));

            if (oldBucket !== newBucket) {
                requestManager.cancelFieldRequests(fieldName);

                dispatch(setViewBucket({
                    contextId, // ← ДОБАВИЛИ
                    field: fieldName,
                    bucketMs: newBucket
                }));
            }

            if (shouldSync) {
                isSyncUpdateRef.current = true;

                syncFieldsRef.current.forEach(field => {
                    if (field.name !== fieldName) {
                        dispatch(setViewRange({
                            contextId, // ← ДОБАВИЛИ
                            field: field.name,
                            range: {
                                fromMs: range.fromMs,
                                toMs: range.toMs
                            }
                        }));

                        const syncBucket = calculateBucket(range.fromMs, range.toMs, width);
                        if (syncBucket !== currentBucketRef.current) {
                            dispatch(setViewBucket({
                                contextId, // ← ДОБАВИЛИ
                                field: field.name,
                                bucketMs: syncBucket
                            }));
                        }
                    }
                });

                setTimeout(() => {
                    isSyncUpdateRef.current = false;
                }, 100);
            }
        });

        if (loadDebounceRef.current) {
            clearTimeout(loadDebounceRef.current);
        }

        loadDebounceRef.current = setTimeout(() => {
            void requestManager.loadVisibleRange(
                fieldName,
                range.fromMs,
                range.toMs,
                newBucket,
                width
            );
        }, 150);

    }, [dispatch, fieldName, width, requestManager, contextId]); // ← добавили contextId в deps

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
                    // ТОЛЬКО добавили contextId
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
    }, [dispatch, fieldName, contextId]); // ← добавили contextId в deps

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
                contextId={contextId} // ← ДОБАВИЛИ
                fieldName={fieldName}
                onZoomEnd={handleOnZoomEnd}
                onRetry={handleRetry}
            />
        </div>
    );
}