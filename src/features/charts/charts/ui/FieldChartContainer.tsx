// components/chart/FieldChartContainer/FieldChartContainer.tsx

import { useRef, useCallback, useEffect } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { ViewFieldChart } from '@charts/charts/ui/ViewFieldChart';
import { useRequestManager } from '@charts/charts/orchestration/hooks/useRequestManager';
import { setViewRange, updateView } from '@charts/charts/core/store/chartsSlice';
import type { ChartZoomEvent} from '@charts/charts/ui/ChartCanvas';

interface FieldChartContainerProps {
    readonly fieldName: string;
    readonly height?: string | undefined;
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
                                        height = '400px'
                                    }: FieldChartContainerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const dispatch = useAppDispatch();
    const requestManager = useRequestManager();
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);


    /**
     * Обработка zoom/pan от ECharts
     */
    const handleOnZoomEnd = useCallback((event: ChartZoomEvent) => {
        console.log(event);
    }, [dispatch, fieldName, requestManager]);

  /*  const handleOnDataZoom = useCallback((event: ChartDataZoomEvent) => {

        console.log('handleOnDataZoom', event);


        const batch = event.batch;

        if (!batch || batch.length === 0) return;

        const zoomData = batch[0];


        if (!zoomData || !zoomData.start || !zoomData.end) return;

        const newRange = {
            from: new Date(zoomData.start),
            to: new Date(zoomData.end)
        };

        console.log(newRange)
        // Обновляем range в store немедленно (для UI)
        dispatch(setViewRange({ field: fieldName, range: newRange }));

        // Debounced загрузка через RequestManager
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            void requestManager.loadVisibleRange(fieldName);
        }, 300);
    }, [dispatch, fieldName, requestManager])

*/

    /**
     * Retry при ошибке
     */
    const handleRetry = useCallback(() => {
        requestManager.cancelFieldRequests(fieldName);
        void requestManager.loadVisibleRange(fieldName);
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

    /**
     * Автозагрузка при монтировании
     * RequestManager сам определит нужна ли загрузка
     */
    useEffect(() => {
        void requestManager.loadVisibleRange(fieldName);
    }, []); // Только при монтировании

    return (
        <div ref={containerRef}>
            <ViewFieldChart
                fieldName={fieldName}
                onZoomEnd={handleOnZoomEnd}
                onRetry={handleRetry}
                height={height}
            />
        </div>
    );
}