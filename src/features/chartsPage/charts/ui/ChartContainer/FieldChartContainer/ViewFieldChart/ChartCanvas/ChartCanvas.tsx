// features/chartsPage/charts/ui/ChartContainer/FieldChartContainer/ViewFieldChart/ChartCanvas/ChartCanvas.tsx
// ИСПРАВЛЕНИЕ: Усиленная защита от программных событий dataZoom

import { useRef, useEffect } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption, EChartsType } from 'echarts';
import type { TimeRange } from '@chartsPage/charts/core/store/types/chart.types.ts';

interface ChartCanvasProps {
    readonly options: EChartsOption;
    readonly totalPoints: number;
    readonly onZoomEnd?: ((range: TimeRange) => void) | undefined;
    readonly loading?: boolean | undefined;
    readonly currentRange?: TimeRange | undefined;
}

export function ChartCanvas({
                                options,
                                totalPoints,
                                onZoomEnd,
                                loading = false,
                                currentRange
                            }: ChartCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<EChartsType | null>(null);
    const onZoomEndRef = useRef(onZoomEnd);
    const totalPointsRef = useRef(totalPoints);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isInteractingRef = useRef(false);
    const isProgrammaticUpdateRef = useRef(false);

    // Отслеживание последнего применённого range
    const lastAppliedRangeRef = useRef<TimeRange | null>(null);

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

        chart.setOption(options, { notMerge: true });

        const triggerZoomEnd = (): void => {
            // ========== ЗАЩИТА 1: Флаг программного обновления ==========
            if (isProgrammaticUpdateRef.current) {
                console.log('[ChartCanvas] Пропускаем callback - программное обновление');
                return;
            }

            const option = chart.getOption() as any;
            const dataZoom = option.dataZoom?.[0];

            if (dataZoom?.startValue != null && dataZoom?.endValue != null) {
                const newRange: TimeRange = {
                    fromMs: dataZoom.startValue as number,
                    toMs: dataZoom.endValue as number
                };

                // ========== ЗАЩИТА 2: Сравнение с lastAppliedRange ==========
                // Если это тот же range, который мы только что применили - игнорируем
                if (
                    lastAppliedRangeRef.current &&
                    Math.abs(lastAppliedRangeRef.current.fromMs - newRange.fromMs) <= 1 &&
                    Math.abs(lastAppliedRangeRef.current.toMs - newRange.toMs) <= 1
                ) {
                    console.log('[ChartCanvas] Range совпадает с lastApplied, игнорируем callback:', newRange);
                    return;
                }

                // Обновляем lastAppliedRange
                lastAppliedRangeRef.current = newRange;

                console.log('[ChartCanvas] Вызываем onZoomEnd:', newRange);

                onZoomEndRef.current?.(newRange);
            }
        };

        const handleDataZoom = (_params: any): void => {
            // Защита от программных обновлений
            if (isProgrammaticUpdateRef.current) {
                console.log('[ChartCanvas] Программное обновление, игнорируем dataZoom');
                return;
            }

            // Защита от пана
            if (isInteractingRef.current) {
                console.log('[ChartCanvas] Пан в процессе, игнорируем dataZoom');
                return;
            }

            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            debounceTimerRef.current = setTimeout(() => {
                triggerZoomEnd();
            }, 150);
        };

        const handleMouseDown = (e: MouseEvent): void => {
            if (e.button === 0) {
                isInteractingRef.current = true;

                if (debounceTimerRef.current) {
                    clearTimeout(debounceTimerRef.current);
                    debounceTimerRef.current = null;
                }
            }
        };

        const handleMouseUp = (e: MouseEvent): void => {
            if (e.button === 0 && isInteractingRef.current) {
                isInteractingRef.current = false;

                if (debounceTimerRef.current) {
                    clearTimeout(debounceTimerRef.current);
                }

                debounceTimerRef.current = setTimeout(() => {
                    triggerZoomEnd();
                }, 100);
            }
        };

        chart.on('dataZoom', handleDataZoom);
        container.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mouseup', handleMouseUp);

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
            container.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('mouseup', handleMouseUp);
            chart.dispose();
            chartRef.current = null;
        };
    }, []);

    // ============================================
    // ОБНОВЛЕНИЕ OPTIONS
    // ============================================
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;

        chart.setOption(options, {
            notMerge: false,
            lazyUpdate: false,
            silent: false
        });
    }, [options]);

    // ============================================
    // УМНОЕ ПРОГРАММНОЕ ОБНОВЛЕНИЕ ДИАПАЗОНА
    // ============================================
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart || !currentRange) return;

        // ========== ПРОВЕРКА: Сравниваем с текущим zoom ECharts ==========
        const option = chart.getOption() as any;
        const dataZoom = option.dataZoom?.[0];
        const currentStart = dataZoom?.startValue;
        const currentEnd = dataZoom?.endValue;

        const TOLERANCE = 1;
        const isAlreadySet =
            currentStart != null &&
            currentEnd != null &&
            Math.abs(currentStart - currentRange.fromMs) <= TOLERANCE &&
            Math.abs(currentEnd - currentRange.toMs) <= TOLERANCE;

        if (isAlreadySet) {
            console.log('[ChartCanvas] ECharts zoom уже установлен, пропускаем:', {
                current: { from: currentStart, to: currentEnd },
                incoming: currentRange
            });
            // Обновляем lastAppliedRange
            lastAppliedRangeRef.current = currentRange;
            return;
        }

        // ========== ПРИМЕНЯЕМ ПРОГРАММНОЕ ОБНОВЛЕНИЕ ==========
        console.log('[ChartCanvas] Применяем программное обновление:', {
            from: { current: currentStart, new: currentRange.fromMs },
            to: { current: currentEnd, new: currentRange.toMs }
        });

        // КРИТИЧНО: Устанавливаем флаг ПЕРЕД обновлением
        isProgrammaticUpdateRef.current = true;

        chart.setOption(
            {
                dataZoom: [
                    {
                        type: 'inside',
                        startValue: currentRange.fromMs,
                        endValue: currentRange.toMs,
                        zoomLock: false,
                        zoomOnMouseWheel: true,
                        moveOnMouseMove: true,
                        moveOnMouseWheel: false,
                        preventDefaultMouseMove: true
                    }
                ]
            },
            {
                replaceMerge: ['dataZoom'],
                silent: true
            }
        );

        // Обновляем lastAppliedRange СРАЗУ после setOption
        lastAppliedRangeRef.current = currentRange;

        // КРИТИЧНО: Увеличиваем задержку до 300ms для надёжности
        const timer = setTimeout(() => {
            isProgrammaticUpdateRef.current = false;
            console.log('[ChartCanvas] Флаг программного обновления сброшен');
        }, 300);

        return () => {
            clearTimeout(timer);
        };
    }, [currentRange]);

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