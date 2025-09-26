// charts/ui/CharContainer/ChartCollection/FieldChart/ViewFieldChart/ViewFieldChart.tsx

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as echarts from 'echarts';
import type { ECharts, EChartsOption } from 'echarts';
import styles from './ViewFieldChart.module.css';
import classNames from 'classnames';
import type { ChartStats } from "@charts/ui/CharContainer/types/ChartStats.ts";
import { ChartHeader } from "@charts/ui/CharContainer/ChartHeader/ChartHeader.tsx";
import type { TimeRange } from "@charts/store/chartsSlice.ts";

export interface ViewFieldChartProps {
    domain: TimeRange;
    fieldName: string;
    chartOption: EChartsOption;
    stats: ChartStats;
    loading: boolean;
    error?: string | undefined;
    info?: string | undefined;
    onChartReady: (chart: echarts.ECharts) => void;
    onZoom: (params: any) => void;
    onResize: (width: number, height: number) => void;
    onBrush?: ((params: any) => void) | undefined;
    onClick?: ((params: any) => void) | undefined;
    className?: string | undefined;
    height: number;
    loadingProgress?: number;
}

/**
 * Презентационный компонент для отображения графика поля
 */
const ViewFieldChart: React.FC<ViewFieldChartProps> = ({
                                                           fieldName,
                                                           chartOption,
                                                           stats,
                                                           loading,
                                                           error,
                                                           info,
                                                           onChartReady,
                                                           onZoom,
                                                           onResize,
                                                           onBrush,
                                                           onClick,
                                                           className,
                                                           height,
                                                           domain,
                                                           loadingProgress = 0
                                                       }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartInstanceRef = useRef<ECharts | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showSkeleton, setShowSkeleton] = useState(true);

    // Флаги для управления обновлениями
    const isInitializedRef = useRef(false);
    const lastOptionHashRef = useRef<string>('');

    // Флаги для предотвращения одновременных операций
    const isProcessingRef = useRef(false);
    const pendingOptionRef = useRef<EChartsOption | null>(null);
    const pendingResizeRef = useRef(false);

    // Инициализация графика - убираем лишние ограничения
    useEffect(() => {
        if (!chartContainerRef.current || isInitializedRef.current) return;

        const initChart = () => {
            if (!chartContainerRef.current) return;

            try {
                isProcessingRef.current = true;

                const chartInstance = echarts.init(chartContainerRef.current, undefined, {
                    renderer: 'canvas',
                    useDirtyRect: true
                });

                chartInstanceRef.current = chartInstance;
                isInitializedRef.current = true;

                // Устанавливаем начальные опции
                chartInstance.setOption(chartOption, true);

                // Подписываемся на события после небольшой задержки
                setTimeout(() => {
                    if (!chartInstance || chartInstance.isDisposed()) return;

                    const handleDataZoom = (params: any) => {
                        if (!isProcessingRef.current) {
                            onZoom(params);
                        }
                    };

                    const handleClick = (params: any) => {
                        if (!isProcessingRef.current) {
                            onClick?.(params);
                        }
                    };

                    const handleBrush = (params: any) => {
                        if (!isProcessingRef.current) {
                            onBrush?.(params);
                        }
                    };

                    chartInstance.on('datazoom', handleDataZoom);
                    chartInstance.on('click', handleClick);
                    if (onBrush) {
                        chartInstance.on('brush', handleBrush);
                    }

                    // Уведомляем что график готов
                    onChartReady(chartInstance);
                }, 100);

            } finally {
                isProcessingRef.current = false;
            }
        };

        requestAnimationFrame(initChart);
    }, []);

    // В useEffect для обновления опций графика (строки ~150-200):
    useEffect(() => {
        if (!chartInstanceRef.current || !isInitializedRef.current) return;

        const optionHash = JSON.stringify({
            series: chartOption.series,
            xAxis: chartOption.xAxis,
            yAxis: chartOption.yAxis
        });

        if (optionHash !== lastOptionHashRef.current) {
            lastOptionHashRef.current = optionHash;

            const updateChart = () => {
                if (!chartInstanceRef.current || chartInstanceRef.current.isDisposed()) return;

                if (isProcessingRef.current) {
                    pendingOptionRef.current = chartOption;
                    return;
                }

                // Используем микрозадачу для отложенного выполнения
                queueMicrotask(() => {
                    if (!chartInstanceRef.current || chartInstanceRef.current.isDisposed()) {
                        return;
                    }

                    try {
                        isProcessingRef.current = true;

                        // Очищаем все состояния перед обновлением
                        chartInstanceRef.current.dispatchAction({
                            type: 'downplay'
                        });

                        chartInstanceRef.current.dispatchAction({
                            type: 'hideTip'
                        });

                        // Получаем текущее состояние zoom
                        const currentOption = chartInstanceRef.current.getOption() as any;
                        const currentDataZoom = currentOption?.dataZoom || [];

                        // Подсчитываем общее количество точек данных
                        const totalDataPoints = chartOption.series?.reduce((acc: number, s: any) => {
                            return acc + (s.data?.length || 0);
                        }, 0) || 0;

                        // Для больших объемов данных или первой загрузки используем clear
                        const needsClear = totalDataPoints > 1000 ||
                            (totalDataPoints > 0 && !currentOption?.series?.[0]?.data?.length);

                        if (needsClear) {
                            chartInstanceRef.current.clear();
                            // Даём время на очистку
                            setTimeout(() => {
                                if (chartInstanceRef.current && !chartInstanceRef.current.isDisposed()) {
                                    chartInstanceRef.current.setOption({
                                        ...chartOption,
                                        dataZoom: currentDataZoom.length > 0 ? currentDataZoom : chartOption.dataZoom
                                    }, true);
                                    setShowSkeleton(false);
                                }
                                isProcessingRef.current = false;
                                checkPendingUpdates();
                            }, 10);
                        } else {
                            // Обычное обновление для небольших изменений
                            chartInstanceRef.current.setOption({
                                ...chartOption,
                                dataZoom: currentDataZoom.length > 0 ? currentDataZoom : chartOption.dataZoom
                            }, {
                                notMerge: false,
                                lazyUpdate: true,
                                replaceMerge: ['series']
                            });
                            setShowSkeleton(false);
                            isProcessingRef.current = false;
                            checkPendingUpdates();
                        }
                    } catch (error) {
                        console.warn('Chart update error:', error);
                        isProcessingRef.current = false;
                        checkPendingUpdates();
                    }
                });
            };

            // Функция проверки отложенных обновлений
            const checkPendingUpdates = () => {
                if (pendingOptionRef.current) {
                    pendingOptionRef.current = null;
                    setTimeout(() => {
                        if (chartInstanceRef.current && !chartInstanceRef.current.isDisposed()) {
                            lastOptionHashRef.current = '';
                            updateChart();
                        }
                    }, 50);
                }
            };

            // Используем requestIdleCallback для низкоприоритетного обновления
            if ('requestIdleCallback' in window) {
                requestIdleCallback(updateChart, { timeout: 100 });
            } else {
                requestAnimationFrame(updateChart);
            }
        }
    }, [chartOption]);

    // Управление состоянием скелетона
    useEffect(() => {
        if (loading) {
            setShowSkeleton(true);
        } else {
            // Плавное исчезновение скелетона
            const timer = setTimeout(() => setShowSkeleton(false), 300);
            clearTimeout(timer);
        }
    }, [loading]);

    // ResizeObserver для адаптивности
    useEffect(() => {
        if (!containerRef.current) return;

        let resizeTimeout: NodeJS.Timeout | null = null;
        let lastWidth = 0;
        let lastHeight = 0;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;

                // Игнорируем незначительные изменения размера
                if (Math.abs(width - lastWidth) < 5 && Math.abs(height - lastHeight) < 5) {
                    return;
                }

                lastWidth = width;
                lastHeight = height;

                // Вызываем onResize сразу
                onResize(width, height);

                // Debounce для resize графика
                if (resizeTimeout) {
                    clearTimeout(resizeTimeout);
                }

                resizeTimeout = setTimeout(() => {
                    if (!chartInstanceRef.current ||
                        chartInstanceRef.current.isDisposed() ||
                        isProcessingRef.current) {
                        return;
                    }

                    // Используем queueMicrotask для безопасного resize
                    queueMicrotask(() => {
                        if (!chartInstanceRef.current ||
                            chartInstanceRef.current.isDisposed() ||
                            isProcessingRef.current) {
                            return;
                        }

                        try {
                            // Временно блокируем обработку
                            isProcessingRef.current = true;

                            // Скрываем tooltip перед resize
                            chartInstanceRef.current.dispatchAction({
                                type: 'hideTip'
                            });

                            // Выполняем resize
                            chartInstanceRef.current.resize();

                            // Разблокируем через небольшую задержку
                            setTimeout(() => {
                                isProcessingRef.current = false;

                                // Проверяем отложенный resize
                                if (pendingResizeRef.current) {
                                    pendingResizeRef.current = false;
                                    // Рекурсивный вызов через timeout
                                    resizeTimeout = setTimeout(() => {
                                        if (chartInstanceRef.current && !chartInstanceRef.current.isDisposed()) {
                                            chartInstanceRef.current.resize();
                                        }
                                    }, 100);
                                }
                            }, 50);
                        } catch (error) {
                            console.warn('Chart resize error:', error);
                            isProcessingRef.current = false;
                        }
                    });
                }, 200); // Увеличиваем debounce
            }
        });

        resizeObserver.observe(containerRef.current);

        return () => {
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }
            resizeObserver.disconnect();
        };
    }, [onResize]);

    // Экспорт данных в CSV
    const handleExport = useCallback(() => {
        if (!chartInstanceRef.current) return;

        const option = chartInstanceRef.current.getOption() as any;
        const series = option.series || [];

        // Ищем серию с основными данными (avg)
        const avgSeries = series.find((s: any) => s.name?.includes('avg')) || series[0];
        const data = avgSeries?.data || [];

        const csv = [
            ['Time', 'Value'],
            ...data.map((point: any) => {
                const time = Array.isArray(point) ? point[0] : point.value?.[0];
                const value = Array.isArray(point) ? point[1] : point.value?.[1];
                return [
                    new Date(time).toISOString(),
                    value?.toString() || 'null'
                ];
            })
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fieldName}_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [fieldName]);

    // Переключение развёрнутого состояния
    const toggleExpanded = useCallback(() => {
        setIsExpanded(prev => !prev);
        setTimeout(() => {
            if (chartInstanceRef.current && !chartInstanceRef.current.isDisposed() && !isProcessingRef.current) {
                requestAnimationFrame(() => {
                    if (chartInstanceRef.current) {
                        chartInstanceRef.current.resize();
                    }
                });
            }
        }, 300);
    }, []);

    // Индикатор качества данных
    const getQualityIndicator = () => {
        if (!stats.quality) return null;

        const indicators = {
            good: { icon: '✓', color: '#52c41a', text: 'Хорошее' },
            medium: { icon: '!', color: '#faad14', text: 'Среднее' },
            poor: { icon: '✗', color: '#f5222d', text: 'Плохое' }
        };

        const indicator = indicators[stats.quality];
        return (
            <span
                className={styles.quality}
                style={{ backgroundColor: indicator.color + '20', color: indicator.color }}
                title={`Качество данных: ${indicator.text}`}
            >
                {indicator.icon}
            </span>
        );
    };

    // Форматирование диапазона дат
    const formatDateRange = () => {
        const formatDate = (date: Date) => {
            return date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
        };
        return `${formatDate(domain.from)} - ${formatDate(domain.to)}`;
    };

    return (
        <div
            ref={containerRef}
            className={classNames(
                styles.chartContainerWrapper,
                isExpanded && styles.expanded,
                loading && styles.loadingState,
                error && styles.hasError,
                className
            )}
        >
            <div className={styles.chartContainer}>
                <ChartHeader fieldName={fieldName} />

                {/* Заголовок и статистика */}
                <div className={styles.header}>
                    <div className={styles.titleSection}>
                        <h3 className={styles.title}>
                            {fieldName}
                            {getQualityIndicator()}
                        </h3>
                        <span className={styles.bucket}>
                            {stats.currentBucket}
                        </span>
                        <span className={styles.dateRange}>
                            {formatDateRange()}
                        </span>
                    </div>

                    <div className={styles.statsSection}>
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>Покрытие:</span>
                            <span className={styles.statValue}>{stats.coverage}%</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>Плотность:</span>
                            <span className={styles.statValue}>
                                {stats.density.toFixed(2)} точек/px
                            </span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>Видимо:</span>
                            <span className={styles.statValue}>
                                {stats.visiblePoints} из {stats.totalPoints}
                            </span>
                        </div>
                        {stats.gaps !== undefined && stats.gaps > 0 && (
                            <div className={styles.stat}>
                                <span className={styles.statLabel}>Разрывов:</span>
                                <span className={styles.statValue}>{stats.gaps}</span>
                            </div>
                        )}
                    </div>

                    <div className={styles.actions}>
                        <button
                            className={styles.actionBtn}
                            onClick={handleExport}
                            title="Экспортировать данные в CSV"
                            disabled={stats.totalPoints === 0}
                        >
                            📥
                        </button>
                        <button
                            className={styles.actionBtn}
                            onClick={toggleExpanded}
                            title={isExpanded ? "Свернуть" : "Развернуть"}
                        >
                            {isExpanded ? '⬇' : '⬆'}
                        </button>
                    </div>
                </div>

                {/* График */}
                <div
                    className={styles.chartWrapper}
                    style={{ height: !isExpanded ? height : undefined }}
                >
                    {/* Минималистичный индикатор загрузки */}
                    {loading && (
                        <div className={styles.loadingIndicator}>
                            <div className={styles.loadingDots}>
                                <div className={styles.loadingDot}></div>
                                <div className={styles.loadingDot}></div>
                                <div className={styles.loadingDot}></div>
                            </div>
                            <span className={styles.loadingText}>Загрузка</span>
                        </div>
                    )}

                    {/* Скелетон для первичной загрузки */}
                    {showSkeleton && !error && (
                        <div className={styles.skeleton}>
                            <div className={styles.skeletonChart} />
                        </div>
                    )}

                    {/* Прогресс-бар */}
                    {loading && loadingProgress > 0 && (
                        <div className={styles.progressBar}>
                            <div
                                className={styles.progressBarFill}
                                style={{ width: `${loadingProgress}%` }}
                            />
                        </div>
                    )}

                    {/* Оверлей ошибки */}
                    {error && !loading && (
                        <div className={styles.errorOverlay}>
                            <span className={styles.errorIcon}>⚠️</span>
                            <span className={styles.errorText}>{error}</span>
                            <button
                                className={styles.retryBtn}
                                onClick={() => window.location.reload()}
                            >
                                Попробовать снова
                            </button>
                        </div>
                    )}

                    {/* Информационное сообщение */}
                    {!error && !loading && info && (
                        <div className={styles.infoOverlay}>
                            <span>ℹ️ {info}</span>
                        </div>
                    )}

                    {/* Контейнер для ECharts */}
                    <div
                        ref={chartContainerRef}
                        className={classNames(
                            styles.chartContent,
                            loading && styles.loading
                        )}
                        style={{
                            width: '100%',
                            height: '100%',
                            visibility: error ? 'hidden' : 'visible'
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default ViewFieldChart;