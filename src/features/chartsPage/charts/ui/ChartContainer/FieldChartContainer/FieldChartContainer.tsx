import { useRef, useCallback, useEffect } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { useRequestManager } from "@chartsPage/charts/orchestration/hooks/useRequestManager.ts";
import { setViewBucket, setViewRange, updateView } from "@chartsPage/charts/core/store/chartsSlice.ts";
import { ViewFieldChart } from "@chartsPage/charts/ui/ChartContainer/FieldChartContainer/ViewFieldChart/ViewFieldChart.tsx";
import { calculateBucket } from "@chartsPage/charts/core/store/chartsSettingsSlice.ts";
import {batch, useSelector} from "react-redux";
import type { RootState } from "@/store/store.ts";
import { selectFieldCurrentBucketMs } from "@chartsPage/charts/core/store/selectors/base.selectors.ts";



interface FieldChartContainerProps {
    readonly fieldName: string;
    readonly width: number;
}

/**
 *    ОПТИМИЗАЦИЯ: Мгновенное обновление визуального диапазона + debounce для загрузки
 */
export function FieldChartContainer({
                                        fieldName,
                                        width,
                                    }: FieldChartContainerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const dispatch = useAppDispatch();
    const requestManager = useRequestManager();
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const loadDebounceRef = useRef<NodeJS.Timeout | null>(null); //    Отдельный debounce для загрузки

    const currentBucket = useSelector((state: RootState) => selectFieldCurrentBucketMs(state, fieldName));

    const currentBucketRef = useRef(currentBucket);

    useEffect(() => {
        currentBucketRef.current = currentBucket;
    }, [currentBucket]);

    /**
     *    КРИТИЧНО: Разделены обновление UI и загрузка данных
     * 1. UI обновляется сразу (batch)
     * 2. Загрузка с debounce 250ms
     */
    const handleOnZoomEnd = useCallback((range: { from: number; to: number }) => {
        const newRange = {
            from: new Date(range.from),
            to: new Date(range.to)
        };

        const newBucket = calculateBucket(
            range.from,
            range.to,
            width
        );

        const oldBucket = currentBucketRef.current;

        //    Батчим все Redux updates для мгновенного обновления UI
        batch(() => {
            dispatch(setViewRange({ field: fieldName, range: newRange }));

            if (oldBucket !== newBucket) {
                console.log('[FieldChartContainer] Bucket changed:', {
                    from: oldBucket,
                    to: newBucket,
                    field: fieldName
                });

                // Отменяем запросы ВСЕХ bucket для этого поля
                requestManager.cancelFieldRequests(fieldName);

                // Обновляем bucket
                dispatch(setViewBucket({ field: fieldName, bucketMs: newBucket }));
            }
        });

        //    Debounce для загрузки данных (если нужно)
        if (loadDebounceRef.current) {
            clearTimeout(loadDebounceRef.current);
        }

        loadDebounceRef.current = setTimeout(() => {
            void requestManager.loadVisibleRange(fieldName, range.from, range.to, newBucket, width);
        }, 250); //    Загружаем с задержкой только если нужно

    }, [dispatch, fieldName, width, requestManager]);

    const handleRetry = useCallback(() => {
        console.log("Попытка handleRetry в FieldChartContainer");
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
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            if (loadDebounceRef.current) {
                clearTimeout(loadDebounceRef.current);
            }
        };
    }, [dispatch, fieldName]);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }} ref={containerRef}>
            <ViewFieldChart
                width={width}
                fieldName={fieldName}
                onZoomEnd={handleOnZoomEnd}
                onRetry={handleRetry}
            />
        </div>
    );
}