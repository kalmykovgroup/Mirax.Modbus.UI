// components/chart/ChartCanvas/ChartCanvas.tsx
// ZERO лишних рендеров при zoom

import { useRef, useEffect } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption, EChartsType } from 'echarts';

interface ChartCanvasProps {
    readonly options: EChartsOption;
    readonly totalPoints: number;
    readonly onZoomEnd?: ((range: { from: number; to: number }) => void) | undefined;
    readonly loading?: boolean | undefined;
}

export function ChartCanvas({   options,
                                totalPoints,
                                onZoomEnd,
                                loading = false
                            }: ChartCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<EChartsType | null>(null);
    const onZoomEndRef = useRef(onZoomEnd);
    const totalPointsRef = useRef(totalPoints);
    const lastOptionsRef = useRef<EChartsOption>(options);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Синхронизируем refs (без ре-рендера)
    totalPointsRef.current = totalPoints;
    onZoomEndRef.current = onZoomEnd;

    // ============================================
    // ИНИЦИАЛИЗАЦИЯ (1 раз)
    // ============================================
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const chart = echarts.init(container, null, {
            renderer: 'canvas',
            useDirtyRect: true,
            locale: 'RU'
        });

        chartRef.current = chart;

        // Устанавливаем начальные options
        chart.setOption(options, { notMerge: true });
        lastOptionsRef.current = options;

        // Обработчик zoom с debounce
        const handleDataZoom = (): void => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            debounceTimerRef.current = setTimeout(() => {
                const option = chart.getOption() as any;
                const dataZoom = option.dataZoom?.[0];

                if (dataZoom?.startValue && dataZoom?.endValue) {
                    onZoomEndRef.current?.({
                        from: dataZoom.startValue,
                        to: dataZoom.endValue
                    });
                }
            }, 500); // 500ms debounce для загрузки
        };

        chart.on('dataZoom', handleDataZoom);

        const resizeObserver = new ResizeObserver(() => {
            chart.resize();
        });
        resizeObserver.observe(container);

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            resizeObserver.disconnect();
            chart.off('dataZoom', handleDataZoom);
            chart.dispose();
            chartRef.current = null;
        };
    }, []); // ← Пустые deps: инициализация 1 раз

    // ============================================
    // ОБНОВЛЕНИЕ OPTIONS (только при изменении данных)
    // ============================================
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;

        // ✅ Всегда обновляем при изменении options (useMemo гарантирует что options меняется только при реальных изменениях данных)
        chart.setOption(options, {
            notMerge: false,  // Мержим с существующими опциями
            lazyUpdate: false, // ✅ ИСПРАВЛЕНО: Немедленное обновление
            silent: false
        });

        console.log('[ChartCanvas] Options updated', {
            seriesCount: (options.series as any[])?.length,
            totalPoints
        });

    }, [options, totalPoints]);

    // ============================================
    // LOADING STATE
    // ============================================
    useEffect(() => {
        const chart = chartRef.current;
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
            style={{ width: '100%', height: '100%', flex: 1 }}
        />
    );
}