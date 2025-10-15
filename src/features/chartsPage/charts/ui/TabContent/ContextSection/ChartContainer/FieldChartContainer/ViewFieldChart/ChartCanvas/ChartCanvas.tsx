// features/chartsPage/charts/ui/ChartContainer/FieldChartContainer/ViewFieldChart/ChartCanvas/ChartCanvas.tsx
// ИСПРАВЛЕНИЕ: Надёжная обработка зума браузера (Ctrl+/-) + стилизованный tooltip + сброс зума

import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption, EChartsType } from 'echarts';
import type {OriginalRange, TimeRange} from '@chartsPage/charts/core/store/types/chart.types.ts';
import './ChartTooltip.module.css';

interface ChartCanvasProps {
    readonly options: EChartsOption;
    readonly totalPoints: number;
    readonly onZoomEnd?: ((range: TimeRange) => void) | undefined;
    readonly loading?: boolean | undefined;
    readonly currentRange?: TimeRange | undefined;
    readonly originalRange?: OriginalRange | undefined;
}

export interface ChartCanvasRef {
    resetZoom: () => void;
}

export const ChartCanvas = forwardRef<ChartCanvasRef, ChartCanvasProps>(
    function ChartCanvas(
        {
            options,
            totalPoints,
            onZoomEnd,
            loading = false,
            currentRange,
            originalRange
        },
        ref
    ) {
        const containerRef = useRef<HTMLDivElement>(null);
        const chartRef = useRef<EChartsType | null>(null);
        const onZoomEndRef = useRef(onZoomEnd);
        const totalPointsRef = useRef(totalPoints);
        const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
        const isInteractingRef = useRef(false);
        const isProgrammaticUpdateRef = useRef(false);
        const programmaticTimerRef = useRef<NodeJS.Timeout | null>(null);
        const lastAppliedRangeRef = useRef<TimeRange | null>(null);
        const lastUserZoomRef = useRef<TimeRange | null>(null);
        const programmaticUpdateCountRef = useRef(0);
        const MAX_PROGRAMMATIC_UPDATES = 3;

        const resizeDebounceRef = useRef<NodeJS.Timeout | null>(null);
        const lastPixelRatioRef = useRef<number>(window.devicePixelRatio);

        const browserZoomStabilizeTimerRef = useRef<NodeJS.Timeout | null>(null);
        const resizeAttemptRef = useRef<number>(0);

        totalPointsRef.current = totalPoints;
        onZoomEndRef.current = onZoomEnd;

        // ============================================
        // ПУБЛИЧНЫЙ МЕТОД: СБРОС ЗУМА
        // ============================================
        useImperativeHandle(ref, () => ({
            resetZoom: () => {
                const chart = chartRef.current;
                if (!chart) return;

                // 1. СРАЗУ применяем зум локально (не ждём useEffect)
                isProgrammaticUpdateRef.current = true;

                if (programmaticTimerRef.current) {
                    clearTimeout(programmaticTimerRef.current);
                }

                chart.setOption(
                    {
                        dataZoom: [
                            {
                                type: 'inside',
                                startValue: originalRange?.fromMs,
                                endValue: originalRange?.toMs,
                                zoomLock: false
                            }
                        ]
                    },
                    {
                        replaceMerge: ['dataZoom']
                    }
                );

                lastAppliedRangeRef.current = originalRange!;
                lastUserZoomRef.current = null;

                // 2. Уведомляем родителя для синхронизации ДРУГИХ графиков
                onZoomEndRef.current?.(originalRange!);

                // Сброс флага
                programmaticTimerRef.current = setTimeout(() => {
                    isProgrammaticUpdateRef.current = false;
                    programmaticTimerRef.current = null;
                }, 500);
            }
        }), [originalRange]);

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

                    const TOLERANCE = 1;
                    if (
                        lastAppliedRangeRef.current &&
                        Math.abs(lastAppliedRangeRef.current.fromMs - newRange.fromMs) <= TOLERANCE &&
                        Math.abs(lastAppliedRangeRef.current.toMs - newRange.toMs) <= TOLERANCE
                    ) {
                        return;
                    }

                    if (
                        lastUserZoomRef.current &&
                        Math.abs(lastUserZoomRef.current.fromMs - newRange.fromMs) <= TOLERANCE &&
                        Math.abs(lastUserZoomRef.current.toMs - newRange.toMs) <= TOLERANCE
                    ) {
                        return;
                    }

                    lastUserZoomRef.current = newRange;
                    lastAppliedRangeRef.current = newRange;
                    onZoomEndRef.current?.(newRange);
                }
            };

            const handleDataZoom = (_params: any): void => {
                if (isProgrammaticUpdateRef.current) {
                    return;
                }

                if (isInteractingRef.current) {
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

            // ============================================
            // УЛУЧШЕННАЯ ФУНКЦИЯ RESIZE
            // ============================================
            const performResize = (): void => {
                if (!container || !chart) return;

                try {
                    const rect = container.getBoundingClientRect();
                    const width = Math.round(rect.width);
                    const height = Math.round(rect.height);

                    if (width <= 0 || height <= 0) {
                        console.warn('[ChartCanvas] Невалидные размеры:', { width, height });
                        return;
                    }

                    console.log('[ChartCanvas] Выполняем resize:', {
                        width,
                        height,
                        devicePixelRatio: window.devicePixelRatio,
                        attempt: resizeAttemptRef.current
                    });

                    chart.resize({
                        width,
                        height,
                        animation: {
                            duration: 200,
                            easing: 'cubicInOut'
                        }
                    });

                    requestAnimationFrame(() => {
                        const canvasElements = container.querySelectorAll('canvas');
                        let hasOverflow = false;

                        canvasElements.forEach(canvas => {
                            const canvasWidth = canvas.width / window.devicePixelRatio;
                            if (canvasWidth > width + 1) {
                                hasOverflow = true;
                                console.warn('[ChartCanvas] Обнаружен overflow canvas:', {
                                    canvasWidth,
                                    containerWidth: width,
                                    diff: canvasWidth - width
                                });
                            }
                        });

                        if (hasOverflow && resizeAttemptRef.current < 3) {
                            resizeAttemptRef.current++;
                            console.log('[ChartCanvas] Повторный resize из-за overflow');
                            setTimeout(() => performResize(), 50);
                        } else {
                            resizeAttemptRef.current = 0;
                        }
                    });

                } catch (error) {
                    console.error('[ChartCanvas] Ошибка при resize:', error);
                }
            };

            const forceResize = (): void => {
                if (resizeDebounceRef.current) {
                    clearTimeout(resizeDebounceRef.current);
                }

                resizeDebounceRef.current = setTimeout(() => {
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            performResize();
                        });
                    });
                }, 100);
            };

            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const { width, height } = entry.contentRect;

                    console.log('[ResizeObserver] Размер контейнера:', {
                        width: Math.round(width),
                        height: Math.round(height)
                    });

                    forceResize();
                }
            });

            resizeObserver.observe(container);

            const handleWindowResize = (): void => {
                const currentPixelRatio = window.devicePixelRatio;

                const pixelRatioDiff = Math.abs(currentPixelRatio - lastPixelRatioRef.current);
                const isBrowserZoom = pixelRatioDiff > 0.01;

                if (isBrowserZoom) {
                    console.log('[Window Resize] 🔍 ОБНАРУЖЕН ЗУМ БРАУЗЕРА:', {
                        oldRatio: lastPixelRatioRef.current,
                        newRatio: currentPixelRatio,
                        diff: pixelRatioDiff
                    });
                    lastPixelRatioRef.current = currentPixelRatio;

                    if (browserZoomStabilizeTimerRef.current) {
                        clearTimeout(browserZoomStabilizeTimerRef.current);
                    }

                    resizeAttemptRef.current = 0;

                    forceResize();

                    browserZoomStabilizeTimerRef.current = setTimeout(() => {
                        console.log('[Browser Zoom] Стабилизационный resize #1');
                        forceResize();
                    }, 200);

                    setTimeout(() => {
                        console.log('[Browser Zoom] Стабилизационный resize #2');
                        forceResize();
                    }, 500);

                } else {
                    console.log('[Window Resize] Обычное изменение размера окна');
                    forceResize();
                }
            };

            window.addEventListener('resize', handleWindowResize);

            const handleVisualViewportResize = (): void => {
                console.log('[VisualViewport] Изменение viewport');
                forceResize();
            };

            if (window.visualViewport) {
                window.visualViewport.addEventListener('resize', handleVisualViewportResize);
            }

            return () => {
                if (debounceTimerRef.current) {
                    clearTimeout(debounceTimerRef.current);
                }
                if (programmaticTimerRef.current) {
                    clearTimeout(programmaticTimerRef.current);
                }
                if (resizeDebounceRef.current) {
                    clearTimeout(resizeDebounceRef.current);
                }
                if (browserZoomStabilizeTimerRef.current) {
                    clearTimeout(browserZoomStabilizeTimerRef.current);
                }
                resizeObserver.disconnect();
                chart.off('dataZoom', handleDataZoom);
                container.removeEventListener('mousedown', handleMouseDown);
                document.removeEventListener('mouseup', handleMouseUp);
                window.removeEventListener('resize', handleWindowResize);

                if (window.visualViewport) {
                    window.visualViewport.removeEventListener('resize', handleVisualViewportResize);
                }

                chart.dispose();
                chartRef.current = null;
            };
        }, [originalRange]);

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

            if (!chart || !currentRange) {
                if (!currentRange && lastAppliedRangeRef.current) {
                    lastAppliedRangeRef.current = null;
                }
                return;
            }

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
                lastAppliedRangeRef.current = currentRange;
                programmaticUpdateCountRef.current = 0;
                return;
            }

            programmaticUpdateCountRef.current += 1;

            if (programmaticUpdateCountRef.current > MAX_PROGRAMMATIC_UPDATES) {
                isProgrammaticUpdateRef.current = false;
                programmaticUpdateCountRef.current = 0;

                if (programmaticTimerRef.current) {
                    clearTimeout(programmaticTimerRef.current);
                    programmaticTimerRef.current = null;
                }

                return;
            }

            isProgrammaticUpdateRef.current = true;

            if (programmaticTimerRef.current) {
                clearTimeout(programmaticTimerRef.current);
            }

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

            lastAppliedRangeRef.current = currentRange;

            programmaticTimerRef.current = setTimeout(() => {
                isProgrammaticUpdateRef.current = false;
                programmaticTimerRef.current = null;
                programmaticUpdateCountRef.current = 0;
            }, 500);

            return () => {
                if (programmaticTimerRef.current) {
                    clearTimeout(programmaticTimerRef.current);
                }
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
                style={{
                    width: '100%',
                    height: '100%',
                    flex: 1,
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    minWidth: 0,
                    minHeight: 0,
                    overflow: 'hidden',
                    position: 'relative'
                }}
            />
        );
    }
);