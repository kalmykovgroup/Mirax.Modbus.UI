// components/chart/ChartCanvas/ChartCanvas.tsx

import { useRef, useEffect } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption, EChartsType } from 'echarts';

interface ChartCanvasProps {
    readonly options: EChartsOption;
    readonly onZoomEnd?: ((event: ChartZoomEvent) => void) | undefined;
    readonly height?: string | undefined;
    readonly loading?: boolean | undefined;
}

export interface ChartZoomEvent {
    readonly start: number;
    readonly end: number;
    readonly startValue?: number | undefined;
    readonly endValue?: number | undefined;
}

export function ChartCanvas({
                                options,
                                onZoomEnd,
                                height = '400px',
                                loading = false
                            }: ChartCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartInstanceRef = useRef<EChartsType | null>(null);
    const onZoomEndRef = useRef(onZoomEnd);

    // Синхронизация callback
    useEffect(() => {
        onZoomEndRef.current = onZoomEnd;
    }, [onZoomEnd]);

    // Инициализация графика
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Создаём инстанс
        const chart = echarts.init(container, null, {
            renderer: 'canvas',
            useDirtyRect: true, // Оптимизация для больших данных
            locale: 'RU'
        });

        chartInstanceRef.current = chart;

        // Подписка на dataZoom
        const handleDataZoom = () => {
            if (!onZoomEndRef.current) return;

            const option = chart.getOption() as any;
            const dataZoom = option.dataZoom?.[0];

            if (!dataZoom) return;

            const startValue = dataZoom.startValue;
            const endValue = dataZoom.endValue;

            if (typeof startValue === 'number' && typeof endValue === 'number') {
                onZoomEndRef.current({
                    start: dataZoom.start || 0,
                    end: dataZoom.end || 100,
                    startValue,
                    endValue
                });
            }
        };

        // ECharts 6+ использует именованные события
        chart.on('dataZoom', handleDataZoom);

        // Обработка resize
        const resizeObserver = new ResizeObserver(() => {
            chart.resize();
        });
        resizeObserver.observe(container);

        // Cleanup
        return () => {
            resizeObserver.disconnect();
            chart.off('dataZoom', handleDataZoom);
            chart.dispose();
            chartInstanceRef.current = null;
        };
    }, []); // Инициализация только один раз

    // Обновление options
    useEffect(() => {
        const chart = chartInstanceRef.current;
        if (!chart) return;

        chart.setOption(options, {
            notMerge: false,  // Всегда merge для производительности
            lazyUpdate: true,
            silent: false
        });
    }, [options]);

    // Обновление loading состояния
    useEffect(() => {
        const chart = chartInstanceRef.current;
        if (!chart) return;

        if (loading) {
            chart.showLoading('default', {
                text: 'Загрузка...',
                color: '#4A90E2',
                maskColor: 'rgba(255, 255, 255, 0.8)'
            });
        } else {
            chart.hideLoading();
        }
    }, [loading]);

    return (
        <div
            ref={containerRef}
            style={{ width: '100%', height }}
        />
    );
}