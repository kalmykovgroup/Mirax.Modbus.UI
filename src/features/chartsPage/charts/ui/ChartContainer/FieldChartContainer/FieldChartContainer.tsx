
import {useRef, useCallback, useEffect, useState} from 'react';
import { useAppDispatch } from '@/store/hooks';
import {useRequestManager} from "@chartsPage/charts/orchestration/hooks/useRequestManager.ts";
import {setViewBucket, setViewRange, updateView} from "@chartsPage/charts/core/store/chartsSlice.ts";
import {ViewFieldChart} from "@chartsPage/charts/ui/ChartContainer/FieldChartContainer/ViewFieldChart/ViewFieldChart.tsx";
import {calculateBucket} from "@chartsPage/charts/core/store/chartsSettingsSlice.ts";
import {useSelector} from "react-redux";
import type {RootState} from "@/store/store.ts";
import {selectFieldCurrentBucketMs} from "@chartsPage/charts/core/store/selectors/base.selectors.ts";
import { ResizableContainer } from "../ResizableContainer/ResizableContainer";

const GROUP_ID = "ChartContainer";



interface FieldChartContainerProps {
    readonly fieldName: string;
    readonly width: number;
}

/**
 * Контейнер графика с логикой загрузки через RequestManager
 *
 * Ответственность:
 * - Обработка zoom/pan от ECharts
 * - Отслеживание resize контейнера
 * - Делегирование загрузки в RequestManager
 */
export function FieldChartContainer({
                                        fieldName,
                                        width,
                                    }: FieldChartContainerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const dispatch = useAppDispatch();
    const requestManager = useRequestManager();
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [containerHeight, setContainerHeight] = useState<number>(1000);
    const currentBucket = useSelector((state: RootState) => selectFieldCurrentBucketMs(state, fieldName) )

    // Ref всегда хранит актуальный bucket
    const currentBucketRef = useRef(currentBucket);

    // Обновляем ref при каждом изменении currentBucket (НЕ вызывая ререндер)
    useEffect(() => {
        currentBucketRef.current = currentBucket;
    }, [currentBucket]);
    /**
     * Обработка zoom/pan от ECharts
     */
        // FieldChartContainer.tsx - исправленный handleOnZoomEnd

    const handleOnZoomEnd = useCallback((range: { from: number; to: number }) => {
            const newRange = {
                from: new Date(range.from),
                to: new Date(range.to)
            };

            dispatch(setViewRange({ field: fieldName, range: newRange }));

            const newBucket = calculateBucket(
                range.from,
                range.to,
                width
            );

            const oldBucket = currentBucketRef.current;

            if (oldBucket !== newBucket) {
                console.log('[FieldChartContainer] Bucket changed:', {
                    from: oldBucket,
                    to: newBucket,
                    field: fieldName
                });

                // ВАЖНО: отменяем запросы ВСЕХ bucket для этого поля
                requestManager.cancelFieldRequests(fieldName);

                // Обновляем bucket
                dispatch(setViewBucket({ field: fieldName, bucketMs: newBucket }));
            }

            // Загружаем данные только если нужно
            void requestManager.loadVisibleRange(fieldName, range.from, range.to, newBucket, width);

        }, [dispatch, fieldName, width, requestManager]);



    /**
     * Retry при ошибке
     */
    const handleRetry = useCallback(() => {
        console.log("Попытка handleRetry в FieldChartContainer")
        /*requestManager.cancelFieldRequests(fieldName);
        void requestManager.loadVisibleRange(fieldName);*/
    }, [requestManager, fieldName]);

    /**
     * Отслеживание resize контейнера
     */
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
        };
    }, [dispatch, fieldName]);


    console.log("Пересобрали")

    return (
        <ResizableContainer
            key={fieldName}
            groupId={GROUP_ID}
            defaultHeight={containerHeight}
            minHeight={300}
            maxHeight={2000}
            onHeightChange={setContainerHeight}
        >
            <div style={{width: '100%', height: '100%', position: 'relative', display: 'flex'}} ref={containerRef}>
                <ViewFieldChart
                    fieldName={fieldName}
                    onZoomEnd={handleOnZoomEnd}
                    onRetry={handleRetry}
                    height={containerHeight}
                />
            </div>
        </ResizableContainer>

    );
}