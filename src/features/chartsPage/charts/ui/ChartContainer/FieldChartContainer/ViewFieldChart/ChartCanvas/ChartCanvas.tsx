// components/chart/ChartCanvas/ChartCanvas.tsx
// Программное управление диапазоном для синхронизации

import { useRef, useEffect } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption, EChartsType } from 'echarts';
import type { TimeRange } from "@chartsPage/charts/core/store/types/chart.types.ts";

interface ChartCanvasProps {
    readonly options: EChartsOption;
    readonly totalPoints: number;
    readonly onZoomEnd?: ((range: TimeRange) => void) | undefined;
    readonly loading?: boolean | undefined;
    readonly currentRange?: TimeRange | undefined; // Новый проп для синхронизации
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
    const isInteractingRef = useRef(false); // Флаг: нажата ли кнопка мыши
    const isProgrammaticUpdateRef = useRef(false); // Флаг: программное обновление

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

        /**
         * Вспомогательная функция для вызова callback
         */
        const triggerZoomEnd = (): void => {
            // Не вызываем callback если это программное обновление
            if (isProgrammaticUpdateRef.current) {
                console.log('[ChartCanvas] Пропускаем callback - программное обновление');
                return;
            }

            const option = chart.getOption() as any;
            const dataZoom = option.dataZoom?.[0];

            if (dataZoom?.startValue != null && dataZoom?.endValue != null) {
                console.log('[ChartCanvas] Вызываем onZoomEnd:', {
                    fromMs: dataZoom.startValue,
                    toMs: dataZoom.endValue
                });

                onZoomEndRef.current?.({
                    fromMs: dataZoom.startValue as number,
                    toMs: dataZoom.endValue as number
                });
            }
        };

        /**
         * КРИТИЧНО: Обработчик dataZoom
         *
         * Логика:
         * 1. Если isProgrammaticUpdateRef.current === true (программное обновление) - игнорируем
         * 2. Если isInteractingRef.current === true (пан с зажатой мышью) - игнорируем
         * 3. Если isInteractingRef.current === false (зум колесом) - вызываем onZoomEnd с debounce
         */
        const handleDataZoom = (_params: any): void => {

            // Игнорируем программные обновления
            if (isProgrammaticUpdateRef.current) {
                console.log('[ChartCanvas] Программное обновление, игнорируем dataZoom');
                return;
            }

            // Если пользователь в процессе пана (мышь зажата) - не вызываем callback
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

        /**
         * Отслеживаем начало взаимодействия (пан)
         */
        const handleMouseDown = (e: MouseEvent): void => {
            if (e.button === 0) {
                isInteractingRef.current = true;

                if (debounceTimerRef.current) {
                    clearTimeout(debounceTimerRef.current);
                    debounceTimerRef.current = null;
                }
            }
        };

        /**
         * Отслеживаем окончание взаимодействия (пан)
         */
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

        // Подписываемся на события
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
    }, []); // ← Пустые deps: инициализация 1 раз

    // ============================================
    // ОБНОВЛЕНИЕ OPTIONS (только при изменении данных)
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
    // ПРОГРАММНОЕ ОБНОВЛЕНИЕ ДИАПАЗОНА (для синхронизации)
    // ============================================
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart || !currentRange) return;

        console.log('[ChartCanvas] Программное обновление диапазона:', currentRange);

        // Устанавливаем флаг программного обновления
        isProgrammaticUpdateRef.current = true;

        // Обновляем dataZoom программно
        chart.setOption({
            dataZoom: [{
                type: 'inside',
                startValue: currentRange.fromMs,
                endValue: currentRange.toMs,
                zoomLock: false,
                zoomOnMouseWheel: true,
                moveOnMouseMove: true,
                moveOnMouseWheel: false,
                preventDefaultMouseMove: true
            }]
        }, {
            replaceMerge: ['dataZoom'], // Заменяем только dataZoom
            silent: true // КРИТИЧНО: не генерируем событие dataZoom
        });

        // Сбрасываем флаг после небольшой задержки
        const timer = setTimeout(() => {
            isProgrammaticUpdateRef.current = false;
            console.log('[ChartCanvas] Флаг программного обновления сброшен');
        }, 100);

        return () => {
            clearTimeout(timer);
        };
    }, [currentRange]);

    console.log('[ChartCanvas] Обновление options');

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