import { useRef, useCallback, useEffect } from 'react';
import {batch, useSelector} from 'react-redux';
import { useAppDispatch } from '@/store/hooks';
import { useRequestManager } from "@chartsPage/charts/orchestration/hooks/useRequestManager.ts";
import { setViewBucket, setViewRange, updateView } from "@chartsPage/charts/core/store/chartsSlice.ts";
import { ViewFieldChart } from "@chartsPage/charts/ui/ChartContainer/FieldChartContainer/ViewFieldChart/ViewFieldChart.tsx";
import { calculateBucket } from "@chartsPage/charts/core/store/chartsSettingsSlice.ts";
import type { RootState } from "@/store/store.ts";
import { selectFieldCurrentBucketMs } from "@chartsPage/charts/core/store/selectors/base.selectors.ts";
import type { TimeRange } from "@chartsPage/charts/core/store/types/chart.types.ts";
import type {FieldDto} from "@chartsPage/metaData/shared/dtos/FieldDto.ts";

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
export function FieldChartContainer({
                                        fieldName,
                                        width,
                                    }: FieldChartContainerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const dispatch = useAppDispatch();
    const requestManager = useRequestManager();

    const loadDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const isSyncUpdateRef = useRef(false); // Флаг для предотвращения циклов

    const syncEnabledRef = useRef(false); // Флаг для предотвращения циклов
    const syncFieldsRef = useRef([] as readonly FieldDto[]); // Флаг для предотвращения циклов

    const currentBucket = useSelector((state: RootState) =>
        selectFieldCurrentBucketMs(state, fieldName)
    );

    const syncEnabled = useSelector((state: RootState) => state.charts.syncEnabled);
    const syncFields = useSelector((state: RootState) => state.charts.syncFields);

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

    /**
     * КРИТИЧНО: Обработка zoom/pan с поддержкой синхронизации
     *
     * Вызывается:
     * 1. После зума колесом мыши (с debounce 150ms)
     * 2. После отпускания кнопки мыши при пане (с debounce 100ms)
     * 3. Программно при синхронизации с других графиков
     */

    const handleOnZoomEnd = useCallback((range: TimeRange, fromSync = false) => {
        console.log('[FieldChartContainer] Обновили FieldChartContainer');

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

        // ✅ КРИТИЧНО: Батчим все dispatch в один ре-рендер
        batch(() => {
            // Обновляем текущее поле
            dispatch(setViewRange({
                field: fieldName,
                range: {
                    fromMs: range.fromMs,
                    toMs: range.toMs
                }
            }));

            if (oldBucket !== newBucket) {
                requestManager.cancelFieldRequests(fieldName);

                dispatch(setViewBucket({
                    field: fieldName,
                    bucketMs: newBucket
                }));
            }

            // СИНХРОНИЗАЦИЯ: Обновляем другие графики
            if (shouldSync) {
                isSyncUpdateRef.current = true;

                syncFieldsRef.current.forEach(field => {
                    if (field.name !== fieldName) {
                        dispatch(setViewRange({
                            field: field.name,
                            range: {
                                fromMs: range.fromMs,
                                toMs: range.toMs
                            }
                        }));

                        const syncBucket = calculateBucket(range.fromMs, range.toMs, width);
                        if (syncBucket !== currentBucketRef.current) {
                            dispatch(setViewBucket({
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

        // Дозагрузка данных ПОСЛЕ батчинга
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

    }, [dispatch, fieldName, width, requestManager]);


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
                    dispatch(updateView({ field: fieldName, px }));
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
    }, [dispatch, fieldName]);


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
                fieldName={fieldName}
                onZoomEnd={handleOnZoomEnd}
                onRetry={handleRetry}
            />
        </div>
    );
}